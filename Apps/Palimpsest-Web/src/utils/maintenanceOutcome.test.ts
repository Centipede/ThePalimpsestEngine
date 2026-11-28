import { describe, it, expect } from 'vitest';
import { describeRemoval } from './maintenanceOutcome';

describe('describeRemoval', () => {
    it('names every kind it removed', () => {
        const outcome = describeRemoval({
            status: 'success',
            deleted_counts: { finding_contexts: 42, finding_candidates: 7 },
        });

        expect(outcome.variant).toBe('success');
        expect(outcome.text).toBe('Removed 42 groupings and 7 identity candidates.');
    });

    it('says so when nothing matched', () => {
        const outcome = describeRemoval({ status: 'success', deleted_counts: {} });

        expect(outcome.variant).toBe('success');
        expect(outcome.text).toBe('Nothing matched; no records were removed.');
    });

    it('treats a missing count map as nothing removed', () => {
        expect(describeRemoval({}).text).toBe('Nothing matched; no records were removed.');
    });

    it('leaves zeroes out: they are not news', () => {
        const outcome = describeRemoval({
            deleted_counts: { finding_contexts: 3, finding_candidates: 0 },
        });

        expect(outcome.text).toBe('Removed 3 groupings.');
    });

    it('explains a preserved count, and lifts the variant for it', () => {
        const outcome = describeRemoval({
            deleted_counts: { finding_contexts: 42, finding_candidates: 7 },
            preserved_counts: { identified_contexts: 3 },
        });

        expect(outcome.variant).toBe('warning');
        expect(outcome.text).toContain('Removed 42 groupings and 7 identity candidates.');
        expect(outcome.text).toContain('Kept 3 identified groupings');
        expect(outcome.text).toContain('that is why groupings remain here');
        expect(outcome.text).toContain('“include identified groupings”');
    });

    it('reports a removal that spared everything it found', () => {
        const outcome = describeRemoval({
            deleted_counts: { finding_contexts: 0 },
            preserved_counts: { identified_contexts: 1 },
        });

        expect(outcome.variant).toBe('warning');
        expect(outcome.text).toContain('Nothing matched; no records were removed.');
        expect(outcome.text).toContain('Kept 1 identified grouping:');
    });

    it('reads the singular of a known kind', () => {
        const outcome = describeRemoval({
            deleted_counts: { finding_contexts: 1, finding_candidates: 1 },
        });

        expect(outcome.text).toBe('Removed 1 grouping and 1 identity candidate.');
    });

    it('leaves out the zeroes the server sends with every removal', () => {
        // Every key it knows, every time - which is why nothing is read as a flag.
        const outcome = describeRemoval({
            status: 'success',
            deleted_counts: {
                essential_digests: 0,
                essential_outlines: 0,
                section_info_records: 0,
                content_info_records: 0,
                finding_contexts: 5,
                finding_occurrences: 0,
                finding_candidates: 2,
            },
            preserved_counts: { identified_contexts: 0 },
        });

        expect(outcome.variant).toBe('success');
        expect(outcome.text).toBe('Removed 5 groupings and 2 identity candidates.');
    });

    it('prints a count key it has never heard of rather than dropping it', () => {
        const outcome = describeRemoval({
            deleted_counts: { taxonomies: 2, glossary_entries: 1 },
        });

        expect(outcome.text).toBe('Removed 2 taxonomies and 1 glossary entry.');
    });

    it('only offers the include-identified way round when that is what was kept', () => {
        const outcome = describeRemoval({
            deleted_counts: { finding_contexts: 2 },
            preserved_counts: { locked_sections: 1 },
        });

        expect(outcome.variant).toBe('warning');
        expect(outcome.text).toContain('Kept 1 locked section');
        expect(outcome.text).not.toContain('include identified');
    });
});
