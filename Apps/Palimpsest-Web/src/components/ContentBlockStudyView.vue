<template>
  <div class="content-block-study-view">
    <div v-if="isStaff" class="admin-actions-row">
      <div class="admin-actions-spacer-left"></div>
      <div class="admin-actions-content">
        <sl-button variant="warning" size="small" @click="gatherBlockInfo">
          <sl-icon slot="prefix" name="gear"></sl-icon>
          Gather block info
        </sl-button>
      </div>
      <div class="admin-actions-spacer-right"></div>
    </div>
    <ContentBlockView v-bind="props" />
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '../composables/useAuth';
import ContentBlockView from './ContentBlockView.vue';
import type { ContentBlock, FoldTrigger, ToolbarToggle } from '../types/library';

const props = defineProps<{
  block: ContentBlock;
  index: number;
  foldTrigger?: FoldTrigger;
  availableHighlights?: ToolbarToggle[];
  borderColor?: string;
  blockLink?: string;
}>();

const { isStaff } = useAuth();

function gatherBlockInfo() {
  console.log('Gathering block info for:', props.block.path_id);
  // Dummy implementation as per plan
}
</script>

<style scoped>
.content-block-study-view {
  width: 100%;
}

.admin-actions-row {
  display: grid;
  grid-template-columns: 80px 1fr 4fr 1fr 80px;
  grid-gap: 0.5rem;
  padding-left: 0.5rem;
  margin-bottom: 2px;
}

.admin-actions-content {
  grid-column: 2 / span 3;
  display: flex;
  gap: 0.5rem;
  padding: 4px 0;
  border-bottom: 1px dashed var(--sl-color-warning-300);
}

@media (max-width: 1024px) {
  .admin-actions-row {
    grid-template-columns: 30px 80px 1fr 1fr 80px 30px;
  }
  .admin-actions-content {
    grid-column: 2 / span 4;
  }
}
</style>
