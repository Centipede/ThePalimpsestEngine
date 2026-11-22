<template>
  <div class="occurrences-list">
    <template v-if="occurrences.length > 0">
      <div
        v-for="occurrence in occurrences"
        :key="occurrence.id"
        :id="idPrefix ? `${idPrefix}-${occurrence.id}` : undefined"
        class="occurrence-item"
        :class="{ 'is-selected': selectedOccurrence?.id === occurrence.id }"
      >
        <div class="occurrence-header">
          <div class="occurrence-name">{{ occurrence.name }}</div>
          <sl-icon-button
            v-if="actionIcon && occurrence.in_block_pi"
            :name="actionIcon"
            :label="actionLabel"
            class="action-button"
            @click="emit('action', occurrence)"
          ></sl-icon-button>
        </div>
        <blockquote class="occurrence-quote">{{ occurrence.quote }}</blockquote>
        <div class="occurrence-description">{{ occurrence.description }}</div>
      </div>
    </template>
    <div v-else class="no-occurrences">{{ emptyLabel }}</div>
  </div>
</template>

<script setup lang="ts">
import type { FindingOccurrence } from '../../../types/library';

/**
 * The mentions behind a finding: each one's name, its quote, and what the extraction
 * made of it.
 *
 * Lifted out of ContextRow, which had the only copy, because the identity match work
 * area has to show the same thing in two more places - a candidate's occurrences in
 * column 3, and a linked section's in the found-in tree. The spec asks for "basically
 * the occurrence list from sections", so this is that list rather than a lookalike that
 * would drift from it.
 *
 * Order is the payload's order, always. Every endpoint that sends these sorts by reading
 * order, which is not lexicographic - `2.p` comes before `10.p` - so re-sorting here
 * would be a regression that reads like a tidy-up.
 */

withDefaults(defineProps<{
  occurrences: FindingOccurrence[];
  /** Highlights one row, for the paragraph-to-mention jump in the reading view. */
  selectedOccurrence?: FindingOccurrence | null;
  /**
   * Bootstrap Icons name for the per-row button. Omitted, no button is rendered - which
   * is what the work area wants, where there is no paragraph on screen to jump to.
   */
  actionIcon?: string;
  actionLabel?: string;
  /** Gives each row a DOM id, so something outside can scroll to it. */
  idPrefix?: string;
  emptyLabel?: string;
}>(), {
  selectedOccurrence: null,
  actionIcon: '',
  actionLabel: '',
  idPrefix: '',
  emptyLabel: 'No occurrences found.',
});

const emit = defineEmits<{
  (e: 'action', occurrence: FindingOccurrence): void;
}>();
</script>

<style scoped>
/* A bare list: no left rule, no inset. The gutter belongs to whoever is placing it -
   ContextRow wants the mentions and the Wikipedia link above them inside one rule, and
   the work area's columns want no rule at all. */
.occurrences-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.occurrence-item {
  transition: background-color 0.3s ease;
}

.occurrence-item.is-selected {
  background-color: var(--sl-color-primary-50);
  border-radius: 4px;
  padding: 0.25rem;
  margin: -0.25rem;
}

.occurrence-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
}

.action-button {
  font-size: 0.9rem;
  flex-shrink: 0;
  color: var(--sl-color-primary-600);
}

.action-button::part(base) {
  padding: 0;
}

.occurrence-name {
  font-weight: 600;
  color: var(--sl-color-neutral-800);
  margin-bottom: 0.1rem;
}

.occurrence-quote {
  margin: 0;
  font-style: italic;
  color: var(--sl-color-neutral-700);
  line-height: 1.4;
}

.occurrence-description {
  font-size: 0.75rem;
  color: var(--sl-color-neutral-500);
  margin-top: 0.2rem;
}

.no-occurrences {
  font-size: 0.75rem;
  color: var(--sl-color-neutral-400);
  font-style: italic;
}
</style>
