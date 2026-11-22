import {
  CANDIDATE_ORDERS,
  CANDIDATE_STAGES,
  IDENTITY_ORDERS,
  VERDICT_FILTERS,
  type CandidateBrief,
  type CandidateDetail,
  type CandidateOrder,
  type CandidateStage,
  type CandidateCounts,
  type IdentityOrder,
  type MatchFilters,
  type VerdictFilter,
} from '../types/identityMatches';

/**
 * The work area's URL contract, and the two bits of prose the chip needs.
 *
 * Pure - no Vue, no fetch - because both ends depend on it: the chip builds a link the
 * screen must be able to read back, and a filter the screen cannot parse is a filter
 * that silently does nothing. Keeping it here means the round trip is unit-testable.
 */

/** What the screen holds when nothing has been chosen. */
export function defaultFilters(): MatchFilters {
  return {
    facets: [],
    bookMn: null,
    q: '',
    onlyWithCandidates: false,
    identityOrder: 'facet',
    stages: [],
    verdict: 'pending',
    candidateOrder: 'best',
    identityId: null,
    contextId: null,
  };
}

/** vue-router hands a repeated key as an array; the last value wins, as it does in DRF. */
function one(value: unknown): string {
  if (Array.isArray(value)) return one(value[value.length - 1]);
  return typeof value === 'string' ? value : '';
}

/** Comma-separated, with the empties dropped: `people,,places` is two facets. */
function list(value: unknown): string[] {
  return one(value).split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * A positive integer, or null.
 *
 * Null rather than NaN for anything unparseable: `?identity=abc` must leave the screen
 * unpinned and working, not pass NaN into a URL and 404.
 */
function id(value: unknown): number | null {
  const raw = one(value);
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 ? n : null;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const raw = one(value);
  return (allowed as readonly string[]).includes(raw) ? raw as T : fallback;
}

function subsetOf<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  const wanted = list(value);
  // Ordered by `allowed`, not by the URL, so two spellings of one filter are one filter.
  return allowed.filter(item => wanted.includes(item));
}

/**
 * Read the screen's state out of a route query.
 *
 * Every enum is re-validated against its allowed set rather than cast, the discipline
 * useBookListUiState already applies to its stored state: a stale or hand-edited URL
 * must degrade to the default, never put an unknown value in a request.
 */
export function parseFindingsQuery(query: Record<string, unknown>): MatchFilters {
  return {
    facets: list(query.facet),
    bookMn: one(query.book) || null,
    q: one(query.q),
    onlyWithCandidates: one(query.candidates) === '1',
    identityOrder: oneOf<IdentityOrder>(query.order, IDENTITY_ORDERS, 'facet'),
    stages: subsetOf<CandidateStage>(query.stage, CANDIDATE_STAGES),
    verdict: oneOf<VerdictFilter>(query.verdict, VERDICT_FILTERS, 'pending'),
    candidateOrder: oneOf<CandidateOrder>(query.candidate_order, CANDIDATE_ORDERS, 'best'),
    identityId: id(query.identity),
    // A context pin inverts the screen, and the two pins are exclusive: an identity
    // named alongside a context would leave it ambiguous which column 2 is answering.
    contextId: id(query.identity) !== null ? null : id(query.context),
  };
}

/**
 * The query to put back in the URL.
 *
 * Only what differs from the default, so a freshly opened screen has a clean address
 * and a shared link carries nothing but the filters that were actually set.
 */
export function toFindingsQuery(filters: MatchFilters): Record<string, string> {
  const query: Record<string, string> = {};
  if (filters.facets.length > 0) query.facet = filters.facets.join(',');
  if (filters.bookMn) query.book = filters.bookMn;
  if (filters.q.trim()) query.q = filters.q.trim();
  if (filters.onlyWithCandidates) query.candidates = '1';
  if (filters.identityOrder !== 'facet') query.order = filters.identityOrder;
  if (filters.stages.length > 0) query.stage = filters.stages.join(',');
  if (filters.verdict !== 'pending') query.verdict = filters.verdict;
  if (filters.candidateOrder !== 'best') query.candidate_order = filters.candidateOrder;
  if (filters.identityId !== null) query.identity = String(filters.identityId);
  else if (filters.contextId !== null) query.context = String(filters.contextId);
  return query;
}

/* ------------------------------------------------------------------- the chip */

/**
 * Where the `(3/72)` chip points, or null when it should not be a link at all.
 *
 * Null for no counts, for nothing pending, and - importantly - for a missing `basis`:
 * without one there is nothing to filter the work area by, and a link that lands on an
 * unfiltered screen is worse than no link.
 *
 * The query is deliberately minimal. No facet or book filter is carried over, because
 * either could filter the very thing being linked to off its own page.
 */
export function candidateChipLink(
  counts: CandidateCounts | null | undefined,
): Record<string, string> | null {
  if (!counts) return null;
  if (!hasCandidates(counts)) return null;
  if (counts.basis !== 'identity' && counts.basis !== 'context') return null;
  if (!counts.of) return null;

  // Straight to the compared candidates when there are any: three scored proposals are
  // the work, and seventy-two coarse ones are the haystack.
  const stage = counts.compared > 0 ? 'compared' : 'triage,compared';

  return counts.basis === 'identity'
    ? { identity: String(counts.of), stage }
    : { context: String(counts.of), stage };
}

export function hasCandidates(counts: CandidateCounts | null | undefined): boolean {
  if (!counts) return false;
  return (counts.compared ?? 0) + (counts.triage ?? 0) > 0;
}

/**
 * What the chip says on hover, to a reader who cannot act on it.
 *
 * Worded for someone who has never heard of a FoundIdentity: the numbers mean the system
 * has noticed something, and a librarian is who decides. The spec wants readers able to
 * nudge staff about a match, and until there is an endpoint for that nudge, saying who to
 * nudge is the honest version of the feature.
 */
export function chipTooltip(counts: CandidateCounts | null | undefined): string {
  if (!counts) return '';
  const { compared, triage } = counts;

  const subject = counts.basis === 'context'
    ? 'this unidentified finding'
    : 'this';

  const strong = compared === 1
    ? '1 strong candidate match'
    : `${compared} strong candidate matches`;
  const coarse = triage === 1 ? '1 possible one' : `${triage} possible ones`;

  return `The system has found ${strong} and ${coarse} for ${subject} elsewhere in the `
    + 'library. A librarian decides whether to tie them together - tell one if you think '
    + 'they belong to the same thing.';
}

/* ------------------------------------------------------------------- the score */

/**
 * The number to show, and the one the server filters on.
 *
 * `??`, not `||`: a compared candidate scored 0 is a judgement - "the LLM read this and
 * said no" - and must not fall through to the triage guess as though it were unscored.
 * Mirrors the server's own `min_probability` definition, so the figure on screen and any
 * future score filter cannot disagree.
 */
export function effectiveScore(
  candidate: Pick<CandidateBrief, 'probability' | 'triage_probability'>,
): number | null {
  return candidate.probability ?? candidate.triage_probability ?? null;
}

/** A score as a percentage, or an em dash when the scan has not scored it. */
export function formatScore(
  candidate: Pick<CandidateBrief, 'probability' | 'triage_probability'>,
): string {
  const score = effectiveScore(candidate);
  if (score === null) return '—';
  return `${Math.round(score * 100)}%`;
}

/**
 * The reading route for a candidate's section, or null when it is unplaced.
 *
 * Built from the denormalised `in_book_mn`/`in_section_pf` rather than from the nested
 * objects: those are null for an unplaced candidate, and the flat pair is what the
 * backend put on the row for exactly this purpose. path_full is interpolated unescaped,
 * as every other section route in this app is.
 */
export function candidateSectionPath(
  candidate: Pick<CandidateBrief | CandidateDetail, 'in_book_mn' | 'in_section_pf'>,
): string | null {
  if (!candidate.in_book_mn || !candidate.in_section_pf) return null;
  return `/study/${candidate.in_book_mn}/section/${candidate.in_section_pf}`;
}

/** The same, for a found-in tree row, which always has both. */
export function sectionPath(bookMachineName: string, pathFull: string): string {
  return `/study/${bookMachineName}/section/${pathFull}`;
}
