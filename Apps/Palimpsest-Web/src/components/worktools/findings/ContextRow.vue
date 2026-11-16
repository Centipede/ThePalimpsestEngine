<template>
  <sl-details
    class="entity-details"
    :open="open"
    @sl-show="emit('update:open', true)"
    @sl-hide="emit('update:open', false)"
  >
    <div slot="summary" class="summary-content">
      <span class="summary-label">
        <!-- @click.stop is load-bearing, not defensive: sl-details binds click on its
             shadow-DOM <summary>, which is an ancestor of this slot in the flattened
             tree, so without it ticking the box also toggles the finding open. .prevent
             must NOT be added - that would cancel the tick itself. @keydown.stop is the
             same story for Space, which sl-details also claims. -->
        <sl-checkbox
          v-if="isStaff"
          size="small"
          class="select-checkbox"
          title="Select this finding"
          :checked="selected"
          @click.stop
          @keydown.stop
          @sl-change="emit('toggle-select', context.id, ($event.target as HTMLInputElement).checked)"
        ></sl-checkbox>
        <span class="summary-text" :title="context.name">{{ symbol }} {{ context.name }}</span>
      </span>
      <sl-icon-button
        v-if="isStaff"
        name="gear"
        label="Manage Finding"
        class="manage-button"
        @click.stop="emit('open-toolset')"
        @keydown.stop
      ></sl-icon-button>
    </div>

    <div class="occurrences-list">
      <div v-if="context.of_identity?.wikipedia_url" class="identity-link">
        <a :href="context.of_identity.wikipedia_url" target="_blank" rel="noopener">
          <sl-icon name="link-45deg"></sl-icon>
          Wikipedia
          <sl-icon name="box-arrow-up-right" class="external-icon"></sl-icon>
        </a>
      </div>

      <template v-if="context.occurrences.length > 0">
        <div
          v-for="occurrence in context.occurrences"
          :key="occurrence.id"
          :id="`occurrence-${occurrence.id}`"
          class="occurrence-item"
          :class="{ 'is-selected': selectedOccurrence?.id === occurrence.id }"
        >
          <div class="occurrence-header">
            <div class="occurrence-name">{{ occurrence.name }}</div>
            <sl-icon-button
              v-if="occurrence.in_block_pi"
              name="arrow-down-right-circle"
              label="Jump to paragraph"
              class="jump-button"
              @click="emit('jump-to-block', occurrence)"
            ></sl-icon-button>
          </div>
          <blockquote class="occurrence-quote">{{ occurrence.quote }}</blockquote>
          <div class="occurrence-description">{{ occurrence.description }}</div>
        </div>
      </template>
      <div v-else class="no-occurrences">No occurrences found.</div>
    </div>
  </sl-details>
</template>

<script setup lang="ts">
import type { FindingContext, FindingOccurrence } from '../../../types/library';

/**
 * One finding in the section's findings grid: its name in the summary, its mentions in
 * the body.
 *
 * Lifted out of SectionFindings, which rendered this twice over - once for the
 * identified findings and once for the rest - in two bodies that had drifted apart only
 * in that the unidentified branch had lost its Wikipedia link. The link is v-if'd on the
 * identity anyway, so one component covers both and the branches differ purely in
 * ordering now.
 */

defineProps<{
  context: FindingContext;
  symbol: string;
  isStaff: boolean;
  open: boolean;
  selected: boolean;
  selectedOccurrence?: FindingOccurrence | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'open-toolset'): void;
  (e: 'toggle-select', contextId: number, checked: boolean): void;
  (e: 'jump-to-block', occurrence: FindingOccurrence): void;
}>();
</script>

<style scoped>
.entity-details::part(base) {
  border: none;
  background: none;
}

.entity-details::part(header) {
  padding: 0.1rem 0;
  cursor: pointer;
}

/* The chain that lets a long name ellipsise instead of growing the row: every flex and
   grid ancestor between the text and the column defaults to min-width:auto, which is
   "never shrink below my content". The summary part is sl-details' own flex item, so it
   has to be reached through ::part. Without this the name shoulders the gear button out
   of the column and over the next one, where it cannot be clicked. */
.entity-details::part(summary) {
  min-width: 0;
}

.entity-details::part(header):hover {
  background-color: var(--sl-color-neutral-100);
}

.entity-details::part(content) {
  padding: 0.4rem 0 0.6rem 1rem;
}

.summary-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 0.5rem;
  gap: 0.25rem;
}

.summary-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.summary-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-checkbox {
  flex-shrink: 0;
}

.manage-button {
  font-size: 1rem;
  flex-shrink: 0;
}

.manage-button::part(base) {
  padding: 0;
}

.occurrences-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border-left: 2px solid var(--sl-color-neutral-200);
  padding-left: 0.75rem;
}

.identity-link {
  margin-bottom: 0.2rem;
}

.identity-link a {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--sl-color-primary-600);
  text-decoration: none;
  font-weight: 500;
  padding: 0.2rem 0.4rem;
  background-color: var(--sl-color-primary-50);
  border-radius: var(--sl-border-radius-small);
  transition: background-color 0.2s ease;
}

.identity-link a:hover {
  background-color: var(--sl-color-primary-100);
}

.external-icon {
  font-size: 0.7rem;
  opacity: 0.8;
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

.jump-button {
  font-size: 0.9rem;
  flex-shrink: 0;
  color: var(--sl-color-primary-600);
}

.jump-button::part(base) {
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
