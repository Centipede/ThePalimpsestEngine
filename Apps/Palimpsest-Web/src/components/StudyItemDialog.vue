<template>
  <sl-dialog
    :label="type === 'conversation' ? 'Conversation' : 'Q&A'"
    :open="open"
    @sl-after-hide.self="$emit('update:open', false)"
    style="--width: 80vw;"
  >
    <div v-if="loading" class="dialog-status">
      <sl-spinner></sl-spinner>
      <span>Loading...</span>
    </div>
    <div v-else-if="error" class="dialog-status error">
      {{ error }}
    </div>
    <div v-else-if="data" class="dialog-content">
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
      />
    </div>
    <sl-button slot="footer" variant="primary" @click="$emit('update:open', false)">Close</sl-button>
  </sl-dialog>
</template>

<script setup lang="ts">
import type { Conversation, ConversationRef, QuestionAnswer, QuestionAnswerRef } from '../types/study';
import QuestionAnswerWorkspace from './QuestionAnswerWorkspace.vue';
import ConversationWorkspace from './ConversationWorkspace.vue';

defineProps<{
  open: boolean;
  type: 'conversation' | 'question_answer' | null;
  loading: boolean;
  error: string | null;
  data: Conversation | QuestionAnswer | null;
  linkingRef: ConversationRef | QuestionAnswerRef | null;
}>();

defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'title-updated', newTitle: string): void;
  (e: 'pin-updated', isPinned: boolean): void;
  (e: 'note-updated', payload: { field: 'question_note' | 'answer_note', value: string | null }): void;
  (e: 'turn-note-updated', payload: { turnId: number, field: 'question_note' | 'answer_note', value: string | null }): void;
}>();
</script>

<style scoped>
.dialog-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--color-text-muted);
}

.dialog-status.error {
  color: var(--sl-color-danger-600);
}

.dialog-content {
  /* Any dialog-wide content styling can go here */
}
</style>
