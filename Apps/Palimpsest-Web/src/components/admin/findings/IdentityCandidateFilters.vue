<template>
  <div class="match-filters">
    <sl-input
      class="match-filters__q"
      size="small"
      placeholder="Name of a found identity or a candidate…"
      clearable
      :value="filters.q"
      @sl-input="patch({ q: ($event.target as HTMLInputElement).value })"
      @sl-clear="patch({ q: '' })"
    >
      <sl-icon name="search" slot="prefix"></sl-icon>
    </sl-input>

    <sl-select
      class="match-filters__book"
      size="small"
      placeholder="Any book"
      clearable
      :value="filters.bookMn ?? ''"
      @sl-change="patch({ bookMn: ($event.target as HTMLInputElement).value || null })"
    >
      <sl-option v-for="book in sortedBooks" :key="book.machine_name" :value="book.machine_name">
        {{ book.abbrev ? `${book.abbrev} — ${book.title}` : book.title }}
      </sl-option>
    </sl-select>

    <sl-select
      class="match-filters__order"
      size="small"
      :value="filters.identityOrder"
      @sl-change="patch({ identityOrder: ($event.target as HTMLInputElement).value as IdentityOrder })"
    >
      <sl-option v-for="option in ORDER_OPTIONS" :key="option.value" :value="option.value">
        {{ option.label }}
      </sl-option>
    </sl-select>

    <sl-checkbox
      size="small"
      :checked="filters.onlyWithCandidates"
      @sl-change="patch({ onlyWithCandidates: ($event.target as HTMLInputElement).checked })"
    >
      Only with candidates
    </sl-checkbox>

    <!-- Click-to-toggle tags rather than a multi-select: a facet's symbol is an emoji,
         and sl-select builds its closed label from the chosen options' textContent,
         which would pile every symbol into the combobox. The same reason ContextPicker
         gives for refusing one. -->
    <div class="match-filters__facets">
      <sl-tag
        v-for="facet in sortedFacets"
        :key="facet.id"
        size="small"
        :variant="isFacetOn(facet.machine_name_plural) ? 'primary' : 'neutral'"
        class="facet-tag"
        :class="{ 'facet-tag--on': isFacetOn(facet.machine_name_plural) }"
        @click="toggleFacet(facet.machine_name_plural)"
      >
        {{ facet.symbol }} {{ facet.name }}
      </sl-tag>
    </div>

    <!-- Candidate-side filters. Separated by a divider because they narrow column 2
         only: leaving them with the identity filters invites reading "compared" as
         "identities that have compared candidates", which is what the checkbox does. -->
    <sl-divider vertical></sl-divider>

    <sl-button-group label="Stage">
      <sl-button
        v-for="stage in CANDIDATE_STAGES"
        :key="stage"
        size="small"
        :variant="filters.stages.includes(stage) ? 'primary' : 'default'"
        @click="toggleStage(stage)"
      >
        {{ stage === 'compared' ? 'Compared' : 'Triage' }}
      </sl-button>
    </sl-button-group>

    <sl-select
      class="match-filters__verdict"
      size="small"
      :value="filters.verdict"
      @sl-change="patch({ verdict: ($event.target as HTMLInputElement).value as VerdictFilter })"
    >
      <sl-option v-for="option in VERDICT_OPTIONS" :key="option.value" :value="option.value">
        {{ option.label }}
      </sl-option>
    </sl-select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Book, FacetQuery } from '../../../types/library';
import {
  CANDIDATE_STAGES,
  type CandidateStage,
  type IdentityOrder,
  type MatchFilters,
  type VerdictFilter,
} from '../../../types/identityMatches';

/**
 * The work area's filter bar.
 *
 * Presentational: it is handed the books and facets rather than reading the stores, and
 * it emits a partial of the filter object rather than mutating one. The screen owns when
 * a change refetches - the search box needs debouncing and a tag does not - and that
 * decision cannot live in here.
 */

const props = defineProps<{
  filters: MatchFilters;
  books: Book[];
  facets: FacetQuery[];
}>();

const emit = defineEmits<{
  (e: 'update', patch: Partial<MatchFilters>): void;
}>();

const ORDER_OPTIONS: { value: IdentityOrder; label: string }[] = [
  { value: 'facet', label: 'Grouped by facet' },
  { value: 'name', label: 'By name' },
  { value: 'pending', label: 'Most waiting' },
  { value: 'recent', label: 'Newest dossier' },
];

const VERDICT_OPTIONS: { value: VerdictFilter; label: string }[] = [
  { value: 'pending', label: 'Undecided' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'Any verdict' },
];

/** Copied before sorting: these arrays belong to the stores. */
const sortedBooks = computed(() =>
  [...props.books].sort((a, b) => (a.abbrev || a.title).localeCompare(b.abbrev || b.title)));

const sortedFacets = computed(() => [...props.facets].sort((a, b) => a.id - b.id));

function patch(fields: Partial<MatchFilters>) {
  emit('update', fields);
}

function isFacetOn(plural: string) {
  return props.filters.facets.includes(plural);
}

function toggleFacet(plural: string) {
  const next = isFacetOn(plural)
    ? props.filters.facets.filter(f => f !== plural)
    : [...props.filters.facets, plural];
  patch({ facets: next });
}

/**
 * Both stages off is the same request as both on - the server's default is every stage -
 * so the bar shows neither as selected rather than pretending to a third state.
 */
function toggleStage(stage: CandidateStage) {
  const next = props.filters.stages.includes(stage)
    ? props.filters.stages.filter(s => s !== stage)
    : [...props.filters.stages, stage];
  patch({ stages: next });
}
</script>

<style scoped>
.match-filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-bottom: 0.5rem;
}

.match-filters__q {
  width: 18rem;
  flex: 1 1 14rem;
  min-width: 10rem;
}

.match-filters__book {
  width: 14rem;
}

.match-filters__order {
  width: 11rem;
}

.match-filters__verdict {
  width: 9.5rem;
}

.match-filters__facets {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.facet-tag {
  cursor: pointer;
}

.facet-tag:not(.facet-tag--on)::part(base) {
  opacity: 0.65;
}
</style>
