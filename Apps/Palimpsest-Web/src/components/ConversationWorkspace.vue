<template>
  <div class="conversation-workspace">
    <WorkspaceHeader
      :title="data.title"
      :linking-ref="linkingRef"
      :all-refs="data.references || []"
      item-type="conversation"
      :item-id="data.id"
      :metadata="data.metadata"
      @title-updated="$emit('title-updated', $event)"
      @pin-updated="$emit('pin-updated', $event)"
    />
    <div v-for="turn in data.turns" :key="turn.id">
      <ConversationTurn
        :turn="turn"
        @turn-note-updated="$emit('turn-note-updated', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Conversation, ConversationRef } from '../types/study';
import WorkspaceHeader from './WorkspaceHeader.vue';
import ConversationTurn from './ConversationTurn.vue';

defineProps<{
  data: Conversation;
  linkingRef: ConversationRef;
}>();

const emit = defineEmits<{
  (e: 'title-updated', newTitle: string): void;
  (e: 'pin-updated', isPinned: boolean): void;
  (e: 'turn-note-updated', payload: { turnId: number, field: 'question_note' | 'answer_note', value: string | null }): void;
}>();
</script>

<style scoped>
.conversation-workspace {
  padding: 0;
}
</style>
