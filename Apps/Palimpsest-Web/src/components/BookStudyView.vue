<template>
  <div class="book-study">
    <p v-if="loading" class="book-study__status">Loading…</p>
    <p v-else-if="error" class="book-study__status book-study__status--error">{{ error }}</p>
    <template v-else-if="book">
      <header class="book-study__header">
        <h1 class="book-study__title">{{ book.book.title }}</h1>
        <p v-if="author" class="book-study__author">{{ author.full_name }}</p>
      </header>
      <TableOfContents :flows="book.flows" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiFetch } from '../api';
import type { Author, Book, Flow } from '../types/library';
import TableOfContents from './TableOfContents.vue';

interface BookStructure {
  book: Book;
  flows: Flow[];
}

const props = defineProps<{ machineName: string }>();

const authors = ref<Author[] | null>(null);
const book = ref<BookStructure | null>(null);
const author = computed(() => authors.value?.find(a => a.id === book.value?.book.by_author));
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    const [authorsRes, bookRes] = await Promise.all([
      apiFetch('/testbooks/api/v1/author/'),
      apiFetch(`/testbooks/api/v1/book/${props.machineName}/structure/?tree_depth=5`),
    ]);
    if (!authorsRes.ok) throw new Error(`Authors: HTTP ${authorsRes.status}`);
    if (!bookRes.ok) throw new Error(`Book: HTTP ${bookRes.status}`);
    authors.value = await authorsRes.json();
    book.value = await bookRes.json();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load book';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.book-study {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
}

.book-study__header {
  padding: 1.5rem 1rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.book-study__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.book-study__author {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.book-study__status {
  padding: 2rem;
  color: var(--color-text-muted);
}

.book-study__status--error {
  color: var(--sl-color-danger-600, #dc2626);
}
</style>
