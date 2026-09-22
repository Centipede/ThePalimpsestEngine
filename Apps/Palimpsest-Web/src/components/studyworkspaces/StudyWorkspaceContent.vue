<template>
  <div v-if="loading" class="workspace-status">
    <sl-spinner></sl-spinner>
    <span>Loading...</span>
  </div>

  <div v-else-if="error" class="workspace-status error">
    {{ error }}
  </div>

  <div v-else-if="data" class="workspace-content">
    <QuestionAnswerWorkspace
      v-if="type === 'question_answer'"
      :data="(data as QuestionAnswer)"
      :linking-ref="(linkingRef as QuestionAnswerRef)"
      @title-updated="$emit('title-updated', $event)"
      @pin-updated="$emit('pin-updated', $event)"
      @note-updated="$emit('note-updated', $event)"
    />

    <ConversationWorkspace
      v-else-if="type === 'conversation'"
      :data="(data as Conversation)"
      :linking-ref="(linkingRef as ConversationRef)"
      @title-updated="$emit('title-updated', $event)"
      @pin-updated="$emit('pin-updated', $event)"
      @turn-note-updated="$emit('turn-note-updated', $event)"
      @turn-added="$emit('turn-added', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { Conversation, ConversationRef, ConversationTurn, QuestionAnswer, QuestionAnswerRef } from '../../types/study';
import QuestionAnswerWorkspace from './QuestionAnswerWorkspace.vue';
import ConversationWorkspace from './ConversationWorkspace.vue';

defineProps<{
  type: 'conversation' | 'question_answer' | null;
  loading: boolean;
  error: string | null;
  data: Conversation | QuestionAnswer | null;
  linkingRef: ConversationRef | QuestionAnswerRef | null;
}>();

defineEmits<{
  (e: 'title-updated', newTitle: string): void;
  (e: 'pin-updated', isPinned: boolean): void;
  (e: 'note-updated', payload: { field: 'question_note' | 'answer_note', value: string | null }): void;
  (e: 'turn-note-updated', payload: { turnId: number, field: 'question_note' | 'answer_note', value: string | null }): void;
  (e: 'turn-added', turn: ConversationTurn): void;
}>();
</script>

<style scoped>
.workspace-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--color-text-muted);
}

.workspace-status.error {
  color: var(--sl-color-danger-600);
}

.workspace-content {
  /* Any workspace-wide content styling can go here */
}
</style>
