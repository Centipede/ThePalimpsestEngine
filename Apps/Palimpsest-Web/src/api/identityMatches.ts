import { buildUrl, get, post, requestPage, type Page, type PageRequest } from './http';
import type { FoundIdentity } from '../types/library';
import type {
  AcceptResult,
  CandidateBrief,
  CandidateDetail,
  CandidateOrder,
  CandidateStage,
  FoundIdentityRow,
  FoundInTree,
  IdentityOrder,
  RejectResult,
  VerdictFilter,
} from '../types/identityMatches';

/**
 * Every server call behind the identity-match work area. Nothing else in the app may
 * hold one of these URLs: the backend lives in a separate project, so when a route
 * moves this file is the whole blast radius.
 *
 * Split from api/findings.ts, which owns the per-occurrence curation routes. This is a
 * different resource family - a scan proposing "this unidentified finding might be this
 * confirmed identity" - with its own pagination and a dozen filter params.
 *
 * The decision actions are IsAdminUser server-side; the reads are not, and `found_in`
 * is explicitly meant for ordinary users. A 400 carries `{ error }` with the business
 * rule that was broken, which api/http.ts turns into a FindingActionError.
 */

const IDENTITY = '/testbooks/api/v1/found-identity';
const CANDIDATE = '/testbooks/api/v1/finding-candidate';

/* --------------------------------------------------------- column 1: identities */

export interface IdentityQuery {
  /** Plural or singular machine names, or ids. Joined with commas by buildUrl. */
  facets?: string[];
  bookMn?: string | null;
  /**
   * Broad search: identity name, exact QID, a linked context's name, or a pending
   * candidate context's name. Deliberately inclusive - a librarian searching "leop"
   * wants the candidate side too.
   */
  q?: string;
  onlyWithCandidates?: boolean;
  order?: IdentityOrder;
  /**
   * Asks for `llm_wikipedia` and `llm_corpus` on every row. The work area always does:
   * a selected row then shows its dossier with no second request and no spinner, which
   * is worth the extra weight at a page size of 25.
   */
  includeDossier?: boolean;
}

function identityParams(query: IdentityQuery) {
  return {
    of_facet: query.facets ?? [],
    book_mn: query.bookMn ?? undefined,
    q: query.q || undefined,
    has_candidates: query.onlyWithCandidates ? 1 : undefined,
    order: query.order,
    include_dossier: query.includeDossier ? 1 : undefined,
  };
}

export function fetchFoundIdentities(
  query: IdentityQuery,
  page: PageRequest,
  signal?: AbortSignal,
): Promise<Page<FoundIdentityRow>> {
  return requestPage<FoundIdentityRow>(`${IDENTITY}/`, identityParams(query), page, signal);
}

/**
 * One identity, from the detail route.
 *
 * The work area needs this because the listing has no `id` filter: a chip deep link
 * names an identity that may sit on any page, so it is fetched directly and pinned.
 * `include_dossier` is sent here too, so a pinned row reads the same as a listed one.
 */
export function fetchFoundIdentityRow(
  identityId: number,
  signal?: AbortSignal,
): Promise<FoundIdentityRow> {
  return get<FoundIdentityRow>(
    buildUrl(`${IDENTITY}/${identityId}/`, { include_dossier: 1 }),
    signal,
  );
}

/**
 * One identity as the rest of the app knows it - the full record, articles included.
 *
 * Moved here from api/findings.ts with its missing trailing slash restored: it was the
 * only call in that file without one, relying on APPEND_SLASH, whose redirect can drop
 * the Authorization header.
 */
export function fetchFoundIdentity(
  identityId: number,
  signal?: AbortSignal,
): Promise<FoundIdentity> {
  return get<FoundIdentity>(`${IDENTITY}/${identityId}/`, signal);
}

/** The books and sections an identity is already linked in. Readable by any user. */
export function fetchFoundIn(identityId: number, signal?: AbortSignal): Promise<FoundInTree> {
  return get<FoundInTree>(`${IDENTITY}/${identityId}/found_in/`, signal);
}

/* --------------------------------------------------------- column 2: candidates */

export interface CandidateQuery {
  /** The usual case: candidates proposed FOR this confirmed identity. */
  ofIdentity?: number | null;
  /**
   * The inverted case: identities proposed for this unidentified finding. Mutually
   * exclusive with ofIdentity - the screen asks one question or the other, never both.
   */
  ofContext?: number | null;
  facets?: string[];
  inBookMn?: string | null;
  inSectionPf?: string | null;
  stages?: CandidateStage[];
  verdict?: VerdictFilter;
  /** Filters on the effective score: `probability` if present, else triage's. */
  minProbability?: number | null;
  q?: string;
  order?: CandidateOrder;
}

function candidateParams(query: CandidateQuery) {
  return {
    of_identity: query.ofIdentity ?? undefined,
    of_context: query.ofContext ?? undefined,
    of_facet: query.facets ?? [],
    in_book_mn: query.inBookMn ?? undefined,
    in_section_pf: query.inSectionPf ?? undefined,
    stage: query.stages ?? [],
    verdict: query.verdict,
    min_probability: query.minProbability ?? undefined,
    q: query.q || undefined,
    order: query.order,
  };
}

export function fetchCandidates(
  query: CandidateQuery,
  page: PageRequest,
  signal?: AbortSignal,
): Promise<Page<CandidateBrief>> {
  return requestPage<CandidateBrief>(`${CANDIDATE}/`, candidateParams(query), page, signal);
}

export function fetchCandidate(
  candidateId: number,
  signal?: AbortSignal,
): Promise<CandidateDetail> {
  return get<CandidateDetail>(`${CANDIDATE}/${candidateId}/`, signal);
}

/* ------------------------------------------------------------------- decisions */

/**
 * Accept a candidate: the candidate context takes on the candidate identity.
 *
 * Refused with a 400 when the context has meanwhile been bound to a different identity,
 * and the server's message names that identity. That is a real race - two librarians, or
 * one librarian and an accepted candidate from elsewhere - so the caller must surface the
 * message and refresh rather than retry.
 */
export function acceptCandidate(candidateId: number): Promise<AcceptResult> {
  return post<AcceptResult>(`${CANDIDATE}/${candidateId}/accept/`, {});
}

/**
 * Reject a candidate.
 *
 * The row survives, which is the point: it stops the scan proposing - and paying an LLM
 * for - the same identity/context pair again.
 */
export function rejectCandidate(candidateId: number): Promise<RejectResult> {
  return post<RejectResult>(`${CANDIDATE}/${candidateId}/reject/`, {});
}

/* --------------------------------------------------------------------- dossier */

/**
 * The two dense summaries behind a row, named once.
 *
 * Read through here rather than off the row directly so that a backend rename is a
 * one-line edit, and so the "is it there at all" question has one answer: these fields
 * only arrive with `include_dossier=1`.
 */
export function dossierSummaries(row: FoundIdentityRow | null | undefined): {
  corpus: string;
  wikipedia: string;
  any: boolean;
} {
  const corpus = (row?.llm_corpus ?? '').trim();
  const wikipedia = (row?.llm_wikipedia ?? '').trim();
  return { corpus, wikipedia, any: corpus.length > 0 || wikipedia.length > 0 };
}
