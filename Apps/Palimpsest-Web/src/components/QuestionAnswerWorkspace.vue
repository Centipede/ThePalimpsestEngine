<template>
  <div class="qa-workspace">
    <WorkspaceHeader
      :title="data.title"
      :linking-ref="linkingRef"
      :all-refs="data.references || []"
      item-type="question_answer"
      :item-id="data.id"
      :metadata="data.metadata"
      @title-updated="$emit('title-updated', $event)"
      @pin-updated="$emit('pin-updated', $event)"
    />
    <div class="qa-container">
      <WorkspaceFoldableSection
        label="Question"
        :content="data.question"
        :note="data.question_note"
        item-type="question-answer"
        :item-id="data.id"
        note-field="question_note"
        @note-updated="$emit('note-updated', { field: 'question_note', value: $event })"
        :initially-open="true"
      />
      <WorkspaceFoldableSection
        label="Answer"
        :content="data.answer"
        :note="data.answer_note"
        item-type="question-answer"
        :item-id="data.id"
        note-field="answer_note"
        @note-updated="$emit('note-updated', { field: 'answer_note', value: $event })"
        :initially-open="true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { QuestionAnswer, QuestionAnswerRef } from '../types/study';
import WorkspaceHeader from './WorkspaceHeader.vue';
import WorkspaceFoldableSection from './WorkspaceFoldableSection.vue';

defineProps<{
  data: QuestionAnswer;
  linkingRef: QuestionAnswerRef;
}>();

const emit = defineEmits<{
  (e: 'title-updated', newTitle: string): void;
  (e: 'pin-updated', isPinned: boolean): void;
  (e: 'note-updated', payload: { field: 'question_note' | 'answer_note', value: string | null }): void;
}>();
</script>

<style scoped>
.qa-workspace {
  padding: 0;
}

.qa-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

</style>
