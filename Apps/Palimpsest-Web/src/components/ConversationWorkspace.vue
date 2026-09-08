<template>
  <div class="conversation-workspace">
    <div v-if="!isEditingTitle" class="title-container" @click="startEditing">
      <h3 class="workspace-title">{{ data.title || 'Conversation' }}</h3>
      <sl-icon name="pencil" class="edit-icon"></sl-icon>
    </div>
    <div v-else class="title-edit-container">
      <sl-input
        ref="titleInput"
        v-model="editedTitle"
        size="medium"
        placeholder="Conversation"
        :loading="isSaving"
        :disabled="isSaving"
        @sl-blur="saveTitle"
        @keydown.enter="saveTitle"
        @keydown.esc="cancelEditing"
      ></sl-input>
    </div>
    <div v-for="turn in data.turns" :key="turn.id" class="conversation-turn">
      <div class="turn-q">
        <div class="turn-label">User Question</div>
        <div class="markdown-content" v-html="marked.parse(turn.question)"></div>
      </div>
      <div class="turn-a">
        <div class="turn-label">Assistant Answer</div>
        <div class="markdown-content" v-html="marked.parse(turn.answer)"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { marked } from 'marked';
import type { Conversation } from '../types/study';
import { apiFetch } from '../api';

const props = defineProps<{
  data: Conversation;
}>();

const emit = defineEmits<{
  (e: 'title-updated', newTitle: string): void;
}>();

const isEditingTitle = ref(false);
const editedTitle = ref('');
const isSaving = ref(false);
const titleInput = ref<any>(null);

function startEditing() {
  editedTitle.value = props.data.title || '';
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

  // Treat empty string as null for the backend
  const newTitle = editedTitle.value.trim() || null;
  const currentTitle = props.data.title || null;

  if (newTitle === currentTitle) {
    isEditingTitle.value = false;
    return;
  }

  isSaving.value = true;
  try {
    const response = await apiFetch(`/teststudy/api/v1/conversation/${props.data.id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: newTitle }),
    });

    if (response.ok) {
      emit('title-updated', newTitle || 'Conversation');
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

.conversation-turn {
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--sl-color-neutral-200);
}

.conversation-turn:last-child {
  border-bottom: none;
}

.turn-q {
  margin-bottom: 1rem;
}

.turn-a {
  padding-left: 1rem;
  border-left: 3px solid var(--sl-color-primary-200);
}

.turn-label {
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
