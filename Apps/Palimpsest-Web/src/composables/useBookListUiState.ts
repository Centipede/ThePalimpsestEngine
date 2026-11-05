import { ref, watch } from 'vue';

/**
 * Session-scoped UI state for the Study Home book list: which topics, authors
 * and books are picked as filters, and how far the list was scrolled.
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
  scrollTop: number;
}

const EMPTY_STATE: BookListUiState = { topics: [], authors: [], books: [], scrollTop: 0 };

function numberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((id): id is number => typeof id === 'number') : [];
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

  // The offset to restore, captured before any scroll handler can overwrite it.
  const initialScrollTop = stored.scrollTop;

  watch([selectedTopicIds, selectedAuthorIds, selectedBookIds], () => {
    // A changed filter makes the old offset meaningless.
    writeState({
      topics: selectedTopicIds.value,
      authors: selectedAuthorIds.value,
      books: selectedBookIds.value,
      scrollTop: 0,
    });
  });

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
    saveScroll,
    restoreScroll,
    clearSelections,
  };
}
