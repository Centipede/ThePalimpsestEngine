<template>
  <div class="corpus-scope-selector">
    <div class="selector-column">
      <div class="column-header">Authors</div>
      <AuthorSelector
        :selected-ids="selectedAuthorIds"
        @update:selected-ids="selectedAuthorIds = $event"
      />
    </div>

    <div class="selector-column">
      <div class="column-header">Books</div>
      <BookSelector
        :author-ids="selectedAuthorIds"
        :selected-ids="selectedBookIds"
        @update:selected-ids="handleBookSelectionChange"
      />
    </div>

    <div class="selector-column selector-column--wide">
      <div class="column-header">Chapters</div>
      <SectionSelector
        :machine-name="lastSelectedBookMachineName"
        @select-single="handleSelectSingle"
        @select-tree="handleSelectTree"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AuthorSelector from './AuthorSelector.vue';
import BookSelector from './BookSelector.vue';
import SectionSelector from './SectionSelector.vue';
import { useLibraryStore } from '../../stores/library';

const libraryStore = useLibraryStore();

const selectedAuthorIds = ref<number[]>([]);
const selectedBookIds = ref<number[]>([]);
const lastSelectedBookMachineName = ref<string | null>(null);

function handleBookSelectionChange(ids: number[]) {
  selectedBookIds.value = ids;
  if (ids.length > 0) {
    const lastId = ids[ids.length - 1];
    const book = libraryStore.books.find(b => b.id === lastId);
    if (book) {
      lastSelectedBookMachineName.value = book.machine_name;
    }
  } else {
    lastSelectedBookMachineName.value = null;
  }
}

function handleSelectSingle(path: string) {
  console.log('Single section selected:', path);
}

function handleSelectTree(path: string) {
  console.log('Section tree selected:', path);
}
</script>

<style scoped>
.corpus-scope-selector {
  display: flex;
  gap: 1rem;
  height: 500px;
  width: 100%;
}

.selector-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 200px;
}

.selector-column--wide {
  flex: 1.5;
}

.column-header {
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--sl-color-neutral-500);
  letter-spacing: 0.05em;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--sl-color-neutral-100);
}
</style>
