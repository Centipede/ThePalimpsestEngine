<template>
  <sl-dialog
    class="corpus-dialog"
    :label="type === 'talk' ? 'Talk with book' : 'Ask book'"
    :open="open"
    @sl-request-close="handleRequestClose"
    @sl-after-hide.self="$emit('update:open', false)"
    style="--width: 80vw; "
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
              :value="question"
              @sl-input="question = $event.target.value"
            ></sl-textarea>

            <div class="llm-settings">
              <sl-select label="Model" :value="selectedModel" @sl-change="selectedModel = $event.target.value">
                <sl-option value="gpt-4o">GPT 4o</sl-option>
                <sl-option value="gpt-4.1-mini">GPT 4.1 Mini</sl-option>
                <sl-option value="gpt-5.1-mini">GPT 5.1 Mini</sl-option>
                <sl-option value="gpt-5.6-luna">GPT 5.6 Luna</sl-option>
              </sl-select>

              <sl-select label="Assistant Prompt" :value="selectedStyle" @sl-change="selectedStyle = $event.target.value">
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
          <CorpusScopeSelector
              :initial-authors="initialAuthors"
              :initial-books="initialBooks"
              :initial-sections="initialSections"
              @add-materials="handleAddMaterials"
          />
        </div>

        <div v-if="error" class="error-panel">
          <sl-alert variant="danger" open closable @sl-after-hide="error = null">
            <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
            <strong>Error:</strong> {{ error }}
          </sl-alert>
        </div>
      </div>
    </div>

    <sl-button slot="footer" variant="primary" @click="$emit('update:open', false)">Close</sl-button>
    <sl-button 
      slot="footer" 
      variant="success" 
      :loading="loading"
      :disabled="materials.length === 0 || !question"
      @click="type === 'talk' ? handleStartTalk() : handleGetAnswer()"
    >
      {{ type === 'talk' ? 'Start Talk' : 'Get Answer' }}
    </sl-button>
  </sl-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CorpusScopeSelector from './CorpusScopeSelector.vue';
import { apiFetch } from '../../api';
import type { CorpusMaterialItem } from '../../types/library';
import type { AskCorpusRequest, AskCorpusResponse, ConverseCorpusRequest, ConverseCorpusResponse } from '../../types/study';

const props = defineProps<{
  open: boolean
  type: 'talk' | 'ask';
  initialAuthors?: number[];
  initialBooks?: number[];
  initialSections?: number[];
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'conversation-created', id: number): void;
  (e: 'qa-created', id: number): void;
}>();

const showScopeSelector = ref(false);
const materials = ref<CorpusMaterialItem[]>([]);

const question = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const selectedModel = ref('gpt-5.6-luna');
const selectedStyle = ref('scholarly');

async function handleStartTalk() {
  if (!question.value || materials.value.length === 0) return;

  loading.value = true;
  error.value = null;

  const request: ConverseCorpusRequest = {
    question: question.value,
    system_prompt: `You are a ${selectedStyle.value} assistant. Use the provided context to answer the user question. Format as markdown.`,
    num_results: 20,
    corpus: {
      items: materials.value
    }
  };

  try {
    const response = await apiFetch('/teststudy/api/v1/converse/corpus/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const data: ConverseCorpusResponse = await response.json();
    emit('conversation-created', data.conversation_id);
  } catch (e: any) {
    error.value = e.message || 'An error occurred while starting the conversation.';
  } finally {
    loading.value = false;
  }
}


async function handleGetAnswer() {
  if (!question.value || materials.value.length === 0) return;

  loading.value = true;
  error.value = null;

  const request: AskCorpusRequest = {
    expression: null,
    style: selectedStyle.value,
    question: question.value,
    system_prompt: `You are a ${selectedStyle.value} assistant. Use the provided passages to answer the question. Format as markdown.`,
    num_results: 20,
    corpus: {
      items: materials.value
    }
  };

  try {
    const response = await apiFetch('/teststudy/api/v1/ask/corpus/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const data: AskCorpusResponse = await response.json();
    emit('qa-created', data.qa_id);
  } catch (e: any) {
    error.value = e.message || 'An error occurred while fetching the answer.';
  } finally {
    loading.value = false;
  }
}

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
.corpus-dialog::part(panel) {
  height: 80vh;
  max-height: 80vh;
}

.corpus-dialog::part(body) {
  height: 100%;
  overflow: hidden;
}

.corpus-study-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.dialog-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
}

.workspace-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  flex: 1;
  min-height: 0;
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
  min-height: 0;
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
  overflow-y: auto;
  flex: 1;
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
  max-height: 50%;
  overflow-y: auto;
}

.error-panel {
  margin-top: 1rem;
}
</style>
