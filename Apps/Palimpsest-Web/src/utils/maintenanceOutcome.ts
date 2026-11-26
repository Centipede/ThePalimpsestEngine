import type { RemoveRecordsResult } from '../api/maintenance';

/**
 * What a removal did, as a sentence the panel can show.
 *
 * The counts matter beyond reassurance: a facet that still shows groupings after a
 * removal is the expected result of the server sparing the identified ones, and without
 * being told so the admin reads it as a failure. Kept out of the component so the
 * wording can be tested without a DOM.
 */

export interface RemovalOutcome {
    /** A removal that spared something is not a failure, but it is not plain success. */
    variant: 'success' | 'warning';
    text: string;
}

/**
 * Names for the count keys, singular and plural.
 *
 * The server sends every key it knows on every removal, zeroes included, so the keys
 * listed here are the whole of what it reports today. Anything it adds later falls back
 * to its own name, which reads well enough to be worth printing rather than dropping.
 */
const COUNT_LABELS: Record<string, [string, string]> = {
    finding_contexts: ['grouping', 'groupings'],
    // What the reading view calls these everywhere it speaks of them.
    finding_occurrences: ['mention', 'mentions'],
    finding_candidates: ['identity candidate', 'identity candidates'],
    essential_digests: ['digest', 'digests'],
    essential_outlines: ['outline', 'outlines'],
    section_info_records: ['section info record', 'section info records'],
    content_info_records: ['block info record', 'block info records'],
    identified_contexts: ['identified grouping', 'identified groupings'],
};

/** `finding_occurrences` -> `finding occurrence` / `finding occurrences`. */
function fallbackLabel(key: string, count: number): string {
    const words = key.replace(/_/g, ' ');
    if (count === 1) {
        if (words.endsWith('ies')) return `${words.slice(0, -3)}y`;
        if (words.endsWith('s') && !words.endsWith('ss')) return words.slice(0, -1);
    }
    return words;
}

function phrase(key: string, count: number): string {
    const label = COUNT_LABELS[key]?.[count === 1 ? 0 : 1] ?? fallbackLabel(key, count);
    return `${count} ${label}`;
}

/** "a", "a and b", "a, b and c" - the Oxford comma is not the house style here. */
function joinPhrases(parts: string[]): string {
    if (parts.length <= 1) return parts[0] ?? '';
    return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Every non-zero count, in the order the server listed them. Zeroes are not news. */
function countPhrases(counts: Record<string, number> | undefined): string[] {
    return Object.entries(counts ?? {})
        .filter(([, count]) => typeof count === 'number' && count > 0)
        .map(([key, count]) => phrase(key, count));
}

export function describeRemoval(result: RemoveRecordsResult): RemovalOutcome {
    const deleted = countPhrases(result.deleted_counts);
    const preserved = countPhrases(result.preserved_counts);

    const sentences: string[] = [
        deleted.length > 0
            ? `Removed ${joinPhrases(deleted)}.`
            : 'Nothing matched; no records were removed.',
    ];

    if (preserved.length > 0) {
        // Kept short on purpose: this lands in a pane about a fifth of the window wide.
        sentences.push(`Kept ${joinPhrases(preserved)}: that is why groupings remain here.`);
        if ((result.preserved_counts?.identified_contexts ?? 0) > 0) {
            sentences.push('Tick “include identified groupings” to remove those too.');
        }
    }

    return {
        variant: preserved.length > 0 ? 'warning' : 'success',
        text: sentences.join(' '),
    };
}
