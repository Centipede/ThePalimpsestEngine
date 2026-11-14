import { apiFetch } from '../api';
import type { FindingContext, FoundIdentity } from '../types/library';

/**
 * Every server call that curates findings. Nothing else in the app may hold one of
 * these URLs: the backend lives in a separate project, so when a route moves this
 * file is the whole blast radius.
 *
 * All of these are IsAdminUser server-side, which is the same gate as the frontend's
 * `isStaff`. A 400 carries `{ error }` explaining which business rule was broken.
 */

const CONTEXT = '/testbooks/api/v1/finding-context';
const OCCURRENCE = '/testbooks/api/v1/finding-occurrence';

/**
 * A failed curation call. Carries the server's own explanation, because the rules it
 * enforces (same facet, same section, no conflicting identities) are finer-grained
 * than anything the frontend can check from the section payload alone.
 */
export class FindingActionError extends Error {
  // Declared rather than a constructor parameter property: `erasableSyntaxOnly` is on.
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'FindingActionError';
    this.status = status;
  }
}

/**
 * The context shape the curation endpoints return. Deliberately NOT FindingContext:
 * none of them send `occurrences` back, so a response can never rebuild the findings
 * grid and the caller has to refetch the section for a correct view.
 */
export interface CurationContext {
  id: number;
  name: string;
  of_identity: FoundIdentity | null;
}

export interface MergeResult {
  target_context: CurationContext;
  deleted_context_ids: number[];
  moved_occurrence_ids: number[];
}

/** Shared by both move actions: the destination, the source, and whether it survived. */
export interface MoveResult {
  /** The context the occurrences landed in. `new_context` is normalised to this. */
  target_context: CurationContext;
  /** Null when the source was emptied and therefore deleted. */
  source_context: CurationContext | null;
  source_deleted: boolean;
  moved_occurrence_ids: number[];
}

export interface RemoveOccurrencesResult {
  /** Detached from their context but still present in the block payload. */
  detached_occurrence_ids: number[];
  /** Gone for good, block payload included. */
  deleted_occurrence_ids: number[];
  /** Contexts the server dropped because they were left empty. */
  deleted_context_ids: number[];
  affected_contexts: CurationContext[];
}

/**
 * The one place that turns a non-2xx into something a dialog can show.
 *
 * apiFetch resolves on 4xx, and the identity calls this file inherited used to do
 * `if (response.ok) { ... }` with no else - a silent no-op. That is tolerable for a
 * lookup and not for a destructive action, so every curation call throws instead.
 */
async function request<T>(url: string, init: RequestInit): Promise<T> {
  const res = await apiFetch(url, init);
  if (res.ok) return await res.json() as T;

  if (res.status === 403) {
    throw new FindingActionError('Admin permission is required for this action.', 403);
  }

  let message = `Request failed (HTTP ${res.status}).`;
  try {
    const body = await res.json();
    // DRF's own errors use `detail`; these endpoints use `error`.
    message = body?.error || body?.detail || message;
  } catch {
    // A non-JSON error body (a proxy error page, say) leaves the generic message.
  }
  throw new FindingActionError(message, res.status);
}

function post<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    ...(body === undefined ? {} : {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
}

/**
 * Fold several contexts into one.
 *
 * `keepId` is the addressed context, but the server overrides it when one of the
 * others carries a found identity - an identified context always survives. The merge
 * dialog mirrors that by locking its survivor radio, so the two agree.
 */
export function mergeContexts(input: {
  keepId: number;
  sourceIds: number[];
  name?: string;
}): Promise<MergeResult> {
  return post<MergeResult>(`${CONTEXT}/${input.keepId}/merge/`, {
    source_context_ids: input.sourceIds,
    ...(input.name ? { name_probably: input.name } : {}),
  });
}

/**
 * Split occurrences off into a brand new, unidentified context.
 *
 * Omitting `name` is allowed: the server names the new context after the first moved
 * occurrence. Moving every occurrence is also allowed, and deletes the emptied source.
 */
export async function splitContext(input: {
  contextId: number;
  occurrenceIds: number[];
  name?: string;
}): Promise<MoveResult> {
  const raw = await post<{
    new_context: CurationContext;
    source_context: CurationContext | null;
    source_deleted: boolean;
    moved_occurrence_ids: number[];
  }>(`${CONTEXT}/${input.contextId}/move_occurrences_to_new_context/`, {
    occurrence_ids: input.occurrenceIds,
    ...(input.name ? { name_probably: input.name } : {}),
  });

  // Normalised to MoveResult so callers handle both moves the same way.
  return {
    target_context: raw.new_context,
    source_context: raw.source_context,
    source_deleted: raw.source_deleted,
    moved_occurrence_ids: raw.moved_occurrence_ids,
  };
}

/** Move occurrences into a context that already exists. Same facet and section only. */
export function moveOccurrences(input: {
  fromContextId: number;
  toContextId: number;
  occurrenceIds: number[];
}): Promise<MoveResult> {
  return post<MoveResult>(
    `${CONTEXT}/${input.fromContextId}/move_occurrences_to_existing_context/`,
    { occurrence_ids: input.occurrenceIds, target_context_id: input.toContextId },
  );
}

/**
 * Remove occurrences from curation.
 *
 * `deleteFromBlock: false` only breaks the link to the context - the occurrence stays
 * in the block payload as an unclustered finding. `true` destroys the record. Either
 * way a context left with nothing is deleted, which is also how a whole context is
 * removed: hand this every occurrence id it holds.
 */
export function removeOccurrences(input: {
  occurrenceIds: number[];
  deleteFromBlock: boolean;
}): Promise<RemoveOccurrencesResult> {
  return post<RemoveOccurrencesResult>(`${OCCURRENCE}/remove/`, {
    occurrence_ids: input.occurrenceIds,
    delete_from_block: input.deleteFromBlock,
  });
}

/**
 * Rename a context.
 *
 * The readable field is `name`; the writable model field is `name_probably`. This is
 * the one curation call that is a plain PATCH rather than an action - confirmed with
 * the backend, which also notes that only `unlink_identity` genuinely needs POST.
 */
export function renameContext(contextId: number, name: string): Promise<FindingContext> {
  return request<FindingContext>(`${CONTEXT}/${contextId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name_probably: name }),
  });
}

export function linkIdentity(contextId: number, wikidataId: string): Promise<FindingContext> {
  return post<FindingContext>(`${CONTEXT}/${contextId}/link_identity/`, { wikidata_id: wikidataId });
}

export function unlinkIdentity(contextId: number): Promise<FindingContext> {
  return post<FindingContext>(`${CONTEXT}/${contextId}/unlink_identity/`);
}

export function retryWikipediaLink(contextId: number): Promise<FindingContext> {
  return post<FindingContext>(`${CONTEXT}/${contextId}/retry_wikipedia_link/`);
}

export function fetchFoundIdentity(identityId: number): Promise<FoundIdentity> {
  return request<FoundIdentity>(`/testbooks/api/v1/found-identity/${identityId}`, { method: 'GET' });
}

export interface WikidataCandidate {
  title: string;
  titlesnippet: string;
  snippet?: string;
}

export function lookupWikidata(query: string, facetSingular?: string | null): Promise<{ results: WikidataCandidate[] }> {
  const url = new URL('/testbooks/api/v1/lookup/wikidata/', window.location.origin);
  url.searchParams.append('query', query);
  if (facetSingular) url.searchParams.append('facet', facetSingular);
  return request<{ results: WikidataCandidate[] }>(url.toString(), { method: 'GET' });
}
