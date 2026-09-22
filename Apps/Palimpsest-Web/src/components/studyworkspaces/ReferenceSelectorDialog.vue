<template>
  <sl-dialog ref="dialog" :label="label" class="reference-selector-dialog">
    <div class="selector-container">
      <div class="selector-column">
        <div class="column-header">Authors</div>
        <AuthorSelector
          mode="reference"
          :selected-ids="selectedAuthorIds"
          @update:selected-ids="selectedAuthorIds = $event"
          @reference-action="handleReferenceAction"
        />
      </div>

      <div class="selector-column">
        <div class="column-header">Books</div>
        <BookSelector
          mode="reference"
          :author-ids="selectedAuthorIds"
          :selected-ids="selectedBookIds"
          @update:selected-ids="handleBookSelectionChange"
          @reference-action="handleReferenceAction"
        />
      </div>

      <div class="selector-column selector-column--wide">
        <div class="column-header">Chapters</div>
        <SectionSelector
          mode="reference"
          :machine-name="lastSelectedBookMachineName"
          @reference-action="handleReferenceAction"
        />
      </div>
    </div>
    <sl-button slot="footer" @click="hide">Cancel</sl-button>
  </sl-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AuthorSelector from '../corpus/AuthorSelector.vue';
import BookSelector from '../corpus/BookSelector.vue';
import SectionSelector from '../corpus/SectionSelector.vue';
import { useLibraryStore } from '../../stores/library';

const props = defineProps<{
  label?: string;
}>();

const emit = defineEmits<{
  (e: 'reference-action', payload: { action: 'add' | 'move', type: 'book' | 'section', item: any }): void;
}>();

const libraryStore = useLibraryStore();
const dialog = ref<any>(null);

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

function handleReferenceAction(payload: any) {
  if (payload.type === 'section') {
    const book = libraryStore.books.find(b => b.machine_name === lastSelectedBookMachineName.value);
    payload.book = book;
  }
  emit('reference-action', payload);
  hide();
}

function show() {
  dialog.value?.show();
}

function hide() {
  dialog.value?.hide();
}

defineExpose({ show, hide });
</script>

<style scoped>
.reference-selector-dialog::part(panel) {
  --width: 90vw;
  max-width: 1000px;
}

.selector-container {
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
  flex: 3;
}

.column-header {
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--color-border);
}
</style>
