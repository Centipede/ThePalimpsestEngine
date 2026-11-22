<template>
  <div class="identity-row" :class="{ 'identity-row--selected': selected }">
    <button type="button" class="identity-row__head" @click="emit('select')">
      <span class="identity-row__name">
        <span v-if="showFacet && identity.facet" class="identity-row__symbol">
          {{ identity.facet.symbol }}
        </span>
        {{ identity.name }}
      </span>

      <!-- The same figures as the chip in a section, so a librarian arriving from one
           recognises the row they landed on. Inert here: this IS the work area. -->
      <span v-if="counts" class="identity-row__counts">
        <strong>{{ counts.compared }}</strong
        >/<span class="identity-row__triage">{{ counts.triage }}</span>
      </span>
    </button>

    <span v-if="pinned" class="identity-row__pin">Linked from a section</span>

    <div v-if="selected" class="identity-row__body">
      <IdentityDossier :identity="identity" />

      <sl-details class="identity-row__found-in" :open="foundInOpen" @sl-show="emit('open-found-in')" @sl-hide="emit('close-found-in')">
        <span slot="summary" class="identity-row__found-in-summary">
          Already found in
          <template v-if="identity.book_count > 0">
            {{ identity.book_count }} {{ identity.book_count === 1 ? 'book' : 'books' }}
          </template>
        </span>

        <IdentityFoundIn
          :tree="foundIn"
          :loading="foundInLoading"
          :error="foundInError"
          :open-book-ids="openBookIds"
          :open-section-ids="openSectionIds"
          @toggle-book="emit('toggle-book', $event)"
          @toggle-section="emit('toggle-section', $event)"
        />
      </sl-details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FoundIdentityRow, FoundInTree } from '../../../types/identityMatches';
import { hasCandidates } from '../../../utils/findingCandidateQuery';
import IdentityDossier from './IdentityDossier.vue';
import IdentityFoundIn from './IdentityFoundIn.vue';

/**
 * One confirmed identity in column 1. Collapsed it is a name and its candidate counts;
 * selected it opens its dossier and the tree of sections it is already linked in.
 *
 * Expansion and selection are the same gesture on purpose. The screen can only answer
 * questions about one identity at a time - column 2 is keyed on it - so a row that could
 * be open without being selected would be showing a dossier next to someone else's
 * candidates.
 */

const props = defineProps<{
  identity: FoundIdentityRow;
  selected: boolean;
  /** Shows the facet symbol inline, for the orderings that have no facet headers. */
  showFacet: boolean;
  /** Marks a row fetched by id for a deep link rather than drawn from the listing. */
  pinned: boolean;
  foundInOpen: boolean;
  foundIn: FoundInTree | null;
  foundInLoading: boolean;
  foundInError: string;
  openBookIds: Set<number>;
  openSectionIds: Set<number>;
}>();

const emit = defineEmits<{
  (e: 'select'): void;
  (e: 'open-found-in'): void;
  (e: 'close-found-in'): void;
  (e: 'toggle-book', bookId: number): void;
  (e: 'toggle-section', sectionId: number): void;
}>();

const counts = computed(() =>
  hasCandidates(props.identity.candidate_counts) ? props.identity.candidate_counts : null);
</script>

<style scoped>
.identity-row {
  border-bottom: 1px solid var(--color-border);
}

.identity-row--selected {
  background-color: var(--color-bg-muted);
}

.identity-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  width: 100%;
  min-width: 0;
  padding: 0.3rem 0.4rem;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.identity-row__head:hover {
  background-color: var(--color-bg-muted);
}

.identity-row__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.85rem;
}

.identity-row--selected .identity-row__name {
  font-weight: 600;
}

.identity-row__symbol {
  margin-right: 0.15rem;
}

.identity-row__counts {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.identity-row__counts strong {
  color: var(--sl-color-primary-700);
}

.identity-row__triage {
  color: var(--color-text-dimmed);
  font-style: italic;
}

.identity-row__pin {
  display: block;
  padding: 0 0.4rem 0.2rem;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sl-color-primary-700);
}

.identity-row__body {
  padding: 0.25rem 0.5rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.identity-row__found-in::part(base) {
  border: none;
  background: none;
}

.identity-row__found-in::part(header) {
  padding: 0.2rem 0;
}

.identity-row__found-in::part(content) {
  padding: 0.3rem 0 0;
}

.identity-row__found-in-summary {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
