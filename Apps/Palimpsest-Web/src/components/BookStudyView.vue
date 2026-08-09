<template>
  <div class="book-study">
    <p v-if="loading" class="book-study__status">Loading…</p>
    <p v-else-if="error" class="book-study__status book-study__status--error">{{ error }}</p>
    <template v-else-if="book">
      <header class="book-study__header">
        <h1 class="book-study__title">{{ book.book.title }}</h1>
        <p v-if="author" class="book-study__author">{{ author.full_name }}</p>
      </header>

      <router-view v-if="isSectionActive" v-slot="{ Component }">
        <component :is="Component" :book-structure="book" />
      </router-view>
      <TableOfContents v-else :flows="book.flows" :machineName="machineName" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { apiFetch } from '../api';
import type { BookStructure } from '../types/library';
import { useLibraryStore } from '../stores/library';
import TableOfContents from './TableOfContents.vue';

const props = defineProps<{ machineName: string }>();

const route = useRoute();
const isSectionActive = computed(() => !!route.params.path_full);

const store = useLibraryStore();
const book = ref<BookStructure | null>(null);
const author = computed(() => store.getAuthorById(book.value?.book.by_author ?? null));
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    // Ensure authors are loaded (cached in store)
    const authorsPromise = store.fetchAuthors();

    // Fetch book structure
    const bookRes = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/structure/?tree_depth=5`);
    if (!bookRes.ok) throw new Error(`Book: HTTP ${bookRes.status}`);

    const [_, bookData] = await Promise.all([authorsPromise, bookRes.json()]);
    book.value = bookData;
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
