import type { FindingOccurrence, FoundIdentity } from './library';

/**
 * The payloads of the identity-match work area: the staff screen that adjudicates what
 * the background scan proposed.
 *
 * These are serializer view models, not corpus records, which is why they live apart
 * from types/library.ts. The one exception is CandidateCounts, declared there because it
 * arrives inside a section's own findings payload and is read by the reading view.
 */

/* ---------------------------------------------------------------- the two stages */

/**
 * How far the scan got with a candidate.
 *
 * `triage` is the nightly coarse pass - cheap, wide, and wrong a lot; it scores into
 * `triage_probability`. `compared` is the LLM close read against the identity's dossier;
 * it scores into `probability` and writes `reasoning`.
 */
export type CandidateStage = 'triage' | 'compared';

/**
 * How a candidate was settled.
 *
 * `dismissed` is an accept with no operation attached: it settles the row and takes it out
 * of the pending queue without touching the context. It exists for the case the scan cannot
 * see - the finding acquired its identity by another route, so the proposal was right but
 * was not what linked it, and rejecting it would record the opposite of what happened.
 */
export type CandidateVerdict = 'pending' | 'accepted' | 'rejected' | 'dismissed';

/** `all` is a filter value only; no candidate ever carries it. */
export type VerdictFilter = CandidateVerdict | 'all';

export const CANDIDATE_STAGES: readonly CandidateStage[] = ['triage', 'compared'];
export const VERDICT_FILTERS: readonly VerdictFilter[] =
  ['pending', 'accepted', 'rejected', 'dismissed', 'all'];

/* --------------------------------------------------------------------- ordering */

export type IdentityOrder = 'facet' | 'name' | 'pending' | 'recent';
export type CandidateOrder = 'best' | 'reading' | 'newest';

export const IDENTITY_ORDERS: readonly IdentityOrder[] = ['facet', 'name', 'pending', 'recent'];
export const CANDIDATE_ORDERS: readonly CandidateOrder[] = ['best', 'reading', 'newest'];

/* ------------------------------------------------------------------- the briefs */

/**
 * The facet as the work area's own serializers send it.
 *
 * Deliberately not FacetQuery: this carries `order_key`, which FacetQuery has not got,
 * and omits the prompts and schemas, which it has. `symbol` is opaque display text here
 * as everywhere else in the app - an emoji, usually.
 */
export interface FacetBrief {
  id: number;
  name: string;
  machine_name_singular: string;
  machine_name_plural: string;
  symbol: string;
  order_key: number;
}

/**
 * How many candidates are waiting on something.
 *
 * `basis` says what "something" is, and it decides how the chip behaves when clicked:
 * `identity` counts candidates for a confirmed identity across the whole corpus, so
 * `of` is a FoundIdentity pk; `context` counts identities proposed FOR an unidentified
 * finding, so `of` is a FindingContext pk and the work area opens inverted.
 *
 * `compared` is the bold numerator and `triage` the secondary figure: `Leopold I (3/72)`.
 */
export interface CandidateCounts {
  basis: 'identity' | 'context';
  of: number;
  compared: number;
  triage: number;
}

/* ------------------------------------------------------------ column 1: identities */

/**
 * One row of the found-identity listing.
 *
 * NOT an extension of FoundIdentity, on purpose: `of_facet` is always a plain id here
 * where FoundIdentity's is `number | FacetQuery | null`, and this row carries no
 * `articles`. Extending would need Omit gymnastics and would let a row be passed
 * wherever a full record is expected.
 *
 * `llm_wikipedia` and `llm_corpus` are the dossier - the dense summaries the compared
 * pass reasons against - and arrive only when the request asks for `include_dossier=1`.
 */
export interface FoundIdentityRow {
  id: number;
  name: string;
  wikidata_qid: string;
  wikipedia_url: string | null;
  wikimedia_url: string | null;
  properties: Record<string, unknown> | null;
  of_facet: number;
  dossier_built_at: string | null;
  facet: FacetBrief | null;
  candidate_counts: CandidateCounts | null;
  has_dossier: boolean;
  /** Finding contexts already linked to this identity. */
  context_count: number;
  /** Distinct books it is already linked in. */
  book_count: number;
  /** Only with `include_dossier=1`. A dense summary of the Wikipedia article. */
  llm_wikipedia?: string | null;
  /** Only with `include_dossier=1`. A dense summary of the occurrences linked so far. */
  llm_corpus?: string | null;
}

/* ------------------------------------------------------- column 1: the found-in tree */

export interface FoundInContext {
  id: number;
  name: string;
  /** Singular machine name. */
  of_facet: string;
  occurrence_count: number;
  occurrences: FindingOccurrence[];
}

export interface FoundInSection {
  id: number;
  title: string;
  /** The canonical path, and what a route is built from. */
  path_full: string;
  /** Display text only - "III.9". */
  path_coded: string;
  context_count: number;
  occurrence_count: number;
  contexts: FoundInContext[];
}

export interface FoundInBook {
  id: number;
  machine_name: string;
  abbrev: string;
  title: string;
  section_count: number;
  context_count: number;
  occurrence_count: number;
  sections: FoundInSection[];
}

/**
 * Where an identity is already linked: the "found in" expander under a column-1 row.
 *
 * Readable by ordinary authenticated users, unlike the rest of this work area.
 */
export interface FoundInTree {
  identity: Pick<FoundIdentity, 'id' | 'name' | 'wikidata_qid' | 'wikipedia_url'> & {
    wikimedia_url: string | null;
    properties: Record<string, unknown> | null;
    of_facet: number;
    dossier_built_at: string | null;
  };
  totals: {
    books: number;
    sections: number;
    contexts: number;
    occurrences: number;
  };
  books: FoundInBook[];
  /** Linked contexts the server could not place in a section. Usually empty. */
  unplaced: FoundInContext[];
}

/* ------------------------------------------------------- column 2 and 3: candidates */

/** The identity a candidate proposes, as the candidate's own payload carries it. */
export interface CandidateIdentityBrief {
  id: number;
  name: string;
  of_facet: number;
  wikidata_qid?: string;
  wikipedia_url?: string | null;
  wikimedia_url?: string | null;
  properties?: Record<string, unknown> | null;
  dossier_built_at?: string | null;
}

/** The unidentified finding a candidate is about. */
export interface CandidateContext {
  id: number;
  name: string;
  /** Singular machine name. */
  of_facet: string;
  /**
   * Null is the normal case - an unclaimed context is what a candidate proposes an
   * identity FOR. Non-null means someone bound it meanwhile, which refuses an accept only
   * when it is a DIFFERENT identity: accepting a candidate whose context already carries
   * the proposed one succeeds idempotently, and the server has a test pinning that.
   *
   * A bare pk on a list row and a nested object on the detail - the two come from different
   * serializers. Read it through `claimedIdentity` in utils/findingEligibility.ts rather
   * than reaching in here, which is where that difference is absorbed.
   */
  of_identity: number | FoundIdentity | CandidateIdentityBrief | null;
  occurrences?: FindingOccurrence[];
  candidate_counts?: CandidateCounts | null;
}

export interface CandidateBookBrief {
  id: number;
  machine_name: string;
  abbrev: string;
  title: string;
}

export interface CandidateSectionBrief {
  id: number;
  path_full: string;
  path_coded: string;
  title: string;
}

/**
 * One row of column 2. A brief payload: navigation, scores, a reasoning preview - but
 * no occurrences and no full reasoning, both of which are on the detail.
 */
export interface CandidateBrief {
  id: number;
  of_identity: CandidateIdentityBrief;
  of_context: CandidateContext;
  /** Singular machine name. */
  of_facet: string;
  /** Denormalised onto the candidate, so a route can be built without `in_book`. */
  in_book_mn: string | null;
  in_section_pf: string | null;
  /** Null when the candidate context could not be placed in a section. */
  in_book: CandidateBookBrief | null;
  in_section: CandidateSectionBrief | null;
  occurrence_count: number;
  stage: CandidateStage;
  triage_probability: number | null;
  /** Null until the compared pass has scored it. */
  probability: number | null;
  verdict: CandidateVerdict;
  /** The first 240 characters of `reasoning`. */
  reasoning_preview: string | null;
  suggested_at: string;
  decided_at: string | null;
}

/**
 * Column 3's payload: the same candidate fat, with the full LLM reasoning, the evidence
 * blob, and the candidate context's occurrences in reading order.
 */
export interface CandidateDetail extends Omit<CandidateBrief, 'reasoning_preview'> {
  reasoning: string | null;
  /** Free-form; `decisive_quotes` and `model` are the documented keys. */
  evidence: Record<string, unknown> | null;
  decided_by: number | string | null;
}

export interface AcceptResult {
  status: string;
  candidate: CandidateDetail;
  /** The context as it now stands, identity attached. */
  context: CandidateContext;
}

export interface RejectResult {
  status: string;
  candidate: CandidateDetail;
}

/**
 * The same shape as RejectResult, declared apart from it rather than aliased: the absence
 * of a `context` key is the meaning of the endpoint, not a coincidence of its payload.
 */
export interface DismissResult {
  status: string;
  candidate: CandidateDetail;
}

/* ----------------------------------------------------------------- filter state */

/** What the filter bar holds, and what the URL round-trips. */
export interface MatchFilters {
  /** Plural machine names; the API accepts ids or either form. */
  facets: string[];
  bookMn: string | null;
  q: string;
  onlyWithCandidates: boolean;
  identityOrder: IdentityOrder;
  stages: CandidateStage[];
  verdict: VerdictFilter;
  candidateOrder: CandidateOrder;
  /** The pinned identity from a chip deep link. */
  identityId: number | null;
  /** The pinned unidentified context from a chip deep link; inverts the screen. */
  contextId: number | null;
}
