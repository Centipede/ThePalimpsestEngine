// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readonly, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { ContentBlock, FindingContext, FindingContextMap, FindingOccurrence } from '../types/library';
import { useFacetsStore } from '../stores/facets';
import SectionFindings from './SectionFindings.vue';

/**
 * A mount test, not a behaviour suite.
 *
 * The selection layer put SectionFindings in reach of a failure nothing else catches:
 * `watch(visible, ...)` evaluates its source during setup, and `visible` reads
 * `sortedFacets`, so declaring the groups below the selection makes mounting throw a
 * TDZ ReferenceError. It type-checks perfectly. Only mounting notices, so that is what
 * this does - plus the few bits of selection wiring that live in the template rather
 * than in findingEligibility, which is unit-tested on its own.
 */

// useAuth keeps its state at module scope and reads localStorage as the module is
// evaluated - which has already happened by the time any hook runs, via the store's
// own import of apiFetch. Mocking is the only way to choose a viewer.
const isStaff = ref(true);
vi.mock('../composables/useAuth', () => ({
    useAuth: () => ({
        isStaff: readonly(isStaff),
        token: readonly(ref<string | null>('test-token')),
        isAuthenticated: readonly(ref(true)),
        login: vi.fn(),
        logout: vi.fn(),
    }),
}));

function occurrence(id: number): FindingOccurrence {
    return {
        id,
        name: `mention ${id}`,
        description: 'desc',
        quote: `quote ${id}`,
        in_block_pi: '1.p',
        on_page: null,
        of_context: null,
        extracted_data: null,
    };
}

function context(id: number, name: string): FindingContext {
    return { id, name, of_identity: null, occurrences: [occurrence(id * 10)] };
}

const facets: FindingContextMap = {
    people: [context(1, 'Ada'), context(2, 'Lovelace')],
    places: [context(3, 'Potsdam')],
};

beforeAll(() => {
    // Shoelace components observe their own size on connect; jsdom has no ResizeObserver.
    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
    isStaff.value = true;
    setActivePinia(createPinia());
    useFacetsStore().facetQueries = [
        { id: 1, name: 'People', machine_name_singular: 'person', machine_name_plural: 'people', symbol: '\u{1F464}' },
        { id: 2, name: 'Places', machine_name_singular: 'place', machine_name_plural: 'places', symbol: '\u{1F4CD}' },
    ] as never;
});

/** A block as the section payload delivers it, carrying the text the quote is checked against. */
function block(pathId: string, text: string): ContentBlock {
    return {
        path_id: pathId,
        content_type: 'paragraph',
        content_text: text,
        content_json: null,
    };
}

function mountPanel(props: Record<string, unknown> = {}) {
    return mount(SectionFindings, {
        props: {
            facets,
            openFindingIds: {},
            machineName: 'a-book',
            sectionPath: 'main.ch1',
            ...props,
        },
        global: {
            // The candidate-count chip resolves its own href, so ContextRow needs a
            // router in scope now even when no finding has any candidates.
            plugins: [createRouter({
                history: createMemoryHistory(),
                routes: [{ path: '/admin/findings', component: { template: '<div />' } }],
            })],
            config: { compilerOptions: { isCustomElement: (tag: string) => tag.startsWith('sl-') } },
            stubs: {
                FindingContextToolset: true,
                MergeDialog: true,
                ConfirmDialog: true,
                NewOccurrenceDialog: true,
            },
        },
    });
}

function rows(wrapper: ReturnType<typeof mountPanel>) {
    return wrapper.findAllComponents({ name: 'ContextRow' });
}

describe('SectionFindings', () => {
    it('mounts without evaluating a computed before its declaration', () => {
        expect(mountPanel().find('.categories-grid').exists()).toBe(true);
    });

    it('renders one column per facet and one row per finding', () => {
        const wrapper = mountPanel();
        expect(wrapper.findAll('.category-column')).toHaveLength(2);
        expect(rows(wrapper)).toHaveLength(3);
    });

    it('shows no candidate chip for findings the scan has not reached', () => {
        // The fixture findings carry no candidate_counts, which is the ordinary case:
        // the grid must look exactly as it did before the chip existed.
        expect(mountPanel().find('.chip').exists()).toBe(false);
    });

    it('shows the candidate chip on a finding that has candidates', async () => {
        const withCounts: FindingContextMap = {
            people: [{
                ...context(1, 'Leopold I'),
                candidate_counts: { basis: 'identity', of: 17, compared: 3, triage: 72 },
            }],
        };
        const wrapper = mountPanel({ facets: withCounts });

        const chip = wrapper.find('.chip');
        expect(chip.exists()).toBe(true);
        expect(chip.text().replace(/\s+/g, '')).toBe('(3/72)');
        // Staff get the link into the work area, aimed at this identity.
        expect(chip.attributes('href')).toContain('identity=17');

        /**
         * The chip sits inside sl-details' summary slot, where it has to stop its click
         * from reaching the shadow <summary> that would toggle the finding. That cannot
         * be asserted here - the stub has no shadow root - so what this checks is that
         * adding the chip did not disturb the selection wiring beside it.
         */
        rows(wrapper)[0].vm.$emit('toggle-select', 1, true);
        await wrapper.vm.$nextTick();
        expect(wrapper.find('.selection-bar').text()).toContain('1 selected');
    });

    it('shows an ordinary reader the figures but not a link', () => {
        isStaff.value = false;
        const withCounts: FindingContextMap = {
            people: [{
                ...context(1, 'Leopold I'),
                candidate_counts: { basis: 'identity', of: 17, compared: 3, triage: 72 },
            }],
        };
        const chip = mountPanel({ facets: withCounts }).find('.chip');
        expect(chip.text().replace(/\s+/g, '')).toBe('(3/72)');
        expect(chip.element.tagName).toBe('SPAN');
        expect(chip.attributes('title')).toContain('librarian');
    });

    it('shows the staff action bar with nothing selected', () => {
        expect(mountPanel().find('.selection-bar').text()).toContain('0 selected');
    });

    it('hides the action bar from a non-staff viewer', () => {
        isStaff.value = false;
        const wrapper = mountPanel();
        expect(wrapper.find('.categories-grid').exists()).toBe(true);
        expect(wrapper.find('.selection-bar').exists()).toBe(false);
    });

    it('counts a finding once its checkbox reports a change', async () => {
        const wrapper = mountPanel();
        rows(wrapper)[0].vm.$emit('toggle-select', 1, true);
        await wrapper.vm.$nextTick();
        expect(wrapper.find('.selection-bar').text()).toContain('1 selected');
    });

    it('clears the selection on demand', async () => {
        const wrapper = mountPanel();
        rows(wrapper)[0].vm.$emit('toggle-select', 1, true);
        await wrapper.vm.$nextTick();

        wrapper.findComponent({ name: 'FindingsToolbar' }).vm.$emit('clear');
        await wrapper.vm.$nextTick();
        expect(wrapper.find('.selection-bar').text()).toContain('0 selected');
    });

    it('drops a selected finding when its facet is filtered out of view', async () => {
        const wrapper = mountPanel({ activeFacetTypes: new Set(['people', 'places']) });
        rows(wrapper)[0].vm.$emit('toggle-select', 1, true);
        await wrapper.vm.$nextTick();
        expect(wrapper.find('.selection-bar').text()).toContain('1 selected');

        await wrapper.setProps({ activeFacetTypes: new Set(['places']) });
        expect(wrapper.find('.selection-bar').text()).toContain('0 selected');
    });

    it('drops a selected finding that has left the payload', async () => {
        const wrapper = mountPanel();
        rows(wrapper)[0].vm.$emit('toggle-select', 1, true);
        await wrapper.vm.$nextTick();

        // What a merge looks like from here: the absorbed context is simply gone.
        await wrapper.setProps({ facets: { ...facets, people: [context(2, 'Lovelace')] } });
        expect(wrapper.find('.selection-bar').text()).toContain('0 selected');
    });

    it('refuses a merge across facets, naming both facets', async () => {
        const wrapper = mountPanel();
        rows(wrapper)[0].vm.$emit('toggle-select', 1, true);
        rows(wrapper)[2].vm.$emit('toggle-select', 3, true);
        await wrapper.vm.$nextTick();

        const reason = wrapper.find('.selection-reason').text();
        expect(reason).toContain('People');
        expect(reason).toContain('Places');
    });

    it('offers no add row until a block is in focus', () => {
        const wrapper = mountPanel();
        expect(wrapper.find('.selection-bar').exists()).toBe(true);
        expect(wrapper.find('.add-mention-row').exists()).toBe(false);
    });

    it('grows an add row once a block is in focus', () => {
        const wrapper = mountPanel({ focusedBlock: block('1.p', 'Ada Lovelace wrote the notes.') });
        expect(wrapper.find('.add-mention-row').exists()).toBe(true);
    });

    it('offers the add row to staff only', () => {
        isStaff.value = false;
        const wrapper = mountPanel({ focusedBlock: block('1.p', 'Ada Lovelace wrote the notes.') });
        expect(wrapper.find('.add-mention-row').exists()).toBe(false);
    });

    /**
     * The case the whole second row exists for: with no findings yet there is no grid to
     * hang it under, so it has to live outside the hasFindings guard.
     */
    it('keeps the add row in a section with no findings at all', () => {
        const wrapper = mountPanel({
            facets: {},
            focusedBlock: block('1.p', 'Ada Lovelace wrote the notes.'),
        });
        expect(wrapper.find('.categories-grid').exists()).toBe(false);
        expect(wrapper.find('.add-mention-row').exists()).toBe(true);
        // Nothing to tick, so the selection half of the bar stays out of the way.
        expect(wrapper.find('.selection-bar').exists()).toBe(false);
    });

    it('hands the typed quote and facet to the create dialog', async () => {
        const wrapper = mountPanel({ focusedBlock: block('1.p', 'Ada Lovelace wrote the notes.') });
        wrapper.findComponent({ name: 'FindingsToolbar' }).vm.$emit('add-occurrence', {
            quote: 'Ada Lovelace',
            facet: 'person',
        });
        await wrapper.vm.$nextTick();

        const dialog = wrapper.findComponent({ name: 'NewOccurrenceDialog' });
        expect(dialog.props('open')).toBe(true);
        expect(dialog.props('quote')).toBe('Ada Lovelace');
        expect(dialog.props('facet')).toBe('person');
        // Resolved singular -> plural, so the candidate homes are the People findings.
        expect((dialog.props('contexts') as FindingContext[]).map(c => c.name)).toEqual(['Ada', 'Lovelace']);
    });

    it('offers the toolset the other findings of the same facet as move targets', async () => {
        const wrapper = mountPanel();
        rows(wrapper)[0].vm.$emit('open-toolset');
        await wrapper.vm.$nextTick();

        const toolset = wrapper.findComponent({ name: 'FindingContextToolset' });
        const siblings = toolset.props('siblingContexts') as FindingContext[];
        expect(siblings.map(c => c.name)).toEqual(['Lovelace']);
    });
});
