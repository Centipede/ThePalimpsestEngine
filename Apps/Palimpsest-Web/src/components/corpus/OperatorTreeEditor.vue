<template>
  <div class="operator-tree-editor" :style="{ paddingLeft: depth > 0 ? '0.5rem' : '0' }">
    <div class="operator-node-row">
      <div class="operator-node-header">
        <sl-icon :name="isSearchSequence(node) ? 'search' : getNodeIcon(node)" class="node-icon"></sl-icon>
        <span class="node-kind">{{ isSearchSequence(node) ? 'Search' : node.op_kind }}</span>
        
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
      <div v-if="isSearchSequence(node)" class="search-sequence-content">
        <div class="search-summary">
          <span class="query-text">"{{ getSearchNode(node as SequenceOperator)?.query }}"</span>
          <span class="scope-text">in specified scope</span>
        </div>
      </div>

      <!-- Picking Operator Content -->
      <div v-else-if="node.op_kind === 'picking'" class="picking-content">
        <div v-if="node.steps.length === 0" class="empty-steps">
          No steps in this picking operator.
        </div>
        <div v-else class="picking-steps">
          <div 
            v-for="(step, index) in node.steps" 
            :key="index"
            :class="['picking-step', `picking-step--${step.strategy}`]"
          >
            <div class="step-main">
              <sl-icon :name="getStepIcon(step)" class="step-icon"></sl-icon>
              <span class="step-label">{{ getStepLabel(step) }}</span>
            </div>
            <sl-button variant="text" size="small" @click="removeStep(node, index)">
              <sl-icon name="x-lg" slot="prefix"></sl-icon>
            </sl-button>
          </div>
        </div>
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
  PickingStep, 
  PickingOperator,
  SequenceOperator,
  UnionOperator,
  IntersectionOperator,
  SearchPostgresFTS
} from "../../types/corpusquery.ts";
import OperatorTreeEditor from './OperatorTreeEditor.vue';

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
  if (isSearchSequence(node)) return false;
  return ['sequence', 'union', 'intersection'].includes(node.op_kind);
}

function isSearchSequence(node: OperatorNode): node is SequenceOperator {
  return node.op_kind === 'sequence' && node.operators.some(op => op.op_kind.startsWith('search_'));
}

function getSearchNode(node: SequenceOperator): SearchPostgresFTS | undefined {
  return node.operators.find(op => op.op_kind.startsWith('search_')) as SearchPostgresFTS;
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

function getStepIcon(step: PickingStep) {
  const item = step.selection[0];
  if (!item) return 'dot';
  switch (item.obj_kind) {
    case 'author': return 'person';
    case 'book': return 'book';
    case 'section': return 'hash';
    default: return 'dot';
  }
}

function getStepLabel(step: PickingStep) {
  const item = step.selection[0];
  if (!item) return 'Unknown item';
  
  if (item.obj_kind === 'author') {
    return `Author: ${item.abbrev}`;
  }
  if (item.obj_kind === 'book') {
    const authorPart = item.author_abbrev ? ` (${item.author_abbrev})` : '';
    return `Book: ${item.abbrev}${authorPart}`;
  }
  if (item.obj_kind === 'section') {
    const subtree = step.expansion === 'descendants' ? ' (and subchapters)' : '';
    const bookPart = item.book_abbrev ? ` in ${item.book_abbrev}` : '';
    const authorPart = item.author_abbrev ? ` (${item.author_abbrev})` : '';
    return `Chapter: ${item.path_coded}${bookPart}${authorPart}${subtree}`;
  }
  return 'Unknown item';
}

function removeStep(node: PickingOperator, index: number) {
  node.steps.splice(index, 1);
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
}

.operator-node-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.25rem 0;
}

.operator-node-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.5rem;
  background-color: var(--color-bg-muted);
  border-radius: var(--sl-border-radius-small);
}

.node-icon {
  font-size: 0.9rem;
}

.node-kind {
  flex: 1;
}

.picking-steps {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
}

.picking-step {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
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

.empty-steps, .empty-content {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
  padding: 0.5rem 1rem;
}

.logical-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-left: 1px dashed var(--color-border);
  margin-left: 1rem;
  padding-left: 0.25rem;
}

.search-sequence-content {
  padding: 0.5rem 0.5rem;
}

.search-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
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
