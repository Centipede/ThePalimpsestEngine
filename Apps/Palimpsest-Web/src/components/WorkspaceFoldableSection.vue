<template>
  <sl-details class="workspace-section" :open="initiallyOpen ?? false">
    <div slot="summary" class="section-summary">
      <span class="section-label">{{ label }}</span>
      <span v-if="note && !isEditing" class="note-preview">
        {{ truncateNote(note) }}
      </span>
    </div>

    <div class="section-content">
      <div class="note-container">
        <div v-if="!isEditing" class="note-display" @click="startEditing">
          <span v-if="note" class="note-text">{{ note }}</span>
          <span v-else class="note-placeholder">Add note...</span>
          <sl-icon name="pencil" class="edit-icon"></sl-icon>
        </div>
        <div v-else class="note-edit">
          <sl-textarea
            ref="noteInput"
            v-model="editedNote"
            :loading="isSaving"
            :disabled="isSaving"
            placeholder="Type your note here..."
            @sl-blur="saveNote"
            @keydown.esc="cancelEditing"
          ></sl-textarea>
          <div class="edit-actions">
            <sl-button size="small" variant="primary" :loading="isSaving" @click="saveNote">Save</sl-button>
            <sl-button size="small" @click="cancelEditing">Cancel</sl-button>
          </div>
        </div>
      </div>
      
      <div class="markdown-content" v-html="marked.parse(content || '')"></div>
    </div>
  </sl-details>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { marked } from 'marked';
import { apiFetch } from '../api';

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

function truncateNote(text: string, length = 60) {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
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
  margin-bottom: 1rem;
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
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.section-label {
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  color: var(--sl-color-neutral-500);
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.note-preview {
  font-size: 0.875rem;
  color: var(--sl-color-neutral-400);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.note-container {
  background-color: var(--sl-color-neutral-50);
  padding: 0.75rem;
  border-radius: var(--sl-border-radius-medium);
  border: 1px dashed var(--sl-color-neutral-200);
}

.note-display {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  min-height: 1.5rem;
}

.note-text {
  font-size: 0.9375rem;
  color: var(--sl-color-neutral-700);
  line-height: 1.5;
  white-space: pre-wrap;
}

.note-placeholder {
  font-size: 0.9375rem;
  color: var(--sl-color-neutral-400);
  font-style: italic;
}

.edit-icon {
  font-size: 0.875rem;
  color: var(--sl-color-neutral-400);
  opacity: 0;
  transition: opacity var(--sl-transition-fast);
  margin-top: 0.25rem;
}

.note-display:hover .edit-icon {
  opacity: 1;
}

.note-edit {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
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
