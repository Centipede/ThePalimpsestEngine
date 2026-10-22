<template>
  <div class="picking-tree-node">
    <div v-if="node.steps.length === 0" class="empty-steps">
      No steps in this picking operator.
    </div>
    <div v-else class="picking-steps">
      <PickingStepItem 
        v-for="(step, index) in node.steps" 
        :key="index"
        :step="step" 
        :index="index"
        @remove="removeStep(index)"
        @dragstart="handleDragStart"
        @drop="handleDrop"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { PickingOperator } from '../../../types/corpusquery';
import PickingStepItem from './PickingStepItem.vue';

const props = defineProps<{
  node: PickingOperator;
}>();

const draggedIndex = ref<number | null>(null);

function removeStep(index: number) {
  props.node.steps.splice(index, 1);
}

function handleDragStart(index: number) {
  draggedIndex.value = index;
}

function handleDrop(toIndex: number) {
  if (draggedIndex.value !== null && draggedIndex.value !== toIndex) {
    const steps = props.node.steps;
    const movedItem = steps[draggedIndex.value];
    steps.splice(draggedIndex.value, 1);
    steps.splice(toIndex, 0, movedItem);
  }
  draggedIndex.value = null;
}
</script>

<style scoped>
.picking-steps {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.125rem 0.5rem;
}

.empty-steps {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
  padding: 0.5rem 1rem;
}
</style>
