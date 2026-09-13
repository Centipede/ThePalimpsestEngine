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
          <CorpusScopeSelector @add-materials="handleAddMaterials" />
        </div>

        <div v-if="error" class="error-panel">
          <sl-alert variant="danger" open closable @sl-after-hide="error = null">
            <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
            <strong>Error:</strong> {{ error }}
          </sl-alert>
        </div>

        <div v-if="result" class="result-panel">
          <sl-divider></sl-divider>
          
          <div class="result-layout">
            <div class="answer-section">
              <div class="section-header">
                <sl-icon name="chat-dots"></sl-icon>
                AI Answer
              </div>
              <div class="answer-content markdown-body" v-html="result.answer_html"></div>
              <div class="qa-footer">
                <sl-button variant="text" size="small" :href="`/study/qa/${result.qa_id}`" target="_blank">
                  <sl-icon slot="prefix" name="box-arrow-up-right"></sl-icon>
                  Open full Q&A record
                </sl-button>
              </div>
            </div>

            <div class="sources-section">
              <div class="section-header">
                <sl-icon name="journal-text"></sl-icon>
                Source Passages
              </div>
              <div class="hits-list">
                <div v-for="(hit, index) in result.hits" :key="index" class="hit-item">
                  <div class="hit-meta">
                    <img v-if="hit.book_thumbnail_url" :src="hit.book_thumbnail_url" class="hit-thumbnail" />
                    <div class="hit-info">
                      <div class="hit-book">{{ getBookTitle(hit.in_book) }}</div>
                      <div class="hit-location">Page {{ hit.on_page }} • Score: {{ hit.rank.toFixed(3) }}</div>
                    </div>
                  </div>
                  <div class="hit-text" v-html="hit.html_highlighted"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <sl-button slot="footer" variant="primary" @click="$emit('update:open', false)">Close</sl-button>
    <sl-button 
      slot="footer" 
      variant="success" 
      :loading="loading"
      :disabled="materials.length === 0 || !question"
      @click="handleGetAnswer"
    >
      {{ type === 'talk' ? 'Start Talk' : 'Get Answer' }}
    </sl-button>
  </sl-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CorpusScopeSelector from './CorpusScopeSelector.vue';
import { apiFetch } from '../../api';
import { useLibraryStore } from '../../stores/library';
import type { CorpusMaterialItem } from '../../types/library';
import type { AskCorpusRequest, AskCorpusResponse } from '../../types/study';

defineProps<{
  open: boolean;
  type: 'talk' | 'ask';
}>();

const libraryStore = useLibraryStore();
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const showScopeSelector = ref(false);
const materials = ref<CorpusMaterialItem[]>([]);

const question = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const result = ref<AskCorpusResponse | null>(null);

const selectedModel = ref('gpt-4o');
const selectedStyle = ref('scholarly');

async function handleGetAnswer() {
  if (!question.value || materials.value.length === 0) return;

  loading.value = true;
  error.value = null;
  result.value = null;

  const request: AskCorpusRequest = {
    expression: question.value, // Using question as expression for search
    style: selectedStyle.value,
    question: question.value,
    system_prompt: `You are a ${selectedStyle.value} assistant. Use the provided passages to answer the question. Format as markdown.`,
    num_results: 20,
    corpus: {
      items: materials.value
    }
  };

  try {
    const response = await apiFetch('/testbooks/api/v1/ask/corpus/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    result.value = await response.json();
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

function getBookTitle(bookId: number | null) {
  if (!bookId) return 'Unknown Book';
  const book = libraryStore.books.find(b => b.id === bookId);
  return book ? book.title : `Book #${bookId}`;
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

.error-panel {
  margin-top: 1rem;
}

.result-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-layout {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 1rem;
  color: var(--sl-color-neutral-800);
}

.answer-content {
  line-height: 1.6;
  font-size: 0.95rem;
  color: var(--sl-color-neutral-900);
}

.qa-footer {
  margin-top: 1.5rem;
  border-top: 1px solid var(--sl-color-neutral-100);
  padding-top: 0.5rem;
}

.sources-section {
  border-left: 1px solid var(--sl-color-neutral-200);
  padding-left: 1.5rem;
}

.hits-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.hit-item {
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-medium);
  padding: 0.75rem;
  background-color: white;
}

.hit-meta {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  align-items: flex-start;
}

.hit-thumbnail {
  width: 40px;
  height: 60px;
  object-fit: cover;
  border-radius: var(--sl-border-radius-small);
  border: 1px solid var(--sl-color-neutral-200);
}

.hit-book {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--sl-color-neutral-700);
}

.hit-location {
  font-size: 0.75rem;
  color: var(--sl-color-neutral-500);
}

.hit-text {
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--sl-color-neutral-800);
}

.hit-text :deep(em) {
  font-weight: 600;
  font-style: normal;
  background-color: var(--sl-color-warning-100);
  color: var(--sl-color-warning-900);
  padding: 0 0.1rem;
}
</style>
