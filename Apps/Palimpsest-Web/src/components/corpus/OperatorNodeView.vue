<template>
  <div class="operator-node-view" :class="[`style-${viewStyle}`, `kind-${node.op_kind}`]">
    <!-- Group Operators -->
    <template v-if="isGroupOperator">
      <div class="group-header">
        <sl-badge :variant="viewStyle === 'compact' ? 'neutral' : 'primary'" :pill="viewStyle !== 'compact'" :size="viewStyle === 'compact' ? 'small' : 'medium'">
          <sl-icon v-if="viewStyle === 'compact'" :name="groupIcon" class="compact-icon"></sl-icon>
          {{ groupLabel }}
        </sl-badge>
      </div>
      <div class="group-children">
        <OperatorNodeView
          v-for="(child, index) in (node as any).operators"
          :key="index"
          :node="child"
          :view-style="viewStyle"
        />
      </div>
    </template>

    <!-- Picking Operator -->
    <template v-else-if="node.op_kind === 'picking'">
      <div class="leaf-header">
        <sl-badge :variant="viewStyle === 'compact' ? 'neutral' : 'success'" :pill="viewStyle !== 'compact'" :size="viewStyle === 'compact' ? 'small' : 'medium'">
          <sl-icon v-if="viewStyle === 'compact'" name="hand-index-thumb" class="compact-icon"></sl-icon>
          Picking
        </sl-badge>
      </div>
      <div class="leaf-content">
        <div v-for="(step, idx) in node.steps" :key="idx" class="picking-step">
          <sl-badge :variant="step.strategy === 'include' ? 'success' : 'warning'" size="small">
            {{ step.strategy === 'include' ? '+' : '-' }}
          </sl-badge>
          <span class="step-details">
            <template v-for="(item, sIdx) in step.selection" :key="sIdx">
              <sl-badge variant="neutral" size="small" class="compact-selection-item" v-if="viewStyle === 'compact'">
                <sl-icon :name="getItemIcon(item)" class="item-icon"></sl-icon>
                {{ getItemLabel(item) }}
              </sl-badge>
              <span v-else class="selection-item">
                <sl-icon :name="getItemIcon(item)" class="item-icon"></sl-icon>
                {{ getItemLabel(item) }}
              </span>
              <span v-if="step.expansion && step.expansion !== 'self'" class="expansion-note">
                ({{ step.expansion }})
              </span>
              <span v-if="sIdx < step.selection.length - 1 && viewStyle !== 'compact'">, </span>
            </template>
          </span>
        </div>
      </div>
    </template>

    <!-- Search Operators -->
    <template v-else-if="isSearchOperator">
      <div class="leaf-header">
        <sl-badge :variant="viewStyle === 'compact' ? 'neutral' : 'neutral'" :pill="viewStyle !== 'compact'" :size="viewStyle === 'compact' ? 'small' : 'medium'">
          <sl-icon v-if="viewStyle === 'compact'" name="search" class="compact-icon"></sl-icon>
          {{ searchLabel }}
        </sl-badge>
      </div>
      <div class="leaf-content">
        <div class="search-query" :class="{ 'compact-query': viewStyle === 'compact' }">"{{ (node as any).query }}"</div>
        <div class="search-meta" v-if="viewStyle !== 'compact' && ((node as any).fts_style || (node as any).within_levenshtein_dist || (node as any).embedding_model)">
          <sl-badge size="small" variant="neutral">
            {{ getSearchDetail(node) }}
          </sl-badge>
        </div>
      </div>
    </template>

    <!-- Conversion Operator -->
    <template v-else-if="node.op_kind === 'conversion'">
      <div class="leaf-header">
        <sl-badge :variant="viewStyle === 'compact' ? 'neutral' : 'neutral'" :pill="viewStyle !== 'compact'" :size="viewStyle === 'compact' ? 'small' : 'medium'">
          <sl-icon v-if="viewStyle === 'compact'" name="arrow-repeat" class="compact-icon"></sl-icon>
          Conv
        </sl-badge>
      </div>
      <div class="leaf-content">
        <div class="conversion-details" :class="{ 'compact-conversion': viewStyle === 'compact' }">
          <span>{{ node.conversion || 'self' }}</span>
          <sl-icon name="arrow-right" class="arrow-icon"></sl-icon>
          <sl-badge variant="neutral" size="small">{{ node.output_type }}</sl-badge>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { OperatorNode, PickedObject } from '../../types/corpusquery';
import { useLibraryStore } from '../../stores/library';

const props = defineProps<{
  node: OperatorNode;
  viewStyle: 'nested' | 'compact';
}>();

const libraryStore = useLibraryStore();

const isGroupOperator = computed(() => 
  ['sequence', 'union', 'intersection'].includes(props.node.op_kind)
);

const groupLabel = computed(() => {
  switch (props.node.op_kind) {
    case 'sequence': return 'Sequence';
    case 'union': return 'Union';
    case 'intersection': return 'Intersection';
    default: return '';
  }
});

const groupIcon = computed(() => {
  switch (props.node.op_kind) {
    case 'sequence': return 'list-ol';
    case 'union': return 'union';
    case 'intersection': return 'intersect';
    default: return 'circle';
  }
});

const isSearchOperator = computed(() => 
  props.node.op_kind.startsWith('search_')
);

const searchLabel = computed(() => {
  switch (props.node.op_kind) {
    case 'search_postgres_fts': return 'FTS Search';
    case 'search_fuzzy_search': return 'Fuzzy Search';
    case 'search_semantic_vector': return 'Semantic Search';
    default: return 'Search';
  }
});

function getSearchDetail(node: any) {
  if (node.op_kind === 'search_postgres_fts') return `Style: ${node.fts_style}`;
  if (node.op_kind === 'search_fuzzy_search') return `Dist: ${node.within_levenshtein_dist}`;
  if (node.op_kind === 'search_semantic_vector') return `Model: ${node.embedding_model}`;
  return '';
}

function getItemIcon(item: PickedObject) {
  switch (item.obj_kind) {
    case 'author': return 'person';
    case 'book': return 'book';
    case 'section': return 'hash';
    default: return 'dot';
  }
}

function getItemLabel(item: PickedObject) {
  if (item.obj_kind === 'author') {
    return item.abbrev;
  }
  if (item.obj_kind === 'book') {
    return item.abbrev;
  }
  if (item.obj_kind === 'section') {
    return item.path_coded;
  }
  return 'Unknown';
}
</script>

<style scoped>
.operator-node-view {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Nested Style */
.style-nested {
  padding: 0.75rem;
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-medium);
  background-color: var(--sl-color-neutral-0);
}

.style-nested.kind-sequence,
.style-nested.kind-union,
.style-nested.kind-intersection {
  border-left: 4px solid var(--sl-color-primary-500);
}

.style-nested .group-children {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-left: 1rem;
  margin-top: 0.5rem;
  border-left: 1px dashed var(--sl-color-neutral-300);
}

.style-nested .leaf-content {
  margin-top: 0.25rem;
  font-size: 0.9rem;
}

.picking-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.selection-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--sl-color-neutral-700);
}

.item-icon {
  font-size: 0.8rem;
  opacity: 0.6;
}

.expansion-note {
  font-size: 0.8rem;
  color: var(--sl-color-neutral-500);
  margin-left: 0.2rem;
}

.search-query {
  font-family: var(--sl-font-mono);
  background: var(--sl-color-neutral-50);
  padding: 0.25rem 0.5rem;
  border-radius: var(--sl-border-radius-small);
  color: var(--sl-color-neutral-900);
  margin-bottom: 0.25rem;
}

.search-meta {
  font-size: 0.8rem;
}

.conversion-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.arrow-icon {
  font-size: 0.8rem;
  opacity: 0.5;
}

/* Compact Style */
.style-compact {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
  padding: 0.15rem 0.25rem;
  border: 1px solid var(--sl-color-neutral-100);
  border-radius: var(--sl-border-radius-small);
  background-color: var(--sl-color-neutral-50);
  font-size: 0.8rem;
}

.style-compact .group-children {
  display: inline-flex;
  flex-direction: row;
  gap: 0.25rem;
  align-items: center;
  padding-left: 0.25rem;
  border-left: 1px solid var(--sl-color-neutral-300);
}

.style-compact .leaf-content {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.style-compact .picking-step {
  display: inline-flex;
  gap: 0.15rem;
  margin-bottom: 0;
}

.style-compact .compact-selection-item {
  --sl-border-radius-small: 2px;
}

.style-compact .compact-query {
  font-family: var(--sl-font-mono);
  font-size: 0.75rem;
  padding: 0 0.25rem;
  background: white;
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: 2px;
}

.style-compact .search-meta {
  display: none; /* Hide complex meta in compact view */
}

.compact-icon {
  margin-right: 0.2rem;
  font-size: 0.8rem;
}
</style>
