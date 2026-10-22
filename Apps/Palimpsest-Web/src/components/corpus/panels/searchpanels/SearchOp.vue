<template>
  <div class="search-op">
    <div class="search-params">
      <sl-input
        v-if="searchNode"
        v-model="searchNode.query"
        placeholder="Type your search query here..."
        clearable
        class="query-input"
      >
        <sl-icon name="search" slot="prefix"></sl-icon>
      </sl-input>
      
      <sl-input
        v-if="searchNode"
        v-model.number="searchNode.num_results"
        type="number"
        min="1"
        class="num-results-input"
        placeholder="Num. results"
      >
        <sl-icon name="hash" slot="prefix"></sl-icon>
      </sl-input>
      
      <sl-select v-if="searchNode" v-model="searchNode.fts_style" class="style-selector">
        <sl-option value="plain">Plain words</sl-option>
        <sl-option value="phrase">Phrase</sl-option>
        <sl-option value="raw">Raw PostgreSQL expression</sl-option>
        <sl-option value="websearch">Web search expression</sl-option>
      </sl-select>
    </div>

    <div class="scope-header">Search Scope</div>
    <div class="scope-container">
      <PickingOp
        v-if="pickingNode"
        :node="pickingNode"
        :initial-authors="initialAuthors"
        :initial-books="initialBooks"
        :initial-sections="initialSections"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SequenceOperator, PickingOperator, SearchPostgresFTS } from "../../../../types/corpusquery.ts";
import PickingOp from '../pickingpanels/PickingOp.vue';

const props = defineProps<{
  node: SequenceOperator;
  initialAuthors?: number[];
  initialBooks?: number[];
  initialSections?: number[];
}>();

// We expect the sequence to be: Picking -> Conversion -> Representation -> Search
const pickingNode = computed(() => 
  props.node.operators.find(op => op.op_kind === 'picking') as PickingOperator | undefined
);

const searchNode = computed(() => 
  props.node.operators.find(op => op.op_kind === 'search_postgres_fts') as SearchPostgresFTS | undefined
);

</script>

<style scoped>
.search-op {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.search-params {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.query-input {
  flex: 1;
}

.num-results-input {
  width: 120px;
}

.style-selector {
  width: 200px;
}

.scope-header {
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--color-border);
}

.scope-container {
  border: 1px solid var(--color-border);
  border-radius: var(--sl-border-radius-medium);
  padding: 1rem;
  background-color: var(--color-bg-muted);
}
</style>
