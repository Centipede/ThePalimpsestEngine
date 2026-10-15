<template>
  <sl-dialog
    class="corpus-dialog"
    :label="type === 'talk' ? 'Talk with book' : 'Ask book'"
    :open="open"
    @sl-request-close="handleRequestClose"
    @sl-after-hide.self="$emit('update:open', false)"
    style="--width: 95vw; "
  >
    <div class="corpus-study-dialog">
      <div class="dialog-layout">
        <div class="workspace-panel">
          <div class="llm-controls">
            <sl-textarea
              label="Question"
              placeholder="Type your question here..."
              rows="10"
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
                <sl-button size="small" @click="handleAddChapters">
                  <sl-icon slot="prefix" name="plus"></sl-icon>
                  Add chapters...
                </sl-button>
                <sl-button size="small" @click="handleAddSearch">
                  <sl-icon slot="prefix" name="search"></sl-icon>
                  Add via search...
                </sl-button>
              </div>
            </div>

            <div class="material-list">
              <div v-if="corpusQuery.operators.length === 0" class="empty-material">
                No material added yet. Click the buttons above to add chapters or search queries.
              </div>
              <div v-else class="material-items">
                <OperatorTreeEditor :node="corpusQuery" @edit-node="handleEditNode" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="error" class="error-panel">
          <sl-alert variant="danger" open closable @sl-after-hide="error = null">
            <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
            <strong>Error:</strong> {{ error }}
          </sl-alert>
        </div>
      </div>
    </div>

    <sl-dialog
      :open="showEditor"
      :label="getEditorLabel()"
      class="editor-dialog"
      @sl-request-close="handleEditorCancel"
      @sl-after-hide="handleEditorAfterHide"
      style="--width: 90vw;"
    >
      <div class="editor-container">
        <PickingOp
          v-if="editingNode?.op_kind === 'picking'"
          :node="editingNode"
        />
        <SearchOp
          v-else-if="editingNode && isSearchSequence(editingNode)"
          :node="editingNode as SequenceOperator"
        />
      </div>
      <sl-button slot="footer" variant="text" @click="handleEditorCancel">Cancel</sl-button>
      <sl-button slot="footer" variant="primary" @click="handleEditorDone">Done</sl-button>
    </sl-dialog>

    <sl-button slot="footer" variant="primary" @click="$emit('update:open', false)">Close</sl-button>
    <sl-button 
      slot="footer" 
      variant="success" 
      :loading="loading"
      :disabled="corpusQuery.operators.length === 0 || !question"
      @click="type === 'talk' ? handleStartTalk() : handleGetAnswer()"
    >
      {{ type === 'talk' ? 'Start Talk' : 'Get Answer' }}
    </sl-button>
  </sl-dialog>
</template>

<script setup lang="ts">
import {ref, onMounted, watch} from 'vue';
import { useDraft } from '../../composables/useDraft';
import PickingOp from './picking/PickingOp.vue';
import SearchOp from './SearchOp.vue';
import OperatorTreeEditor from './OperatorTreeEditor.vue';
import { apiFetch } from '../../api';
import { useLibraryStore } from '../../stores/library';
import type { AskCorpusRequest, AskCorpusResponse, ConverseCorpusRequest, ConverseCorpusResponse } from '../../types/study';
import type {
  OperatorNode,
  PickingOperator,
  UnionOperator,
  SequenceOperator,
  ConversionOperator,
  RepresentationOperator,
  SearchPostgresFTS, PickingStep
} from "../../types/corpusquery.ts";

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

const libraryStore = useLibraryStore();

const showEditor = ref(false);
const isAdding = ref(false);
const editingNode = ref<OperatorNode | null>(null);
const originalEditingNode = ref<OperatorNode | null>(null);

const corpusQuery = ref<UnionOperator>({
  op_kind: 'union',
  operators: []
});

watch(corpusQuery, () => {
  console.log('Corpus query changed:', corpusQuery.value);

}, { deep: true }
)

onMounted(async () => {
  await Promise.all([
    libraryStore.fetchAuthors(),
    libraryStore.fetchBooks()
  ]);

  if (props.initialAuthors?.length || props.initialBooks?.length || props.initialSections?.length) {
    const initialPicking: PickingOperator = {
      op_kind: 'picking',
      steps: []
    };

    if (props.initialAuthors?.length) {
      props.initialAuthors.forEach(id => {
        const author = libraryStore.authors.find(a => a.id === id);
        initialPicking.steps.push({
          strategy: 'include',
          expansion: 'self',
          properties: 'contents',
          selection: [{ obj_kind: 'author', id, abbrev: author?.abbrev || '' }]
        });
      });
    }

    if (props.initialBooks?.length) {
      props.initialBooks.forEach(id => {
        const book = libraryStore.books.find(b => b.id === id);
        const author = libraryStore.authors.find(a => a.id === book?.by_author);
        initialPicking.steps.push({
          strategy: 'include',
          expansion: 'self',
          properties: 'contents',
          selection: [{ 
            obj_kind: 'book', 
            id, 
            abbrev: book?.abbrev || '',
            machine_name: book?.machine_name || '',
            author_abbrev: author?.abbrev || null
          }]
        });
      });
    }

    initialPickingSteps.value = initialPicking.steps;
    // if (initialPicking.steps.length > 0) {
    //   corpusQuery.value.operators.push(initialPicking);
    // }
  }
});

const { draft: question, clear: clearQuestionDraft } = useDraft('palimpsest_draft_corpus_question');
const loading = ref(false);
const error = ref<string | null>(null);

const selectedModel = ref('gpt-5.6-luna');
const selectedStyle = ref('scholarly');

const initialPickingSteps = ref<PickingStep[]>([]);

function isSearchSequence(node: OperatorNode): node is SequenceOperator {
  return node.op_kind === 'sequence' && node.operators.some(op => op.op_kind.startsWith('search_'));
}

function isValidOp(node: OperatorNode | null): boolean {
  if (!node) return false;

  if (node.op_kind === 'picking') {
    return node.steps.length > 0;
  }

  if (node.op_kind === 'sequence' || node.op_kind === 'union' || node.op_kind === 'intersection') {
    return node.operators.every(isValidOp);
  }

  return true;
}

function handleAddChapters() {
  const newNode: PickingOperator = {
    op_kind: 'picking',
    steps: []
  };
  isAdding.value = true;
  originalEditingNode.value = null;
  editingNode.value = newNode;
  showEditor.value = true;
}

function handleAddSearch() {
  const pickingOp: PickingOperator = {
    op_kind: 'picking',
    steps: JSON.parse(JSON.stringify(initialPickingSteps.value))
  };
  const conversionOp: ConversionOperator = {
    op_kind: 'conversion',
    conversion: 'descendants',
    input_types: ['author', 'book', 'section'],
    output_type: 'section'
  };
  const representationOp: RepresentationOperator = {
    op_kind: 'representation',
    representation: 'querysets'
  };
  const searchOp: SearchPostgresFTS = {
    op_kind: 'search_postgres_fts',
    query: '',
    fts_style: 'plain',
    num_results: 100,
    input_types: ['section'],
    output_type: 'content'
  };

  const newNode: SequenceOperator = {
    op_kind: 'sequence',
    operators: [pickingOp, conversionOp, representationOp, searchOp]
  };
  
  isAdding.value = true;
  originalEditingNode.value = null;
  editingNode.value = newNode;
  showEditor.value = true;
}

function handleEditNode(node: OperatorNode) {
  isAdding.value = false;
  originalEditingNode.value = node;
  editingNode.value = JSON.parse(JSON.stringify(node));
  showEditor.value = true;
}

function handleEditorDone() {
  if (!isValidOp(editingNode.value)) {
    handleEditorCancel();
    return;
  }

  if (isAdding.value && editingNode.value) {
    corpusQuery.value.operators.push(editingNode.value as any);
  } else if (!isAdding.value && editingNode.value && originalEditingNode.value) {
    const index = corpusQuery.value.operators.indexOf(originalEditingNode.value as any);
    if (index !== -1) {
      corpusQuery.value.operators[index] = editingNode.value as any;
    }
  }
  showEditor.value = false;
}

function handleEditorCancel() {
  showEditor.value = false;
}

function handleEditorAfterHide() {
  editingNode.value = null;
  originalEditingNode.value = null;
  isAdding.value = false;
}

function getEditorLabel() {
  if (!editingNode.value) return 'Edit Material';
  if (editingNode.value.op_kind === 'picking') return 'Add Chapters';
  if (isSearchSequence(editingNode.value)) return 'Add via Search';
  return 'Edit Operator';
}

async function handleStartTalk() {
  if (!question.value || corpusQuery.value.operators.length === 0) return;

  loading.value = true;
  error.value = null;

  const request: ConverseCorpusRequest = {
    question: question.value,
    system_prompt: `You are a ${selectedStyle.value} assistant. Use the provided context to answer the user question. Format as markdown.`,
    graph: corpusQuery.value
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
    clearQuestionDraft();
  } catch (e: any) {
    error.value = e.message || 'An error occurred while starting the conversation.';
  } finally {
    loading.value = false;
  }
}


async function handleGetAnswer() {
  if (!question.value || corpusQuery.value.operators.length === 0) return;

  loading.value = true;
  error.value = null;

  const request: AskCorpusRequest = {
    expression: null,
    style: selectedStyle.value,
    question: question.value,
    system_prompt: `You are a ${selectedStyle.value} assistant. Use the provided passages to answer the question. Format as markdown.`,
    graph: corpusQuery.value
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
    clearQuestionDraft();
  } catch (e: any) {
    error.value = e.message || 'An error occurred while fetching the answer.';
  } finally {
    loading.value = false;
  }
}

function handleRequestClose(event: Event) {
  event.preventDefault();
}
</script>

<style scoped>
.corpus-dialog::part(panel) {
  height: 95vh;
  max-height: 95vh;
}

.corpus-dialog::part(body) {
  height: 100%;
  overflow-y: auto;
  padding: 0.75rem 1rem;
}

.corpus-dialog::part(footer) {
  padding: 0.75rem 1rem;
}

.corpus-study-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.dialog-layout {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  min-height: 0;
}

.workspace-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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

@media (max-width: 768px) {
  .workspace-panel {
    grid-template-columns: 1fr;
    overflow-y: visible;
  }

  .llm-settings {
    grid-template-columns: 1fr;
  }
}

.material-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--sl-border-radius-medium);
  padding: 0.75rem;
  background-color: var(--color-bg-muted);
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
  color: var(--color-text);
}

.panel-actions {
  display: flex;
  gap: 0.5rem;
}

.material-list {
  flex: 1;
  min-height: 100px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
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

[data-theme="dark"] .material-item--include {
  background-color: var(--sl-color-success-950);
  color: var(--sl-color-success-200);
}

.material-item--exclude {
  background-color: var(--sl-color-warning-50);
  border-left: 4px solid var(--sl-color-warning-600);
  color: var(--sl-color-warning-900);
}

[data-theme="dark"] .material-item--exclude {
  background-color: var(--sl-color-warning-950);
  color: var(--sl-color-warning-200);
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
  color: var(--color-text-dimmed);
  font-style: italic;
  text-align: center;
}

.editor-container {
  min-height: 400px;
}

.error-panel {
  margin-top: 1rem;
}
</style>
