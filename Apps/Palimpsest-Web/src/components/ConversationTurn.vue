<template>
  <div class="conversation-turn">
    <WorkspaceFoldableSection
      label="User Question"
      :content="turn.question"
      :note="turn.question_note"
      item-type="conversation-turn"
      :item-id="turn.id"
      note-field="question_note"
      class="turn-q"
      @note-updated="$emit('turn-note-updated', { turnId: turn.id, field: 'question_note', value: $event })"
    />
    <WorkspaceFoldableSection
      label="Assistant Answer"
      :content="turn.answer"
      :note="turn.answer_note"
      item-type="conversation-turn"
      :item-id="turn.id"
      note-field="answer_note"
      class="turn-a"
      @note-updated="$emit('turn-note-updated', { turnId: turn.id, field: 'answer_note', value: $event })"
    />
  </div>
</template>

<script setup lang="ts">
import type { ConversationTurn } from '../types/study';
import WorkspaceFoldableSection from './WorkspaceFoldableSection.vue';

defineProps<{
  turn: ConversationTurn;
}>();

defineEmits<{
  (e: 'turn-note-updated', payload: { turnId: number, field: 'question_note' | 'answer_note', value: string | null }): void;
}>();
</script>

<style scoped>
.conversation-turn {
  padding: 1rem 0;
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
</style>
