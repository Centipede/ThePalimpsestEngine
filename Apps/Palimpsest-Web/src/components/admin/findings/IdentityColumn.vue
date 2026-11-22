<template>
  <div class="column">
    <div class="column-header">Found identities</div>

    <div class="column__scroll">
      <!-- The deep-linked identity, fetched by id because the listing has no id filter
           and cannot promise it is on this page. Above the list and labelled, so its
           presence is explained rather than surprising. -->
      <div v-if="pinnedIdentity" class="pinned">
        <IdentityRow
          :identity="pinnedIdentity"
          :selected="selectedId === pinnedIdentity.id"
          :show-facet="true"
          :pinned="true"
          :found-in-open="foundInOpen"
          :found-in="foundIn"
          :found-in-loading="foundInLoading"
          :found-in-error="foundInError"
          :open-book-ids="openBookIds"
          :open-section-ids="openSectionIds"
          @select="emit('select', pinnedIdentity.id)"
          @open-found-in="emit('open-found-in')"
          @close-found-in="emit('close-found-in')"
          @toggle-book="emit('toggle-book', $event)"
          @toggle-section="emit('toggle-section', $event)"
        />
      </div>

      <!-- The unidentified finding a context deep link named. There is no identity to
           select here: column 2 is answering the opposite question. -->
      <div v-if="pinnedContextName" class="pinned pinned--context">
        <p class="pinned__label">Unidentified finding</p>
        <p class="pinned__name">{{ pinnedContextName }}</p>
        <p class="pinned__hint">
          The candidates beside this are identities the scan proposes <em>for</em> it.
          Pick an identity below to go back to the usual direction.
        </p>
      </div>

      <p v-if="showLoading" class="column__status">
        <sl-spinner></sl-spinner>
        Loading identities…
      </p>

      <p v-else-if="error" class="column__error">{{ error }}</p>

      <p v-else-if="groups.length === 0" class="column__status">
        No identities match these filters.
      </p>

      <div
        v-for="group in groups"
        :key="group.key"
        class="group"
        :class="{ 'group--dim': isLoading }"
      >
        <!-- Only under the facet ordering. Under any other, a facet heading would
             describe a grouping the rows are not actually in. -->
        <p v-if="group.label" class="group__header">
          {{ group.symbol }} {{ group.label }}
          <span class="group__count">{{ group.identities.length }} on this page</span>
        </p>

        <IdentityRow
          v-for="identity in group.identities"
          :key="identity.id"
          :identity="identity"
          :selected="selectedId === identity.id"
          :show-facet="!group.label"
          :pinned="false"
          :found-in-open="foundInOpen"
          :found-in="selectedId === identity.id ? foundIn : null"
          :found-in-loading="selectedId === identity.id && foundInLoading"
          :found-in-error="selectedId === identity.id ? foundInError : ''"
          :open-book-ids="openBookIds"
          :open-section-ids="openSectionIds"
          @select="emit('select', identity.id)"
          @open-found-in="emit('open-found-in')"
          @close-found-in="emit('close-found-in')"
          @toggle-book="emit('toggle-book', $event)"
          @toggle-section="emit('toggle-section', $event)"
        />
      </div>
    </div>

    <Pager
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
import type { FoundIdentityRow, FoundInTree } from '../../../types/identityMatches';
import Pager from '../../worktools/Pager.vue';
import IdentityRow from './IdentityRow.vue';

/**
 * Column 1: the confirmed identities, under facet section headers when the ordering
 * makes those meaningful.
 *
 * The groups are computed by the screen, not here: it knows the ordering and owns the
 * facet lookup, and a column that regrouped its own rows could disagree with the header
 * counts above it.
 */

export interface IdentityGroup {
  key: string;
  /** Empty when the ordering is not by facet, which suppresses the header. */
  label: string;
  symbol: string;
  identities: FoundIdentityRow[];
}

defineProps<{
  groups: IdentityGroup[];
  selectedId: number | null;
  pinnedIdentity: FoundIdentityRow | null;
  pinnedContextName: string;
  isLoading: boolean;
  /** True only while there is genuinely nothing to show, so paging never blanks. */
  showLoading: boolean;
  error: string;
  foundInOpen: boolean;
  foundIn: FoundInTree | null;
  foundInLoading: boolean;
  foundInError: string;
  openBookIds: Set<number>;
  openSectionIds: Set<number>;
  rangeLabel: string;
  hasPrev: boolean;
  hasNext: boolean;
  limit: number;
}>();

const emit = defineEmits<{
  (e: 'select', identityId: number): void;
  (e: 'open-found-in'): void;
  (e: 'close-found-in'): void;
  (e: 'toggle-book', bookId: number): void;
  (e: 'toggle-section', sectionId: number): void;
  (e: 'prev'): void;
  (e: 'next'): void;
  (e: 'update:limit', value: number): void;
}>();
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

/* Dimmed rather than emptied while a page loads: the previous page stays readable and
   the position on screen does not jump. */
.group--dim {
  opacity: 0.55;
}

.group__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.4rem;
  margin: 0.7rem 0 0.1rem;
  font-weight: 600;
  font-size: 0.8rem;
  border-bottom: 1px solid var(--sl-color-neutral-200);
  padding-bottom: 0.15rem;
}

.group__count {
  font-weight: 400;
  font-size: 0.65rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.pinned {
  border: 1px solid var(--sl-color-primary-300);
  border-radius: var(--sl-border-radius-medium);
  background-color: var(--sl-color-primary-50);
  margin-bottom: 0.6rem;
}

.pinned--context {
  padding: 0.4rem 0.5rem;
}

.pinned__label {
  margin: 0;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sl-color-primary-700);
}

.pinned__name {
  margin: 0.1rem 0;
  font-weight: 600;
  font-size: 0.85rem;
}

.pinned__hint {
  margin: 0;
  font-size: 0.7rem;
  line-height: 1.4;
  color: var(--color-text-muted);
}
</style>
