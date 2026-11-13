import type { FacetExpectation } from '../composables/useFacetExpectations';
import type { PMCompleted } from '../types/library';

export interface GatherGroup {
    essentials: string[];
    facets: string[];
}

/** The body the start_gather_info endpoint takes: what to run, per level. */
export interface GatherOptions {
    section: GatherGroup;
    content: GatherGroup;
}

export function emptyGatherOptions(): GatherOptions {
    return {
        section: { essentials: [], facets: [] },
        content: { essentials: [], facets: [] },
    };
}

/**
 * The toggle handlers mutate the arrays in place, so a suggestion has to be copied
 * before it is handed to the panel.
 */
export function cloneGatherOptions(options: GatherOptions): GatherOptions {
    return {
        section: { essentials: [...options.section.essentials], facets: [...options.section.facets] },
        content: { essentials: [...options.content.essentials], facets: [...options.content.facets] },
    };
}

export interface GatherSuggestionInput {
    /** The book's facet applications, resolved by useFacetExpectations. */
    expectations: FacetExpectation[];
    /** The section's own manifest. */
    sectionCompleted: PMCompleted | null | undefined;
    /** One entry per content block of the section, in payload order. */
    blockCompleteds: (PMCompleted | null | undefined)[];
}

/**
 * What this section still owes, as the Gather Info panel's checkbox state.
 *
 * The application scheme says which facets run at which level; the manifests say what
 * has already been done. Suggesting the difference means nothing checked == nothing
 * left to do, and the admin is never asked to re-derive the scheme by hand.
 *
 * Facets outside the scheme for a level are never suggested, though the panel still
 * lists them: gathering a facet at a level it is not applied at stays possible as a
 * deliberate act.
 */
export function suggestGatherOptions(input: GatherSuggestionInput): GatherOptions {
    const { expectations, sectionCompleted, blockCompleteds } = input;

    const sectionEssentials = sectionCompleted?.essentials ?? [];
    const sectionFacets = sectionCompleted?.facets ?? [];
    // Optional: a manifest written before the field existed omits it.
    const sectionContexts = sectionCompleted?.facet_contexts ?? [];

    // Only blocks the pipeline has touched carry a manifest. A heading or other
    // non-content block never gets one, and nothing in the payload distinguishes the
    // two: content_type's values are unknown to the frontend, and the section's
    // first_real_content / last_real_content are ids that ContentBlock does not carry.
    // Ignoring manifest-less blocks is therefore the only safe reading. The cost is
    // that an interrupted run can leave content-level work looking done.
    const knownBlocks = blockCompleteds.filter((c): c is PMCompleted => !!c);
    // A section with no content blocks at all is owed no content-level work. Keep that
    // apart from a section whose blocks exist but have not been processed yet.
    const hasBlocks = blockCompleteds.length > 0;
    const nothingProcessed = hasBlocks && knownBlocks.length === 0;

    const options = emptyGatherOptions();

    // Essentials have no application scheme to read: EssentialApplication exists in the
    // types but is never fetched, and is meant for a future with many more essentials.
    // Section carries both; content carries digest only, since BlockEssentials.outline
    // is still marked for future use.
    for (const key of ['digest', 'outline']) {
        if (!sectionEssentials.includes(key)) options.section.essentials.push(key);
    }
    if (hasBlocks && (nothingProcessed || knownBlocks.some(c => !(c.essentials ?? []).includes('digest')))) {
        options.content.essentials.push('digest');
    }

    for (const exp of expectations) {
        const plural = exp.facet.machine_name_plural;

        if (exp.expectsSection && !sectionFacets.includes(plural)) {
            options.section.facets.push(plural);
        }

        // Content-level work spans two records: the per-block findings in each block's
        // own manifest, and the clustering of those into FindingContexts, which only
        // the section records. Either one missing leaves work to do.
        if (exp.expectsContexts && hasBlocks) {
            const clustered = sectionContexts.includes(plural);
            const foundInEveryBlock =
                !nothingProcessed && knownBlocks.every(c => (c.facets ?? []).includes(plural));
            if (!clustered || !foundInEveryBlock) {
                options.content.facets.push(plural);
            }
        }
    }

    return options;
}

/** True when a gather would do nothing. */
export function isGatherOptionsEmpty(options: GatherOptions): boolean {
    return (
        options.section.essentials.length === 0 &&
        options.section.facets.length === 0 &&
        options.content.essentials.length === 0 &&
        options.content.facets.length === 0
    );
}
