import { describe, it, expect } from 'vitest';
import {
    canMerge,
    canMoveOccurrences,
    canRemoveContext,
    canRemoveSelection,
    canSplit,
    identityQid,
    isIdentified,
    mergeCandidateKeepIds,
    mergeTarget,
    suggestMergedName,
    visibleSelection,
    type SelectedContext,
} from './findingEligibility';
import type { FindingContext, FindingOccurrence, FoundIdentity } from '../types/library';

/** An occurrence carrying only what the rules look at: its id. */
function occurrence(id: number): FindingOccurrence {
    return {
        id,
        name: `mention ${id}`,
        description: '',
        quote: `quote ${id}`,
        in_block_pi: '1.p',
        on_page: null,
        of_context: null,
        extracted_data: null,
    };
}

function identity(qid: string, name = `Identity ${qid}`): FoundIdentity {
    return {
        id: Number(qid.slice(1)),
        of_facet: null,
        wikidata_qid: qid,
        wikipedia_url: null,
        wikimedia_url: null,
        name,
        properties: null,
        articles: [],
    };
}

function context(
    id: number,
    opts: { name?: string; qid?: string; identityName?: string; occurrences?: number } = {},
): FindingContext {
    const count = opts.occurrences ?? 2;
    return {
        id,
        name: opts.name ?? `Context ${id}`,
        of_identity: opts.qid ? identity(opts.qid, opts.identityName) : null,
        // Occurrence ids are namespaced by context so a "foreign id" case is easy to build.
        occurrences: Array.from({ length: count }, (_, i) => occurrence(id * 100 + i)),
    };
}

/** A context as the grid rendered it: in a named facet column. */
function sel(c: FindingContext, facetKey = 'people'): SelectedContext {
    return { context: c, facetKey };
}

const label = (key: string) => ({ people: 'People', places: 'Places', works: 'Works' }[key] ?? key);

describe('isIdentified / identityQid', () => {
    it('reads the identity binding', () => {
        expect(isIdentified(context(1))).toBe(false);
        expect(identityQid(context(1))).toBeNull();
        expect(isIdentified(context(1, { qid: 'Q7251' }))).toBe(true);
        expect(identityQid(context(1, { qid: 'Q7251' }))).toBe('Q7251');
    });
});

describe('canMerge', () => {
    it('refuses an empty selection', () => {
        expect(canMerge([])).toMatchObject({ ok: false });
        expect(canMerge([]).reason).toContain('at least two');
    });

    it('refuses a single selection', () => {
        expect(canMerge([sel(context(1))]).ok).toBe(false);
    });

    it('allows two unidentified contexts in the same facet', () => {
        expect(canMerge([sel(context(1)), sel(context(2))])).toEqual({ ok: true, reason: '' });
    });

    it('refuses a selection spanning two facets, naming both', () => {
        const check = canMerge([sel(context(1), 'people'), sel(context(2), 'places')], label);
        expect(check.ok).toBe(false);
        expect(check.reason).toContain('People');
        expect(check.reason).toContain('Places');
    });

    it('refuses when only one of three sits in another facet', () => {
        const check = canMerge([
            sel(context(1), 'people'),
            sel(context(2), 'people'),
            sel(context(3), 'works'),
        ], label);
        expect(check.ok).toBe(false);
        expect(check.reason).toContain('Works');
    });

    it('falls back to raw facet keys when no label function is given', () => {
        const check = canMerge([sel(context(1), 'people'), sel(context(2), 'places')]);
        expect(check.reason).toContain('people');
        expect(check.reason).toContain('places');
    });

    it('allows one identified plus unidentified contexts', () => {
        expect(canMerge([sel(context(1, { qid: 'Q7251' })), sel(context(2))]).ok).toBe(true);
    });

    it('allows two contexts identified to the SAME qid', () => {
        const check = canMerge([
            sel(context(1, { qid: 'Q7251' })),
            sel(context(2, { qid: 'Q7251' })),
        ]);
        expect(check.ok).toBe(true);
    });

    it('refuses two contexts identified to DIFFERENT qids, naming both', () => {
        const check = canMerge([
            sel(context(1, { qid: 'Q7251' })),
            sel(context(2, { qid: 'Q937' })),
        ]);
        expect(check.ok).toBe(false);
        expect(check.reason).toContain('Q7251');
        expect(check.reason).toContain('Q937');
    });

    it('refuses three identified contexts when one qid differs', () => {
        const check = canMerge([
            sel(context(1, { qid: 'Q7251' })),
            sel(context(2, { qid: 'Q7251' })),
            sel(context(3, { qid: 'Q937' })),
        ]);
        expect(check.ok).toBe(false);
    });

    it('still allows a context that has no occurrences at all', () => {
        expect(canMerge([sel(context(1, { occurrences: 0 })), sel(context(2))]).ok).toBe(true);
    });

    it('checks the facet span before the identity conflict', () => {
        // Both rules broken; the facet message is the more actionable one.
        const check = canMerge([
            sel(context(1, { qid: 'Q7251' }), 'people'),
            sel(context(2, { qid: 'Q937' }), 'places'),
        ], label);
        expect(check.reason).toContain('spans');
    });
});

describe('mergeTarget / mergeCandidateKeepIds', () => {
    it('forces the single identified context as survivor', () => {
        const identified = context(1, { qid: 'Q7251' });
        const selection = [sel(identified), sel(context(2))];
        expect(mergeTarget(selection)?.id).toBe(1);
        expect(mergeCandidateKeepIds(selection)).toEqual([1]);
    });

    it('leaves the choice open when nothing is identified', () => {
        const selection = [sel(context(1)), sel(context(2))];
        expect(mergeTarget(selection)).toBeNull();
        expect(mergeCandidateKeepIds(selection)).toEqual([1, 2]);
    });

    it('leaves the choice open between two same-qid identities, but only those two', () => {
        const selection = [
            sel(context(1, { qid: 'Q7251' })),
            sel(context(2, { qid: 'Q7251' })),
            sel(context(3)),
        ];
        expect(mergeTarget(selection)).toBeNull();
        expect(mergeCandidateKeepIds(selection)).toEqual([1, 2]);
    });
});

describe('suggestMergedName', () => {
    it('prefers the identity name over the context name', () => {
        const selection = [sel(context(1, { name: 'Freddy', qid: 'Q7251', identityName: 'Frederick II' }))];
        expect(suggestMergedName(selection, 1)).toBe('Frederick II');
    });

    it('uses the context name when unidentified', () => {
        expect(suggestMergedName([sel(context(1, { name: 'Freddy' }))], 1)).toBe('Freddy');
    });

    it('falls back to the first selection for an unknown keepId', () => {
        expect(suggestMergedName([sel(context(1, { name: 'Freddy' }))], 99)).toBe('Freddy');
    });

    it('returns an empty string for an empty selection rather than throwing', () => {
        expect(suggestMergedName([], 1)).toBe('');
    });
});

describe('canRemoveContext', () => {
    it('refuses an identified context, naming the identity and the qid', () => {
        const check = canRemoveContext(context(1, { name: 'Caesar', qid: 'Q1048', identityName: 'Julius Caesar' }));
        expect(check.ok).toBe(false);
        expect(check.reason).toContain('Caesar');
        expect(check.reason).toContain('Q1048');
        expect(check.reason).toContain('Unlink');
    });

    it('allows an unidentified context', () => {
        expect(canRemoveContext(context(1)).ok).toBe(true);
    });

    it('allows an unidentified context with no occurrences', () => {
        expect(canRemoveContext(context(1, { occurrences: 0 })).ok).toBe(true);
    });
});

describe('canRemoveSelection', () => {
    it('refuses an empty selection', () => {
        expect(canRemoveSelection([]).reason).toBe('Nothing selected.');
    });

    it('allows an all-unidentified selection spanning facets', () => {
        expect(canRemoveSelection([
            sel(context(1), 'people'),
            sel(context(2), 'places'),
        ]).ok).toBe(true);
    });

    it('defers to the single-context message when exactly one is identified', () => {
        const check = canRemoveSelection([sel(context(1, { name: 'Caesar', qid: 'Q1048' })), sel(context(2))]);
        expect(check.ok).toBe(false);
        expect(check.reason).toContain('Caesar');
    });

    it('counts the identified ones when several are', () => {
        const check = canRemoveSelection([
            sel(context(1, { qid: 'Q1048' })),
            sel(context(2, { qid: 'Q937' })),
            sel(context(3)),
        ]);
        expect(check.ok).toBe(false);
        expect(check.reason).toContain('2 of the selected');
    });
});

describe('canSplit', () => {
    it('refuses an identified context', () => {
        const check = canSplit({ context: context(1, { qid: 'Q7251', occurrences: 3 }), occurrenceIds: [100] });
        expect(check.ok).toBe(false);
        expect(check.reason).toContain('Unlink');
    });

    it('refuses a context with a single mention', () => {
        const check = canSplit({ context: context(1, { occurrences: 1 }), occurrenceIds: [100] });
        expect(check.ok).toBe(false);
        expect(check.reason).toContain('single mention');
    });

    it('refuses when nothing is ticked', () => {
        expect(canSplit({ context: context(1, { occurrences: 3 }), occurrenceIds: [] }).ok).toBe(false);
    });

    it('refuses an occurrence that belongs to another finding', () => {
        const check = canSplit({ context: context(1, { occurrences: 3 }), occurrenceIds: [100, 999] });
        expect(check.ok).toBe(false);
        expect(check.reason).toContain('does not belong');
    });

    it('allows a genuine subset with no warning', () => {
        const check = canSplit({ context: context(1, { occurrences: 5 }), occurrenceIds: [100, 101] });
        expect(check).toEqual({ ok: true, reason: '' });
    });

    it('allows all-but-one', () => {
        const check = canSplit({ context: context(1, { occurrences: 3 }), occurrenceIds: [100, 101] });
        expect(check.ok).toBe(true);
        expect(check.warning).toBeUndefined();
    });

    it('allows every mention, but warns that the original disappears', () => {
        const check = canSplit({
            context: context(1, { name: 'Ada', occurrences: 2 }),
            occurrenceIds: [100, 101],
        });
        expect(check.ok).toBe(true);
        expect(check.warning).toContain('Ada');
        expect(check.warning).toContain('deleted');
    });

    it('checks the identity before the mention count', () => {
        const check = canSplit({ context: context(1, { qid: 'Q7251', occurrences: 1 }), occurrenceIds: [] });
        expect(check.reason).toContain('Unlink');
    });
});

describe('canMoveOccurrences', () => {
    const from = context(1, { name: 'Lovelace', occurrences: 3 });

    it('refuses when nothing is ticked', () => {
        expect(canMoveOccurrences({ from, to: context(2), occurrenceIds: [] }).ok).toBe(false);
    });

    it('refuses without a target', () => {
        const check = canMoveOccurrences({ from, to: null, occurrenceIds: [100] });
        expect(check.ok).toBe(false);
        expect(check.reason).toContain('Pick the finding');
    });

    it('refuses moving into the same finding', () => {
        const check = canMoveOccurrences({ from, to: from, occurrenceIds: [100] });
        expect(check.ok).toBe(false);
        expect(check.reason).toContain('already in');
    });

    it('refuses an occurrence that belongs to another finding', () => {
        const check = canMoveOccurrences({ from, to: context(2), occurrenceIds: [999] });
        expect(check.ok).toBe(false);
        expect(check.reason).toContain('does not belong');
    });

    it('allows unidentified -> identified', () => {
        expect(canMoveOccurrences({
            from, to: context(2, { qid: 'Q7251' }), occurrenceIds: [100],
        }).ok).toBe(true);
    });

    it('allows identified -> identified', () => {
        const identifiedFrom = context(1, { qid: 'Q7251', occurrences: 3 });
        expect(canMoveOccurrences({
            from: identifiedFrom, to: context(2, { qid: 'Q937' }), occurrenceIds: [100],
        }).ok).toBe(true);
    });

    it('allows identified -> unidentified', () => {
        const identifiedFrom = context(1, { qid: 'Q7251', occurrences: 3 });
        expect(canMoveOccurrences({
            from: identifiedFrom, to: context(2), occurrenceIds: [100],
        }).ok).toBe(true);
    });

    it('allows a subset with no warning', () => {
        const check = canMoveOccurrences({ from, to: context(2), occurrenceIds: [100, 101] });
        expect(check).toEqual({ ok: true, reason: '' });
    });

    it('allows moving every mention out, but warns the source is deleted', () => {
        const check = canMoveOccurrences({ from, to: context(2), occurrenceIds: [100, 101, 102] });
        expect(check.ok).toBe(true);
        expect(check.warning).toContain('Lovelace');
        expect(check.warning).toContain('deleted');
    });
});

describe('visibleSelection', () => {
    it('drops ids that are no longer in the payload', () => {
        const kept = visibleSelection(new Set([1, 2]), [sel(context(1))]);
        expect([...kept]).toEqual([1]);
    });

    it('drops ids whose facet column has been filtered out', () => {
        // The caller feeds it the already-filtered grid, so a hidden column is simply absent.
        const kept = visibleSelection(new Set([1, 2]), [sel(context(2), 'places')]);
        expect([...kept]).toEqual([2]);
    });

    it('returns an empty set for an empty selection', () => {
        expect(visibleSelection(new Set(), [sel(context(1))]).size).toBe(0);
    });

    it('keeps everything when there is nothing to prune', () => {
        const kept = visibleSelection(new Set([1, 2]), [sel(context(1)), sel(context(2))]);
        expect([...kept].sort()).toEqual([1, 2]);
    });

    it('returns a new set rather than mutating the one it was given', () => {
        const original = new Set([1, 2]);
        const kept = visibleSelection(original, [sel(context(1))]);
        expect(original.size).toBe(2);
        expect(kept).not.toBe(original);
    });
});
