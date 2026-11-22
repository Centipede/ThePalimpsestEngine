import { computed, ref, type ComputedRef, type Ref } from 'vue';
import type { Page, PageRequest } from '../api/http';

/**
 * One list endpoint's worth of limit/offset state.
 *
 * Deliberately NOT a Pinia store and NOT a module singleton: the match work area runs
 * two of these side by side, and nothing outside that screen wants the data. The same
 * reasoning AdminTopicAssignments gives for keeping its filters in local refs rather
 * than reusing useBookListUiState.
 *
 * It holds no filters either. The caller passes a closure that already knows them, so
 * one composable serves two endpoints with entirely different query shapes, and the
 * decision of *when* a filter change should refetch stays with the view that can debounce
 * it.
 */

export interface PaginatedList<T> {
  items: Ref<T[]>;
  /** Rows matching the filters server-side, not the length of `items`. */
  count: Ref<number>;
  offset: Ref<number>;
  limit: Ref<number>;
  isLoading: Ref<boolean>;
  error: Ref<string>;
  hasPrev: ComputedRef<boolean>;
  hasNext: ComputedRef<boolean>;
  /** "1-25 of 318" / "26-50 of 318" / "No matches". */
  rangeLabel: ComputedRef<string>;
  /** Anything about the query changed: back to the first page. */
  reload(): Promise<void>;
  /** A write happened: same page, fresh rows. */
  refresh(): Promise<void>;
  next(): Promise<void>;
  prev(): Promise<void>;
  setLimit(value: number): Promise<void>;
}

export interface PaginatedListOptions {
  limit?: number;
  /** Skip the first fetch, for a list that has nothing to ask for yet. */
  immediate?: boolean;
}

export function usePaginatedList<T>(
  fetcher: (page: PageRequest, signal: AbortSignal) => Promise<Page<T>>,
  options: PaginatedListOptions = {},
): PaginatedList<T> {
  const items = ref<T[]>([]) as Ref<T[]>;
  const count = ref(0);
  const offset = ref(0);
  const limit = ref(options.limit ?? 25);
  const isLoading = ref(false);
  const error = ref('');

  /**
   * The in-flight request. Aborting the previous one is what stops an earlier reply
   * overwriting a later one while someone types in the search box - the same guard
   * views/Search.vue uses, and the one bug this file exists to prevent.
   */
  let controller: AbortController | null = null;

  /** Guards the clamp below, so a backend that disagrees cannot make this loop. */
  let clamping = false;

  async function load(target: number): Promise<void> {
    controller?.abort();
    const own = new AbortController();
    controller = own;

    isLoading.value = true;

    try {
      const page = await fetcher({ limit: limit.value, offset: target }, own.signal);
      // A superseded request can still resolve before its abort lands.
      if (own.signal.aborted) return;

      /**
       * An empty page with rows behind it means the offset is now past the end: the
       * librarian accepted or rejected the last rows of the page they were on. Land on
       * the final page instead of showing an empty column with "318 matches" above it.
       */
      if (page.results.length === 0 && page.count > 0 && target > 0 && !clamping) {
        clamping = true;
        try {
          const last = Math.max(0, Math.ceil(page.count / limit.value) - 1) * limit.value;
          if (last !== target) {
            await load(last);
            return;
          }
        } finally {
          clamping = false;
        }
      }

      // Replaced only on success, so a failed or superseded fetch leaves the previous
      // page on screen rather than blanking the column.
      items.value = page.results;
      count.value = page.count;
      offset.value = target;
      error.value = '';
    } catch (e) {
      // An abort is this composable's own doing, not a failure to report.
      if (own.signal.aborted || (e instanceof Error && e.name === 'AbortError')) return;
      error.value = e instanceof Error ? e.message : 'The list could not be loaded.';
    } finally {
      if (controller === own) {
        controller = null;
        isLoading.value = false;
      }
    }
  }

  const hasPrev = computed(() => offset.value > 0);
  const hasNext = computed(() => offset.value + items.value.length < count.value);

  const rangeLabel = computed(() => {
    if (count.value === 0) return 'No matches';
    const first = offset.value + 1;
    const last = offset.value + items.value.length;
    return `${first}–${last} of ${count.value}`;
  });

  function reload() {
    return load(0);
  }

  function refresh() {
    return load(offset.value);
  }

  function next() {
    if (!hasNext.value) return Promise.resolve();
    return load(offset.value + limit.value);
  }

  function prev() {
    if (!hasPrev.value) return Promise.resolve();
    return load(Math.max(0, offset.value - limit.value));
  }

  /** A changed page size invalidates the offset, so this starts over at the first page. */
  function setLimit(value: number) {
    limit.value = value;
    return load(0);
  }

  if (options.immediate !== false) {
    void reload();
  }

  return {
    items,
    count,
    offset,
    limit,
    isLoading,
    error,
    hasPrev,
    hasNext,
    rangeLabel,
    reload,
    refresh,
    next,
    prev,
    setLimit,
  };
}
