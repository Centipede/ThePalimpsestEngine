<template>
  <div class="qa-workspace">
    <h3 class="workspace-title">{{ data.title }}</h3>
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
import type { QuestionAnswer } from '../types/study';

defineProps<{
  data: QuestionAnswer;
}>();
</script>

<style scoped>
.workspace-title {
  margin-top: 0;
  color: var(--sl-color-neutral-900);
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
