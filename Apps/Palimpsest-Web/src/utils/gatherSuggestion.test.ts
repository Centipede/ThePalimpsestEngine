import { describe, it, expect } from 'vitest';
import {
    cloneGatherOptions,
    emptyGatherOptions,
    isGatherOptionsEmpty,
    relevantOptions,
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

    it('suggests the mid level for findings that are extracted but not clustered', () => {
        const options = suggest({
            sectionCompleted: { ...completeSection, facet_contexts: ['events', 'people', 'places', 'times'] },
        });

        // Every block already holds its works findings, so the clustering is the only
        // work left and re-running the extraction for it would be waste.
        expect(options.contexts.facets).toEqual(['works']);
        expect(options.content.facets).toEqual([]);
        expect(options.section.facets).toEqual([]);
    });

    it('suggests the content level for a facet that a single block is missing', () => {
        const options = suggest({
            blockCompleteds: [
                { facets: ['people', 'works'], essentials: ['digest'] },
                { facets: ['people'], essentials: ['digest'] },
            ],
        });

        // The extraction has to run, and it clusters what it finds on the way.
        expect(options.content.facets).toEqual(['works']);
        expect(options.contexts.facets).toEqual([]);
    });

    it('keeps the two halves of content-level work apart in one suggestion', () => {
        const options = suggest({
            // people is extracted everywhere but unclustered; works is missing from a block.
            sectionCompleted: { ...completeSection, facet_contexts: ['events', 'places', 'times', 'works'] },
            blockCompleteds: [
                { facets: ['people', 'works'], essentials: ['digest'] },
                { facets: ['people'], essentials: ['digest'] },
            ],
        });

        expect(options.contexts.facets).toEqual(['people']);
        expect(options.content.facets).toEqual(['works']);
    });

    it('keeps the two levels of one facet apart', () => {
        // people is applied at both levels; only its clustering is missing.
        const options = suggest({
            sectionCompleted: { ...completeSection, facet_contexts: ['events', 'places', 'times', 'works'] },
        });

        expect(options.section.facets).toEqual([]);
        expect(options.contexts.facets).toEqual(['people']);
        expect(options.content.facets).toEqual([]);
    });

    it('never suggests a facet outside the scheme for that level', () => {
        const options = suggest({
            sectionCompleted: { facets: [], essentials: [], facet_contexts: [] },
            blockCompleteds: [{ facets: [], essentials: [] }],
        });

        // institutions is section-only, works content-only, people both. Nothing has been
        // extracted, so the content level owns all of it and the mid level nothing.
        expect(options.section.facets).toEqual(['people', 'institutions']);
        expect(options.content.facets).toEqual(['people', 'works']);
        expect(options.contexts.facets).toEqual([]);
    });

    it('treats a manifest written before facet_contexts existed as unclustered', () => {
        const legacy = { facets: ['institutions', 'people'], essentials: ['digest', 'outline'] } as PMCompleted;
        const options = suggest({ sectionCompleted: legacy });

        // The blocks have their findings, so what such a manifest is missing is clustering.
        expect(options.contexts.facets).toEqual(['people', 'works']);
        expect(options.content.facets).toEqual([]);
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
            expect(options.contexts.facets).toEqual([]);
        });
    });

    it('suggests no content work for a section without content blocks', () => {
        const options = suggest({
            sectionCompleted: { facets: [], essentials: [], facet_contexts: [] },
            blockCompleteds: [],
        });

        expect(options.content).toEqual({ essentials: [], facets: [] });
        expect(options.contexts).toEqual({ facets: [] });
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
        copy.contexts.facets.push('extra');

        expect(suggestion.section.facets).not.toContain('extra');
        expect(suggestion.section.essentials).toEqual(['digest', 'outline']);
        expect(suggestion.contexts.facets).not.toContain('extra');
    });
});

describe('isGatherOptionsEmpty', () => {
    it('counts the mid level, so a reclustering is a gather like any other', () => {
        const options = emptyGatherOptions();
        expect(isGatherOptionsEmpty(options)).toBe(true);

        options.contexts.facets.push('people');
        expect(isGatherOptionsEmpty(options)).toBe(false);
    });
});

describe('relevantOptions', () => {
    it('offers every level what the book applies there', () => {
        const options = relevantOptions(expectations);

        expect(options.section.facets).toEqual(['people', 'institutions']);
        expect(options.contexts.facets).toEqual(['people', 'works']);
        expect(options.content.facets).toEqual(['people', 'works']);
    });

    it('offers the section both essentials and the content level only a digest', () => {
        const options = relevantOptions(expectations);

        expect(options.section.essentials).toEqual(['digest', 'outline']);
        expect(options.content.essentials).toEqual(['digest']);
    });

    it('names a facet applied at both levels once per level, never twice in one', () => {
        const options = relevantOptions(expectations);

        expect(options.contexts.facets.filter(f => f === 'people')).toHaveLength(1);
        expect(options.section.facets.filter(f => f === 'people')).toHaveLength(1);
    });

    it('offers nothing the scheme does not apply', () => {
        const options = relevantOptions([expectation(2, 'institutions', { section: true })]);

        // institutions is section-only: the two lower levels have no facet to offer.
        expect(options.section.facets).toEqual(['institutions']);
        expect(options.contexts.facets).toEqual([]);
        expect(options.content.facets).toEqual([]);
    });

    it('offers only the essentials for a book with no facet applications', () => {
        const options = relevantOptions([]);

        expect(options.section).toEqual({ essentials: ['digest', 'outline'], facets: [] });
        expect(options.contexts).toEqual({ facets: [] });
        expect(options.content).toEqual({ essentials: ['digest'], facets: [] });
    });
});
