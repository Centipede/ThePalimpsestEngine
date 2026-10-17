<template>
  <div class="topic-selector">
    <sl-input
      v-model="searchQuery"
      placeholder="Filter topics..."
      size="small"
      clearable
      @sl-clear="searchQuery = ''"
    >
      <sl-icon name="search" slot="prefix"></sl-icon>
    </sl-input>

    <div class="topic-list">
      <div
        v-for="topic in filteredTopics"
        :key="topic.id"
        :class="['topic-item', { 'is-selected': selectedIds.includes(topic.id) }]"
        @click="toggleSelection(topic.id)"
        @contextmenu.prevent="handleContextMenu(topic, $event)"
        :title="topic.fullPath"
      >
        <span class="topic-name">{{ topic.fullPath }}</span>
      </div>
    </div>

    <sl-dropdown ref="dropdown">
      <div slot="trigger" class="context-menu-anchor"></div>
      <sl-menu @sl-select="handleMenuSelect">
        <template v-if="mode === 'corpus'">
          <sl-menu-item value="include">Include Topic</sl-menu-item>
          <sl-menu-item value="exclude">Exclude Topic</sl-menu-item>
          <sl-divider v-if="selectedIds.length > 0"></sl-divider>
          <sl-menu-item v-if="selectedIds.length > 0" value="include-selected">
            Include Selected ({{ selectedIds.length }})
          </sl-menu-item>
          <sl-menu-item v-if="selectedIds.length > 0" value="exclude-selected">
            Exclude Selected ({{ selectedIds.length }})
          </sl-menu-item>
        </template>
      </sl-menu>
    </sl-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useLibraryStore, type FlattenedTopic } from '../../../stores/library';

const props = withDefaults(defineProps<{
  selectedIds: number[];
  mode?: 'corpus' | 'reference';
}>(), {
  mode: 'corpus'
});

const emit = defineEmits<{
  (e: 'update:selectedIds', ids: number[]): void;
  (e: 'includeTopics', ids: number[]): void;
  (e: 'excludeTopics', ids: number[]): void;
}>();

const libraryStore = useLibraryStore();
const searchQuery = ref('');
const dropdown = ref<any>(null);
const contextTopic = ref<FlattenedTopic | null>(null);

onMounted(() => {
  libraryStore.fetchTopics();
});

const filteredTopics = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return libraryStore.flattenedTopics;
  return libraryStore.flattenedTopics.filter(t =>
    t.name.toLowerCase().includes(query) ||
    t.fullPath.toLowerCase().includes(query)
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

function handleContextMenu(topic: FlattenedTopic, event: MouseEvent) {
  contextTopic.value = topic;
  
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
  
  if (action === 'include' && contextTopic.value) {
    emit('includeTopics', [contextTopic.value.id]);
  } else if (action === 'exclude' && contextTopic.value) {
    emit('excludeTopics', [contextTopic.value.id]);
  } else if (action === 'include-selected') {
    emit('includeTopics', props.selectedIds);
  } else if (action === 'exclude-selected') {
    emit('excludeTopics', props.selectedIds);
  }
}
</script>

<style scoped>
.topic-selector {
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

.topic-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--sl-border-radius-medium);
}

.topic-item {
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  transition: background-color var(--sl-transition-fast);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.topic-item:hover {
  background-color: var(--color-bg-muted);
}

.topic-item.is-selected {
  background-color: var(--color-bg-selected);
  color: white;
}

[data-theme="dark"] .topic-item.is-selected {
  background-color: var(--color-bg-selected);
  color: var(--color-text);
}

.topic-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
