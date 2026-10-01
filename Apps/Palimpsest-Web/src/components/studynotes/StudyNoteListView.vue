<template>
  <div class="study-note-list mt-12 border-t pt-8">
    <header class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-slate-800">My Study Notes</h2>
      <sl-button size="small" @click="fetchNotes" :loading="loading" variant="default" pill>
        <sl-icon slot="prefix" name="arrow-clockwise"></sl-icon>
        Refresh
      </sl-button>
    </header>

    <div v-if="notes.length > 0" class="grid gap-6">
      <sl-card v-for="note in notes" :key="note.id" class="note-card">
        <div slot="header" class="flex justify-between items-center">
          <strong class="text-lg">{{ note.title }}</strong>
          <sl-badge variant="primary" pill>{{ note.references?.length || 0 }} references</sl-badge>
        </div>
        
        <div class="content-preview text-base text-slate-600 line-clamp-4 mb-4 whitespace-pre-wrap">
          {{ note.content_md || 'No content yet.' }}
        </div>

        <div slot="footer" class="flex flex-col gap-2">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Attached to:</div>
          <div class="flex flex-wrap gap-x-4 gap-y-2">
            <template v-if="note.references && note.references.length > 0">
              <router-link 
                v-for="ref in note.references" 
                :key="ref.id"
                :to="`/study/${ref.in_book_mn}/section/${ref.in_section_pf}`"
                class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                <sl-icon name="book" class="text-slate-400"></sl-icon>
                <span class="font-medium">{{ ref.in_book_mn }}</span>
                <span class="text-slate-300">/</span>
                <span>{{ ref.in_section_pf }}</span>
              </router-link>
            </template>
            <span v-else class="text-sm text-slate-400 italic">No locations linked.</span>
          </div>
        </div>
      </sl-card>
    </div>
    <div v-else-if="!loading" class="text-center py-16 text-slate-400 italic border-2 border-dashed rounded-xl bg-slate-50">
      <sl-icon name="journal-text" class="text-4xl mb-2 block mx-auto opacity-20"></sl-icon>
      You haven't created any study notes yet.
    </div>
    <div v-if="loading && notes.length === 0" class="text-center py-16">
      <sl-spinner style="font-size: 2rem;"></sl-spinner>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { StudyNote } from '../../types/study';
import { apiFetch } from '../../api';

const notes = ref<StudyNote[]>([]);
const loading = ref(false);

const fetchNotes = async () => {
  loading.value = true;
  try {
    const response = await apiFetch('/teststudy/api/v1/study-notes/');
    if (response.ok) {
      notes.value = await response.json();
    }
  } catch (e) {
    console.error('Failed to fetch all notes', e);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchNotes);
</script>

<style scoped>
.note-card {
  --border-radius: 0.75rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.note-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.note-card::part(base) {
  border: 1px solid var(--sl-color-neutral-200);
}

.note-card::part(header) {
  background-color: var(--sl-color-neutral-50);
}

.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;  
  overflow: hidden;
}
</style>
