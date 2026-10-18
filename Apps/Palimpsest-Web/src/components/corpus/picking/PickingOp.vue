<template>
  <div class="picking-op-container">
    <div class="picking-op__summary" v-if="props.node.steps.length > 0">
      <OperatorNodeView :node="props.node" view-style="compact"/>
    </div>
    <div class="picking-op">
      <div class="selector-column">
        <div class="column-header">Topics</div>
        <TopicSelector
          :selected-ids="selectedTopicIds"
          @update:selected-ids="selectedTopicIds = $event"
          @include-topics="handleIncludeTopics"
          @exclude-topics="handleExcludeTopics"
        />
      </div>

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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AuthorSelector from './AuthorSelector.vue';
import BookSelector from './BookSelector.vue';
import TopicSelector from './TopicSelector.vue';
import SectionSelector from './SectionSelector.vue';
import { useLibraryStore } from '../../../stores/library';
import type { Section } from '../../../types/library';
import type { PickingOperator, PickingStep, PickStrategy, PickExpansion } from "../../../types/corpusquery.ts";
import OperatorNodeView from "../OperatorNodeView.vue";

const props = defineProps<{
  node: PickingOperator;
  initialAuthors?: number[];
  initialBooks?: number[];
  initialSections?: number[];
  initialTopics?: number[];
}>();

const libraryStore = useLibraryStore();

const selectedTopicIds = ref<number[]>(props.initialTopics || []);
const selectedAuthorIds = ref<number[]>(props.initialAuthors || []);
const selectedBookIds = ref<number[]>(props.initialBooks || []);
const lastSelectedBookMachineName = ref<string | null>(null);

onMounted(() => {
  if (selectedBookIds.value.length > 0) {
    const lastId = selectedBookIds.value[selectedBookIds.value.length - 1];
    const book = libraryStore.books.find(b => b.id === lastId);
    if (book) {
      lastSelectedBookMachineName.value = book.machine_name;
    }
  }
});

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

function addSteps(steps: PickingStep[]) {
  props.node.steps.push(...steps);
}

function handleIncludeTopics(ids: number[]) {
  const items: PickingStep[] = ids.map(id => {
    const topic = libraryStore.flattenedTopics.find(t => t.id === id);
    return {
      strategy: 'include',
      expansion: 'self',
      properties: 'contents',
      selection: [{
        obj_kind: 'topic',
        id,
        name: topic?.name || '',
        path: topic?.path || ''
      }]
    };
  });
  addSteps(items);
}

function handleExcludeTopics(ids: number[]) {
  const items: PickingStep[] = ids.map(id => {
    const topic = libraryStore.flattenedTopics.find(t => t.id === id);
    return {
      strategy: 'exclude',
      expansion: 'self',
      properties: 'contents',
      selection: [{
        obj_kind: 'topic',
        id,
        name: topic?.name || '',
        path: topic?.path || ''
      }]
    };
  });
  addSteps(items);
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
  addSteps(items);
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
  addSteps(items);
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
  addSteps(items);
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
  addSteps(items);
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
  addSteps([step]);
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
.picking-op-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.picking-op__summary {
  padding-bottom: 0.75rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.picking-op {
  display: flex;
  gap: 1rem;
  height: 400px;
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
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--color-border);
}
</style>
