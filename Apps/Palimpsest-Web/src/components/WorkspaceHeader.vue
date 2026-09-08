<template>
  <div class="workspace-header">
    <div class="header-main">
      <div v-if="!isEditingTitle" class="title-display" @click="startEditing">
        <h2 class="title-text">{{ title || (itemType === 'conversation' ? 'Conversation' : 'Q&A') }}</h2>
        <sl-icon name="pencil" class="edit-icon"></sl-icon>
      </div>
      <div v-else class="title-edit">
        <sl-input
          ref="titleInput"
          v-model="editedTitle"
          size="medium"
          :placeholder="itemType === 'conversation' ? 'Conversation' : 'Q&A'"
          :loading="isSavingTitle"
          :disabled="isSavingTitle"
          @sl-blur="saveTitle"
          @keydown.enter="saveTitle"
          @keydown.esc="cancelEditing"
        ></sl-input>
      </div>

      <div class="pin-status">
        <sl-radio-group
          label="Pin Status"
          :value="linkingRef.is_pinned ? 'pinned' : 'unpinned'"
          @sl-change="togglePin"
        >
          <sl-radio-button value="pinned">Pinned</sl-radio-button>
          <sl-radio-button value="unpinned">Unpinned</sl-radio-button>
        </sl-radio-group>
      </div>
    </div>

    <div class="references-section">
      <h4 class="references-title">References</h4>
      <ul class="references-list">
        <li v-for="ref in allRefs" :key="ref.id" class="reference-item">
          <sl-icon :name="ref.in_section ? 'file-text' : 'book'" class="ref-icon"></sl-icon>
          <router-link
            v-if="ref.in_section_pf"
            :to="`/study/${ref.in_book_mn}/section/${ref.in_section_pf}`"
            class="ref-link"
          >
            {{ getReferenceLabel(ref) }}
          </router-link>
          <router-link
            v-else-if="ref.in_book_mn"
            :to="`/study/${ref.in_book_mn}`"
            class="ref-link"
          >
            {{ ref.in_book_mn }}
          </router-link>
          <sl-badge v-if="ref.id === linkingRef.id" variant="neutral" pill size="small">Active</sl-badge>
          <sl-icon v-if="ref.is_pinned" name="pin-angle-fill" class="pinned-icon" title="Pinned"></sl-icon>
        </li>
      </ul>
    </div>

    <div v-if="metadata && metadata.sections && metadata.sections.length > 0" class="references-section search-scope-section">
      <h4 class="references-title">Search Scope</h4>
      <ul class="references-list">
        <li v-for="sec in metadata.sections" :key="sec.id" class="reference-item">
          <sl-icon name="file-text" class="ref-icon"></sl-icon>
          <router-link
            :to="`/study/${metadata.book_machine_name}/section/${sec.path_full}`"
            class="ref-link"
          >
            [{{ sec.full_path_coded }}] {{ sec.title_text }}
          </router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { RouterLink } from 'vue-router';
import type { BaseRef, SearchMetadata } from '../types/study';
import type { SectionDetail } from '../types/library';
import { apiFetch } from '../api';

const props = defineProps<{
  title: string | null;
  linkingRef: BaseRef;
  allRefs: BaseRef[];
  itemType: 'conversation' | 'question_answer';
  itemId: number;
  metadata?: SearchMetadata | null;
}>();

const emit = defineEmits<{
  (e: 'title-updated', newTitle: string): void;
  (e: 'pin-updated', isPinned: boolean): void;
}>();

const isEditingTitle = ref(false);
const editedTitle = ref('');
const isSavingTitle = ref(false);
const titleInput = ref<any>(null);

const sectionTitles = ref<Record<string, string>>({});

function startEditing() {
  editedTitle.value = props.title || '';
  isEditingTitle.value = true;
  nextTick(() => {
    titleInput.value?.focus();
  });
}

function cancelEditing() {
  isEditingTitle.value = false;
}

async function saveTitle() {
  if (!isEditingTitle.value || isSavingTitle.value) return;

  const newTitle = editedTitle.value.trim() || null;
  if (newTitle === props.title) {
    isEditingTitle.value = false;
    return;
  }

  isSavingTitle.value = true;
  try {
    const endpoint = props.itemType === 'conversation' ? 'conversation' : 'question-answer';
    const response = await apiFetch(`/teststudy/api/v1/${endpoint}/${props.itemId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });

    if (response.ok) {
      emit('title-updated', newTitle || (props.itemType === 'conversation' ? 'Conversation' : 'Q&A'));
      isEditingTitle.value = false;
    }
  } catch (error) {
    console.error('Error saving title:', error);
  } finally {
    isSavingTitle.value = false;
  }
}

async function togglePin(event: any) {
  const isPinned = event.target.value === 'pinned';
  if (isPinned === props.linkingRef.is_pinned) return;

  try {
    const endpoint = props.itemType === 'conversation' ? 'conversation-ref' : 'question-answer-ref';
    const response = await apiFetch(`/teststudy/api/v1/${endpoint}/${props.linkingRef.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_pinned: isPinned }),
    });

    if (response.ok) {
      emit('pin-updated', isPinned);
    }
  } catch (error) {
    console.error('Error toggling pin:', error);
  }
}

async function fetchSectionTitles() {
  const sectionsByBook: Record<string, string[]> = {};
  props.allRefs.forEach(ref => {
    if (ref.in_book_mn && ref.in_section_pf) {
      if (!sectionsByBook[ref.in_book_mn]) {
        sectionsByBook[ref.in_book_mn] = [];
      }
      if (!sectionsByBook[ref.in_book_mn].includes(ref.in_section_pf)) {
        sectionsByBook[ref.in_book_mn].push(ref.in_section_pf);
      }
    }
  });

  for (const [bookmn, paths] of Object.entries(sectionsByBook)) {
    try {
      const response = await apiFetch(`/testbooks/api/v1/book/${bookmn}/sections/?code=1&paths=${paths.join(',')}`);
      if (response.ok) {
        const data: SectionDetail[] = await response.json();
        data.forEach(sec => {
          sectionTitles.value[`${bookmn}:${sec.path_full}`] = sec.full_path_coded ? `[${sec.full_path_coded}] ${sec.title_text}` : sec.title_text;
        });
      }
    } catch (e) {
      console.error(`Failed to fetch titles for book ${bookmn}`, e);
    }
  }
}

function getReferenceLabel(ref: BaseRef) {
  if (ref.in_book_mn && ref.in_section_pf) {
    return sectionTitles.value[`${ref.in_book_mn}:${ref.in_section_pf}`] || ref.in_section_pf;
  }
  return ref.in_book_mn || 'Unknown Book';
}

onMounted(fetchSectionTitles);
watch(() => props.allRefs, fetchSectionTitles, { deep: true });
</script>

<style scoped>
.workspace-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--sl-color-neutral-200);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.title-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.25rem;
  margin: -0.25rem;
  border-radius: var(--sl-border-radius-medium);
  transition: background-color var(--sl-transition-fast);
  flex: 1;
}

.title-display:hover {
  background-color: var(--sl-color-neutral-100);
}

.title-text {
  margin: 0;
  font-size: 1.5rem;
  color: var(--sl-color-neutral-900);
}

.edit-icon {
  font-size: 1rem;
  color: var(--sl-color-neutral-400);
  opacity: 0;
  transition: opacity var(--sl-transition-fast);
}

.title-display:hover .edit-icon {
  opacity: 1;
}

.title-edit {
  flex: 1;
}

.pin-status {
  flex-shrink: 0;
}

.references-section {
  background-color: var(--sl-color-neutral-50);
  padding: 1rem;
  border-radius: var(--sl-border-radius-medium);
}

.search-scope-section {
  margin-top: 1rem;
}

.references-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  text-transform: uppercase;
  color: var(--sl-color-neutral-500);
  letter-spacing: 0.05em;
}

.references-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.reference-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
}

.ref-icon {
  color: var(--sl-color-neutral-400);
  font-size: 0.875rem;
}

.ref-link {
  color: var(--sl-color-primary-600);
  text-decoration: none;
}

.ref-link:hover {
  text-decoration: underline;
}

.pinned-icon {
  color: var(--sl-color-warning-600);
  font-size: 0.875rem;
}
</style>
