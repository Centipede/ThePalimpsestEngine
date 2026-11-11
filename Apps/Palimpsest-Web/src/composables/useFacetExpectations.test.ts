import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFacetExpectations } from './useFacetExpectations';
import { useFacetsStore } from '../stores/facets';
import type { Book, FacetApplication, FacetQuery, PMCompleted } from '../types/library';

// The store pulls in api.ts, which touches localStorage at module scope; nothing here
// fetches, so the transport is stubbed out as in the other store tests.
vi.mock('../api', () => ({
    apiFetch: vi.fn(),
}));

function facet(id: number, plural: string, singular: string): FacetQuery {
    return {
        id,
        name: plural,
        machine_name_singular: singular,
        machine_name_plural: plural,
        symbol: plural[0],
        prose_description: null,
        query_block: null,
        query_section_one: null,
        query_section_few: null,
        query_section_many: null,
        query_data: 'full_text',
        schema_scratchpad: null,
        schema_section_one: null,
        schema_section_few: null,
        schema_section_many: null,
    };
}

function application(facetId: number, flags: Partial<FacetApplication> = {}): FacetApplication {
    return {
        id: facetId * 100,
        facet: facetId,
        book: 1,
        topic: null,
        use_section_one: false,
        use_section_few: false,
        use_section_many: false,
        use_segment_one: false,
        use_segment_few: false,
        use_segment_many: false,
        use_content_all: false,
        render_method: null,
        ...flags,
    };
}

function book(applications: FacetApplication[]): Book {
    return { facet_applications_cascaded: applications } as unknown as Book;
}

// Facet ids used throughout, mirroring a real corpus.
const PEOPLE = 1;        // applied at both levels
const INSTITUTIONS = 2;  // section level only
const WORKS = 3;         // content level only
const THEMES = 4;        // segment level only

beforeEach(() => {
    setActivePinia(createPinia());
    const store = useFacetsStore();
    store.facetQueries = [
        facet(PEOPLE, 'people', 'person'),
        facet(INSTITUTIONS, 'institutions', 'institution'),
        facet(WORKS, 'works', 'work'),
        facet(THEMES, 'themes', 'theme'),
    ];
});

const allLevels = book([
    application(PEOPLE, { use_section_one: true, use_content_all: true }),
    application(INSTITUTIONS, { use_section_few: true }),
    application(WORKS, { use_content_all: true }),
    application(THEMES, { use_segment_one: true }),
]);

describe('useFacetExpectations', () => {
    it('derives the expected level from the application flags', () => {
        const { expectations } = useFacetExpectations(() => allLevels);

        expect(expectations.value.map(e => [e.facet.machine_name_plural, e.expectsSection, e.expectsContexts])).toEqual([
            ['people', true, true],
            ['institutions', true, false],
            ['works', false, true],
        ]);
    });

    it('drops facets that are only applied at segment level', () => {
        const { expectations } = useFacetExpectations(() => allLevels);
        expect(expectations.value.map(e => e.facet.machine_name_plural)).not.toContain('themes');
    });

    it('splits the facets by the level they are expected at', () => {
        const { sectionLevelFacets, contextLevelFacets } = useFacetExpectations(() => allLevels);

        expect(sectionLevelFacets.value.map(e => e.facet.machine_name_plural)).toEqual(['people', 'institutions']);
        expect(contextLevelFacets.value.map(e => e.facet.machine_name_plural)).toEqual(['people', 'works']);
    });

    it('merges repeated applications of one facet instead of listing it twice', () => {
        // The same facet reaching the book once directly and once via a topic.
        const viaBookAndTopic = book([
            application(PEOPLE, { use_section_one: true }),
            { ...application(PEOPLE, { use_content_all: true }), id: 999, book: null, topic: 7 },
        ]);
        const { expectations } = useFacetExpectations(() => viaBookAndTopic);

        expect(expectations.value).toHaveLength(1);
        expect(expectations.value[0].expectsSection).toBe(true);
        expect(expectations.value[0].expectsContexts).toBe(true);
    });

    describe('against the manifest of a real section', () => {
        // institutions ran at section level but has no contexts; works has contexts only.
        const completed: PMCompleted = {
            facets: ['events', 'institutions', 'people', 'places', 'times'],
            essentials: ['digest', 'outline'],
            facet_contexts: ['events', 'people', 'places', 'times', 'works'],
        };

        it('counts a section-level facet as done from PMCompleted.facets alone', () => {
            const { expectations, facetState } = useFacetExpectations(() => allLevels);
            const institutions = expectations.value.find(e => e.facet.machine_name_plural === 'institutions')!;

            expect(facetState(completed, institutions)).toBe('complete');
        });

        it('counts a content-level facet as done from PMCompleted.facet_contexts alone', () => {
            const { expectations, facetState } = useFacetExpectations(() => allLevels);
            const works = expectations.value.find(e => e.facet.machine_name_plural === 'works')!;

            expect(facetState(completed, works)).toBe('complete');
        });

        it('requires both lists for a facet applied at both levels', () => {
            const { expectations, facetState } = useFacetExpectations(() => allLevels);
            const people = expectations.value.find(e => e.facet.machine_name_plural === 'people')!;

            expect(facetState(completed, people)).toBe('complete');
            expect(facetState({ ...completed, facets: ['institutions'] }, people)).toBe('partial');
            expect(facetState({ ...completed, facet_contexts: [] }, people)).toBe('partial');
            expect(facetState({ facets: [], essentials: [], facet_contexts: [] }, people)).toBe('none');
        });

        it('reports the section as findings-complete', () => {
            const { allFacetsOk } = useFacetExpectations(() => allLevels);
            expect(allFacetsOk(completed)).toBe(true);
        });

        it('is not findings-complete when a content-level facet has no contexts', () => {
            const { allFacetsOk } = useFacetExpectations(() => allLevels);
            const withoutWorks = { ...completed, facet_contexts: ['events', 'people', 'places', 'times'] };

            expect(allFacetsOk(withoutWorks)).toBe(false);
        });
    });

    it('treats a manifest written before facet_contexts existed as missing contexts', () => {
        const { expectations, facetState } = useFacetExpectations(() => allLevels);
        const works = expectations.value.find(e => e.facet.machine_name_plural === 'works')!;
        const legacy = { facets: ['institutions', 'works'], essentials: ['digest'] } as PMCompleted;

        expect(facetState(legacy, works)).toBe('none');
    });

    it('withholds a verdict until the facet queries have loaded', () => {
        useFacetsStore().facetQueries = [];
        const { expectationsKnown, allFacetsOk } = useFacetExpectations(() => allLevels);

        expect(expectationsKnown.value).toBe(false);
        // Nothing resolves to a facet yet, so every expectation would look satisfied.
        expect(allFacetsOk({ facets: [], essentials: [], facet_contexts: [] })).toBe(false);
    });

    it('is complete for a book with no facet applications at all', () => {
        const { expectations, expectationsKnown, allFacetsOk } = useFacetExpectations(() => book([]));

        expect(expectations.value).toEqual([]);
        expect(expectationsKnown.value).toBe(true);
        expect(allFacetsOk({ facets: [], essentials: ['digest'] })).toBe(true);
    });

    it('survives a missing book', () => {
        const { expectations, allFacetsOk } = useFacetExpectations(() => undefined);

        expect(expectations.value).toEqual([]);
        expect(allFacetsOk(undefined)).toBe(true);
    });
});
