<template>
  <div 
    :class="['picking-step', `picking-step--${step.strategy}`, { 'is-dragging': isDragging }]"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover.prevent
    @drop="$emit('drop', index)"
  >
    <div class="step-main">
      <sl-icon name="grip-vertical" class="drag-handle"></sl-icon>
      <sl-icon :name="stepIcon" class="step-icon"></sl-icon>
      <span class="step-label">{{ stepLabel }}</span>
    </div>
    <div class="step-actions">
      <sl-button variant="text" size="small" @click="$emit('remove')">
        <sl-icon name="x-lg" slot="prefix"></sl-icon>
      </sl-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PickingStep } from '../../../types/corpusquery';

const props = defineProps<{
  step: PickingStep;
  index: number;
}>();

const emit = defineEmits<{
  (e: 'remove'): void;
  (e: 'dragstart', index: number): void;
  (e: 'dragend'): void;
  (e: 'drop', index: number): void;
}>();

const isDragging = ref(false);

function handleDragStart(event: DragEvent) {
  isDragging.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', props.index.toString());
  }
  emit('dragstart', props.index);
}

function handleDragEnd() {
  isDragging.value = false;
  emit('dragend');
}

const stepIcon = computed(() => {
  const item = props.step.selection[0];
  if (!item) return 'dot';
  switch (item.obj_kind) {
    case 'author': return 'person';
    case 'book': return 'book';
    case 'section': return 'hash';
    default: return 'dot';
  }
});

const stepLabel = computed(() => {
  const item = props.step.selection[0];
  if (!item) return 'Unknown item';
  
  if (item.obj_kind === 'author') {
    return `Author: ${item.abbrev}`;
  }
  if (item.obj_kind === 'book') {
    const authorPart = item.author_abbrev ? ` (${item.author_abbrev})` : '';
    return `Book: ${item.abbrev}${authorPart}`;
  }
  if (item.obj_kind === 'section') {
    const subtree = props.step.expansion === 'descendants' ? ' (and subchapters)' : '';
    const bookPart = item.book_abbrev ? ` in ${item.book_abbrev}` : '';
    const authorPart = item.author_abbrev ? ` (${item.author_abbrev})` : '';
    return `Chapter: ${item.path_coded}${bookPart}${authorPart}${subtree}`;
  }
  return 'Unknown item';
});
</script>

<style scoped>
.picking-step {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: var(--sl-border-radius-small);
  font-size: 0.8rem;
}

.picking-step--include {
  background-color: var(--sl-color-success-50);
  border-left: 4px solid var(--sl-color-success-600);
  color: var(--sl-color-success-900);
}

[data-theme="dark"] .picking-step--include {
  background-color: var(--sl-color-success-950);
  color: var(--sl-color-success-200);
}

.picking-step--exclude {
  background-color: var(--sl-color-warning-50);
  border-left: 4px solid var(--sl-color-warning-600);
  color: var(--sl-color-warning-900);
}

[data-theme="dark"] .picking-step--exclude {
  background-color: var(--sl-color-warning-950);
  color: var(--sl-color-warning-200);
}

.step-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.step-icon {
  font-size: 0.9rem;
  opacity: 0.7;
}

.drag-handle {
  cursor: grab;
  opacity: 0.4;
  font-size: 1rem;
}

.drag-handle:hover {
  opacity: 1;
}

.is-dragging {
  opacity: 0.5;
  border: 1px dashed var(--sl-color-primary-600);
}

.step-actions {
  display: flex;
  align-items: center;
}
</style>
