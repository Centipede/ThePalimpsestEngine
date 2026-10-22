<template>
  <div class="search-tree-node">
    <div class="search-summary">
      <span class="query-text">"{{ searchNode?.query }}"</span>
      <span v-if="!pickingNode || pickingNode.steps.length === 0" class="scope-text">
        in specified scope
      </span>
    </div>

    <!-- Picking steps within Search -->
    <PickingTreeNode v-if="pickingNode && pickingNode.steps.length > 0" :node="pickingNode" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SequenceOperator, PickingOperator, SearchPostgresFTS } from '../../../types/corpusquery';
import PickingTreeNode from './PickingTreeNode.vue';

const props = defineProps<{
  node: SequenceOperator;
}>();

const searchNode = computed(() => {
  return props.node.operators.find(op => op.op_kind.startsWith('search_')) as SearchPostgresFTS;
});

const pickingNode = computed(() => {
  return props.node.operators.find(op => op.op_kind === 'picking') as PickingOperator;
});
</script>

<style scoped>
.search-tree-node {
  padding: 0.25rem 0.5rem;
}

.search-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  padding: 0.25rem 0;
}

.query-text {
  font-weight: 600;
  font-family: var(--sl-font-mono);
  color: var(--sl-color-primary-600);
}

.scope-text {
  color: var(--color-text-muted);
  font-style: italic;
  font-size: 0.75rem;
}
</style>
