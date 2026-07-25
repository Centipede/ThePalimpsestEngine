<template>
  <div class="book-list">
    <h1 class="book-list__heading">Books</h1>

    <p v-if="loading" class="book-list__status">Loading…</p>
    <p v-else-if="error" class="book-list__status book-list__status--error">
      {{ error }}
    </p>

    <div v-else>
      <section
          v-for="group in booksByAuthor"
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
              :src="book.thumbnail_url || '#'"
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
          </div>

          <nav class="book-list__actions" aria-label="Book actions">
            <a :href="`/testbooks/book/${book.machine_name}/`">View</a>
            <a :href="`/teststudy/annotations/book/${book.id}/`">Study</a>
          </nav>
        </article>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

interface Book {
  id: number;
  title: string;
  abbrev: string;
  language: string;
  published: string;
  machine_name: string;
  thumbnail_url?: string;
}

interface BookGroup {
  author: string;
  books: Book[];
}

const books = ref<Book[]>([]);
const loading = ref(true);
const error = ref('');

const booksByAuthor = computed<BookGroup[]>(() => {
  const groups = new Map<string, Book[]>();

  for (const book of books.value) {
    const author = book.abbrev || 'Unknown';

    if (!groups.has(author)) {
      groups.set(author, []);
    }

    groups.get(author)?.push(book);
  }

  return Array.from(groups.entries()).map(([author, groupedBooks]) => ({
    author,
    books: groupedBooks,
  }));
});

function publishedYear(value: string): string {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 4);
  }

  return String(date.getFullYear());
}

onMounted(async () => {
  try {
    const res = await fetch('/testbooks/api/v1/book/');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    books.value = await res.json();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load books';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.book-list {
  max-width: 900px;
  padding: 2rem;
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
</style>