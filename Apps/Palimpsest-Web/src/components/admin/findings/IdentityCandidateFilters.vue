<template>
  <div class="match-filters">
    <!-- Grouped rather than one flat run of controls: the bar wraps on most windows, and
         a flat run wraps wherever it happens to run out of room - which once left the
         verdict select orphaned on a row of its own. Wrapping between groups puts the
         break on a boundary that means something. -->
    <div class="match-filters__group match-filters__group--identity">
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
    </div>

    <!-- Click-to-toggle tags rather than a multi-select: a facet's symbol is an emoji,
         and sl-select builds its closed label from the chosen options' textContent,
         which would pile every symbol into the combobox. The same reason ContextPicker
         gives for refusing one.

         The name is a span of its own so the narrow bar can hide it and let the symbol
         carry the tag; the tooltip is what says the name then. -->
    <div class="match-filters__facets">
      <sl-tooltip
        v-for="facet in sortedFacets"
        :key="facet.id"
        :content="facet.name"
      >
        <sl-tag
          size="small"
          :variant="isFacetOn(facet.machine_name_plural) ? 'primary' : 'neutral'"
          class="facet-tag"
          :class="{ 'facet-tag--on': isFacetOn(facet.machine_name_plural) }"
          @click="toggleFacet(facet.machine_name_plural)"
        >
          <span class="facet-tag__symbol">{{ facet.symbol }}</span>
          <span class="facet-tag__name">{{ facet.name }}</span>
        </sl-tag>
      </sl-tooltip>
    </div>

    <!-- Candidate-side filters. Set apart by a rule because they narrow column 2 only:
         leaving them with the identity filters invites reading "compared" as
         "identities that have compared candidates", which is what the checkbox does.

         The rule is a border rather than an sl-divider: a vertical sl-divider is
         `height: 100%`, which in a wrapping bar resolves against the whole bar and
         renders a 100px line inside a 24px row, dragging the last row out of the bar and
         on top of the columns below. A border cannot do that, and cannot be orphaned
         onto a row of its own either. -->
    <div class="match-filters__group match-filters__group--candidate">
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

.match-filters__group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  min-width: 0;
}

/* The one group that takes the slack, so the search box grows into a wide bar. */
.match-filters__group--identity {
  flex: 1 1 auto;
}

.match-filters__group--candidate {
  flex: none;
  border-left: 1px solid var(--color-border);
  padding-left: 0.5rem;
}

.match-filters__q {
  flex: 1 1 10rem;
  min-width: 8rem;
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
  min-width: 0;
}

/* sl-tooltip is `display: contents` in Shoelace, so the tag stays the flex item here.
   Stated rather than relied on, because a tooltip that became a box of its own would
   break the tag row's wrapping. */
.match-filters__facets sl-tooltip {
  display: contents;
}

.facet-tag {
  cursor: pointer;
}

.facet-tag:not(.facet-tag--on)::part(base) {
  opacity: 0.65;
}

.facet-tag__name {
  margin-left: 0.25rem;
}

/* Measured against the pane, not the window: the admin sidebar means a 1256px window
   gives this screen about 940px. See .overview in FindingCandidateOverview.vue, which
   declares the container.

   With its names showing, the bar needs roughly 1760px to sit on one row - the facet
   tags alone are 690px of that - and no window this screen is used in is that wide.
   Below that threshold the names cost a whole row and buy nothing, so the symbol carries
   the tag and the name moves to the tooltip. Clipped rather than `display: none`, which
   would take the name out of the accessibility tree along with the layout. */
@container findings (max-width: 1700px) {
  .facet-tag__name {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .match-filters {
    gap: 0.35rem;
  }

  .match-filters__group {
    gap: 0.35rem;
  }

  /* Flex line-breaking reads each item's basis, and `auto` on a group resolves to its
     max-content width - the search box at its widest - which is far more room than the
     group needs and enough on its own to push the candidate filters onto a second row.
     36rem is what the four controls actually take with the search box at its minimum.
     Both still grow into whatever slack the row has. */
  .match-filters__group--identity {
    flex-basis: 36rem;
  }

  .match-filters__q {
    flex-basis: 8rem;
  }

  .match-filters__book {
    width: 9rem;
  }

  .match-filters__order {
    width: 8.5rem;
  }

  .match-filters__verdict {
    width: 8rem;
  }

  /* Only the closed control narrows. sl-select syncs its popup to the width of its
     anchor, so without this the book list - whose entries are "ABBREV — Full Title" -
     would wrap every other line to fit a 9rem box. The minimums are the widths these
     controls used to have, so the lists read exactly as they did before. */
  .match-filters__book::part(popup),
  .match-filters__order::part(popup),
  .match-filters__verdict::part(popup) {
    width: auto;
  }

  .match-filters__book::part(listbox) {
    min-width: 20rem;
  }

  .match-filters__order::part(listbox) {
    min-width: 11rem;
  }

  .match-filters__verdict::part(listbox) {
    min-width: 9.5rem;
  }

  /* The symbol is the whole tag now, so the "not selected" dimming is eased off - the
     name used to carry a tag the dimming had washed out, and no longer can. Left at its
     own size deliberately: enlarging it widens every tag, which was enough on its own to
     cost the bar the row this whole block exists to save. */
  .facet-tag:not(.facet-tag--on)::part(base) {
    opacity: 0.8;
  }
}
</style>
