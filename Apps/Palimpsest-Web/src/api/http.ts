import { apiFetch } from '../api';

/**
 * The shared plumbing under every typed API module: one place that turns a non-2xx into
 * something a dialog can show, and one place that understands DRF's pagination envelope.
 *
 * Extracted from api/findings.ts, which had grown this layer privately. Nothing here
 * knows a single URL - the modules that import it own those, so a moved route still has
 * exactly one file as its blast radius.
 */

/**
 * A failed call. Carries the server's own explanation, because the rules these endpoints
 * enforce are finer-grained than anything the frontend can check for itself.
 *
 * Named for the findings curation calls it was written for, and kept under that name:
 * six components import it from api/findings.ts, which re-exports it.
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
 * A call whose failure is raised rather than returned.
 *
 * apiFetch resolves on 4xx, and the identity calls this layer grew out of used to do
 * `if (response.ok) { ... }` with no else - a silent no-op. That is tolerable for a
 * lookup and not for a destructive action, so every call throws instead.
 */
export async function request<T>(url: string, init: RequestInit): Promise<T> {
  const res = await apiFetch(url, init);
  if (res.ok) return await res.json() as T;
  throw await failure(res);
}

/**
 * The same call for an endpoint that may answer 200 with an empty body.
 *
 * request() reads the body unconditionally, which would turn a successful call into a
 * phantom failure on an empty 200 - a job-starting endpoint that answers with nothing is
 * the case this exists for. The same reading as jsonOrNull in SectionAdminInfoPanel.
 */
export async function requestMaybeEmpty<T>(url: string, init: RequestInit): Promise<T | null> {
  const res = await apiFetch(url, init);
  if (!res.ok) throw await failure(res);

  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    // A 200 with a non-JSON body is not something a caller can use, but it is also not
    // a failure: the action went through. Report it as no body at all.
    return null;
  }
}

/** The one place that turns a non-2xx into something a dialog can show. */
async function failure(res: Response): Promise<FindingActionError> {
  if (res.status === 403) {
    return new FindingActionError('Admin permission is required for this action.', 403);
  }

  let message = `Request failed (HTTP ${res.status}).`;
  try {
    const body = await res.json();
    // DRF's own errors use `detail`; these endpoints use `error`, and the maintenance
    // ones answer `{ status: 'error', message }` instead.
    message = body?.error || body?.detail || body?.message || message;
  } catch {
    // A non-JSON error body (a proxy error page, say) leaves the generic message.
  }
  return new FindingActionError(message, res.status);
}

function postInit(body?: unknown, signal?: AbortSignal): RequestInit {
  return {
    method: 'POST',
    ...(signal ? { signal } : {}),
    ...(body === undefined ? {} : {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  };
}

export function post<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(url, postInit(body, signal));
}

/** Like post(), for endpoints that may answer 200 with an empty body. */
export function postMaybeEmpty<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T | null> {
  return requestMaybeEmpty<T>(url, postInit(body, signal));
}

export function get<T>(url: string, signal?: AbortSignal): Promise<T> {
  return request<T>(url, { method: 'GET', ...(signal ? { signal } : {}) });
}

/* --------------------------------------------------------------------- queries */

export type QueryValue = string | number | boolean | null | undefined | (string | number)[];

/**
 * A URL with its query string, dropping anything the caller left unset.
 *
 * Arrays join with a comma, which is the convention every multi-valued param on these
 * endpoints uses (`of_facet=people,places`, `stage=triage,compared`) - not repeated keys.
 * An empty array is therefore the same as no filter at all, and is dropped.
 *
 * `false` is dropped too: every boolean param here is a flag whose absence is the
 * default, so sending `has_candidates=false` would read as a filter rather than as none.
 */
export function buildUrl(path: string, params: Record<string, QueryValue> = {}): string {
  const url = new URL(path, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '' || value === false) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      url.searchParams.append(key, value.join(','));
      continue;
    }
    url.searchParams.append(key, value === true ? '1' : String(value));
  }
  return url.toString();
}

/* ------------------------------------------------------------------ pagination */

export interface PageRequest {
  limit: number;
  offset: number;
}

/**
 * One page of a list endpoint.
 *
 * `offset` and `limit` are echoed back from the request rather than parsed out of the
 * response, so a pager can label "26-50 of 318" without reading a URL.
 *
 * The server's own `next`/`previous` links are deliberately NOT surfaced. Following one
 * would put a backend URL in a component, which is the thing the per-module URL rule
 * exists to prevent; count, limit and offset are everything an explicit prev/next needs.
 */
export interface Page<T> {
  results: T[];
  /** Total rows matching the filters server-side, not the length of `results`. */
  count: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/**
 * A page of a list endpoint, from either shape the API can answer with.
 *
 * These endpoints paginate only when `limit` is sent, so an unpaginated bare array is a
 * real possibility - a backend that drops the param, or a route that never paginated -
 * and it must not crash the screen. A bare array is reported as a single complete page.
 */
export async function requestPage<T>(
  path: string,
  params: Record<string, QueryValue>,
  page: PageRequest,
  signal?: AbortSignal,
): Promise<Page<T>> {
  const url = buildUrl(path, { ...params, limit: page.limit, offset: page.offset });
  const body = await get<unknown>(url, signal);
  return readPage<T>(body, page);
}

/** Split out from requestPage so the envelope handling can be tested without a fetch. */
export function readPage<T>(body: unknown, page: PageRequest): Page<T> {
  if (Array.isArray(body)) {
    return {
      results: body as T[],
      count: body.length,
      offset: 0,
      limit: body.length,
      hasMore: false,
    };
  }

  const envelope = body as { results?: T[]; count?: number; next?: string | null };
  const results = envelope?.results ?? [];
  const count = envelope?.count ?? results.length;

  return {
    results,
    count,
    offset: page.offset,
    limit: page.limit,
    // Derived rather than taken from `next`: the two agree, and the derivation still
    // works for a backend that answers without the link.
    hasMore: page.offset + results.length < count,
  };
}
