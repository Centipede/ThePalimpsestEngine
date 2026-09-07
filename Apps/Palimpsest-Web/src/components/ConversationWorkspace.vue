<template>
  <div class="conversation-workspace">
    <h3 class="workspace-title">{{ data.title || 'Conversation' }}</h3>
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
import { marked } from 'marked';
import type { Conversation } from '../types/study';

defineProps<{
  data: Conversation;
}>();
</script>

<style scoped>
.workspace-title {
  margin-top: 0;
  color: var(--sl-color-neutral-900);
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
