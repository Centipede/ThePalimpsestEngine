<template>
  <div v-if="block" class="block-only-view">
    <Teleport v-if="isStaff" to=".admin-tools-portal">
      <div class="block-admin-actions-portal">
        <h3 class="portal-section-title">Block Admin</h3>
        <div class="admin-actions-group">
          <sl-button variant="warning" size="small" :loading="isGathering" @click="gatherBlockInfo">
            <sl-icon slot="prefix" name="gear"></sl-icon>
            Gather block info
          </sl-button>
        </div>
      </div>
    </Teleport>

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
import { computed, inject, type Ref, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { apiFetch } from '../api';
import type { SectionContentResponse } from '../types/library';
import ContentBlockView from './ContentBlockView.vue';
import type {ToolbarToggle} from "../types/view_state.ts";

const route = useRoute();
const { isStaff } = useAuth();
// TODO: Don't provide/inject sectionData!
const sectionData = inject<Ref<SectionContentResponse | null>>('sectionData');

const machineName = computed(() => route.params.machine_name as string);
const sectionPath = computed(() => route.params.path_full as string);
const blockId = computed(() => route.params.block_id as string);

const blockIndex = computed(() => {
  if (!sectionData?.value) return -1;
  return sectionData.value.contents.findIndex(b => b.path_id === blockId.value);
});

const block = computed(() => {
  if (blockIndex.value === -1) return null;
  return sectionData!.value!.contents[blockIndex.value];
});

const isGathering = ref(false);

async function gatherBlockInfo() {
  if (!machineName.value || !sectionPath.value || !blockId.value) {
    console.error('Missing context for gathering block info');
    return;
  }

  isGathering.value = true;
  try {
    const res = await apiFetch(`/testbooks/api/v1/book/${machineName.value}/section/${sectionPath.value}/content/${blockId.value}/maintenance/job/run_gather_info`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error('Failed to gather block info:', e);
  } finally {
    isGathering.value = false;
  }
}

const backLink = computed(() => {
  const parts = route.path.split('/content/');
  return parts[0];
});

const availableHighlights: ToolbarToggle[] = [
  { name: 'Summary Quotes', type: 'summary-quotes', checked: true, extraordinary: false },
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

.block-admin-actions-portal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--sl-color-warning-200);
  border-radius: var(--sl-border-radius-medium);
  margin-bottom: 2rem;
}

.portal-section-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--sl-color-warning-700);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.admin-actions-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
