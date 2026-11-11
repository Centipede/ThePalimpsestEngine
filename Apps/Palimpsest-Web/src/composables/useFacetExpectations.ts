import { computed } from 'vue';
import type { Book, FacetQuery, PMCompleted } from '../types/library';
import { useFacetsStore } from '../stores/facets';

/**
 * What a single facet owes a section's processing manifest.
 *
 * The two facet lists in PMCompleted are recorded at different levels of the
 * hierarchy, and which one a facet lands in follows from its FacetApplication:
 *
 *   use_content_all                -> PMCompleted.facet_contexts, because the block
 *                                     findings of this section are clustered into
 *                                     FindingContexts (which straddle the
 *                                     section/block boundary)
 *   use_section_one/few/many       -> PMCompleted.facets
 *   both                           -> both
 *   only use_segment_one/few/many  -> neither; segment progress lives in the
 *                                     segment's own manifest (SegmentInfo), so such
 *                                     a facet imposes nothing on the section.
 */
export interface FacetExpectation {
    facet: FacetQuery;
    /** Any use_section_one/few/many application: expected in PMCompleted.facets */
    expectsSection: boolean;
    /** A use_content_all application: expected in PMCompleted.facet_contexts */
    expectsContexts: boolean;
}

export type FacetState = 'none' | 'partial' | 'complete';

/**
 * Derives the per-facet section-level expectations from a book's cascaded facet
 * applications, and checks a section manifest against them.
 *
 * Takes a getter rather than a ref so it fits both a computed book and a prop path.
 */
export function useFacetExpectations(book: () => Book | null | undefined) {
    const facetsStore = useFacetsStore();

    const cascadedApplications = computed(() => book()?.facet_applications_cascaded ?? []);

    /**
     * One entry per distinct facet. A facet can be applied more than once — via the
     * book and via one of its topics — so the flags are OR-ed across applications
     * rather than taken from whichever row happens to come first.
     */
    const expectations = computed<FacetExpectation[]>(() => {
        const byFacetId = new Map<number, FacetExpectation>();

        for (const app of cascadedApplications.value) {
            if (app.facet === null) continue;
            const facet = facetsStore.getFacetById(app.facet);
            if (!facet) continue;

            const existing = byFacetId.get(app.facet);
            const expectsSection = app.use_section_one || app.use_section_few || app.use_section_many;
            const expectsContexts = app.use_content_all;

            if (existing) {
                existing.expectsSection = existing.expectsSection || expectsSection;
                existing.expectsContexts = existing.expectsContexts || expectsContexts;
            } else {
                byFacetId.set(app.facet, { facet, expectsSection, expectsContexts });
            }
        }

        return [...byFacetId.values()]
            .filter(e => e.expectsSection || e.expectsContexts)
            .sort((a, b) => a.facet.id - b.facet.id);
    });

    const sectionLevelFacets = computed(() => expectations.value.filter(e => e.expectsSection));
    const contextLevelFacets = computed(() => expectations.value.filter(e => e.expectsContexts));

    /**
     * False while the facet queries are still in flight: the applications are known
     * but cannot be resolved to facets yet, so every expectation would look satisfied.
     */
    const expectationsKnown = computed(
        () => cascadedApplications.value.length === 0 || facetsStore.facetQueries.length > 0
    );

    function hasSectionFacet(completed: PMCompleted | null | undefined, exp: FacetExpectation) {
        return completed?.facets?.includes(exp.facet.machine_name_plural) ?? false;
    }

    // facet_contexts is optional: a manifest written before the field existed omits it.
    function hasFacetContexts(completed: PMCompleted | null | undefined, exp: FacetExpectation) {
        return completed?.facet_contexts?.includes(exp.facet.machine_name_plural) ?? false;
    }

    function facetState(completed: PMCompleted | null | undefined, exp: FacetExpectation): FacetState {
        const required: boolean[] = [];
        if (exp.expectsSection) required.push(hasSectionFacet(completed, exp));
        if (exp.expectsContexts) required.push(hasFacetContexts(completed, exp));

        if (required.length === 0 || required.every(Boolean)) return 'complete';
        if (required.some(Boolean)) return 'partial';
        return 'none';
    }

    function isFacetOk(completed: PMCompleted | null | undefined, exp: FacetExpectation) {
        return facetState(completed, exp) === 'complete';
    }

    /** True when every facet has delivered everything it owes this section. */
    function allFacetsOk(completed: PMCompleted | null | undefined) {
        if (!expectationsKnown.value) return false;
        return expectations.value.every(exp => isFacetOk(completed, exp));
    }

    return {
        expectations,
        sectionLevelFacets,
        contextLevelFacets,
        expectationsKnown,
        hasSectionFacet,
        hasFacetContexts,
        facetState,
        isFacetOk,
        allFacetsOk,
    };
}
