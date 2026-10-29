<template>
  <div class="operator-tree-editor">
    <div class="operator-node-row">
      <div class="operator-node-header">
        <sl-icon :name="isSearch(node) ? 'search' : (isPicking(node) ? 'hand-index-thumb' : getNodeIcon(node))" class="node-icon"></sl-icon>
        <span class="node-kind">{{ isSearch(node) ? 'Search' : (isPicking(node) ? 'Picking' : node.op_kind) }}</span>
        
        <div class="node-actions">
          <sl-button 
            v-if="!(depth === 0 && node.op_kind === 'union')" 
            variant="text" 
            size="small" 
            @click="$emit('edit-node', node)"
          >
            <sl-icon name="pencil" slot="prefix"></sl-icon>
          </sl-button>
          <sl-button 
            v-if="depth > 0" 
            variant="text" 
            size="small" 
            @click="$emit('delete-node', node)"
          >
            <sl-icon name="trash" slot="prefix"></sl-icon>
          </sl-button>
        </div>
      </div>

      <!-- Search Sequence Unified View -->
      <SearchTreeNode v-if="isSearch(node)" :node="node" />

      <!-- Picking Content (Raw or Wrapped) -->
      <div v-else-if="isPicking(node)" class="picking-content">
        <PickingTreeNode v-if="getPickingNode(node)" :node="getPickingNode(node)!" />
      </div>

      <!-- Recursive Content for Logical Operators -->
      <div v-else-if="isLogicalOp(node)" class="logical-content">
        <div v-if="node.operators.length === 0" class="empty-content">
          No operators in this {{ node.op_kind }}.
        </div>
        <OperatorTreeEditor 
          v-else
          v-for="(child, index) in node.operators" 
          :key="index"
          :node="child" 
          :depth="depth + 1"
          @delete-node="deleteChild(node, index)"
          @edit-node="$emit('edit-node', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { 
  OperatorNode, 
  PickingOperator,
  SequenceOperator,
  UnionOperator,
  IntersectionOperator,
} from "../../types/corpusquery.ts";
import OperatorTreeEditor from './OperatorTreeEditor.vue';
import PickingTreeNode from './treeitems/PickingTreeNode.vue';
import SearchTreeNode from './treeitems/SearchTreeNode.vue';

const props = withDefaults(defineProps<{
  node: OperatorNode;
  depth?: number;
}>(), {
  depth: 0
});

const emit = defineEmits<{
  (e: 'delete-node', node: OperatorNode): void;
  (e: 'edit-node', node: OperatorNode): void;
}>();

function isLogicalOp(node: OperatorNode): node is SequenceOperator | UnionOperator | IntersectionOperator {
  if (isSearch(node) || isPicking(node)) return false;
  return ['sequence', 'union', 'intersection'].includes(node.op_kind);
}

function isSearch(node: OperatorNode): node is SequenceOperator {
  return node.op_kind === 'sequence' && node.group_purpose === 'searching';
}

function isPicking(node: OperatorNode): boolean {
  return (node.op_kind === 'sequence' && node.group_purpose === 'picking') || node.op_kind === 'picking';
}

function getPickingNode(node: OperatorNode): PickingOperator | undefined {
  if (node.op_kind === 'sequence') {
    return node.operators.find(op => op.op_kind === 'picking') as PickingOperator;
  }
  if (node.op_kind === 'picking') return node;
  return undefined;
}

function getNodeIcon(node: OperatorNode) {
  switch (node.op_kind) {
    case 'picking': return 'hand-index-thumb';
    case 'sequence': return 'distribute-vertical';
    case 'union': return 'intersect';
    case 'intersection': return 'layers-half';
    case 'search_postgres_fts': return 'search';
    case 'search_fuzzy_search': return 'search';
    case 'search_semantic_vector': return 'search';
    case 'conversion': return 'arrow-repeat';
    case 'representation': return 'display';
    default: return 'gear';
  }
}

function deleteChild(node: SequenceOperator | UnionOperator | IntersectionOperator, index: number) {
  node.operators.splice(index, 1);
}

</script>

<style scoped>
.operator-tree-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
}

.operator-node-row {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.125rem 0;
}

.operator-node-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.15rem 0.5rem;
  background-color: var(--color-bg-muted);
  border-radius: var(--sl-border-radius-small);
}

.node-icon {
  font-size: 0.9rem;
}

.node-kind {
  flex: 1;
}

.empty-steps, .empty-content {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
  padding: 0.5rem 1rem;
}

.logical-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  border-left: 1px dashed var(--color-border);
  margin-left: 0.75rem;
  padding-left: 0.5rem;
}
</style>
