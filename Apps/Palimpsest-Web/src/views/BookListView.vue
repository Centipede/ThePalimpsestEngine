<template>
  <div class="book-list">
    <h1 class="book-list__heading">Books</h1>
    <p v-if="loading" class="book-list__status">Loading…</p>
    <p v-else-if="error" class="book-list__status book-list__status--error">{{ error }}</p>
    <ul v-else class="book-list__items">
      <li v-for="book in books" :key="book.id" class="book-list__item">
        <span class="book-list__title">{{ book.title }}</span>
        <span class="book-list__meta">{{ book.abbrev }} &middot; {{ book.language }} &middot; {{ book.published }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Book {
  id: number;
  title: string;
  abbrev: string;
  language: string;
  published: string;
  machine_name: string;
}

const books = ref<Book[]>([]);
const loading = ref(true);
const error = ref('');

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
  padding: 2rem;
  max-width: 800px;
}

.book-list__heading {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1.5rem;
  color: var(--color-text);
}

.book-list__status {
  color: var(--color-text-muted);
}

.book-list__status--error {
  color: var(--sl-color-danger-600, #dc2626);
}

.book-list__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.book-list__item {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.book-list__title {
  font-weight: 500;
  color: var(--color-text);
}

.book-list__meta {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}
</style>
