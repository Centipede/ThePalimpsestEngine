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
      @references-updated="$emit('references-updated')"
    />
    <div v-for="turn in data.turns" :key="turn.id">
      <ConversationTurnComponent
        :turn="turn"
        @turn-note-updated="$emit('turn-note-updated', $event)"
      />
    </div>

    <div class="add-turn-form">
      <sl-textarea
        placeholder="You say..."
        :value="newQuestion"
        @sl-input="newQuestion = $event.target.value"
        :disabled="submitting"
        rows="10"
      ></sl-textarea>

      <sl-details summary="Advanced Settings (Optional Overrides)">
        <div class="settings-grid">
          <sl-input
            label="Model Override"
            placeholder="e.g. gpt-5.6-luna"
            :value="newModel"
            @sl-input="newModel = $event.target.value"
            :disabled="submitting"
          ></sl-input>
          <sl-textarea
            label="System Prompt Override"
            placeholder="Custom system instructions..."
            :value="newSystemPrompt"
            @sl-input="newSystemPrompt = $event.target.value"
            :disabled="submitting"
            rows="5"
            resize="none"
          ></sl-textarea>
        </div>
      </sl-details>

      <div class="form-actions">
        <sl-button
          variant="primary"
          @click="handleAddTurn"
          :loading="submitting"
          :disabled="!newQuestion.trim()"
        >
          Send Question
        </sl-button>
      </div>

      <div v-if="error" class="error-container">
        <sl-alert variant="danger" open closable @sl-after-hide="error = null">
          <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
          <strong>Error:</strong> {{ error }}
        </sl-alert>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useDraft } from '../../composables/useDraft';
import type { Conversation, ConversationRef, ConversationTurn } from '../../types/study';
import { apiFetch } from '../../api';
import WorkspaceHeader from './WorkspaceHeader.vue';
import ConversationTurnComponent from './ConversationTurn.vue';

const props = defineProps<{
  data: Conversation;
  linkingRef: ConversationRef;
}>();

const emit = defineEmits<{
  (e: 'title-updated', newTitle: string): void;
  (e: 'pin-updated', isPinned: boolean): void;
  (e: 'references-updated'): void;
  (e: 'turn-note-updated', payload: { turnId: number, field: 'question_note' | 'answer_note', value: string | null }): void;
  (e: 'turn-added', turn: ConversationTurn): void;
}>();

const { draft: newQuestion, clear: clearQuestionDraft } = useDraft(
  () => `palimpsest_draft_conv_${props.data.id}`
);
const newModel = ref('');
const newSystemPrompt = ref('');
const submitting = ref(false);
const error = ref<string | null>(null);

async function handleAddTurn() {
  if (!props.data?.id || !newQuestion.value.trim()) return;

  submitting.value = true;
  error.value = null;

  try {
    const payload = {
      question: newQuestion.value.trim(),
      system_prompt: newSystemPrompt.value.trim() || null,
      model: newModel.value.trim() || null
    };

    const response = await apiFetch(`/teststudy/api/v1/conversations/${props.data.id}/turns/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Error: ${response.statusText}`);
    }

    const newTurn: ConversationTurn = await response.json();
    emit('turn-added', newTurn);
    
    // Clear form
    clearQuestionDraft();
    // Clear optional overrides as well for next question
    newModel.value = '';
    newSystemPrompt.value = '';
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.conversation-workspace {
  padding: 0;
}

.add-turn-form {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid var(--sl-color-neutral-200);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.error-container {
  margin-top: 1rem;
}
</style>
