<template>
  <sl-dialog
    :label="type === 'talk' ? 'Talk with book' : 'Ask book'"
    :open="open"
    @sl-request-close="handleRequestClose"
    @sl-after-hide="$emit('update:open', false)"
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
              <div class="empty-material">
                No material added yet. Use the buttons above to scope your study.
              </div>
            </div>
          </div>
        </div>

        <div v-if="showScopeSelector" class="scope-selector-panel">
          <sl-divider></sl-divider>
          <CorpusScopeSelector />
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

defineProps<{
  open: boolean;
  type: 'talk' | 'ask';
}>();

defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const showScopeSelector = ref(false);

function handleRequestClose(event: Event) {
  event.preventDefault();
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
  border: 1px dashed var(--sl-color-neutral-300);
  border-radius: var(--sl-border-radius-small);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-material {
  font-size: 0.85rem;
  color: var(--sl-color-neutral-400);
  font-style: italic;
}

.scope-selector-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
