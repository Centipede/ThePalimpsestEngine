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
        @contextmenu.prevent="handleContextMenu(book, $event)"
      >
        <span class="book-title">{{ book.title }}</span>
        <span v-if="book.abbrev" class="book-abbrev">({{ book.abbrev }})</span>
      </div>
    </div>

    <sl-dropdown ref="dropdown">
      <div slot="trigger" class="context-menu-anchor"></div>
      <sl-menu @sl-select="handleMenuSelect">
        <sl-menu-item value="include">Include Book</sl-menu-item>
        <sl-menu-item value="exclude">Exclude Book</sl-menu-item>
        <sl-divider v-if="selectedIds.length > 0"></sl-divider>
        <sl-menu-item v-if="selectedIds.length > 0" value="include-selected">
          Include Selected ({{ selectedIds.length }})
        </sl-menu-item>
        <sl-menu-item v-if="selectedIds.length > 0" value="exclude-selected">
          Exclude Selected ({{ selectedIds.length }})
        </sl-menu-item>
      </sl-menu>
    </sl-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useLibraryStore } from '../../stores/library';
import type { Book } from '../../types/library';

const props = defineProps<{
  selectedIds: number[];
  authorIds: number[];
}>();

const emit = defineEmits<{
  (e: 'update:selectedIds', ids: number[]): void;
  (e: 'includeBooks', ids: number[]): void;
  (e: 'excludeBooks', ids: number[]): void;
}>();

const libraryStore = useLibraryStore();
const searchQuery = ref('');
const dropdown = ref<any>(null);
const contextBook = ref<Book | null>(null);

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

function handleContextMenu(book: Book, event: MouseEvent) {
  contextBook.value = book;
  
  const anchor = dropdown.value?.querySelector('.context-menu-anchor') as HTMLElement | null;
  if (!anchor || !dropdown.value) return;

  anchor.style.position = 'fixed';
  anchor.style.left = `${event.clientX}px`;
  anchor.style.top = `${event.clientY}px`;
  anchor.style.width = '1px';
  anchor.style.height = '1px';

  dropdown.value.show();
}

function handleMenuSelect(event: CustomEvent) {
  const action = event.detail.item.value;
  
  if (action === 'include' && contextBook.value) {
    emit('includeBooks', [contextBook.value.id]);
  } else if (action === 'exclude' && contextBook.value) {
    emit('excludeBooks', [contextBook.value.id]);
  } else if (action === 'include-selected') {
    emit('includeBooks', props.selectedIds);
  } else if (action === 'exclude-selected') {
    emit('excludeBooks', props.selectedIds);
  }
}
</script>

<style scoped>
.book-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
  position: relative;
}

.context-menu-anchor {
  width: 1px;
  height: 1px;
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
