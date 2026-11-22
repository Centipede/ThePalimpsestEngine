<template>
  <button
    type="button"
    class="candidate"
    :class="{ 'candidate--selected': selected, 'candidate--decided': candidate.verdict !== 'pending' }"
    @click="emit('select')"
  >
    <div class="candidate__top">
      <span class="candidate__name">{{ primaryName }}</span>
      <span class="candidate__score" :title="scoreTitle">{{ score }}</span>
    </div>

    <div class="candidate__meta">
      <sl-tag
        size="small"
        :variant="candidate.stage === 'compared' ? 'primary' : 'neutral'"
        class="candidate__stage"
      >
        {{ candidate.stage === 'compared' ? 'compared' : 'triage' }}
      </sl-tag>

      <!-- Unplaced is a real state: a candidate context the server could not tie to a
           section has no book and no path, and must still be readable. -->
      <span v-if="candidate.in_book" class="candidate__where">
        {{ candidate.in_book.abbrev || candidate.in_book.title }}
        <span v-if="candidate.in_section" class="candidate__path">
          {{ candidate.in_section.path_coded }}
        </span>
      </span>
      <span v-else class="candidate__where candidate__where--none">not placed</span>

      <span class="candidate__mentions">
        {{ candidate.occurrence_count }}
        {{ candidate.occurrence_count === 1 ? 'mention' : 'mentions' }}
      </span>

      <sl-tag
        v-if="candidate.verdict !== 'pending'"
        size="small"
        :variant="candidate.verdict === 'accepted' ? 'success' : 'danger'"
      >
        {{ candidate.verdict }}
      </sl-tag>
    </div>

    <p v-if="candidate.reasoning_preview" class="candidate__preview">
      {{ candidate.reasoning_preview }}
    </p>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CandidateBrief } from '../../../types/identityMatches';
import { effectiveScore, formatScore } from '../../../utils/findingCandidateQuery';

/**
 * One proposal in column 2.
 *
 * What a row leans on to be told apart from its neighbours is the book, the coded path
 * and the reasoning preview - not the name, which is exactly the thing that fails to
 * distinguish findings (a book can hold five called "Leopold"). The brief payload
 * carries no quotes, so the quotes are column 3's job; if these three prove too thin in
 * practice the fix is a condensed quote strip on the brief row, server-side.
 */

const props = defineProps<{
  candidate: CandidateBrief;
  selected: boolean;
  /**
   * In the inverted mode the screen is asking which identity an unidentified finding
   * might be, so the identity is what varies between rows and has to be the headline.
   */
  showIdentityName: boolean;
}>();

const emit = defineEmits<{
  (e: 'select'): void;
}>();

const primaryName = computed(() => (props.showIdentityName
  ? props.candidate.of_identity?.name ?? 'Unnamed identity'
  : props.candidate.of_context?.name ?? 'Unnamed finding'));

const score = computed(() => formatScore(props.candidate));

/**
 * Says which pass produced the figure. The two are not comparable - a triage guess and a
 * close reading mean different things - so a bare percentage would invite ranking them
 * against each other.
 */
const scoreTitle = computed(() => {
  if (effectiveScore(props.candidate) === null) return 'Not scored yet';
  return props.candidate.probability !== null
    ? 'Score from the close-reading pass'
    : 'Score from the nightly coarse pass';
});
</script>

<style scoped>
.candidate {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  width: 100%;
  min-width: 0;
  padding: 0.4rem;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.candidate:hover {
  background-color: var(--color-bg-muted);
}

.candidate--selected {
  background-color: var(--sl-color-primary-50);
}

.candidate--decided {
  opacity: 0.7;
}

.candidate__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.4rem;
  min-width: 0;
}

.candidate__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  font-size: 0.85rem;
}

.candidate__score {
  flex-shrink: 0;
  font-family: var(--sl-font-mono);
  font-size: 0.75rem;
  color: var(--sl-color-primary-700);
}

.candidate__meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.candidate__stage::part(base) {
  font-size: 0.6rem;
}

.candidate__path {
  font-family: var(--sl-font-mono);
}

.candidate__where--none {
  font-style: italic;
  color: var(--color-text-dimmed);
}

.candidate__preview {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--color-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
