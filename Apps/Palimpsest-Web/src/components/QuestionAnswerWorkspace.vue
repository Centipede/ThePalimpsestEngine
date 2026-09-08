<template>
  <div class="qa-workspace">
    <WorkspaceHeader
      :title="data.title"
      :linking-ref="linkingRef"
      :all-refs="data.references || []"
      item-type="question_answer"
      :item-id="data.id"
      @title-updated="$emit('title-updated', $event)"
      @pin-updated="$emit('pin-updated', $event)"
    />
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
import { marked } from 'marked';
import type { QuestionAnswer, QuestionAnswerRef } from '../types/study';
import WorkspaceHeader from './WorkspaceHeader.vue';

defineProps<{
  data: QuestionAnswer;
  linkingRef: QuestionAnswerRef;
}>();

defineEmits<{
  (e: 'title-updated', newTitle: string): void;
  (e: 'pin-updated', isPinned: boolean): void;
}>();
</script>

<style scoped>
.qa-workspace {
  padding: 0;
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
