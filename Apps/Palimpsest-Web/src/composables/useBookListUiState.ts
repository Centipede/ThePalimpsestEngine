import { ref, watch } from 'vue';
import {
  GROUP_MODES,
  SORT_DIRECTIONS,
  SORT_MODES,
  type GroupMode,
  type SortDirection,
  type SortMode,
} from '../utils/bookGrouping';

/**
 * Session-scoped UI state for the Study Home book list: which topics, authors
 * and books are picked as filters, how the list is grouped and ordered, and how
 * far it was scrolled.
 *
 * Kept in sessionStorage under a single consolidated key so that peeking into a
 * book and pressing back lands the reader exactly where they left off, while a
 * fresh tab always starts from an unfiltered list.
 *
 * Scroll position is stored for the list's own scroll container rather than
 * handled by the router: `.vue-content` in App.vue is the app's scroller and the
 * window never scrolls, so router `scrollBehavior` would be a no-op here.
 */

const STORAGE_KEY = 'palimpsest:study-home:book-list';

interface BookListUiState {
  topics: number[];
  authors: number[];
  books: number[];
  group: GroupMode;
  sort: SortMode;
  direction: SortDirection;
  scrollTop: number;
}

const EMPTY_STATE: BookListUiState = {
  topics: [],
  authors: [],
  books: [],
  group: 'author',
  sort: 'published',
  direction: 'asc',
  scrollTop: 0,
};

function numberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((id): id is number => typeof id === 'number') : [];
}

/** Stored enums are validated against the allowed set, never trusted as read. */
function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function readState(): BookListUiState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STATE };

    const parsed = JSON.parse(raw) as Partial<BookListUiState>;
    return {
      topics: numberArray(parsed.topics),
      authors: numberArray(parsed.authors),
      books: numberArray(parsed.books),
      group: oneOf(parsed.group, GROUP_MODES, EMPTY_STATE.group),
      sort: oneOf(parsed.sort, SORT_MODES, EMPTY_STATE.sort),
      direction: oneOf(parsed.direction, SORT_DIRECTIONS, EMPTY_STATE.direction),
      scrollTop: typeof parsed.scrollTop === 'number' ? parsed.scrollTop : 0,
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

function writeState(patch: Partial<BookListUiState>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readState(), ...patch }));
  } catch {
    // Private mode or blocked storage: filters simply stop surviving navigation.
  }
}

export function useBookListUiState() {
  const stored = readState();

  const selectedTopicIds = ref<number[]>(stored.topics);
  const selectedAuthorIds = ref<number[]>(stored.authors);
  const selectedBookIds = ref<number[]>(stored.books);

  const groupMode = ref<GroupMode>(stored.group);
  const sortMode = ref<SortMode>(stored.sort);
  const sortDirection = ref<SortDirection>(stored.direction);

  // The offset to restore, captured before any scroll handler can overwrite it.
  const initialScrollTop = stored.scrollTop;

  watch(
    [selectedTopicIds, selectedAuthorIds, selectedBookIds, groupMode, sortMode, sortDirection],
    () => {
      // A changed filter or ordering makes the old offset meaningless.
      writeState({
        topics: selectedTopicIds.value,
        authors: selectedAuthorIds.value,
        books: selectedBookIds.value,
        group: groupMode.value,
        sort: sortMode.value,
        direction: sortDirection.value,
        scrollTop: 0,
      });
    }
  );

  let pendingFrame = 0;

  function saveScroll(el: HTMLElement | null) {
    if (!el || pendingFrame) return;

    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      writeState({ scrollTop: el.scrollTop });
    });
  }

  /**
   * Re-applies the stored offset, retrying over a few frames while the list is
   * still laying out (same guard shape as scrollToBlockWhenReady in
   * SectionDetailView).
   */
  function restoreScroll(el: HTMLElement | null, attempts = 20) {
    if (!el || initialScrollTop <= 0) return;

    const apply = (remaining: number) => {
      el.scrollTop = initialScrollTop;

      if (Math.abs(el.scrollTop - initialScrollTop) > 1 && remaining > 0) {
        requestAnimationFrame(() => apply(remaining - 1));
      }
    };

    apply(attempts);
  }

  function clearSelections() {
    selectedTopicIds.value = [];
    selectedAuthorIds.value = [];
    selectedBookIds.value = [];
  }

  return {
    selectedTopicIds,
    selectedAuthorIds,
    selectedBookIds,
    groupMode,
    sortMode,
    sortDirection,
    saveScroll,
    restoreScroll,
    clearSelections,
  };
}
