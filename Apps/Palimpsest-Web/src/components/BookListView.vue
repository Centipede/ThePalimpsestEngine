<template>
  <div class="book-browser">
    <div class="book-browser__header">
      <h1 class="book-browser__heading">Books</h1>
      <span class="book-browser__count">
        {{ shownBookCount }}<template v-if="hasFilters"> of {{ store.books.length }}</template>
        {{ shownBookCount === 1 ? 'book' : 'books' }}
      </span>
      <sl-button
        v-if="hasFilters"
        size="small"
        variant="default"
        @click="clearSelections"
      >
        <sl-icon slot="prefix" name="x-lg"></sl-icon>
        Clear filters
      </sl-button>
    </div>

    <div class="book-browser__columns">
      <div class="selector-column selector-column--stacked">
        <div class="selector-block">
          <div class="column-header">Topics</div>
          <TopicSelector
            v-model:selectedIds="selectedTopicIds"
            :implied-ids="impliedTopicIds"
            mode="filter"
          />
        </div>

        <div class="selector-block">
          <div class="column-header">Authors</div>
          <AuthorSelector
            v-model:selectedIds="selectedAuthorIds"
            mode="filter"
          />
        </div>
      </div>

      <div class="selector-column">
        <div class="column-header">Books</div>
        <BookSelector
          v-model:selectedIds="selectedBookIds"
          :author-ids="selectedAuthorIds"
          mode="filter"
        />
      </div>

      <div class="book-list">
        <p v-if="showLoading" class="book-list__status">Loading…</p>
        <p v-else-if="showError" class="book-list__status book-list__status--error">
          {{ error }}
        </p>

        <div
          v-else
          ref="scrollerEl"
          class="book-list__scroller"
          @scroll="saveScroll(scrollerEl)"
        >
          <p v-if="filteredBooksByAuthor.length === 0" class="book-list__status">
            No books match the current filters.
          </p>

          <section
              v-for="group in filteredBooksByAuthor"
              :key="group.author"
              class="book-list__group"
          >
            <h2 class="book-list__author">{{ group.author }}</h2>

            <article
                v-for="book in group.books"
                :key="book.id"
                class="book-list__item"
            >
              <img
                  :src="book.thumbnail_url || book.thumbnail_local || '#'"
                  :alt="book.title"
                  class="book-list__thumbnail"
              />

              <div class="book-list__details">
                <h3 class="book-list__title">
                  <span v-if="publishedYear(book.published)">
                    ({{ publishedYear(book.published) }})
                  </span>
                  {{ book.title }}
                </h3>

                <p class="book-list__machine-name">
                  {{ book.machine_name }}
                </p>

                <div v-if="book.topics && book.topics.length > 0" class="book-list__topics">
                  <sl-tag
                    v-for="topicId in book.topics"
                    :key="topicId"
                    size="small"
                    variant="neutral"
                    class="topic-tag"
                  >
                    {{ getTopicPath(topicId) }}
                  </sl-tag>
                  <sl-icon-button
                    v-if="isStaff"
                    name="pencil"
                    label="Edit Topics"
                    @click="openEditTopics(book)"
                  ></sl-icon-button>
                </div>
                <div v-else-if="isStaff" class="book-list__topics">
                  <sl-button
                    variant="default"
                    size="small"
                    @click="openEditTopics(book)"
                  >
                    <sl-icon slot="prefix" name="plus"></sl-icon>
                    Add Topics
                  </sl-button>
                </div>
              </div>

              <nav class="book-list__actions" aria-label="Book actions">
                <RouterLink :to="`/study/${book.machine_name}`">Study</RouterLink>
              </nav>
            </article>
          </section>
        </div>
      </div>
    </div>

    <sl-dialog
      ref="dialog"
      label="Edit Book Topics"
      class="edit-topics-dialog"
    >
      <div v-if="editingBook">
        <p>Managing topics for <strong>{{ editingBook.title }}</strong></p>
        <TopicSelector
          :selectedIds="editingBook.topics"
          mode="filter"
          @update:selectedIds="handleUpdateTopics"
        />
      </div>
      <sl-button slot="footer" variant="primary" @click="dialog?.hide()">Done</sl-button>
    </sl-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, nextTick, ref, computed, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useLibraryStore } from '../stores/library';
import { useAuth } from '../composables/useAuth';
import { useBookListUiState } from '../composables/useBookListUiState';
import type { Book } from '../types/library';
import TopicSelector from './corpus/panels/pickingpanels/TopicSelector.vue';
import AuthorSelector from './corpus/panels/pickingpanels/AuthorSelector.vue';
import BookSelector from './corpus/panels/pickingpanels/BookSelector.vue';

const store = useLibraryStore();
const { isStaff } = useAuth();
const {
  booksByAuthor,
  isLoadingBooks: loading,
  error
} = storeToRefs(store);

const {
  selectedTopicIds,
  selectedAuthorIds,
  selectedBookIds,
  saveScroll,
  restoreScroll,
  clearSelections,
} = useBookListUiState();

const editingBook = ref<Book | null>(null);
const dialog = ref<any>(null);
const scrollerEl = ref<HTMLElement | null>(null);

// Only take over the column while there is nothing to show: a topic edit also
// flips isLoadingBooks, and blanking the list would throw away the reader's place.
const showLoading = computed(() => loading.value && store.books.length === 0);
const showError = computed(() => !!error.value && store.books.length === 0);

/** Selected topics plus every descendant, so a non-leaf topic is never a dead end. */
const effectiveTopicIds = computed(() => {
  const ids = new Set<number>();
  const subtrees = store.topicSubtreeIds;

  for (const topicId of selectedTopicIds.value) {
    const subtree = subtrees.get(topicId);
    if (subtree) {
      for (const id of subtree) ids.add(id);
    } else {
      ids.add(topicId);
    }
  }

  return ids;
});

/** The descendants carried along by the selection, for display in the Topics column. */
const impliedTopicIds = computed(() => {
  const explicit = new Set(selectedTopicIds.value);
  return [...effectiveTopicIds.value].filter((id) => !explicit.has(id));
});

const filteredBooksByAuthor = computed(() => {
  const topicIds = effectiveTopicIds.value;
  const authorIds = selectedAuthorIds.value;
  const bookIds = selectedBookIds.value;

  if (topicIds.size === 0 && authorIds.length === 0 && bookIds.length === 0) {
    return booksByAuthor.value;
  }

  return booksByAuthor.value
    .map(group => ({
      ...group,
      books: group.books.filter(book =>
        (topicIds.size === 0 || book.topics?.some(topicId => topicIds.has(topicId))) &&
        (authorIds.length === 0 || authorIds.includes(book.by_author)) &&
        (bookIds.length === 0 || bookIds.includes(book.id))
      )
    }))
    .filter(group => group.books.length > 0);
});

const shownBookCount = computed(() =>
  filteredBooksByAuthor.value.reduce((total, group) => total + group.books.length, 0)
);

const hasFilters = computed(() =>
  selectedTopicIds.value.length > 0 ||
  selectedAuthorIds.value.length > 0 ||
  selectedBookIds.value.length > 0
);

// Picking an author hides other authors' books in the Books column; drop any
// picked book that is no longer visible there, so it cannot silently empty the list.
watch(selectedAuthorIds, (authorIds) => {
  if (authorIds.length === 0 || selectedBookIds.value.length === 0) return;

  const stillVisible = selectedBookIds.value.filter((bookId) => {
    const book = store.books.find(b => b.id === bookId);
    return book ? authorIds.includes(book.by_author) : false;
  });

  if (stillVisible.length !== selectedBookIds.value.length) {
    selectedBookIds.value = stillVisible;
  }
});

function getTopicPath(topicId: number): string {
  const topic = store.flattenedTopics.find(t => t.id === topicId);
  return topic ? topic.fullPath : `Topic ${topicId}`;
}

function openEditTopics(book: Book) {
  editingBook.value = { ...book };
  dialog.value?.show();
}

async function handleUpdateTopics(newTopicIds: number[]) {
  if (editingBook.value) {
    editingBook.value.topics = newTopicIds;
    await store.updateBook(editingBook.value.machine_name, { topics: newTopicIds });
  }
}

function publishedYear(value: string): string {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 4);
  }

  return String(date.getFullYear());
}

onMounted(async () => {
  await Promise.all([
    store.fetchAuthors(),
    store.fetchBooks(),
    store.fetchTopics(),
  ]);

  await nextTick();
  restoreScroll(scrollerEl.value);
});
</script>

<style scoped>
.book-browser {
  display: flex;
  flex-direction: column;
}

.book-browser__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 1rem;
}

.book-browser__heading {
  margin: 0;
  font-size: 1.75rem;
}

.book-browser__count {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.book-browser__columns {
  display: flex;
  gap: 1rem;
  align-items: stretch;
  height: var(--panel-height, 40rem);
}

.selector-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 200px;
  min-height: 0;
}

.selector-column--stacked {
  gap: 1rem;
}

.selector-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
}

.book-list {
  flex: 3;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.book-list__scroller {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 1rem;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border);
  border-radius: var(--sl-border-radius-medium);
}

.book-list__status {
  color: var(--color-text-muted);
  padding: 1rem 0;
}

.book-list__status--error {
  color: var(--sl-color-danger-600, #dc2626);
}

.book-list__group {
  margin-bottom: 2rem;
}

.book-list__author {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 0 0 0.75rem;
  padding: 0.75rem 0 0.5rem;
  font-size: 1.25rem;
  background: var(--color-surface, #fff);
}

.book-list__item {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--color-border, #ddd);
}

.book-list__thumbnail {
  width: 72px;
  height: 96px;
  object-fit: cover;
  background: var(--color-bg-muted, #f4f4f4);
}

.book-list__details {
  min-width: 0;
}

.book-list__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.book-list__machine-name {
  margin: 0.25rem 0 0;
  color: var(--color-text-muted, #666);
  font-size: 0.875rem;
}

.book-list__topics {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.topic-tag::part(base) {
  font-size: 0.75rem;
  padding: 0 0.25rem;
}

.edit-topics-dialog::part(body) {
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.book-list__actions {
  display: flex;
  gap: 0.75rem;
}

.book-list__actions a {
  color: var(--sl-color-primary-700, #166534);
  text-decoration: none;
}

.book-list__actions a:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .book-browser__columns {
    flex-direction: column;
    height: auto;
  }

  .selector-column,
  .selector-block {
    flex: none;
    width: 100%;
    min-width: 0;
    height: 14rem;
  }

  .selector-column--stacked {
    height: auto;
  }

  .book-list {
    flex: none;
  }

  .book-list__scroller {
    overflow: visible;
    padding: 0;
    background: none;
    border: none;
  }

  .book-list__author {
    position: static;
  }
}
</style>
