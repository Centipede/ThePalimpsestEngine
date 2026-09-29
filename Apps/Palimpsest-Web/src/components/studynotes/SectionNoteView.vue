<template>
  <div class="section-note-view">
    <header class="header">
      <h3 class="text-lg font-semibold">Section Notes</h3>
      <sl-button variant="primary" size="small" @click="isAdding = true" v-if="!isAdding">
        <sl-icon slot="prefix" name="plus-lg"></sl-icon>
        Add Note
      </sl-button>
    </header>

    <div v-if="isAdding" class="add-note-form p-3 border rounded-md bg-slate-50">
      <sl-input v-model="newNoteTitle" placeholder="Note Title" size="small" class="mb-2"></sl-input>
      <div class="actions flex justify-end gap-2">
        <sl-button size="small" @click="cancelAdd">Cancel</sl-button>
        <sl-button variant="primary" size="small" @click="createNewNote" :loading="loading" :disabled="!newNoteTitle.trim()">Create</sl-button>
      </div>
    </div>

    <div class="notes-list flex flex-col gap-3" v-if="notes.length > 0">
      <div v-for="note in notes" :key="note.id" class="note-item">
        <sl-details>
          <div slot="summary" class="flex justify-between items-center w-full pr-4">
             <span class="font-medium text-sm">{{ note.title }}</span>
          </div>
          
          <div v-if="editingNoteId === note.id" class="edit-area flex flex-col gap-2">
            <sl-input v-model="note.title" label="Title" size="small" class="mb-1"></sl-input>
            <sl-textarea
              v-model="note.content_md"
              resize="auto"
              label="Content (Markdown)"
              placeholder="Write your note in Markdown..."
              rows="5"
            ></sl-textarea>
            <div class="edit-actions flex justify-end gap-2 mt-2">
              <sl-button size="small" @click="editingNoteId = null">Cancel</sl-button>
              <sl-button variant="success" size="small" @click="saveNote(note)" :loading="loading">Save</sl-button>
            </div>
          </div>
          
          <div v-else class="view-area">
            <div class="markdown-body text-sm mb-3 prose prose-sm max-w-none" v-html="renderMarkdown(note.content_md || '*No content*')"></div>
            <div class="flex justify-end">
              <sl-button size="small" variant="default" @click="startEditing(note)">
                <sl-icon slot="prefix" name="pencil"></sl-icon>
                Edit
              </sl-button>
            </div>
          </div>
        </sl-details>
      </div>
    </div>
    
    <div v-else-if="!loading && !isAdding" class="empty-state text-center text-slate-400 py-8 italic">
      No notes for this section yet.
    </div>
    
    <div v-if="loading && notes.length === 0" class="loading-state text-center py-8">
      <sl-spinner></sl-spinner>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { Section, Book } from '../../types/library';
import type { StudyNote } from '../../types/study';
import { apiFetch } from '../../api';
import { marked } from 'marked';

const props = defineProps<{
  section: Section;
  book: Book;
  visible?: boolean;
}>();

watch(() => props.visible, (isNowVisible) => {
  if (isNowVisible) {
    fetchNotes();
  }
});

const notes = ref<StudyNote[]>([]);
const loading = ref(false);
const isAdding = ref(false);
const newNoteTitle = ref('');
const editingNoteId = ref<number | null>(null);

const fetchNotes = async () => {
  loading.value = true;
  try {
    // API supports filtering by in_section_pf as per plan requirements
    const response = await apiFetch(`/teststudy/api/v1/study-notes/?in_book_mc=${props.book.machine_name}&in_section_pf=${encodeURIComponent(props.section.path_full)}`);
    if (response.ok) {
      notes.value = await response.json();
    }
  } catch (e) {
    console.error('Failed to fetch notes', e);
  } finally {
    loading.value = false;
  }
};

const createNewNote = async () => {
  if (!newNoteTitle.value.trim()) return;
  loading.value = true;
  try {
    // 1. Create the note
    const noteResponse = await apiFetch('/teststudy/api/v1/study-notes/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newNoteTitle.value, content_md: '' })
    });

    if (noteResponse.ok) {
      const newNote = await noteResponse.json();
      
      // 2. Create the reference to link it to the section
      const refResponse = await apiFetch(`/teststudy/api/v1/study-notes/${newNote.id}/references/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          in_book: props.book.id,
          in_book_mn: props.book.machine_name,
          in_section: props.section.id,
          in_section_pf: props.section.path_full
        })
      });

      if (refResponse.ok) {
        notes.value.unshift(newNote);
        cancelAdd();
        // Automatically start editing the new note
        startEditing(newNote);
      }
    }
  } catch (e) {
    console.error('Failed to create note', e);
  } finally {
    loading.value = false;
  }
};

const saveNote = async (note: StudyNote) => {
  loading.value = true;
  try {
    const response = await apiFetch(`/teststudy/api/v1/study-notes/${note.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: note.title,
        content_md: note.content_md
      })
    });
    if (response.ok) {
      const updated = await response.json();
      const index = notes.value.findIndex(n => n.id === note.id);
      if (index !== -1) {
        notes.value[index] = updated;
      }
      editingNoteId.value = null;
    }
  } catch (e) {
    console.error('Failed to save note', e);
  } finally {
    loading.value = false;
  }
};

const startEditing = (note: StudyNote) => {
  editingNoteId.value = note.id;
};

const cancelAdd = () => {
  isAdding.value = false;
  newNoteTitle.value = '';
};

const renderMarkdown = (md: string) => {
  return marked.parse(md);
};

onMounted(fetchNotes);

watch(() => props.section.id, () => {
  editingNoteId.value = null;
  fetchNotes();
});
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.markdown-body :deep(p) {
  margin-bottom: 0.75rem;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

sl-details::part(base) {
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-medium);
  overflow: hidden;
}

sl-details::part(header) {
  background-color: var(--sl-color-neutral-50);
  padding: 0.5rem 0.75rem;
}

sl-details::part(content) {
  padding: 1rem;
}
</style>
