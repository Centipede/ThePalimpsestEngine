<template>
  <div class="association-manager">
    <header class="section-header">
      <h3>{{ title }}</h3>
      <sl-button variant="default" size="small" circle @click="showSelector = true">
        <sl-icon name="plus"></sl-icon>
      </sl-button>
    </header>

    <div class="item-list">
      <div v-if="items.length === 0" class="empty-state">
        No {{ title.toLowerCase() }} associated.
      </div>
      <sl-tag
          v-for="item in items"
          :key="item.id"
          removable
          @sl-remove="emit('remove', item.id)"
          class="association-tag"
      >
        {{ getItemLabel(item) }}
      </sl-tag>
    </div>

    <sl-dialog :label="`Add ${title}`" :open="showSelector" @sl-after-hide="showSelector = false" class="selector-dialog">
      <div class="selector-container">
        <BookSelector
            v-if="type === 'book'"
            :selected-ids="ids"
            :author-ids="[]"
            @update:selected-ids="handleSelectionChange"
        />
        <TopicSelector
            v-else
            :selected-ids="ids"
            @update:selected-ids="handleSelectionChange"
        />
      </div>
      <sl-button slot="footer" variant="primary" @click="showSelector = false">Close</sl-button>
    </sl-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import {type FlattenedTopic, useLibraryStore} from '../../stores/library';
import BookSelector from '../corpus/panels/pickingpanels/BookSelector.vue';
import TopicSelector from '../corpus/panels/pickingpanels/TopicSelector.vue';
import type {Book} from "../../types/library.ts";

const props = defineProps<{
  type: 'book' | 'topic';
  ids: number[];
  title: string;
}>();

const emit = defineEmits<{
  (e: 'add', id: number): void;
  (e: 'remove', id: number): void;
}>();

const libraryStore = useLibraryStore();
const showSelector = ref(false);

onMounted(() => {
  if (props.type === 'book') {
    libraryStore.fetchBooks();
  } else {
    libraryStore.fetchTopics();
  }
});

const items = computed<Book[] | FlattenedTopic[]>(() => {
  if (props.type === 'book') {
    return props.ids
        .map(id => libraryStore.books.find(b => b.id === id))
        .filter((item): item is Book => Boolean(item));
  } else {
    return props.ids
        .map(id => libraryStore.flattenedTopics.find(t => t.id === id))
        .filter((item): item is FlattenedTopic => Boolean(item));
  }
});

function getItemLabel(item: Book | FlattenedTopic) {
  return 'title' in item ? item.title : item.fullPath || item.name;
}

const handleSelectionChange = (selectedIds: number[]) => {
  const addedId = selectedIds.find(id => !props.ids.includes(id));
  if (addedId !== undefined) {
    emit('add', addedId);
    return;
  }

  const removedId = props.ids.find(id => !selectedIds.includes(id));
  if (removedId !== undefined) {
    emit('remove', removedId);
  }
};

</script>

<style scoped>
.association-manager {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h3 {
  margin: 0;
  font-size: 1.1rem;
}

.item-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.empty-state {
  font-size: 0.9rem;
  color: var(--sl-color-neutral-500);
  font-style: italic;
}

.selector-container {
  height: 400px;
  overflow: hidden;
}

.association-tag {
  max-width: 100%;
}

.selector-dialog::part(body) {
  padding-top: 0;
}
</style>
