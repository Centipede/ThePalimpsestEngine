<template>
  <sl-dialog
    :label="getDialogLabel()"
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
      @references-updated="$emit('references-updated')"
      @note-updated="$emit('note-updated', $event)"
      @turn-note-updated="$emit('turn-note-updated', $event)"
      @turn-added="$emit('turn-added', $event)"
      @content-updated="$emit('content-updated', $event)"
    />
    <sl-button slot="footer" variant="primary" @click="$emit('update:open', false)">Close</sl-button>
  </sl-dialog>
</template>

<script setup lang="ts">
import type { Conversation, ConversationRef, ConversationTurn, QuestionAnswer, QuestionAnswerRef, StudyNote, StudyNoteRef } from '../../types/study';
import StudyWorkspaceContent from './StudyWorkspaceContent.vue';

const props = defineProps<{
  open: boolean;
  type: 'conversation' | 'question_answer' | 'studynote' | null;
  loading: boolean;
  error: string | null;
  data: Conversation | QuestionAnswer | StudyNote | null;
  linkingRef: ConversationRef | QuestionAnswerRef | StudyNoteRef | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'title-updated', newTitle: string): void;
  (e: 'pin-updated', isPinned: boolean): void;
  (e: 'references-updated'): void;
  (e: 'note-updated', payload: { field: 'question_note' | 'answer_note', value: string | null }): void;
  (e: 'turn-note-updated', payload: { turnId: number, field: 'question_note' | 'answer_note' | 'question_summary' | 'answer_summary', value: string | null }): void;
  (e: 'turn-added', turn: ConversationTurn): void;
  (e: 'content-updated', newContent: string): void;
}>();

function getDialogLabel() {
  if (props.type === 'conversation') return 'Conversation';
  if (props.type === 'question_answer') return 'Q&A';
  if (props.type === 'studynote') return 'Study Note';
  return 'Workspace';
}
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
