// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readonly, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { useFacetsStore } from '../../../stores/facets';
import ConfirmDialog from '../../worktools/ConfirmDialog.vue';
import SectionAdminToolsPanel from './SectionAdminToolsPanel.vue';

/**
 * What the panel sends and what it says back - the two things the mid-level `contexts`
 * group changed. The request body is asserted through a stubbed fetch rather than a
 * stubbed api module, so api/maintenance and api/http are in the path too: the body on
 * the wire is the thing that has to be right.
 */

// useAuth keeps its state at module scope and reads localStorage as the module is
// evaluated, so mocking is the only way to hold a token.
vi.mock('../../../composables/useAuth', () => ({
    useAuth: () => ({
        isStaff: readonly(ref(true)),
        token: readonly(ref<string | null>('test-token')),
        isAuthenticated: readonly(ref(true)),
        login: vi.fn(),
        logout: vi.fn(),
    }),
}));

/** people runs at both levels, institutions at section level only, works at content level only. */
const bookStructure = {
    book: {
        facet_applications_cascaded: [
            { facet: 1, use_section_one: true, use_content_all: true },
            { facet: 2, use_section_one: true, use_content_all: false },
            { facet: 3, use_section_one: false, use_content_all: true },
        ],
    },
} as never;

function sectionData(contexts: Record<string, unknown[]> = {}) {
    return {
        section: { info: null, findings: { contexts } },
        contents: [],
    } as never;
}

let fetchMock: ReturnType<typeof vi.fn>;

function answerWith(body: unknown, ok = true) {
    fetchMock.mockResolvedValue({
        ok,
        status: ok ? 200 : 400,
        json: async () => body,
        text: async () => JSON.stringify(body),
    });
}

beforeAll(() => {
    // Shoelace components observe their own size on connect; jsdom has no ResizeObserver.
    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
    setActivePinia(createPinia());
    useFacetsStore().facetQueries = [
        { id: 1, name: 'People', machine_name_singular: 'person', machine_name_plural: 'people', symbol: 'P' },
        { id: 2, name: 'Institutions', machine_name_singular: 'institution', machine_name_plural: 'institutions', symbol: 'I' },
        { id: 3, name: 'Works', machine_name_singular: 'work', machine_name_plural: 'works', symbol: 'W' },
    ] as never;

    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    answerWith({ status: 'success', deleted_counts: { finding_contexts: 2 } });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function mountPanel(data: unknown = sectionData()) {
    return mount(SectionAdminToolsPanel, {
        props: {
            machineName: 'a-book',
            sectionPath: 'main.ch1',
            bookStructure,
            sectionData: data as never,
        },
        global: {
            config: { compilerOptions: { isCustomElement: (tag: string) => tag.startsWith('sl-') } },
            stubs: { ConfirmDialog: true },
        },
    });
}

type Panel = ReturnType<typeof mountPanel>;

/** One checkbox, addressed the way the panel groups them. */
function box(wrapper: Panel, half: 'gather' | 'delete', level: string, value: string) {
    const halves = wrapper.findAll('sl-details');
    const scope = half === 'gather' ? halves[0] : halves[1];
    const found = scope.find(`[data-level="${level}"] [data-value="${value}"]`);
    expect(found.exists()).toBe(true);
    return found;
}

/**
 * Shoelace is not upgraded under jsdom, so the box's own state is set by hand before the
 * event it would have emitted. For the same reason a boolean prop lands as the string
 * "true" or "false" on the element rather than as a property.
 */
async function tick(target: ReturnType<typeof box>, checked = true) {
    (target.element as unknown as { checked: boolean }).checked = checked;
    await target.trigger('sl-change');
}

function isDisabled(target: ReturnType<typeof box>): boolean {
    return target.attributes('disabled') === 'true';
}

async function press(wrapper: Panel, half: 'gather' | 'delete') {
    const halves = wrapper.findAll('sl-details');
    const scope = half === 'gather' ? halves[0] : halves[1];
    await scope.find('sl-button').trigger('click');
    await flushPromises();
}

function lastBody(): Record<string, never> {
    const [, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    return JSON.parse(init.body);
}

function lastUrl(): string {
    return fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0];
}

describe('SectionAdminToolsPanel', () => {
    it('offers the mid level in both halves', () => {
        const wrapper = mountPanel();
        expect(wrapper.findAll('[data-level="contexts"]')).toHaveLength(2);
        expect(wrapper.findAll('[data-level="section"]')).toHaveLength(2);
        expect(wrapper.findAll('[data-level="content"]')).toHaveLength(2);
    });

    it('lists no essentials at the mid level: there is nothing there of that kind', () => {
        const wrapper = mountPanel();
        const contexts = wrapper.findAll('[data-level="contexts"]')[0];

        expect(contexts.find('[data-value="digest"]').exists()).toBe(false);
        expect(contexts.find('[data-value="people"]').exists()).toBe(true);
    });

    it('removes a grouping without touching the block findings', async () => {
        const wrapper = mountPanel();
        await tick(box(wrapper, 'delete', 'contexts', 'people'));
        await press(wrapper, 'delete');

        expect(lastUrl()).toBe('/testbooks/api/v1/book/a-book/section/main.ch1/maintenance/remove_records');
        expect(lastBody()).toEqual({
            section: { essentials: [], facets: [] },
            contexts: { facets: ['people'], include_identified: false },
            content: { essentials: [], facets: [] },
        });
    });

    it('gathers a grouping without re-running the extraction', async () => {
        const wrapper = mountPanel();
        await tick(box(wrapper, 'gather', 'contexts', 'works'));
        await press(wrapper, 'gather');

        expect(lastUrl()).toBe('/testbooks/api/v1/book/a-book/section/main.ch1/maintenance/job/start_gather_info');
        expect(lastBody().contexts).toEqual({ facets: ['works'] });
        expect(lastBody().content).toEqual({ essentials: [], facets: [] });
        expect(wrapper.emitted('job-started')).toHaveLength(1);
    });

    it('will not fire a removal with nothing ticked', async () => {
        const wrapper = mountPanel();
        const remove = wrapper.findAll('sl-details')[1].find('sl-button');

        expect(isDisabled(remove)).toBe(true);
        await tick(box(wrapper, 'delete', 'contexts', 'people'));
        expect(isDisabled(remove)).toBe(false);
    });

    it('ticks exactly what the book applies at a level when All is pressed', async () => {
        const wrapper = mountPanel();
        const contexts = wrapper.findAll('[data-level="contexts"]')[1];
        await contexts.find('.portal-group-all').trigger('sl-change');
        await press(wrapper, 'delete');

        // people and works are applied at content level; institutions is section-only.
        expect(lastBody().contexts).toEqual({ facets: ['people', 'works'], include_identified: false });
        expect(lastBody().section).toEqual({ essentials: [], facets: [] });
    });

    it('clears the level when All is pressed again', async () => {
        const wrapper = mountPanel();
        const contexts = wrapper.findAll('[data-level="contexts"]')[1];
        await contexts.find('.portal-group-all').trigger('sl-change');
        await contexts.find('.portal-group-all').trigger('sl-change');

        expect(isDisabled(wrapper.findAll('sl-details')[1].find('sl-button'))).toBe(true);
    });

    it('offers no All at a level the book applies nothing to', () => {
        const wrapper = mount(SectionAdminToolsPanel, {
            props: {
                machineName: 'a-book',
                sectionPath: 'main.ch1',
                bookStructure: { book: { facet_applications_cascaded: [] } } as never,
                sectionData: sectionData(),
            },
            global: {
                config: { compilerOptions: { isCustomElement: (tag: string) => tag.startsWith('sl-') } },
                stubs: { ConfirmDialog: true },
            },
        });

        const contexts = wrapper.findAll('[data-level="contexts"]')[1];
        expect(isDisabled(contexts.find('.portal-group-all'))).toBe(true);
    });

    it('asks before taking a human’s own work, and not before anything else', async () => {
        const wrapper = mountPanel();
        const dialog = () => wrapper.findComponent(ConfirmDialog);

        await tick(box(wrapper, 'delete', 'contexts', 'people'));
        await press(wrapper, 'delete');
        expect(dialog().props('open')).toBe(false);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        await tick(box(wrapper, 'delete', 'contexts', 'people'));
        await tick(wrapper.findAll('[data-level="contexts"]')[1].find('.portal-checkbox-grave'));
        await press(wrapper, 'delete');

        expect(dialog().props('open')).toBe(true);
        // Nothing has gone to the server yet; the dialog's own button sends it.
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('sends include_identified once the dialog is confirmed', async () => {
        const wrapper = mountPanel();
        await tick(box(wrapper, 'delete', 'contexts', 'people'));
        await tick(wrapper.findAll('[data-level="contexts"]')[1].find('.portal-checkbox-grave'));
        await press(wrapper, 'delete');

        wrapper.findComponent(ConfirmDialog).vm.$emit('confirm');
        await flushPromises();

        expect(lastBody().contexts).toEqual({ facets: ['people'], include_identified: true });
        expect(wrapper.emitted('records-removed')).toHaveLength(1);
    });

    it('says what a removal did', async () => {
        const wrapper = mountPanel();
        await tick(box(wrapper, 'delete', 'contexts', 'people'));
        await press(wrapper, 'delete');

        const alerts = wrapper.findAll('sl-alert').map(a => a.text());
        expect(alerts.some(text => text.includes('Removed 2 groupings.'))).toBe(true);
    });

    it('reports what the server spared as a caveat, not a failure', async () => {
        answerWith({
            status: 'success',
            deleted_counts: { finding_contexts: 4 },
            preserved_counts: { identified_contexts: 3 },
        });

        const wrapper = mountPanel();
        await tick(box(wrapper, 'delete', 'contexts', 'people'));
        await press(wrapper, 'delete');

        const alert = wrapper.findAll('sl-alert').find(a => a.text().includes('Kept 3 identified groupings'));
        expect(alert).toBeDefined();
        expect(alert!.attributes('variant')).toBe('warning');
    });

    it('shows a refused gather in its own half of the panel', async () => {
        // The maintenance endpoints answer `{ status, message }` rather than DRF's own
        // `detail`, and a gather with nothing to plan is a 400 the admin should read.
        answerWith({ status: 'error', message: 'No phases planned based on requirements' }, false);

        const wrapper = mountPanel();
        await tick(box(wrapper, 'gather', 'contexts', 'people'));
        await press(wrapper, 'gather');

        const alerts = wrapper.findAll('sl-alert').map(a => a.text());
        expect(alerts.some(text => text.includes('No phases planned based on requirements'))).toBe(true);
        expect(wrapper.emitted('job-started')).toBeUndefined();
    });

    it('shows the server’s own explanation of a refusal', async () => {
        answerWith({ error: 'That section is locked.' }, false);

        const wrapper = mountPanel();
        await tick(box(wrapper, 'delete', 'contexts', 'people'));
        await press(wrapper, 'delete');

        const alerts = wrapper.findAll('sl-alert').map(a => a.text());
        expect(alerts.some(text => text.includes('That section is locked.'))).toBe(true);
        expect(wrapper.emitted('records-removed')).toBeUndefined();
    });
});
