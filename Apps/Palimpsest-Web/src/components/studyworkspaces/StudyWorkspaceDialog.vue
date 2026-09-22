<template>
  <sl-dialog
    :label="type === 'conversation' ? 'Conversation' : 'Q&A'"
    :open="open"
    class="studyitem-dialog"
    @sl-after-hide.self="$emit('update:open', false)"
    style="--width: 80vw;"
  >
    <StudyWorkspaceContent
      :type="type"
      :loading="loading"
      :error="error"
      :data="data"
      :linking-ref="linkingRef"
      @title-updated="$emit('title-updated', $event)"
      @pin-updated="$emit('pin-updated', $event)"
      @note-updated="$emit('note-updated', $event)"
      @turn-note-updated="$emit('turn-note-updated', $event)"
      @turn-added="$emit('turn-added', $event)"
    />
    <sl-button slot="footer" variant="primary" @click="$emit('update:open', false)">Close</sl-button>
  </sl-dialog>
</template>

<script setup lang="ts">
import type { Conversation, ConversationRef, ConversationTurn, QuestionAnswer, QuestionAnswerRef } from '../../types/study';
import StudyWorkspaceContent from './StudyWorkspaceContent.vue';

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
  (e: 'turn-added', turn: ConversationTurn): void;
}>();
</script>

<style scoped>
.studyitem-dialog::part(panel) {
  height: 80vh;
  max-height: 80vh;
}

.studyitem-dialog::part(body) {
  height: 100%;
  overflow: scroll;
}
</style>
