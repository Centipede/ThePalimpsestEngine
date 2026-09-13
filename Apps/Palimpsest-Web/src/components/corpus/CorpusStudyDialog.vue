<template>
  <sl-dialog
    :label="type === 'talk' ? 'Talk with book' : 'Ask book'"
    :open="open"
    @sl-request-close="handleRequestClose"
    @sl-after-hide.self="$emit('update:open', false)"
    style="--width: 90vw;"
  >
    <div class="corpus-study-dialog">
      <div class="dialog-layout">
        <div class="workspace-panel">
          <div class="llm-controls">
            <sl-textarea
              label="Question"
              placeholder="Type your question here..."
              rows="3"
              resize="none"
            ></sl-textarea>

            <div class="llm-settings">
              <sl-select label="Model" value="gpt-4o">
                <sl-option value="gpt-4.1-mini">GPT 4.1 Mini</sl-option>
                <sl-option value="gpt-5.1-mini">GPT 5.1 Mini</sl-option>
                <sl-option value="gpt-5.6-luna">GPT 5.6 Luna</sl-option>
              </sl-select>

              <sl-select label="Assistant Prompt" value="scholarly">
                <sl-option value="scholarly">Scholarly Assistant</sl-option>
                <sl-option value="concise">Concise Summary</sl-option>
                <sl-option value="analytical">Analytical Deep-Dive</sl-option>
              </sl-select>
            </div>
          </div>

          <div class="material-panel">
            <div class="panel-header">
              <span class="panel-title">Current material added</span>
              <div class="panel-actions">
                <sl-button size="small" @click="showScopeSelector = !showScopeSelector">
                  <sl-icon slot="prefix" :name="showScopeSelector ? 'chevron-up' : 'plus'"></sl-icon>
                  Add chapters...
                </sl-button>
                <sl-button size="small" disabled>
                  <sl-icon slot="prefix" name="search"></sl-icon>
                  Add via search...
                </sl-button>
              </div>
            </div>

            <div class="material-list">
              <div v-if="materials.length === 0" class="empty-material">
                No material added yet. Use the buttons above to scope your study.
              </div>
              <div v-else class="material-items">
                <div 
                  v-for="(item, index) in materials" 
                  :key="index"
                  :class="['material-item', `material-item--${item.strategy}`]"
                >
                  <div class="item-content">
                    <sl-icon :name="getItemIcon(item)" class="item-icon"></sl-icon>
                    <span class="item-label">{{ getItemLabel(item) }}</span>
                  </div>
                  <sl-button variant="text" size="small" @click="removeMaterial(index)">
                    <sl-icon name="x-lg" slot="prefix"></sl-icon>
                  </sl-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="showScopeSelector" class="scope-selector-panel">
          <sl-divider></sl-divider>
          <CorpusScopeSelector @add-materials="handleAddMaterials" />
        </div>
      </div>
    </div>

    <sl-button slot="footer" variant="primary" @click="$emit('update:open', false)">Close</sl-button>
    <sl-button slot="footer" variant="success">
      {{ type === 'talk' ? 'Start Talk' : 'Get Answer' }}
    </sl-button>
  </sl-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CorpusScopeSelector from './CorpusScopeSelector.vue';
import type { CorpusMaterialItem } from '../../types/library';

defineProps<{
  open: boolean;
  type: 'talk' | 'ask';
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const showScopeSelector = ref(false);
const materials = ref<CorpusMaterialItem[]>([]);

function handleRequestClose(event: Event) {
  event.preventDefault();
}

function handleAddMaterials(newItems: CorpusMaterialItem[]) {
  materials.value.push(...newItems);
}

function removeMaterial(index: number) {
  materials.value.splice(index, 1);
}

function getItemIcon(item: CorpusMaterialItem) {
  switch (item.type) {
    case 'author': return 'person';
    case 'book': return 'book';
    case 'section': return 'hash';
    default: return 'dot';
  }
}

function getItemLabel(item: CorpusMaterialItem) {
  if (item.type === 'author' && item.author) {
    return `Author: ${item.author.abbrev}`;
  }
  if (item.type === 'book' && item.book) {
    return `Book: ${item.book.abbrev} (${item.book.author_abbrev})`;
  }
  if (item.type === 'section' && item.section) {
    const subtree = item.section.subtree_strategy === 'tree' ? ' (and subchapters)' : '';
    return `Chapter: ${item.section.path_coded} in ${item.section.book_abbrev} (${item.section.author_abbrev})${subtree}`;
  }
  return 'Unknown item';
}
</script>

<style scoped>
.corpus-study-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dialog-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.workspace-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.llm-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.llm-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.material-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-medium);
  padding: 1rem;
  background-color: var(--sl-color-neutral-50);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--sl-color-neutral-700);
}

.panel-actions {
  display: flex;
  gap: 0.5rem;
}

.material-list {
  flex: 1;
  min-height: 100px;
  background-color: white;
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-small);
  display: flex;
  flex-direction: column;
}

.material-items {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.material-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: var(--sl-border-radius-small);
  font-size: 0.85rem;
}

.material-item--include {
  background-color: var(--sl-color-success-50);
  border-left: 4px solid var(--sl-color-success-600);
  color: var(--sl-color-success-900);
}

.material-item--exclude {
  background-color: var(--sl-color-warning-50);
  border-left: 4px solid var(--sl-color-warning-600);
  color: var(--sl-color-warning-900);
}

.item-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-icon {
  font-size: 1rem;
  opacity: 0.7;
}

.empty-material {
  padding: 2rem;
  font-size: 0.85rem;
  color: var(--sl-color-neutral-400);
  font-style: italic;
  text-align: center;
  align-self: center;
}

.scope-selector-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
