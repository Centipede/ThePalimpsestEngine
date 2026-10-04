<template>
  <div class="corpus-scope-selector">
    <div class="selector-column">
      <div class="column-header">Authors</div>
      <AuthorSelector
        :selected-ids="selectedAuthorIds"
        @update:selected-ids="selectedAuthorIds = $event"
        @include-authors="handleIncludeAuthors"
        @exclude-authors="handleExcludeAuthors"
      />
    </div>

    <div class="selector-column">
      <div class="column-header">Books</div>
      <BookSelector
        :author-ids="selectedAuthorIds"
        :selected-ids="selectedBookIds"
        @update:selected-ids="handleBookSelectionChange"
        @include-books="handleIncludeBooks"
        @exclude-books="handleExcludeBooks"
      />
    </div>

    <div class="selector-column selector-column--wide">
      <div class="column-header">Chapters</div>
      <SectionSelector
        :machine-name="lastSelectedBookMachineName"
        :selected-ids="initialSections"
        @include-single="handleIncludeSingle"
        @include-tree="handleIncludeTree"
        @exclude-single="handleExcludeSingle"
        @exclude-tree="handleExcludeTree"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import AuthorSelector from './AuthorSelector.vue';
import BookSelector from './BookSelector.vue';
import SectionSelector from './SectionSelector.vue';
import { useLibraryStore } from '../../stores/library';
import type { 
  Section
} from '../../types/library';
import type {PickExpansion, PickingStep, PickStrategy} from "../../types/corpusquery.ts";

const props = defineProps<{
  initialAuthors?: number[];
  initialBooks?: number[];
  initialSections?: number[];
}>();

const libraryStore = useLibraryStore();

const emit = defineEmits<{
  (e: 'add-materials', items: PickingStep[]): void;
}>();

const selectedAuthorIds = ref<number[]>(props.initialAuthors || []);
const selectedBookIds = ref<number[]>(props.initialBooks || []);
const lastSelectedBookMachineName = ref<string | null>(null);

watch(() => libraryStore.books, (books) => {
  if (props.initialBooks && props.initialBooks.length > 0 && !lastSelectedBookMachineName.value) {
    const bookId = props.initialBooks[props.initialBooks.length - 1];
    const book = books.find(b => b.id === bookId);
    if (book) {
      lastSelectedBookMachineName.value = book.machine_name;
    }
  }
}, { immediate: true });

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

function handleIncludeAuthors(ids: number[]) {
  const items: PickingStep[] = ids.map(id => {
    const author = libraryStore.authors.find(a => a.id === id);
    return {
      strategy: 'include',
      expansion: 'self',
      properties: 'contents',
      selection: [{
        obj_kind: 'author',
        id,
        abbrev: author?.abbrev || ''
      }]
    };
  });
  emit('add-materials', items);
}

function handleExcludeAuthors(ids: number[]) {
  const items: PickingStep[] = ids.map(id => {
    const author = libraryStore.authors.find(a => a.id === id);
    return {
      strategy: 'exclude',
      expansion: 'self',
      properties: 'contents',
      selection: [{
        obj_kind: 'author',
        id,
        abbrev: author?.abbrev || ''
      }]
    };
  });
  emit('add-materials', items);
}

function handleIncludeBooks(ids: number[]) {
  const items: PickingStep[] = ids.map(id => {
    const book = libraryStore.books.find(b => b.id === id);
    const author = libraryStore.authors.find(a => a.id === book?.by_author);
    return {
      strategy: 'include',
      expansion: 'self',
      properties: 'contents',
      selection: [{
        obj_kind: 'book',
        id,
        abbrev: book?.abbrev || '',
        machine_name: book?.machine_name || '',
        author_abbrev: author?.abbrev || null
      }]
    };
  });
  emit('add-materials', items);
}

function handleExcludeBooks(ids: number[]) {
  const items: PickingStep[] = ids.map(id => {
    const book = libraryStore.books.find(b => b.id === id);
    const author = libraryStore.authors.find(a => a.id === book?.by_author);
    return {
      strategy: 'exclude',
      expansion: 'self',
      properties: 'contents',
      selection: [{
        obj_kind: 'book',
        id,
        abbrev: book?.abbrev || '',
        machine_name: book?.machine_name || '',
        author_abbrev: author?.abbrev || null
      }]
    };
  });
  emit('add-materials', items);
}

function handleSectionAction(section: Section, strategy: PickStrategy, expansion: PickExpansion) {
  const book = libraryStore.books.find(b => b.machine_name === lastSelectedBookMachineName.value);
  const author = libraryStore.authors.find(a => a.id === book?.by_author);
  
  const step: PickingStep = {
    strategy,
    expansion,
    properties: 'contents',
    selection: [{
      obj_kind: 'section',
      id: section.id,
      path_full: section.path_full,
      path_coded: section.path_coded || section.path_full,
      book_abbrev: book?.abbrev || null,
      author_abbrev: author?.abbrev || null
    }]
  };
  emit('add-materials', [step]);
}

function handleIncludeSingle(section: Section) {
  handleSectionAction(section, 'include', 'self');
}

function handleIncludeTree(section: Section) {
  handleSectionAction(section, 'include', 'descendants');
}

function handleExcludeSingle(section: Section) {
  handleSectionAction(section, 'exclude', 'self');
}

function handleExcludeTree(section: Section) {
  handleSectionAction(section, 'exclude', 'descendants');
}
</script>

<style scoped>
.corpus-scope-selector {
  display: flex;
  gap: 0.5rem;
  height: 60vh;
  width: 100%;
}

@media (max-width: 768px) {
  .corpus-scope-selector {
    flex-direction: column;
    height: auto;
  }
  
  .selector-column {
    height: 300px;
  }
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

</style>
