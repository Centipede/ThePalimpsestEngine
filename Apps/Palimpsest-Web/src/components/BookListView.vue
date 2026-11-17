<template>
  <div class="book-browser">
    <div class="book-browser__header">
      <h1 class="book-browser__heading">Books</h1>
      <span class="book-browser__count">
        {{ shownBookCount }}<template v-if="hasFilters"> of {{ store.books.length }}</template>
        <!-- "1 of 8 books": with a total alongside it, the noun follows the total. -->
        {{ shownBookCount === 1 && !hasFilters ? 'book' : 'books' }}
      </span>

      <div class="book-browser__controls">
        <div class="book-browser__control">
          <span class="book-browser__control-label">Group</span>
          <sl-select
            class="book-browser__select"
            size="small"
            hoist
            :value="groupMode"
            @sl-change="groupMode = selectValue($event) as GroupMode"
          >
            <sl-option value="author">Author</sl-option>
            <sl-option value="topic">Topic</sl-option>
          </sl-select>
        </div>

        <div class="book-browser__control">
          <span class="book-browser__control-label">Sort</span>
          <sl-select
            class="book-browser__select"
            size="small"
            hoist
            :value="sortMode"
            @sl-change="sortMode = selectValue($event) as SortMode"
          >
            <sl-option value="published">Published</sl-option>
            <sl-option value="title">Title</sl-option>
          </sl-select>
          <sl-tooltip :content="directionHint" hoist>
            <sl-icon-button
              :name="sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'"
              :label="directionHint"
              @click="toggleSortDirection"
            ></sl-icon-button>
          </sl-tooltip>
        </div>
      </div>

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
          <p v-if="visibleGroups.length === 0" class="book-list__status">
            No books match the current filters.
          </p>

          <section
              v-for="group in visibleGroups"
              :key="group.key"
              class="book-list__group"
          >
            <h2 class="book-list__group-heading">{{ group.label }}</h2>

            <article
                v-for="book in group.books"
                :key="`${group.key}:${book.id}`"
                class="book-list__item"
            >
              <img
                  v-if="thumbnailFor(book)"
                  :src="thumbnailFor(book)"
                  :alt="book.title"
                  class="book-list__thumbnail"
              />
              <span v-else class="book-list__thumbnail book-list__thumbnail--empty" aria-hidden="true"></span>

              <div class="book-list__details">
                <p class="book-list__line">
                  <span v-if="publishedYear(book.published)" class="book-list__year">
                    ({{ publishedYear(book.published) }})
                  </span>
                  <span class="book-list__title">{{ book.title }}</span>
                  <span class="book-list__machine-name">{{ book.machine_name }}</span>
                  <!-- Grouping by topic drops the author heading, so name the author here instead. -->
                  <span v-if="groupMode === 'topic' && authorNames(book)" class="book-list__author">
                    {{ authorNames(book) }}
                  </span>
                </p>

                <p
                  v-if="book.topics?.length || facetsFor(book).length"
                  class="book-list__chips"
                >
                  <sl-tooltip
                    v-for="topicId in book.topics"
                    :key="`topic-${topicId}`"
                    :content="topicPath(topicId)"
                    hoist
                  >
                    <sl-tag size="small" variant="neutral" class="book-list__chip">
                      {{ topicName(topicId) }}
                    </sl-tag>
                  </sl-tooltip>

                  <sl-tooltip
                    v-for="facet in facetsFor(book)"
                    :key="`facet-${facet.id}`"
                    :content="facet.name"
                    hoist
                  >
                    <span class="book-list__facet">{{ facet.symbol }}</span>
                  </sl-tooltip>
                </p>
              </div>

              <nav class="book-list__actions" aria-label="Book actions">
                <RouterLink :to="`/study/${book.machine_name}`">Study</RouterLink>
              </nav>
            </article>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, nextTick, ref, computed, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useLibraryStore } from '../stores/library';
import { useFacetsStore } from '../stores/facets';
import { useBookListUiState } from '../composables/useBookListUiState';
import {
  bookAuthorIds,
  groupBooks,
  publishedYear,
  sortBooks,
  type GroupMode,
  type SortMode,
} from '../utils/bookGrouping';
import { facetsForBook } from '../utils/bookFacets';
import type { Book } from '../types/library';
import TopicSelector from './corpus/panels/pickingpanels/TopicSelector.vue';
import AuthorSelector from './corpus/panels/pickingpanels/AuthorSelector.vue';
import BookSelector from './corpus/panels/pickingpanels/BookSelector.vue';

const store = useLibraryStore();
const facetsStore = useFacetsStore();
const {
  isLoadingBooks: loading,
  error
} = storeToRefs(store);

const {
  selectedTopicIds,
  selectedAuthorIds,
  selectedBookIds,
  groupMode,
  sortMode,
  sortDirection,
  saveScroll,
  restoreScroll,
  clearSelections,
} = useBookListUiState();

const scrollerEl = ref<HTMLElement | null>(null);

// Only take over the column while there is nothing to show: a background refetch
// also flips isLoadingBooks, and blanking the list would throw away the reader's place.
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

/** One entry per book, before grouping fans any of them out across several groups. */
const filteredBooks = computed(() => {
  const topicIds = effectiveTopicIds.value;
  const authorIds = selectedAuthorIds.value;
  const bookIds = selectedBookIds.value;

  if (topicIds.size === 0 && authorIds.length === 0 && bookIds.length === 0) {
    return store.books;
  }

  return store.books.filter(book =>
    (topicIds.size === 0 || book.topics?.some(topicId => topicIds.has(topicId))) &&
    (authorIds.length === 0 || bookAuthorIds(book).some(id => authorIds.includes(id))) &&
    (bookIds.length === 0 || bookIds.includes(book.id))
  );
});

const topicsById = computed(
  () => new Map(store.flattenedTopics.map((topic) => [topic.id, topic]))
);

function topicPath(topicId: number): string {
  return topicsById.value.get(topicId)?.fullPath ?? `Topic ${topicId}`;
}

/** The leaf name alone: the full path lives in the chip's tooltip, to keep rows narrow. */
function topicName(topicId: number): string {
  return topicsById.value.get(topicId)?.name ?? `Topic ${topicId}`;
}

function authorLabel(authorId: number): string {
  return store.getAuthorById(authorId)?.abbrev || 'Unknown';
}

function authorNames(book: Book): string {
  return bookAuthorIds(book).map(authorLabel).join(', ');
}

const visibleGroups = computed(() =>
  groupBooks(filteredBooks.value, groupMode.value, {
    authorLabel,
    topicLabel: topicPath,
  }).map((group) => ({
    ...group,
    books: sortBooks(group.books, sortMode.value, sortDirection.value),
  }))
);

// Counts books, not rows: grouping can place one book under several headings.
const shownBookCount = computed(() => filteredBooks.value.length);

const hasFilters = computed(() =>
  selectedTopicIds.value.length > 0 ||
  selectedAuthorIds.value.length > 0 ||
  selectedBookIds.value.length > 0
);

const directionHint = computed(() => {
  if (sortMode.value === 'published') {
    return sortDirection.value === 'asc' ? 'Oldest first' : 'Newest first';
  }
  return sortDirection.value === 'asc' ? 'A to Z' : 'Z to A';
});

function toggleSortDirection() {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
}

function selectValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function thumbnailFor(book: Book): string {
  return book.thumbnail_url || book.thumbnail_local || '';
}

function facetsFor(book: Book) {
  return facetsForBook(book, facetsStore.getFacetById);
}

// Picking an author hides other authors' books in the Books column; drop any
// picked book that is no longer visible there, so it cannot silently empty the list.
watch(selectedAuthorIds, (authorIds) => {
  if (authorIds.length === 0 || selectedBookIds.value.length === 0) return;

  const stillVisible = selectedBookIds.value.filter((bookId) => {
    const book = store.books.find(b => b.id === bookId);
    return book ? bookAuthorIds(book).some(id => authorIds.includes(id)) : false;
  });

  if (stillVisible.length !== selectedBookIds.value.length) {
    selectedBookIds.value = stillVisible;
  }
});

onMounted(async () => {
  await Promise.all([
    store.fetchAuthors(),
    store.fetchBooks(),
    store.fetchTopics(),
    facetsStore.fetchFacetQueries(),
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
  flex-wrap: wrap;
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

.book-browser__controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-left: auto;
}

.book-browser__control {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.book-browser__control-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.book-browser__select {
  width: 8.5rem;
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
  padding: 0 0.75rem;
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
  margin-bottom: 0.75rem;
}

.book-list__group-heading {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 0;
  padding: 0.4rem 0 0.25rem;
  font-size: 0.95rem;
  background: var(--color-surface, #fff);
  border-bottom: 1px solid var(--color-border);
}

.book-list__item {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--color-border, #ddd);
  font-size: 0.8rem;
}

.book-list__thumbnail {
  width: 32px;
  height: 44px;
  object-fit: cover;
  border-radius: var(--sl-border-radius-small);
  border: 1px solid var(--color-border);
  background: var(--color-bg-muted, #f4f4f4);
  flex-shrink: 0;
}

.book-list__thumbnail--empty {
  display: block;
}

.book-list__details {
  min-width: 0;
}

.book-list__line {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-list__year {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.book-list__title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-list__machine-name {
  color: var(--color-text-muted, #666);
  font-size: 0.7rem;
  font-family: var(--sl-font-mono);
}

.book-list__author {
  color: var(--color-text-muted);
  font-size: 0.7rem;
}

.book-list__chips {
  margin: 0.1rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  align-items: center;
}

.book-list__chip::part(base) {
  font-size: 0.65rem;
  padding: 0 0.3rem;
}

/*
 * Facets are symbols, not words, so they get a light pill of their own rather
 * than sl-badge's filled one: an emoji on a dark fill reads as a smudge at this
 * size. The shape still differs from the topic tags beside them.
 */
.book-list__facet {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.3rem;
  padding: 0.05rem 0.3rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-muted);
  font-size: 0.85rem;
  line-height: 1.3;
  cursor: default;
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

  .book-browser__controls {
    margin-left: 0;
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

  .book-list__group-heading {
    position: static;
  }

  /* The one-line row cannot ellipsis itself down to phone width; let it wrap. */
  .book-list__line {
    white-space: normal;
  }
}
</style>
