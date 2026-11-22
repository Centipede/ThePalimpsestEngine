// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import CandidateCountChip from './CandidateCountChip.vue';
import type { CandidateCounts } from '../../../types/identityMatches';

/**
 * The `(3/72)` chip, which has to behave differently for two audiences from one
 * component - and has to disappear entirely for the sections the scan has not reached.
 */

const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/admin/findings', component: { template: '<div />' } },
    ],
});

beforeAll(() => {
    // Shoelace components observe their own size on connect; jsdom has no ResizeObserver.
    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
});

function counts(over: Partial<CandidateCounts> = {}): CandidateCounts {
    return { basis: 'identity', of: 17, compared: 3, triage: 72, ...over };
}

function chip(props: { counts?: CandidateCounts | null; isStaff: boolean }) {
    return mount(CandidateCountChip, {
        props,
        global: {
            plugins: [router],
            config: { compilerOptions: { isCustomElement: (tag: string) => tag.startsWith('sl-') } },
        },
    });
}

describe('CandidateCountChip', () => {
    it('renders nothing when the scan has found nothing', () => {
        // A section the scan has not reached must look exactly as it did before.
        expect(chip({ counts: null, isStaff: true }).text()).toBe('');
        expect(chip({ counts: undefined, isStaff: true }).text()).toBe('');
        expect(chip({ counts: counts({ compared: 0, triage: 0 }), isStaff: true }).text()).toBe('');
    });

    it('shows both figures, the compared one emphasised', () => {
        const wrapper = chip({ counts: counts(), isStaff: false });
        expect(wrapper.text().replace(/\s+/g, '')).toBe('(3/72)');
        expect(wrapper.find('strong').text()).toBe('3');
    });

    it('is a link into the work area for staff', () => {
        const link = chip({ counts: counts(), isStaff: true }).find('a');
        expect(link.exists()).toBe(true);
        expect(link.attributes('href')).toContain('/admin/findings');
        expect(link.attributes('href')).toContain('identity=17');
        expect(link.attributes('href')).toContain('stage=compared');
        expect(link.attributes('target')).toBe('_blank');
        expect(link.attributes('rel')).toContain('noopener');
    });

    it('links to the inverted mode for an unidentified finding', () => {
        const link = chip({ counts: counts({ basis: 'context', of: 501 }), isStaff: true }).find('a');
        expect(link.attributes('href')).toContain('context=501');
        expect(link.attributes('href')).not.toContain('identity=');
    });

    it('asks for both stages when nothing has been close-read yet', () => {
        const link = chip({ counts: counts({ compared: 0 }), isStaff: true }).find('a');
        expect(link.attributes('href')).toContain('stage=triage,compared');
    });

    it('is not a link for an ordinary reader, but says what the numbers mean', () => {
        // There is no endpoint behind "please tie these together", so a pressable chip
        // would be an affordance that does nothing.
        const wrapper = chip({ counts: counts(), isStaff: false });
        expect(wrapper.find('a').exists()).toBe(false);
        const title = wrapper.find('span').attributes('title') ?? '';
        expect(title).toContain('librarian');
        expect(title).toContain('3 strong');
        expect(title).toContain('72 possible');
    });

    it('is not a link even for staff when there is no basis to filter by', () => {
        const wrapper = chip({
            counts: counts({ basis: null as unknown as 'identity' }),
            isStaff: true,
        });
        expect(wrapper.find('a').exists()).toBe(false);
        expect(wrapper.text().replace(/\s+/g, '')).toBe('(3/72)');
    });
});
