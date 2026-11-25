import type { FindingContext, FindingOccurrence } from '../types/library';
import type { CandidateBrief, CandidateDetail } from '../types/identityMatches';
import { searchForFragments } from './text';

/**
 * Whether a curation act is allowed, and if not, why - in a sentence meant to be read
 * by the librarian, not by a developer.
 *
 * The server enforces these rules too and returns its own `error`, but a disabled
 * button with a stated reason is a better teacher than a dialog that 400s after the
 * fact. Where the two can disagree (the server also knows the section a context
 * belongs to, which the section payload makes implicit), the server wins and its
 * message is shown.
 */
export interface Eligibility {
    ok: boolean;
    /** Empty when ok. Rendered verbatim beside the disabled control. */
    reason: string;
    /** Set when ok, but the act has a consequence worth stating before confirming. */
    warning?: string;
}

/**
 * A selected context together with the grid column it was rendered in.
 *
 * The facet comes from the FindingContextMap bucket key (a machine_name_plural), not
 * from FindingContext.of_facet: that field is optional on the type and absent in some
 * payloads, so it cannot carry the cross-facet check.
 */
export interface SelectedContext {
    context: FindingContext;
    facetKey: string;
}

const OK: Eligibility = { ok: true, reason: '' };

const no = (reason: string): Eligibility => ({ ok: false, reason });

export function isIdentified(context: FindingContext): boolean {
    return context.of_identity !== null && context.of_identity !== undefined;
}

export function identityQid(context: FindingContext): string | null {
    return context.of_identity?.wikidata_qid ?? null;
}

/** Quoted so a name with its own punctuation still reads as one thing in a sentence. */
function quoted(name: string): string {
    return `“${name}”`;
}

function listPhrase(items: string[]): string {
    if (items.length <= 1) return items[0] ?? '';
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Merging folds every selected context into one.
 *
 * Refused across facets and across conflicting identities, both because the server
 * refuses them and because neither has a sane outcome. Two contexts bound to the SAME
 * Wikidata item are allowed through deliberately: that is the only duplicate the
 * system can actually prove is a duplicate, and refusing it would leave the easiest
 * case the one case the UI cannot fix.
 */
export function canMerge(
    selection: SelectedContext[],
    facetLabel?: (facetKey: string) => string,
): Eligibility {
    if (selection.length < 2) {
        return no('Select at least two findings to merge.');
    }

    const facetKeys = [...new Set(selection.map(s => s.facetKey))];
    if (facetKeys.length > 1) {
        const labels = facetKeys.map(key => facetLabel?.(key) ?? key);
        return no(`Merge needs findings of one kind; this selection spans ${listPhrase(labels)}.`);
    }

    const qids = [...new Set(
        selection.map(s => identityQid(s.context)).filter((q): q is string => q !== null),
    )];
    if (qids.length > 1) {
        return no(
            `Two selected findings are linked to different identities (${listPhrase(qids)}). ` +
            'Unlink one of them first.',
        );
    }

    return OK;
}

/**
 * Which context must survive a merge, or null when the librarian may choose.
 *
 * The server keeps an identified context regardless of which id the request addresses,
 * so when exactly one is identified the UI has no choice to offer and says so by
 * locking its radio. With two identified contexts (necessarily the same QID, or
 * canMerge would have refused) the server's rule is ambiguous, so the choice goes
 * back to the librarian.
 */
export function mergeTarget(selection: SelectedContext[]): FindingContext | null {
    const identified = selection.map(s => s.context).filter(isIdentified);
    return identified.length === 1 ? identified[0] : null;
}

/**
 * The ids the survivor radio may offer.
 *
 * The invariant: if anything in the selection is identified, only identified contexts
 * can survive. Letting an unidentified context win would silently discard an identity
 * binding, which is the most expensive thing in the data model to recreate.
 */
export function mergeCandidateKeepIds(selection: SelectedContext[]): number[] {
    const identified = selection.filter(s => isIdentified(s.context));
    const eligible = identified.length > 0 ? identified : selection;
    return eligible.map(s => s.context.id);
}

/**
 * The name to prefill the merge dialog with. An identity's own name beats whatever the
 * LLM guessed for the context.
 */
export function suggestMergedName(selection: SelectedContext[], keepId: number): string {
    const keep = selection.find(s => s.context.id === keepId)?.context
        ?? selection[0]?.context;
    if (!keep) return '';
    return keep.of_identity?.name || keep.name;
}

/**
 * Removing a context means detaching every occurrence it holds, which leaves the
 * server to delete the emptied context.
 *
 * An identified context is refused. Unlinking is NOT chained in automatically: losing
 * an identity binding as an invisible side effect of pressing Remove is exactly the
 * kind of thing that gets discovered a month later.
 */
export function canRemoveContext(context: FindingContext): Eligibility {
    if (isIdentified(context)) {
        const qid = identityQid(context);
        const identityName = context.of_identity?.name ?? 'an identity';
        return no(
            `${quoted(context.name)} is linked to ${identityName}${qid ? ` (${qid})` : ''}. ` +
            'Unlink it first, then remove.',
        );
    }
    return OK;
}

/** The action bar's Remove. Unlike merge, a cross-facet selection is fine here. */
export function canRemoveSelection(selection: SelectedContext[]): Eligibility {
    if (selection.length === 0) {
        return no('Nothing selected.');
    }

    const identified = selection.filter(s => isIdentified(s.context));
    if (identified.length === 1) {
        return canRemoveContext(identified[0].context);
    }
    if (identified.length > 1) {
        return no(
            `${identified.length} of the selected findings are linked to an identity. ` +
            'Unlink them first.',
        );
    }

    return OK;
}

/**
 * Splitting ticked occurrences off into a new, unidentified context.
 *
 * Ticking every occurrence is allowed, because the server allows it and deletes the
 * emptied source - but it is effectively a rename that changes the context's id, so it
 * warns rather than passing silently.
 */
export function canSplit(input: {
    context: FindingContext;
    occurrenceIds: number[];
}): Eligibility {
    const { context, occurrenceIds } = input;

    if (isIdentified(context)) {
        return no('A linked finding cannot be split. Unlink it first.');
    }
    if (context.occurrences.length < 2) {
        return no('A finding with a single mention cannot be split.');
    }
    if (occurrenceIds.length === 0) {
        return no('Tick the mentions that should move to the new finding.');
    }

    const own = new Set(context.occurrences.map(o => o.id));
    if (occurrenceIds.some(id => !own.has(id))) {
        return no('One of the ticked mentions does not belong to this finding.');
    }

    if (occurrenceIds.length === context.occurrences.length) {
        return {
            ok: true,
            reason: '',
            warning: `This moves every mention out of ${quoted(context.name)}, so that finding ` +
                'will be deleted and replaced by the new one.',
        };
    }

    return OK;
}

/**
 * Moving ticked occurrences into a context that already exists.
 *
 * Identity is deliberately not consulted on either side. A move never destroys an
 * identity, and moving a mention into an identified context is the main thing this
 * tool is for - it is how a mention clustered under the wrong person gets fixed.
 */
export function canMoveOccurrences(input: {
    from: FindingContext;
    to: FindingContext | null;
    occurrenceIds: number[];
}): Eligibility {
    const { from, to, occurrenceIds } = input;

    if (occurrenceIds.length === 0) {
        return no('Tick the mentions to move.');
    }
    if (!to) {
        return no('Pick the finding to move them into.');
    }
    if (to.id === from.id) {
        return no('Those mentions are already in that finding.');
    }

    const own = new Set(from.occurrences.map(o => o.id));
    if (occurrenceIds.some(id => !own.has(id))) {
        return no('One of the ticked mentions does not belong to this finding.');
    }

    if (occurrenceIds.length === from.occurrences.length) {
        return {
            ok: true,
            reason: '',
            warning: `This moves every mention out of ${quoted(from.name)}, so that empty ` +
                'finding will be deleted.',
        };
    }

    return OK;
}

/**
 * Whether the highlighter will be able to paint this quote.
 *
 * Returns the warning sentence, or '' when there is nothing to say. The same fuzzy
 * search the paragraph itself uses decides it, so the answer here and the highlight
 * there cannot disagree. Only a courtesy: the server does its own matching and creates
 * the mention regardless, and its verdict is the authoritative one.
 */
export function quoteWarning(blockText: string, quote: string): string {
    const trimmed = quote.trim();
    if (!trimmed || !blockText) return '';

    // The colour is required by the signature and discarded with the result; nothing
    // from this call is ever rendered.
    if (searchForFragments(blockText, trimmed, 'probe').length > 0) return '';

    return 'Those words are not in this paragraph, so the mention will be saved but ' +
        'nothing will be highlighted.';
}

/**
 * Enough in hand to open the new-mention dialog.
 *
 * Split from canCreateOccurrence because the toolbar collects only these two fields and
 * the dialog collects the rest; one predicate covering both would have to be told which
 * half to judge.
 */
export function canStartOccurrence(input: {
    quote: string;
    facet: string;
    blockText?: string;
}): Eligibility {
    const { quote, facet, blockText } = input;

    if (!quote.trim()) {
        return no('Paste the words from the paragraph that this mention is based on.');
    }
    if (!facet) {
        return no('Pick which kind of finding this is.');
    }

    const warning = quoteWarning(blockText ?? '', quote);
    return warning ? { ok: true, reason: '', warning } : OK;
}

/**
 * Enough in hand to create the mention.
 *
 * The destination is not optional even though the endpoint would accept neither key and
 * file the mention nowhere: a mention created outside a finding is exactly the orphan
 * the rest of this toolset exists to clean up, so the create flow always ends in one.
 */
export function canCreateOccurrence(input: {
    quote: string;
    facet: string;
    name: string;
    blockText?: string;
    contextId: number | null;
    newName: string;
}): Eligibility {
    const { name, contextId, newName } = input;

    const started = canStartOccurrence(input);
    if (!started.ok) return started;

    if (!name.trim()) {
        return no('Give the mention a name - what the paragraph calls it.');
    }
    if (contextId === null && !newName.trim()) {
        return no('Choose the finding this mention belongs to, or name a new one.');
    }

    return started;
}

/**
 * Attaching one mention to a finding - an orphan's first home, or a move.
 *
 * One rule short of canMoveOccurrences on purpose. Being clustered already is not a
 * refusal: `add_occurrences` takes occurrences out of any context, which is what lets a
 * single code path serve both cases here. The facet check only fires when both facets
 * are actually known, since FindingContext.of_facet cannot be relied on and the caller
 * resolves the destination's facet from the bucket it drew the candidates from.
 */
export function canAttachOccurrence(input: {
    occurrence: FindingOccurrence;
    to: FindingContext | null;
    /** The destination's facet, singular, as the caller resolved it. */
    targetFacet?: string | null;
    /** The finding it is leaving, when it has one. Only read for the warning. */
    from?: FindingContext | null;
}): Eligibility {
    const { occurrence, to, targetFacet, from } = input;

    if (!to) {
        return no('Pick the finding to attach this mention to.');
    }
    if (occurrence.of_context === to.id) {
        return no('This mention is already in that finding.');
    }
    if (occurrence.of_facet && targetFacet && occurrence.of_facet !== targetFacet) {
        return no('A mention can only join a finding of its own kind.');
    }

    return lastMentionWarning(occurrence, from) ?? OK;
}

/**
 * Clustering one mention into a brand new finding.
 *
 * Nothing to refuse: a new finding has no facet to clash with and no identity to
 * conflict with, and the server names it after the mention when no name is given. Like
 * canMoveOccurrences it does not consult the source's identity either - emptying a
 * linked finding by moving its last mention is warned about, not forbidden, because the
 * move itself is the thing these tools exist to do.
 */
export function canClusterToNew(input: {
    occurrence: FindingOccurrence;
    /** The finding it is leaving, when it has one. Only read for the warning. */
    from?: FindingContext | null;
}): Eligibility {
    return lastMentionWarning(input.occurrence, input.from) ?? OK;
}

/**
 * Deleting or detaching one mention.
 *
 * Never refused on its own account - it is one record, and the paragraph keeps its text
 * either way. The last mention in a finding is the case worth stating, because the
 * finding goes with it: refused outright when that finding is linked to an identity,
 * for the same reason canRemoveContext refuses it, and in the same words.
 */
export function canDeleteOccurrence(input: {
    occurrence: FindingOccurrence;
    context?: FindingContext | null;
}): Eligibility {
    const { occurrence, context } = input;

    if (isLastMention(occurrence, context)) {
        const removable = canRemoveContext(context!);
        if (!removable.ok) return removable;
    }

    return lastMentionWarning(occurrence, context) ?? OK;
}

function isLastMention(
    occurrence: FindingOccurrence,
    context?: FindingContext | null,
): boolean {
    if (!context) return false;
    return context.occurrences.length === 1 && context.occurrences[0]?.id === occurrence.id;
}

/** Shared by attach and delete: either way the emptied finding is deleted. */
function lastMentionWarning(
    occurrence: FindingOccurrence,
    context?: FindingContext | null,
): Eligibility | null {
    if (!isLastMention(occurrence, context)) return null;
    return {
        ok: true,
        reason: '',
        warning: `This is the only mention in ${quoted(context!.name)}, so that finding ` +
            'will be deleted too.',
    };
}

/**
 * Drops selected ids that are no longer on screen.
 *
 * Both reasons matter: a context can vanish because a merge absorbed it, or because the
 * librarian switched its facet off in the Entities toolbar. Keeping a hidden selection
 * would let Merge act on findings nobody can see and make the "N selected" count a lie.
 */
export function visibleSelection(
    selected: Set<number>,
    visible: SelectedContext[],
): Set<number> {
    const onScreen = new Set(visible.map(s => s.context.id));
    const next = new Set<number>();
    selected.forEach(id => {
        if (onScreen.has(id)) next.add(id);
    });
    return next;
}

/* ------------------------------------------------- identity match adjudication */

/**
 * The identity a candidate's context already carries, normalised.
 *
 * The field is a bare pk on a list row and a nested object on the detail - two serializers,
 * one name - so every caller would otherwise need the same union narrowing. `name` is null
 * for the pk form, which is not an error: the id is enough to decide whether the binding is
 * the rival kind, and a sentence that cannot quote a name says so differently.
 */
export function claimedIdentity(
    candidate: CandidateBrief | CandidateDetail,
): { id: number | null; name: string | null } {
    const claimed = candidate.of_context?.of_identity;
    if (claimed === null || claimed === undefined) return { id: null, name: null };
    if (typeof claimed === 'number') return { id: claimed, name: null };
    return { id: claimed.id ?? null, name: claimed.name || null };
}

const NOTHING_SELECTED = 'Pick a candidate to decide on.';

/**
 * The refusal all three decisions share, or null when the row is still open.
 *
 * Takes a candidate rather than a nullable one so each caller's own `!candidate` guard
 * narrows the type for the rules that follow; a combined helper would hand every caller
 * back a value TypeScript still believes might be null.
 *
 * A decided candidate is simply stale - the list is filtered to pending, so this only fires
 * on a row left selected while the decision happened.
 */
function staleVerdict(candidate: CandidateBrief | CandidateDetail): Eligibility | null {
    if (candidate.verdict !== 'pending') {
        return no(`This candidate has already been ${candidate.verdict}.`);
    }
    return null;
}

/**
 * Whether a scan candidate can still be accepted.
 *
 * The case worth catching is a context that has acquired a DIFFERENT identity meanwhile:
 * the server refuses that with a 400, and saying so before the click is better than saying
 * it after. A context already bound to the identity being proposed is NOT that case - the
 * server accepts it idempotently - so it passes with a warning rather than a refusal. The
 * two were conflated before, which left Dismiss the only way out of rows that were in fact
 * acceptable, and recorded "settled, no action" for proposals that had been right.
 *
 * The server stays authoritative. It knows things this cannot - that the context was
 * deleted, say - so a refusal here is a courtesy and never the only check.
 */
export function canAcceptCandidate(
    candidate: CandidateBrief | CandidateDetail | null,
): Eligibility {
    if (!candidate) return no(NOTHING_SELECTED);
    const stale = staleVerdict(candidate);
    if (stale) return stale;

    const claimed = claimedIdentity(candidate);
    const proposed = candidate.of_identity?.id ?? null;

    if (claimed.id !== null && claimed.id !== proposed) {
        const subject = quoted(candidate.of_context.name);
        // Unlinking is NOT the advice: the binding is very likely correct, and this
        // proposal simply is not what made it. Dismiss is what clears the row.
        const tail = 'Dismiss takes this proposal off the list without changing anything.';
        return no(claimed.name
            ? `${subject} already carries the identity ${quoted(claimed.name)}. ${tail}`
            : `${subject} already carries a different identity. ${tail}`);
    }

    if (claimed.id !== null) {
        return {
            ok: true,
            reason: '',
            warning: `${quoted(candidate.of_context.name)} already carries this identity, so ` +
                'accepting only records the decision - nothing about the finding changes.',
        };
    }

    return OK;
}

/**
 * Whether a scan candidate can be rejected.
 *
 * Only staleness stops it. A rejection is recorded against the identity/context pair to
 * stop the scan proposing it again, and that is worth doing whatever else has become of
 * the context - including its being identified as something else, which is precisely
 * the case where "not this one" is the correct and useful answer.
 */
export function canRejectCandidate(
    candidate: CandidateBrief | CandidateDetail | null,
): Eligibility {
    if (!candidate) return no(NOTHING_SELECTED);
    return staleVerdict(candidate) ?? OK;
}

/**
 * Whether a scan candidate can be dismissed.
 *
 * Staleness and nothing else, and unlike accept the context's identity is deliberately not
 * consulted: a context bound to a rival identity is the case dismiss exists for, and one
 * bound to this very identity is the other. The server guards neither, on purpose.
 */
export function canDismissCandidate(
    candidate: CandidateBrief | CandidateDetail | null,
): Eligibility {
    if (!candidate) return no(NOTHING_SELECTED);
    return staleVerdict(candidate) ?? OK;
}
