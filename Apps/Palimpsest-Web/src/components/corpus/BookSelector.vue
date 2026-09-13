<template>
  <div class="book-selector">
    <sl-input
      v-model="searchQuery"
      placeholder="Filter books..."
      size="small"
      clearable
    >
      <sl-icon name="search" slot="prefix"></sl-icon>
    </sl-input>

    <div class="book-list">
      <div
        v-for="book in filteredBooks"
        :key="book.id"
        :class="['book-item', { 'is-selected': selectedIds.includes(book.id) }]"
        @click="toggleSelection(book.id)"
      >
        <span class="book-title">{{ book.title }}</span>
        <span v-if="book.abbrev" class="book-abbrev">({{ book.abbrev }})</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useLibraryStore } from '../../stores/library';

const props = defineProps<{
  selectedIds: number[];
  authorIds: number[];
}>();

const emit = defineEmits<{
  (e: 'update:selectedIds', ids: number[]): void;
}>();

const libraryStore = useLibraryStore();
const searchQuery = ref('');

onMounted(() => {
  libraryStore.fetchBooks();
});

const filteredBooks = computed(() => {
  let books = libraryStore.books;

  // Filter by author if any selected
  if (props.authorIds.length > 0) {
    books = books.filter(b => props.authorIds.includes(b.by_author));
  }

  const query = searchQuery.value.toLowerCase().trim();
  if (query) {
    books = books.filter(b =>
      b.title.toLowerCase().includes(query) ||
      b.abbrev.toLowerCase().includes(query)
    );
  }

  return books;
});

function toggleSelection(id: number) {
  const newSelection = [...props.selectedIds];
  const index = newSelection.indexOf(id);
  if (index === -1) {
    newSelection.push(id);
  } else {
    newSelection.splice(index, 1);
  }
  emit('update:selectedIds', newSelection);
}
</script>

<style scoped>
.book-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
}

.book-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-medium);
}

.book-item {
  padding: 0.5rem;
  cursor: pointer;
  transition: background-color var(--sl-transition-fast);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.book-item:hover {
  background-color: var(--sl-color-neutral-100);
}

.book-item.is-selected {
  background-color: var(--sl-color-primary-100);
  color: var(--sl-color-primary-700);
}

.book-title {
  flex: 1;
}

.book-abbrev {
  font-size: 0.8rem;
  color: var(--sl-color-neutral-500);
}
</style>
