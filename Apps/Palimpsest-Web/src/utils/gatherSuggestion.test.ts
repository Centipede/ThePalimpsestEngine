import { describe, it, expect } from 'vitest';
import {
    cloneGatherOptions,
    emptyGatherOptions,
    isGatherOptionsEmpty,
    suggestGatherOptions,
    type GatherSuggestionInput,
} from './gatherSuggestion';
import type { FacetExpectation } from '../composables/useFacetExpectations';
import type { FacetQuery, PMCompleted } from '../types/library';

function expectation(id: number, plural: string, levels: { section?: boolean, contexts?: boolean }): FacetExpectation {
    return {
        facet: { id, machine_name_plural: plural, machine_name_singular: plural.slice(0, -1) } as FacetQuery,
        expectsSection: levels.section ?? false,
        expectsContexts: levels.contexts ?? false,
    };
}

// people runs at both levels, institutions at section level only, works at content level
// only. A segment-only facet never reaches here: useFacetExpectations drops it.
const expectations: FacetExpectation[] = [
    expectation(1, 'people', { section: true, contexts: true }),
    expectation(2, 'institutions', { section: true }),
    expectation(3, 'works', { contexts: true }),
];

/** A manifest of a section where every facet has run at every level it is applied at. */
const completeSection: PMCompleted = {
    facets: ['events', 'institutions', 'people', 'places', 'times'],
    essentials: ['digest', 'outline'],
    facet_contexts: ['events', 'people', 'places', 'times', 'works'],
};

/** Blocks whose findings cover both content-applied facets, and that have digests. */
const completeBlocks: PMCompleted[] = [
    { facets: ['people', 'works'], essentials: ['digest'] },
    { facets: ['people', 'works'], essentials: ['digest'] },
];

function suggest(overrides: Partial<GatherSuggestionInput> = {}) {
    return suggestGatherOptions({
        expectations,
        sectionCompleted: completeSection,
        blockCompleteds: completeBlocks,
        ...overrides,
    });
}

describe('suggestGatherOptions', () => {
    it('suggests nothing for a fully processed section', () => {
        expect(suggest()).toEqual(emptyGatherOptions());
        expect(isGatherOptionsEmpty(suggest())).toBe(true);
    });

    it('suggests a section-level facet that is missing from PMCompleted.facets', () => {
        const options = suggest({
            sectionCompleted: { ...completeSection, facets: ['events', 'people', 'places', 'times'] },
        });

        expect(options.section.facets).toEqual(['institutions']);
        expect(options.content.facets).toEqual([]);
    });

    it('suggests a content-level facet whose findings are not clustered', () => {
        const options = suggest({
            sectionCompleted: { ...completeSection, facet_contexts: ['events', 'people', 'places', 'times'] },
        });

        expect(options.content.facets).toEqual(['works']);
        expect(options.section.facets).toEqual([]);
    });

    it('suggests a content-level facet that a single block is missing', () => {
        const options = suggest({
            blockCompleteds: [
                { facets: ['people', 'works'], essentials: ['digest'] },
                { facets: ['people'], essentials: ['digest'] },
            ],
        });

        expect(options.content.facets).toEqual(['works']);
    });

    it('keeps the two levels of one facet apart', () => {
        // people is applied at both levels; only its clustering is missing.
        const options = suggest({
            sectionCompleted: { ...completeSection, facet_contexts: ['events', 'places', 'times', 'works'] },
        });

        expect(options.section.facets).toEqual([]);
        expect(options.content.facets).toEqual(['people']);
    });

    it('never suggests a facet outside the scheme for that level', () => {
        const options = suggest({
            sectionCompleted: { facets: [], essentials: [], facet_contexts: [] },
            blockCompleteds: [{ facets: [], essentials: [] }],
        });

        // institutions is section-only, works content-only, people both.
        expect(options.section.facets).toEqual(['people', 'institutions']);
        expect(options.content.facets).toEqual(['people', 'works']);
    });

    it('treats a manifest written before facet_contexts existed as unclustered', () => {
        const legacy = { facets: ['institutions', 'people'], essentials: ['digest', 'outline'] } as PMCompleted;
        const options = suggest({ sectionCompleted: legacy });

        expect(options.content.facets).toEqual(['people', 'works']);
        expect(options.section.facets).toEqual([]);
    });

    describe('essentials', () => {
        it('suggests the section essentials the manifest lacks', () => {
            expect(suggest({ sectionCompleted: { ...completeSection, essentials: ['digest'] } }).section.essentials)
                .toEqual(['outline']);
            expect(suggest({ sectionCompleted: { ...completeSection, essentials: [] } }).section.essentials)
                .toEqual(['digest', 'outline']);
        });

        it('suggests a content digest when a block lacks one', () => {
            const options = suggest({
                blockCompleteds: [
                    { facets: ['people', 'works'], essentials: ['digest'] },
                    { facets: ['people', 'works'], essentials: [] },
                ],
            });

            expect(options.content.essentials).toEqual(['digest']);
        });

        it('suggests a content digest when no block has been processed yet', () => {
            expect(suggest({ blockCompleteds: [undefined, null] }).content.essentials).toEqual(['digest']);
        });

        it('never suggests a content outline, which is not implemented yet', () => {
            const options = suggest({
                sectionCompleted: { facets: [], essentials: [], facet_contexts: [] },
                blockCompleteds: [{ facets: [], essentials: [] }],
            });

            expect(options.content.essentials).toEqual(['digest']);
        });
    });

    describe('blocks that carry no manifest', () => {
        it('ignores them, since a non-content block never gets one', () => {
            const options = suggest({
                blockCompleteds: [...completeBlocks, undefined],
            });

            expect(options).toEqual(emptyGatherOptions());
        });

        it('suggests content work when blocks exist but none are processed', () => {
            const options = suggest({ blockCompleteds: [undefined, undefined] });

            expect(options.content.essentials).toEqual(['digest']);
            expect(options.content.facets).toEqual(['people', 'works']);
        });
    });

    it('suggests no content work for a section without content blocks', () => {
        const options = suggest({
            sectionCompleted: { facets: [], essentials: [], facet_contexts: [] },
            blockCompleteds: [],
        });

        expect(options.content).toEqual({ essentials: [], facets: [] });
        expect(options.section.essentials).toEqual(['digest', 'outline']);
    });

    it('suggests only essentials for a book with no facet applications', () => {
        const options = suggest({
            expectations: [],
            sectionCompleted: { facets: [], essentials: ['digest', 'outline'] },
        });

        expect(options).toEqual(emptyGatherOptions());
    });

    it('survives a section with no manifest at all', () => {
        const options = suggest({ sectionCompleted: null, blockCompleteds: [] });

        expect(options.section.essentials).toEqual(['digest', 'outline']);
        expect(options.section.facets).toEqual(['people', 'institutions']);
    });
});

describe('cloneGatherOptions', () => {
    it('copies the arrays, so the panel cannot mutate a suggestion in place', () => {
        const suggestion = suggest({ sectionCompleted: { facets: [], essentials: [] } });
        const copy = cloneGatherOptions(suggestion);
        copy.section.facets.push('extra');
        copy.section.essentials.pop();

        expect(suggestion.section.facets).not.toContain('extra');
        expect(suggestion.section.essentials).toEqual(['digest', 'outline']);
    });
});
