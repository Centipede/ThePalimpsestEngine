<template>
  <div class="qa-workspace">
    <div v-if="!isEditingTitle" class="title-container" @click="startEditing">
      <h3 class="workspace-title">{{ data.title }}</h3>
      <sl-icon name="pencil" class="edit-icon"></sl-icon>
    </div>
    <div v-else class="title-edit-container">
      <sl-input
        ref="titleInput"
        v-model="editedTitle"
        size="medium"
        :loading="isSaving"
        :disabled="isSaving"
        @sl-blur="saveTitle"
        @keydown.enter="saveTitle"
        @keydown.esc="cancelEditing"
      ></sl-input>
    </div>
    <div class="qa-item">
      <div class="qa-label">Question</div>
      <div class="markdown-content" v-html="marked.parse(data.question || '')"></div>
    </div>
    <div class="qa-item">
      <div class="qa-label">Answer</div>
      <div class="markdown-content" v-html="marked.parse(data.answer || '')"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { marked } from 'marked';
import type { QuestionAnswer } from '../types/study';
import { apiFetch } from '../api';

const props = defineProps<{
  data: QuestionAnswer;
}>();

const emit = defineEmits<{
  (e: 'title-updated', newTitle: string): void;
}>();

const isEditingTitle = ref(false);
const editedTitle = ref('');
const isSaving = ref(false);
const titleInput = ref<any>(null);

function startEditing() {
  editedTitle.value = props.data.title;
  isEditingTitle.value = true;
  nextTick(() => {
    titleInput.value?.focus();
  });
}

function cancelEditing() {
  isEditingTitle.value = false;
}

async function saveTitle() {
  if (!isEditingTitle.value || isSaving.value) return;
  
  if (editedTitle.value === props.data.title) {
    isEditingTitle.value = false;
    return;
  }

  isSaving.value = true;
  try {
    const response = await apiFetch(`/teststudy/api/v1/question-answer/${props.data.id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: editedTitle.value }),
    });

    if (response.ok) {
      emit('title-updated', editedTitle.value);
      isEditingTitle.value = false;
    } else {
      console.error('Failed to save title:', response.statusText);
    }
  } catch (error) {
    console.error('Error saving title:', error);
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.workspace-title {
  margin: 0;
  color: var(--sl-color-neutral-900);
}

.title-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.25rem;
  margin: -0.25rem;
  border-radius: var(--sl-border-radius-medium);
  transition: background-color var(--sl-transition-fast);
}

.title-container:hover {
  background-color: var(--sl-color-neutral-100);
}

.edit-icon {
  font-size: 1rem;
  color: var(--sl-color-neutral-400);
  opacity: 0;
  transition: opacity var(--sl-transition-fast);
}

.title-container:hover .edit-icon {
  opacity: 1;
}

.title-edit-container {
  margin-bottom: 0.5rem;
}

.qa-item {
  margin-top: 1.5rem;
}

.qa-label {
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.markdown-content :deep(p) {
  margin: 0 0 1rem 0;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
