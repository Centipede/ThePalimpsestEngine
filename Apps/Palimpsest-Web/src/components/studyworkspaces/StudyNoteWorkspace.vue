<template>
  <div class="studynote-workspace">
    <WorkspaceHeader
      :title="data.title"
      :linking-ref="linkingRef"
      :all-refs="data.references || []"
      item-type="studynote"
      :item-id="data.id"
      @title-updated="$emit('title-updated', $event)"
      @pin-updated="$emit('pin-updated', $event)"
      @references-updated="$emit('references-updated')"
    />
    <div class="content-container">
        <div v-if="!isEditing" class="content-display" @click="startEditing">
          <div v-if="data.content_md" class="markdown-content" v-html="marked.parse(data.content_md)"></div>
          <span v-else class="content-placeholder">Write your note here... (Markdown supported)</span>
          <sl-icon name="pencil" class="edit-icon"></sl-icon>
        </div>
        <div v-else class="content-edit">
          <sl-textarea
            ref="contentInput"
            v-model="editedContent"
            :loading="isSaving"
            :disabled="isSaving"
            placeholder="Type your note here... (Markdown supported)"
            rows="15"
            @keydown.esc="cancelEditing"
          ></sl-textarea>
          <div class="edit-actions">
            <sl-button size="small" variant="primary" :loading="isSaving" @click="saveContent">Save</sl-button>
            <sl-button size="small" @click="cancelEditing">Cancel</sl-button>
          </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { marked } from 'marked';
import type { StudyNote, StudyNoteRef } from '../../types/study';
import { apiFetch } from '../../api';
import WorkspaceHeader from './WorkspaceHeader.vue';

const props = defineProps<{
  data: StudyNote;
  linkingRef: StudyNoteRef;
}>();

const emit = defineEmits<{
  (e: 'title-updated', newTitle: string): void;
  (e: 'pin-updated', isPinned: boolean): void;
  (e: 'references-updated'): void;
  (e: 'content-updated', newContent: string): void;
}>();

const isEditing = ref(false);
const editedContent = ref('');
const isSaving = ref(false);
const contentInput = ref<any>(null);

function startEditing() {
  editedContent.value = props.data.content_md || '';
  isEditing.value = true;
  nextTick(() => {
    contentInput.value?.focus();
  });
}

function cancelEditing() {
  if (isSaving.value) return;
  isEditing.value = false;
}

async function saveContent() {
  if (!isEditing.value || isSaving.value) return;
  
  const newContent = editedContent.value;
  if (newContent === props.data.content_md) {
    isEditing.value = false;
    return;
  }

  isSaving.value = true;
  try {
    const response = await apiFetch(`/teststudy/api/v1/study-notes/${props.data.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_md: newContent }),
    });

    if (response.ok) {
      emit('content-updated', newContent);
      isEditing.value = false;
    } else {
      console.error('Failed to save study note content:', await response.text());
    }
  } catch (error) {
    console.error('Error saving study note content:', error);
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.studynote-workspace {
  padding: 0;
}

.content-container {
  margin-top: 1rem;
  min-height: 200px;
}

.content-display {
  cursor: pointer;
  position: relative;
  padding: 1rem;
  border-radius: var(--sl-border-radius-medium);
  border: 1px solid transparent;
  transition: all var(--sl-transition-fast);
}

.content-display:hover {
  background-color: var(--sl-color-neutral-50);
  border-color: var(--sl-color-neutral-200);
}

.content-placeholder {
  font-size: 1rem;
  color: var(--sl-color-neutral-400);
  font-style: italic;
}

.edit-icon {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 1rem;
  color: var(--sl-color-neutral-400);
  opacity: 0;
  transition: opacity var(--sl-transition-fast);
}

.content-display:hover .edit-icon {
  opacity: 1;
}

.content-edit {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
