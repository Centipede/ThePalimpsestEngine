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
        @contextmenu.prevent="handleContextMenu(author, $event)"
      >
        <span class="author-name">{{ author.full_name }}</span>
        <span v-if="author.abbrev" class="author-abbrev">({{ author.abbrev }})</span>
      </div>
    </div>

    <sl-dropdown ref="dropdown">
      <div slot="trigger" class="context-menu-anchor"></div>
      <sl-menu @sl-select="handleMenuSelect">
        <template v-if="mode === 'corpus'">
          <sl-menu-item value="include">Include Author</sl-menu-item>
          <sl-menu-item value="exclude">Exclude Author</sl-menu-item>
          <sl-divider v-if="selectedIds.length > 0"></sl-divider>
          <sl-menu-item v-if="selectedIds.length > 0" value="include-selected">
            Include Selected ({{ selectedIds.length }})
          </sl-menu-item>
          <sl-menu-item v-if="selectedIds.length > 0" value="exclude-selected">
            Exclude Selected ({{ selectedIds.length }})
          </sl-menu-item>
        </template>
        <template v-else-if="mode === 'reference'">
          <sl-menu-item value="add" disabled>Add here</sl-menu-item>
          <sl-menu-item value="move" disabled>Move here</sl-menu-item>
        </template>
      </sl-menu>
    </sl-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useLibraryStore } from '../../stores/library';
import type { Author } from '../../types/library';

const props = withDefaults(defineProps<{
  selectedIds: number[];
  mode?: 'corpus' | 'reference';
}>(), {
  mode: 'corpus'
});

const emit = defineEmits<{
  (e: 'update:selectedIds', ids: number[]): void;
  (e: 'includeAuthors', ids: number[]): void;
  (e: 'excludeAuthors', ids: number[]): void;
  (e: 'reference-action', payload: { action: 'add' | 'move', type: 'author', item: Author }): void;
}>();

const libraryStore = useLibraryStore();
const searchQuery = ref('');
const dropdown = ref<any>(null);
const contextAuthor = ref<Author | null>(null);

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

function handleContextMenu(author: Author, event: MouseEvent) {
  contextAuthor.value = author;
  
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
  
  if (action === 'include' && contextAuthor.value) {
    emit('includeAuthors', [contextAuthor.value.id]);
  } else if (action === 'exclude' && contextAuthor.value) {
    emit('excludeAuthors', [contextAuthor.value.id]);
  } else if (action === 'include-selected') {
    emit('includeAuthors', props.selectedIds);
  } else if (action === 'exclude-selected') {
    emit('excludeAuthors', props.selectedIds);
  } else if ((action === 'add' || action === 'move') && contextAuthor.value) {
    emit('reference-action', { action, type: 'author', item: contextAuthor.value });
  }
}
</script>

<style scoped>
.author-selector {
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

.author-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--color-border);
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
  background-color: var(--color-bg-muted);
}

.author-item.is-selected {
  background-color: var(--color-bg-selected);
  color: white;
}

[data-theme="dark"] .author-item.is-selected {
  background-color: var(--color-bg-selected);
  color: var(--color-text);
}

.author-name {
  flex: 1;
}

.author-abbrev {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>
