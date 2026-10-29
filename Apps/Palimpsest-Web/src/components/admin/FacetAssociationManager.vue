<template>
  <div class="association-manager">
    <header class="section-header">
      <h3>{{ title }}</h3>
      <sl-button variant="default" size="small" circle @click="showSelector = true">
        <sl-icon name="plus"></sl-icon>
      </sl-button>
    </header>

    <div class="item-list">
      <div v-if="items.length === 0" class="empty-state">
        No {{ title.toLowerCase() }} associated.
      </div>
      <div v-for="item in items" :key="item.application.id" class="association-item">
        <span class="item-label">{{ item.label }}</span>
        <div class="item-actions">
          <sl-button variant="default" size="small" circle @click="openEdit(item.application)">
            <sl-icon name="gear"></sl-icon>
          </sl-button>
          <sl-button variant="danger" size="small" circle @click="emit('remove', type === 'book' ? item.application.book! : item.application.topic!)">
            <sl-icon name="trash"></sl-icon>
          </sl-button>
        </div>
      </div>
    </div>

    <sl-dialog :label="`Add ${title}`" :open="showSelector" @sl-after-hide.self="showSelector = false" class="selector-dialog">
      <div class="selector-container">
        <BookSelector
            v-if="type === 'book'"
            :selected-ids="ids"
            :author-ids="[]"
            @update:selected-ids="handleSelectionChange"
        />
        <TopicSelector
            v-else
            :selected-ids="ids"
            @update:selected-ids="handleSelectionChange"
        />
      </div>
      <sl-button slot="footer" variant="primary" @click="showSelector = false">Close</sl-button>
    </sl-dialog>

    <sl-dialog :label="`Edit Association Properties`" :open="showEditDialog" @sl-after-hide.self="showEditDialog = false">
      <div v-if="editFormData" class="edit-form">
        <div class="form-grid">
          <div class="form-section">
            <h4>Section Usage</h4>
            <sl-switch :checked="editFormData.use_section_one" @sl-change="editFormData.use_section_one = $event.target.checked">One</sl-switch>
            <sl-switch :checked="editFormData.use_section_few" @sl-change="editFormData.use_section_few = $event.target.checked">Few</sl-switch>
            <sl-switch :checked="editFormData.use_section_many" @sl-change="editFormData.use_section_many = $event.target.checked">Many</sl-switch>
          </div>

          <div class="form-section">
            <h4>Segment Usage</h4>
            <sl-switch :checked="editFormData.use_segment_one" @sl-change="editFormData.use_segment_one = $event.target.checked">One</sl-switch>
            <sl-switch :checked="editFormData.use_segment_few" @sl-change="editFormData.use_segment_few = $event.target.checked">Few</sl-switch>
            <sl-switch :checked="editFormData.use_segment_many" @sl-change="editFormData.use_segment_many = $event.target.checked">Many</sl-switch>
          </div>
        </div>

        <sl-divider></sl-divider>

        <div class="form-section">
          <h4>Content Usage</h4>
          <sl-switch :checked="editFormData.use_content_all" @sl-change="editFormData.use_content_all = $event.target.checked">Use all content</sl-switch>
        </div>

        <sl-divider></sl-divider>

        <sl-select label="Render Method" :value="editFormData.render_method?.method || ''" @sl-change="handleRenderMethodChange">
          <sl-option value="">None</sl-option>
          <sl-option value="time_period">Time Period</sl-option>
          <sl-option value="geographical_area">Geographical Area</sl-option>
        </sl-select>
      </div>
      <sl-button slot="footer" variant="primary" @click="handleSaveEdit">Save Changes</sl-button>
    </sl-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import {useLibraryStore} from '../../stores/library';
import BookSelector from '../corpus/panels/pickingpanels/BookSelector.vue';
import TopicSelector from '../corpus/panels/pickingpanels/TopicSelector.vue';
import type {FacetApplication} from "../../types/library.ts";

const props = defineProps<{
  type: 'book' | 'topic';
  applications: FacetApplication[];
  title: string;
}>();

const emit = defineEmits<{
  (e: 'add', id: number): void;
  (e: 'remove', id: number): void;
  (e: 'update', payload: { id: number, data: Partial<FacetApplication> }): void;
}>();

const libraryStore = useLibraryStore();
const showSelector = ref(false);
const showEditDialog = ref(false);
const editingApp = ref<FacetApplication | null>(null);
const editFormData = ref<FacetApplication | null>(null);

onMounted(() => {
  if (props.type === 'book') {
    libraryStore.fetchBooks();
  } else {
    libraryStore.fetchTopics();
  }
});

interface ApplicationItem {
  application: FacetApplication;
  label: string;
}

const items = computed<ApplicationItem[]>(() => {
  return props.applications.map(app => {
    let label = 'Unknown';
    if (props.type === 'book' && app.book) {
      const book = libraryStore.books.find(b => b.id === app.book);
      label = book ? book.title : `Book #${app.book}`;
    } else if (props.type === 'topic' && app.topic) {
      const topic = libraryStore.flattenedTopics.find(t => t.id === app.topic);
      label = topic ? topic.fullPath || topic.name : `Topic #${app.topic}`;
    }
    return { application: app, label };
  });
});

const ids = computed(() => {
  return props.applications
      .map(app => props.type === 'book' ? app.book : app.topic)
      .filter((id): id is number => id !== null);
});

function openEdit(app: FacetApplication) {
  editingApp.value = app;
  editFormData.value = { ...app };
  showEditDialog.value = true;
}

function handleSaveEdit() {
  if (editingApp.value && editFormData.value) {
    emit('update', { id: editingApp.value.id, data: editFormData.value });
    showEditDialog.value = false;
  }
}

function handleRenderMethodChange(event: any) {
  if(!editFormData.value)
    return;

  const val = event.target.value;
  if (val) {
    editFormData.value.render_method = { method: val };
  } else {
    editFormData.value.render_method = null;
  }
}

const handleSelectionChange = (selectedIds: number[]) => {
  const currentIds = ids.value;
  const addedId = selectedIds.find(id => !currentIds.includes(id));
  if (addedId !== undefined) {
    emit('add', addedId);
    return;
  }

  const removedId = currentIds.find(id => !selectedIds.includes(id));
  if (removedId !== undefined) {
    emit('remove', removedId);
  }
};

</script>

<style scoped>
.association-manager {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h3 {
  margin: 0;
  font-size: 1.1rem;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.association-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--sl-color-neutral-50);
  border-radius: var(--sl-border-radius-medium);
  border: 1px solid var(--sl-color-neutral-200);
}

.item-label {
  font-size: 0.9rem;
  font-weight: 500;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  font-size: 0.9rem;
  color: var(--sl-color-neutral-500);
  font-style: italic;
}

.selector-container {
  height: 400px;
  overflow: hidden;
}

.selector-dialog::part(body) {
  padding-top: 0;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: var(--sl-color-neutral-600);
}
</style>
