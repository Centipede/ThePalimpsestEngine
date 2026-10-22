<template>
  <div class="book-list-layout">
    <aside class="book-list-sidebar">
      <div class="sidebar-header">
        <h3>Topics</h3>
      </div>
      <TopicSelector
        v-model:selectedIds="selectedFilterTopicIds"
      />
    </aside>

    <div class="book-list">
      <h1 class="book-list__heading">Books</h1>

      <p v-if="loading" class="book-list__status">Loading…</p>
      <p v-else-if="error" class="book-list__status book-list__status--error">
        {{ error }}
      </p>

      <div v-else>
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

    <sl-dialog
      ref="dialog"
      label="Edit Book Topics"
      class="edit-topics-dialog"
    >
      <div v-if="editingBook">
        <p>Managing topics for <strong>{{ editingBook.title }}</strong></p>
        <TopicSelector
          :selectedIds="editingBook.topics"
          @update:selectedIds="handleUpdateTopics"
        />
      </div>
      <sl-button slot="footer" variant="primary" @click="dialog?.hide()">Done</sl-button>
    </sl-dialog>
  </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useLibraryStore } from '../stores/library';
import { useAuth } from '../composables/useAuth';
import type { Book } from '../types/library';
import TopicSelector from './corpus/panels/pickingpanels/TopicSelector.vue';

const store = useLibraryStore();
const { isStaff } = useAuth();
const {
  booksByAuthor,
  isLoadingBooks: loading,
  error
} = storeToRefs(store);

const selectedFilterTopicIds = ref<number[]>([]);
const editingBook = ref<Book | null>(null);
const dialog = ref<any>(null);

const filteredBooksByAuthor = computed(() => {
  if (selectedFilterTopicIds.value.length === 0) {
    return booksByAuthor.value;
  }

  return booksByAuthor.value
    .map(group => ({
      ...group,
      books: group.books.filter(book =>
        book.topics?.some(topicId => selectedFilterTopicIds.value.includes(topicId))
      )
    }))
    .filter(group => group.books.length > 0);
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

onMounted(() => {
  store.fetchAuthors();
  store.fetchBooks();
});
</script>

<style scoped>
.book-list-layout {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.book-list-sidebar {
  width: 250px;
  flex-shrink: 0;
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background: var(--color-surface, #fff);
  padding: 1rem;
  border-radius: var(--sl-border-radius-medium);
  border: 1px solid var(--color-border);
}

.sidebar-header {
  margin-bottom: 1rem;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.book-list {
  flex: 1;
  min-width: 0;
}

.book-list__heading {
  margin: 0 0 1.5rem;
  font-size: 1.75rem;
}

.book-list__status {
  color: var(--color-text-muted);
}

.book-list__status--error {
  color: var(--sl-color-danger-600, #dc2626);
}

.book-list__group {
  margin-bottom: 2rem;
}

.book-list__author {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
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
  background: var(--color-surface, #f4f4f4);
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
  .book-list-layout {
    flex-direction: column;
  }

  .book-list-sidebar {
    width: 100%;
    position: static;
    max-height: none;
  }
}
</style>