<template>
  <div class="column">
    <div class="column-header">{{ heading }}</div>

    <div class="column__scroll">
      <p v-if="!hasTarget" class="column__status">
        Pick a found identity to see what the scan has proposed for it.
      </p>

      <p v-else-if="showLoading" class="column__status">
        <sl-spinner></sl-spinner>
        Loading candidates…
      </p>

      <p v-else-if="error" class="column__error">{{ error }}</p>

      <p v-else-if="candidates.length === 0" class="column__status">
        Nothing is waiting here. The scan has proposed no undecided candidates for this
        one under the current filters.
      </p>

      <div v-else :class="{ 'list--dim': isLoading }">
        <CandidateRow
          v-for="candidate in candidates"
          :key="candidate.id"
          :candidate="candidate"
          :selected="selectedId === candidate.id"
          :show-identity-name="showIdentityName"
          @select="emit('select', candidate.id)"
        />
      </div>
    </div>

    <Pager
      v-if="hasTarget"
      :label="rangeLabel"
      :has-prev="hasPrev"
      :has-next="hasNext"
      :limit="limit"
      :busy="isLoading"
      @prev="emit('prev')"
      @next="emit('next')"
      @update:limit="emit('update:limit', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CandidateBrief } from '../../../types/identityMatches';
import Pager from '../../worktools/Pager.vue';
import CandidateRow from './CandidateRow.vue';

/** Column 2: what the scan proposes for whatever column 1 has selected. */

const props = defineProps<{
  candidates: CandidateBrief[];
  selectedId: number | null;
  /** False until an identity or a context is selected; the column then explains itself. */
  hasTarget: boolean;
  /** The inverted mode: identities proposed for one unidentified finding. */
  showIdentityName: boolean;
  isLoading: boolean;
  showLoading: boolean;
  error: string;
  rangeLabel: string;
  hasPrev: boolean;
  hasNext: boolean;
  limit: number;
}>();

const emit = defineEmits<{
  (e: 'select', candidateId: number): void;
  (e: 'prev'): void;
  (e: 'next'): void;
  (e: 'update:limit', value: number): void;
}>();

const heading = computed(() =>
  (props.showIdentityName ? 'Candidate identities' : 'Candidate findings'));
</script>

<style scoped>
.column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  height: 100%;
}

.column__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.3rem;
}

.column__status {
  margin: 0.6rem 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.column__error {
  margin: 0.6rem 0;
  font-size: 0.8rem;
  color: var(--sl-color-danger-700);
}

.list--dim {
  opacity: 0.55;
}
</style>
