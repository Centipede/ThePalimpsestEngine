<template>
  <div class="topic-assignments">
    <header class="view-header">
      <h2>Topic Assignments</h2>
      <span class="view-header__count">
        {{ shownBookCount }}<template v-if="hasFilters"> of {{ store.books.length }}</template>
        {{ shownBookCount === 1 ? 'book' : 'books' }}
        · {{ topics.length }} {{ topics.length === 1 ? 'topic' : 'topics' }}
      </span>
      <sl-button v-if="hasFilters" size="small" variant="default" @click="clearSelections">
        <sl-icon slot="prefix" name="x-lg"></sl-icon>
        Clear filters
      </sl-button>
    </header>

    <!-- A write failure gets its own banner above the columns, so a failed
         toggle never replaces the grid or reads as a load failure. -->
    <sl-alert
      v-if="writeError"
      variant="danger"
      open
      closable
      @sl-after-hide="writeError = ''"
    >
      <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
      {{ writeError }}
    </sl-alert>

    <div class="topic-assignments__columns">
      <div class="selector-column selector-column--stacked">
        <div class="selector-block">
          <div class="column-header">Authors</div>
          <AuthorSelector
            v-model:selectedIds="selectedAuthorIds"
            mode="filter"
          />
        </div>

        <div class="selector-block">
          <div class="column-header">Books</div>
          <BookSelector
            v-model:selectedIds="selectedBookIds"
            :author-ids="selectedAuthorIds"
            mode="filter"
          />
        </div>
      </div>

      <div class="matrix-area">
        <p v-if="showLoading" class="matrix-area__status">
          <sl-spinner></sl-spinner>
          Loading books and topics…
        </p>

        <sl-alert v-else-if="showError" variant="danger" open>
          <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
          <strong>Error</strong><br />
          {{ store.error }}
        </sl-alert>

        <p v-else-if="topics.length === 0" class="matrix-area__status">
          No topics have been defined yet.
        </p>

        <p v-else-if="groups.length === 0" class="matrix-area__status">
          No books match the current filters.
        </p>

        <TopicAssignmentMatrix
          v-else
          :groups="groups"
          :topics="topics"
          :pending="pending"
          @toggle="toggleAssignment"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useLibraryStore } from '../stores/library';
import type { Book } from '../types/library';
import AuthorSelector from '../components/corpus/panels/pickingpanels/AuthorSelector.vue';
import BookSelector from '../components/corpus/panels/pickingpanels/BookSelector.vue';
import TopicAssignmentMatrix from '../components/admin/TopicAssignmentMatrix.vue';

const store = useLibraryStore();

// Filters are local refs rather than useBookListUiState(): that composable is a
// module singleton keyed to Study Home, so reusing it would entangle this
// screen's filters with the reader's book list.
const selectedAuthorIds = ref<number[]>([]);
const selectedBookIds = ref<number[]>([]);

// ref() deep-wraps the Set in a reactive proxy with collection handlers, so
// add/delete are tracked and re-render the cell. A shallowRef would not be.
const pending = ref(new Set<string>());
const writeError = ref('');

/** Serialised write queues, one per book machine_name. */
const rowQueues = new Map<string, Promise<void>>();

const topics = computed(() => store.flattenedTopics);

onMounted(() => {
  // All three cache on length and early-return, so the selectors' own
  // onMounted fetches collapse into no-ops.
  void Promise.all([store.fetchAuthors(), store.fetchBooks(), store.fetchTopics()]);
});

// Every toggle flips the shared isLoadingBooks, and a failed toggle sets
// store.error. Both states may only take over the pane while there is
// genuinely nothing to show, or a single click would blank the matrix or turn
// it into an error page (same guard as BookListView).
const showLoading = computed(() =>
  (store.isLoadingBooks || store.isLoadingTopics) &&
  (store.books.length === 0 || store.topics.length === 0)
);

const showError = computed(() =>
  !!store.error && (store.books.length === 0 || store.topics.length === 0)
);

/** Same semantics as the Study Home book list: empty selection means no filter. */
const groups = computed(() => {
  const authorIds = selectedAuthorIds.value;
  const bookIds = selectedBookIds.value;

  if (authorIds.length === 0 && bookIds.length === 0) return store.booksByAuthor;

  return store.booksByAuthor
    .map((group) => ({
      ...group,
      books: group.books.filter((book) =>
        (authorIds.length === 0 || authorIds.includes(book.by_author)) &&
        (bookIds.length === 0 || bookIds.includes(book.id))
      ),
    }))
    .filter((group) => group.books.length > 0);
});

const shownBookCount = computed(() =>
  groups.value.reduce((total, group) => total + group.books.length, 0)
);

const hasFilters = computed(() =>
  selectedAuthorIds.value.length > 0 || selectedBookIds.value.length > 0
);

function clearSelections() {
  selectedAuthorIds.value = [];
  selectedBookIds.value = [];
}

// Picking an author hides other authors' books in the Books column; drop any
// picked book that is no longer visible there, so it cannot silently empty the
// matrix (same guard as BookListView).
watch(selectedAuthorIds, (authorIds) => {
  if (authorIds.length === 0 || selectedBookIds.value.length === 0) return;

  const stillVisible = selectedBookIds.value.filter((bookId) => {
    const book = store.books.find((b) => b.id === bookId);
    return book ? authorIds.includes(book.by_author) : false;
  });

  if (stillVisible.length !== selectedBookIds.value.length) {
    selectedBookIds.value = stillVisible;
  }
});

function cellKey(machineName: string, topicId: number): string {
  return `${machineName}:${topicId}`;
}

function topicLabel(topicId: number): string {
  return topics.value.find((t) => t.id === topicId)?.fullPath ?? `Topic ${topicId}`;
}

/**
 * Serialises writes per book. updateBook replaces the book's whole topic set,
 * so two clicks on one row computed from the same snapshot would make the
 * second PATCH silently undo the first.
 */
function enqueue(machineName: string, task: () => Promise<void>): Promise<void> {
  const previous = rowQueues.get(machineName) ?? Promise.resolve();
  // Same task on both paths: a failed predecessor must not stall the row.
  const next = previous.then(task, task);
  rowQueues.set(machineName, next);
  void next.finally(() => {
    if (rowQueues.get(machineName) === next) rowQueues.delete(machineName);
  });
  return next;
}

/**
 * Toggle one book's membership in one topic.
 *
 * Deliberately not optimistic: updateBook writes the server's response over the
 * stored book, so the cell flips from authoritative data — and a failure needs
 * no rollback, because nothing local was ever changed.
 */
async function toggleAssignment({ book, topicId }: { book: Book; topicId: number }) {
  const key = cellKey(book.machine_name, topicId);
  if (pending.value.has(key)) return;

  pending.value.add(key);

  await enqueue(book.machine_name, async () => {
    // Read the topic set fresh: a queued predecessor may have replaced the book.
    const current = store.books.find((b) => b.machine_name === book.machine_name)?.topics ?? [];
    const assigned = current.includes(topicId);
    const topicIds = assigned
      ? current.filter((id) => id !== topicId)
      : [...current, topicId];

    try {
      await store.updateBook(book.machine_name, { topics: topicIds });
      writeError.value = '';
    } catch {
      writeError.value =
        `Could not ${assigned ? 'remove' : 'add'} “${topicLabel(topicId)}” ` +
        `for “${book.title}”. The matrix still shows the saved state.`;
    } finally {
      pending.value.delete(key);
    }
  });
}
</script>

<style scoped>
.topic-assignments {
  /* .admin-view is a stretched flex item of a `flex: 1; overflow: hidden` row,
     so it has a definite height and 100% resolves here. */
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.view-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.view-header h2 {
  margin: 0;
}

.view-header__count {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.topic-assignments__columns {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 1rem;
  align-items: stretch;
}

.selector-column--stacked {
  width: 16rem;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
}

.selector-block {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.matrix-area {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.matrix-area__status {
  color: var(--color-text-muted);
  padding: 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 900px) {
  .topic-assignments__columns {
    flex-direction: column;
  }

  .selector-column--stacked {
    width: 100%;
  }

  .selector-block {
    height: 12rem;
    flex: none;
  }

  .matrix-area {
    min-height: 24rem;
  }
}
</style>
