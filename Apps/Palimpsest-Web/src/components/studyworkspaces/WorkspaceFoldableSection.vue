<template>
  <sl-details
    class="workspace-section"
    :open="initiallyOpen ?? false"
    @sl-show="handleShow"
    @sl-hide="handleHide"
  >
    <div slot="summary" class="section-summary">
      <div class="header-left">
        <span class="section-label">{{ label }}</span>
        <div class="note-area">
          <div v-if="!isEditing" class="note-display">
            <span v-if="note" class="note-text">{{ note }}</span>
            <span v-else-if="isOpen" class="note-placeholder">Add note...</span>
          </div>
          <div v-else class="note-edit" @click.stop>
            <sl-textarea
              ref="noteInput"
              v-model="editedNote"
              :loading="isSaving"
              :disabled="isSaving"
              placeholder="Type your note here..."
              size="small"
              resize="auto"
              @keydown.esc="cancelEditing"
            ></sl-textarea>
          </div>
        </div>
      </div>

      <div class="header-actions" v-if="isOpen" @click.stop>
        <template v-if="!isEditing">
          <sl-button size="small" variant="text" @click="startEditing">
            <sl-icon slot="prefix" name="pencil"></sl-icon>
            Edit
          </sl-button>
          <slot name="actions"></slot>
        </template>
        <template v-else>
          <sl-button size="small" variant="success" :loading="isSaving" @click="saveNote">
            <sl-icon slot="prefix" name="check-lg"></sl-icon>
            Save
          </sl-button>
          <sl-button size="small" variant="danger" :disabled="isSaving" @click="cancelEditing">
            <sl-icon slot="prefix" name="x-lg"></sl-icon>
            Cancel
          </sl-button>
        </template>
      </div>
    </div>

    <div class="section-content">
      <div class="markdown-content" v-html="marked.parse(content || '')"></div>
    </div>
  </sl-details>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { marked } from 'marked';
import { apiFetch } from '../../api';

const props = defineProps<{
  label: string;
  content: string | null;
  note: string | null;
  itemType: 'conversation-turn' | 'question-answer';
  itemId: number;
  noteField: 'question_note' | 'answer_note';
  initiallyOpen?: boolean;
}>();

const emit = defineEmits<{
  (e: 'note-updated', newNote: string | null): void;
}>();

const isEditing = ref(false);
const editedNote = ref('');
const isSaving = ref(false);
const noteInput = ref<any>(null);
const isOpen = ref(props.initiallyOpen ?? false);

function handleShow() {
  isOpen.value = true;
}

function handleHide() {
  isOpen.value = false;
  if (isEditing.value) {
    cancelEditing();
  }
}

function startEditing() {
  editedNote.value = props.note || '';
  isEditing.value = true;
  nextTick(() => {
    noteInput.value?.focus();
  });
}

function cancelEditing() {
  if (isSaving.value) return;
  isEditing.value = false;
}

async function saveNote() {
  if (!isEditing.value || isSaving.value) return;
  
  const newNote = editedNote.value.trim() || null;
  if (newNote === props.note) {
    isEditing.value = false;
    return;
  }

  isSaving.value = true;
  try {
    const response = await apiFetch(`/teststudy/api/v1/${props.itemType}/${props.itemId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [props.noteField]: newNote }),
    });

    if (response.ok) {
      emit('note-updated', newNote);
      isEditing.value = false;
    } else {
      console.error('Failed to save note:', await response.text());
    }
  } catch (error) {
    console.error('Error saving note:', error);
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.workspace-section {
  margin-bottom: 0.2rem;
}

.workspace-section::part(base) {
  border: none;
  background: transparent;
}

.workspace-section::part(header) {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--sl-color-neutral-100);
}

.workspace-section::part(content) {
  padding: 1rem 0;
}

.section-summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.note-area {
  flex: 1;
  min-width: 0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
}

.section-label {
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  color: var(--sl-color-neutral-500);
  letter-spacing: 0.05em;
  white-space: nowrap;
  padding-top: 0.125rem;
}

.section-content {
  display: flex;
  flex-direction: column;
}

.note-display {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  min-height: 1.5rem;
}

.note-text {
  font-size: 0.875rem;
  color: var(--sl-color-neutral-600);
  line-height: 1.4;
  white-space: pre-wrap;
}

.note-placeholder {
  font-size: 0.875rem;
  color: var(--sl-color-neutral-400);
  font-style: italic;
}

.note-edit {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.markdown-content {
  line-height: 1.6;
  color: var(--sl-color-neutral-800);
}

.markdown-content :deep(p) {
  margin-top: 0;
  margin-bottom: 1rem;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
