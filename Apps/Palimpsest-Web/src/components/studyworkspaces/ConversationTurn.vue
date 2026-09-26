<template>
  <div class="conversation-turn">
    <WorkspaceFoldableSection
      label="User"
      :content="turn.question"
      :note="turn.question_note"
      item-type="conversation-turn"
      :item-id="turn.id"
      note-field="question_note"
      class="turn-q"
      @note-updated="$emit('turn-note-updated', { turnId: turn.id, field: 'question_note', value: $event })"
    >
      <template #actions>
        <sl-button size="small" :loading="isSummarizingUser" @click="summarizeUserText">
          <sl-icon slot="prefix" name="magic"></sl-icon>
          Summarize
        </sl-button>
      </template>
    </WorkspaceFoldableSection>
    <WorkspaceFoldableSection
      label="Assistant"
      :content="turn.answer"
      :note="turn.answer_note"
      item-type="conversation-turn"
      :item-id="turn.id"
      note-field="answer_note"
      class="turn-a"
      @note-updated="$emit('turn-note-updated', { turnId: turn.id, field: 'answer_note', value: $event })"
    >
      <template #actions>
        <sl-button size="small" :loading="isSummarizingAssistant" @click="summarizeAssistantText">
          <sl-icon slot="prefix" name="magic"></sl-icon>
          Summarize
        </sl-button>
      </template>
    </WorkspaceFoldableSection>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ConversationTurn } from '../../types/study';
import WorkspaceFoldableSection from './WorkspaceFoldableSection.vue';
import { apiFetch } from '../../api';

const props = defineProps<{
  turn: ConversationTurn;
}>();

const emit = defineEmits<{
  (e: 'turn-note-updated', payload: { turnId: number, field: 'question_note' | 'answer_note', value: string | null }): void;
}>();

const isSummarizingUser = ref(false);
const isSummarizingAssistant = ref(false);

async function summarizeUserText() {
  if (isSummarizingUser.value) return;
  isSummarizingUser.value = true;
  try {
    const summaryResponse = await apiFetch(`/teststudy/api/v1/conversation-turn/${props.turn.id}/summarize_user_text/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (summaryResponse.ok) {
      const { summary } = await summaryResponse.json();
      
      // Now PATCH to save the summary
      const patchResponse = await apiFetch(`/teststudy/api/v1/conversation-turn/${props.turn.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_note: summary }),
      });

      if (patchResponse.ok) {
        emit('turn-note-updated', { turnId: props.turn.id, field: 'question_note', value: summary });
      }
    }
  } catch (error) {
    console.error('Error summarizing user text:', error);
  } finally {
    isSummarizingUser.value = false;
  }
}

async function summarizeAssistantText() {
  if (isSummarizingAssistant.value) return;
  isSummarizingAssistant.value = true;
  try {
    const summaryResponse = await apiFetch(`/teststudy/api/v1/conversation-turn/${props.turn.id}/summarize_assistant_text/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (summaryResponse.ok) {
      const { summary } = await summaryResponse.json();

      // Now PATCH to save the summary
      const patchResponse = await apiFetch(`/teststudy/api/v1/conversation-turn/${props.turn.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer_note: summary }),
      });

      if (patchResponse.ok) {
        emit('turn-note-updated', { turnId: props.turn.id, field: 'answer_note', value: summary });
      }
    }
  } catch (error) {
    console.error('Error summarizing assistant text:', error);
  } finally {
    isSummarizingAssistant.value = false;
  }
}
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
  margin-bottom: 0.2rem;
}

.turn-a {
  padding-left: 1rem;
  border-left: 3px solid var(--sl-color-primary-200);
}
</style>
