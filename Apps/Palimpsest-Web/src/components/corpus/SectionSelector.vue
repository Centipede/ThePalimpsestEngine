<template>
  <div class="section-selector">
    <div v-if="loading" class="loading-state">
      <sl-spinner></sl-spinner>
      <span>Loading chapters...</span>
    </div>
    <div v-else-if="error" class="error-state">
      <sl-icon name="exclamation-triangle"></sl-icon>
      <span>{{ error }}</span>
    </div>
    <div v-else-if="bookStructure" class="toc-container">
      <div class="selector-header">
        <sl-icon name="list-ul"></sl-icon>
        <span class="header-text">Chapters</span>
      </div>
      <TableOfContents
        :book-structure="bookStructure"
        :machine-name="machineName!"
        mode="select"
        :show-discussions="false"
        @select="handleSelect"
      />

      <sl-dropdown ref="dropdown">
        <div slot="trigger" class="context-menu-anchor"></div>
        <sl-menu @sl-select="handleMenuSelect">
          <sl-menu-item value="single">Add only this chapter</sl-menu-item>
          <sl-menu-item value="tree">Add chapter and all subchapters</sl-menu-item>
        </sl-menu>
      </sl-dropdown>
    </div>
    <div v-else class="empty-state">
      <sl-icon name="book" class="empty-icon"></sl-icon>
      <p>Select a book to browse chapters</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { apiFetch } from '../../api';
import type { BookStructure } from '../../types/library';
import TableOfContents from '../TableOfContents.vue';

const props = defineProps<{
  machineName: string | null;
}>();

const emit = defineEmits<{
  (e: 'selectSingle', sectionPath: string): void;
  (e: 'selectTree', sectionPath: string): void;
}>();

const bookStructure = ref<BookStructure | null>(null);
const loading = ref(false);
const error = ref('');
const dropdown = ref<any>(null);
const selectedPath = ref<string | null>(null);

async function fetchStructure() {
  if (!props.machineName) {
    bookStructure.value = null;
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const res = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/structure/?tree_depth=5&qas=1&conversations=1&ref_title=1&pageinfo=1&path_coded=1`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    bookStructure.value = await res.json();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load chapters';
  } finally {
    loading.value = false;
  }
}

watch(() => props.machineName, fetchStructure);

onMounted(fetchStructure);

function handleSelect(payload: { path: string, event: MouseEvent }) {
  selectedPath.value = payload.path;
  const event = payload.event;

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
  const item = event.detail.item;
  const action = item.value;
  
  if (!selectedPath.value) return;

  if (action === 'single') {
    emit('selectSingle', selectedPath.value);
  } else if (action === 'tree') {
    emit('selectTree', selectedPath.value);
  }
}
</script>

<style scoped>
.section-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-medium);
  background-color: var(--sl-color-neutral-0);
  overflow: hidden;
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 2rem;
  color: var(--sl-color-neutral-500);
  gap: 1rem;
  text-align: center;
}

.empty-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.toc-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.selector-header {
  padding: 0.75rem 1rem;
  background-color: var(--sl-color-neutral-50);
  border-bottom: 1px solid var(--sl-color-neutral-200);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.toc-container :deep(.toc-wrapper) {
  flex: 1;
  overflow-y: auto;
}

.toc-container :deep(.toc) {
  padding: 0.5rem;
}

.context-menu-anchor {
  width: 1px;
  height: 1px;
}
</style>
