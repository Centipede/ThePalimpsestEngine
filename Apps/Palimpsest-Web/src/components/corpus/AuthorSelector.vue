<template>
  <div class="author-selector">
    <sl-input
      v-model="searchQuery"
      placeholder="Filter authors..."
      size="small"
      clearable
    >
      <sl-icon name="search" slot="prefix"></sl-icon>
    </sl-input>

    <div class="author-list">
      <div
        v-for="author in filteredAuthors"
        :key="author.id"
        :class="['author-item', { 'is-selected': selectedIds.includes(author.id) }]"
        @click="toggleSelection(author.id)"
      >
        <span class="author-name">{{ author.full_name }}</span>
        <span v-if="author.abbrev" class="author-abbrev">({{ author.abbrev }})</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useLibraryStore } from '../../stores/library';

const props = defineProps<{
  selectedIds: number[];
}>();

const emit = defineEmits<{
  (e: 'update:selectedIds', ids: number[]): void;
}>();

const libraryStore = useLibraryStore();
const searchQuery = ref('');

onMounted(() => {
  libraryStore.fetchAuthors();
});

const filteredAuthors = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return libraryStore.authors;
  return libraryStore.authors.filter(a =>
    a.full_name.toLowerCase().includes(query) ||
    a.abbrev.toLowerCase().includes(query)
  );
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
.author-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
}

.author-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-medium);
}

.author-item {
  padding: 0.5rem;
  cursor: pointer;
  transition: background-color var(--sl-transition-fast);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.author-item:hover {
  background-color: var(--sl-color-neutral-100);
}

.author-item.is-selected {
  background-color: var(--sl-color-primary-100);
  color: var(--sl-color-primary-700);
}

.author-name {
  flex: 1;
}

.author-abbrev {
  font-size: 0.8rem;
  color: var(--sl-color-neutral-500);
}
</style>
