<template>
  <div class="study-workspace-page">
    <header class="page-header">
      <router-link :to="`/study/${machineName}/`" class="back-link">
        <sl-icon name="arrow-left"></sl-icon>
        Back to Study
      </router-link>
      <div class="page-title">
        {{ type === 'conversation' ? 'Conversation' : 'Q&A' }}
      </div>
    </header>

    <main class="page-content">
      <StudyWorkspaceContent
        :type="type"
        :loading="loading"
        :error="error"
        :data="data"
        :linking-ref="linkingRef"
        @title-updated="handleTitleUpdated"
        @pin-updated="handlePinUpdated"
        @note-updated="handleNoteUpdated"
        @turn-note-updated="handleTurnNoteUpdated"
        @turn-added="handleTurnAdded"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '@unhead/vue';
import StudyWorkspaceContent from '../components/studyworkspaces/StudyWorkspaceContent.vue';
import { useStudyWorkspaceItem } from '../composables/useStudyWorkspaceItem';
import type { ConversationTurn } from '../types/study';

const route = useRoute();
const machineName = computed(() => route.params.machine_name as string);
const typeParam = computed(() => route.params.type as string);
const idParam = computed(() => parseInt(route.params.id as string));
const refParam = computed(() => route.query.ref ? parseInt(route.query.ref as string) : undefined);

const { loading, error, data, type, linkingRef, loadItem } = useStudyWorkspaceItem();

const pageTitle = computed(() => {
  if (data.value?.title) {
    return `${data.value.title} | Palimpsest Engine`;
  }
  return typeParam.value === 'conversation'
    ? 'Conversation | Palimpsest Engine'
    : 'Q&A | Palimpsest Engine';
});

useHead({
  title: pageTitle,
  link: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: '/logos/palimpsest-menu-icon.svg',
    },
  ],
});

onMounted(() => {
  const itemType = typeParam.value === 'conversation' ? 'conversation' : 'question_answer';
  loadItem(itemType, idParam.value, refParam.value);
});

function handleTitleUpdated(newTitle: string) {
  if (data.value) data.value.title = newTitle;
}

function handlePinUpdated(isPinned: boolean) {
  if (linkingRef.value) linkingRef.value.is_pinned = isPinned;
}

function handleNoteUpdated(payload: { field: 'question_note' | 'answer_note', value: string | null }) {
  if (data.value && 'question_note' in data.value) {
    (data.value as any)[payload.field] = payload.value;
  }
}

function handleTurnNoteUpdated(payload: { turnId: number, field: 'question_note' | 'answer_note', value: string | null }) {
  if (data.value && 'turns' in data.value && data.value.turns) {
    const turn = data.value.turns.find(t => t.id === payload.turnId);
    if (turn) {
      (turn as any)[payload.field] = payload.value;
    }
  }
}

function handleTurnAdded(turn: ConversationTurn) {
  if (data.value && 'turns' in data.value) {
    if (!data.value.turns) data.value.turns = [];
    data.value.turns.push(turn);
  }
}
</script>

<style scoped>
.study-workspace-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--sl-color-neutral-50);
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 2rem;
  background-color: white;
  border-bottom: 1px solid var(--sl-color-neutral-200);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--sl-color-neutral-600);
  font-weight: 500;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--sl-color-primary-600);
}

.page-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--sl-color-neutral-800);
}

.page-content {
  flex: 1;
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}
</style>
