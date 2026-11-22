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
        <!-- After the name and outside .summary-text, so it is never what gets
             ellipsised, and flex-shrink:0 in its own styles so it never competes. -->
        <CandidateCountChip :counts="context.candidate_counts" :is-staff="isStaff" />
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

    <div class="context-body">
      <div v-if="context.of_identity?.wikipedia_url" class="identity-link">
        <a :href="context.of_identity.wikipedia_url" target="_blank" rel="noopener">
          <sl-icon name="link-45deg"></sl-icon>
          Wikipedia
          <sl-icon name="box-arrow-up-right" class="external-icon"></sl-icon>
        </a>
      </div>

      <OccurrenceList
        :occurrences="context.occurrences"
        :selected-occurrence="selectedOccurrence"
        action-icon="arrow-down-right-circle"
        action-label="Jump to paragraph"
        id-prefix="occurrence"
        @action="emit('jump-to-block', $event)"
      />
    </div>
  </sl-details>
</template>

<script setup lang="ts">
import type { FindingContext, FindingOccurrence } from '../../../types/library';
import CandidateCountChip from './CandidateCountChip.vue';
import OccurrenceList from './OccurrenceList.vue';

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

/* The border and inset that used to live on .occurrences-list, now that the list is a
   component: the Wikipedia link above it has to sit inside the same gutter. */
.context-body {
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

</style>
