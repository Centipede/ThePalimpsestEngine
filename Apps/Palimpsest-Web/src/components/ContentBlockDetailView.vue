<template>
  <div v-if="block" class="block-only-view">
    <div class="block-only-view__nav">
      <router-link :to="backLink" class="back-link">
        <sl-icon name="arrow-left-short"></sl-icon>
        Back to Section
      </router-link>
    </div>
    <div class="block-only-view__focus">
      <ContentBlockView
          :block="block"
          :index="blockIndex"
          :available-highlights="availableHighlights"
      />
    </div>
  </div>
  <div v-else class="block-only-view__error">
    Block not found.
  </div>
</template>

<script setup lang="ts">
import { computed, inject, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import type { SectionContentResponse } from '../types/library';
import ContentBlockView from './ContentBlockView.vue';
import type {ToolbarToggle} from "../types/view_state.ts";

const route = useRoute();
// TODO: Don't provide/inject sectionData!
const sectionData = inject<Ref<SectionContentResponse | null>>('sectionData');

const blockId = computed(() => route.params.block_id as string);

const blockIndex = computed(() => {
  if (!sectionData?.value) return -1;
  return sectionData.value.contents.findIndex(b => b.path_id === blockId.value);
});

const block = computed(() => {
  if (blockIndex.value === -1) return null;
  return sectionData!.value!.contents[blockIndex.value];
});

const backLink = computed(() => {
  const parts = route.path.split('/content/');
  return parts[0];
});

const availableHighlights: ToolbarToggle[] = [
  { name: 'Summary Quotes', type: 'summary-quotes', checked: true },
];
</script>

<style scoped>
.block-only-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.block-only-view__nav {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--sl-color-neutral-200);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--sl-color-primary-600);
  text-decoration: none;
  font-size: 0.9rem;
}

.back-link:hover {
  text-decoration: underline;
}

.block-only-view__focus {
  padding: 2rem 0;
  background-color: var(--sl-color-neutral-50);
  border-radius: var(--sl-border-radius-medium);
}

.block-only-view__error {
  padding: 2rem;
  text-align: center;
  color: var(--sl-color-danger-600);
}
</style>
