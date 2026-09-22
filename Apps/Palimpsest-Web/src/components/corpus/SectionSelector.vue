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
        <sl-input 
          size="small" 
          placeholder="Quick add/remove: +2.3-7, -1*" 
          clearable
          class="parser-input"
          @keydown.enter="handleParse"
        ></sl-input>
      </div>
      <TableOfContents
        :book-structure="bookStructure"
        :machine-name="machineName!"
        mode="select"
        :show-discussions="false"
        :selected-ids="selectedIds"
        @select="handleSelect"
      />

      <sl-dropdown ref="dropdown">
        <div slot="trigger" class="context-menu-anchor"></div>
        <sl-menu @sl-select="handleMenuSelect">
          <sl-menu-item value="include-single">Include only this chapter</sl-menu-item>
          <sl-menu-item value="include-tree">Include chapter and all subchapters</sl-menu-item>
          <sl-divider></sl-divider>
          <sl-menu-item value="exclude-single">Exclude only this chapter</sl-menu-item>
          <sl-menu-item value="exclude-tree">Exclude chapter and all subchapters</sl-menu-item>
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
import { ref, watch, onMounted, computed } from 'vue';
import { apiFetch } from '../../api';
import type { BookStructure, Section } from '../../types/library';
import TableOfContents from '../TableOfContents.vue';

const props = defineProps<{
  machineName: string | null;
  selectedIds?: number[];
}>();

const emit = defineEmits<{
  (e: 'includeSingle', section: Section): void;
  (e: 'includeTree', section: Section): void;
  (e: 'excludeSingle', section: Section): void;
  (e: 'excludeTree', section: Section): void;
}>();

const bookStructure = ref<BookStructure | null>(null);

const flattenedSections = computed(() => {
  const result: Section[] = [];
  if (!bookStructure.value) return result;

  const mainFlow = bookStructure.value.flows.find(f => f.name === 'main');
  const tree = mainFlow?.tree;
  if (!tree?.subsections) return result;

  const walk = (sections: Section[]) => {
    for (const s of sections) {
      result.push(s);
      if (s.subsections?.length) {
        walk(s.subsections);
      }
    }
  };

  walk(tree.subsections);
  return result;
});
const loading = ref(false);
const error = ref('');
const dropdown = ref<any>(null);
const selectedSection = ref<Section | null>(null);

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

function handleSelect(payload: { section: Section, event: MouseEvent }) {
  selectedSection.value = payload.section;
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
  
  if (!selectedSection.value) return;

  if (action === 'include-single') {
    emit('includeSingle', selectedSection.value);
  } else if (action === 'include-tree') {
    emit('includeTree', selectedSection.value);
  } else if (action === 'exclude-single') {
    emit('excludeSingle', selectedSection.value);
  } else if (action === 'exclude-tree') {
    emit('excludeTree', selectedSection.value);
  }
}

function handleParse(event: CustomEvent) {
  const target = event.target as any;
  const input = target.value.trim();
  if (!input) return;

  const instructions = input.split(',').map((s: string) => s.trim()).filter(Boolean);

  for (const instruction of instructions) {
    let strategy: 'include' | 'exclude' = 'include';
    let rawPath = instruction;

    if (instruction.startsWith('+')) {
      strategy = 'include';
      rawPath = instruction.slice(1).trim();
    } else if (instruction.startsWith('-')) {
      strategy = 'exclude';
      rawPath = instruction.slice(1).trim();
    }

    let isTree = false;
    if (rawPath.endsWith('*')) {
      isTree = true;
      rawPath = rawPath.slice(0, -1).trim();
    }

    const pathsToMatch = new Set<string>();

    // Check for range: e.g. 2.3-7 or 1-5
    const rangeMatch = rawPath.match(/^(.+?)\.(\d+)-(\d+)$/);
    const simpleRangeMatch = rawPath.match(/^(\d+)-(\d+)$/);

    if (rangeMatch) {
      const prefix = rangeMatch[1];
      const start = parseInt(rangeMatch[2], 10);
      const end = parseInt(rangeMatch[3], 10);
      for (let i = start; i <= end; i++) {
        pathsToMatch.add(`${prefix}.${i}`);
      }
    } else if (simpleRangeMatch) {
      const start = parseInt(simpleRangeMatch[1], 10);
      const end = parseInt(simpleRangeMatch[2], 10);
      for (let i = start; i <= end; i++) {
        pathsToMatch.add(`${i}`);
      }
    } else {
      pathsToMatch.add(rawPath);
    }

    for (const path of pathsToMatch) {
      // Prioritize path_coded, fall back to path_full
      const match = flattenedSections.value.find(s => 
        s.path_coded === path || s.path_full === path
      );

      if (match) {
        if (strategy === 'include') {
          if (isTree) emit('includeTree', match);
          else emit('includeSingle', match);
        } else {
          if (isTree) emit('excludeTree', match);
          else emit('excludeSingle', match);
        }
      }
    }
  }

  // Clear the input
  target.value = '';
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

.parser-input {
  flex: 1;
  margin-left: 0.5rem;
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
