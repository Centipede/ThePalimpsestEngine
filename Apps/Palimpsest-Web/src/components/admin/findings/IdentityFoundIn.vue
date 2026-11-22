<template>
  <div class="found-in">
    <p v-if="loading" class="found-in__status">
      <sl-spinner></sl-spinner>
      Looking up where this is already found…
    </p>

    <p v-else-if="error" class="found-in__error">{{ error }}</p>

    <template v-else-if="tree">
      <p class="found-in__totals">
        Already linked in {{ tree.totals.sections }}
        {{ tree.totals.sections === 1 ? 'section' : 'sections' }}
        across {{ tree.totals.books }} {{ tree.totals.books === 1 ? 'book' : 'books' }}
        · {{ tree.totals.occurrences }}
        {{ tree.totals.occurrences === 1 ? 'mention' : 'mentions' }}
      </p>

      <div v-for="book in tree.books" :key="book.id" class="book">
        <button type="button" class="row row--book" @click="emit('toggle-book', book.id)">
          <sl-icon :name="openBookIds.has(book.id) ? 'chevron-down' : 'chevron-right'"></sl-icon>
          <span class="row__title">{{ book.abbrev || book.title }}</span>
          <span class="row__count">
            {{ book.section_count }}
            {{ book.section_count === 1 ? 'section' : 'sections' }}
          </span>
        </button>

        <div v-show="openBookIds.has(book.id)" class="book__sections">
          <div v-for="section in book.sections" :key="section.id" class="section">
            <div class="section__head">
              <button
                type="button"
                class="row row--section"
                @click="emit('toggle-section', section.id)"
              >
                <sl-icon
                  :name="openSectionIds.has(section.id) ? 'chevron-down' : 'chevron-right'"
                ></sl-icon>
                <span class="row__title">{{ section.title }}</span>
                <span class="row__path">{{ section.path_coded }}</span>
              </button>

              <!-- A real anchor, resolved rather than pushed, so middle-click and
                   ctrl-click behave: the same idiom TableOfContents uses. -->
              <a
                class="section__open"
                :href="sectionHref(book.machine_name, section.path_full)"
                target="_blank"
                rel="noopener noreferrer"
                :title="`Open ${section.title} in a new tab`"
              >
                <sl-icon name="box-arrow-up-right"></sl-icon>
              </a>
            </div>

            <div v-show="openSectionIds.has(section.id)" class="section__contexts">
              <div v-for="context in section.contexts" :key="context.id" class="context">
                <p class="context__name">{{ context.name }}</p>
                <OccurrenceList :occurrences="context.occurrences" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="tree.unplaced.length > 0" class="unplaced">
        <p class="unplaced__heading">
          Linked but not placed in a section
          ({{ tree.unplaced.length }})
        </p>
        <p v-for="context in tree.unplaced" :key="context.id" class="unplaced__row">
          {{ context.name }}
        </p>
      </div>

      <p v-if="tree.books.length === 0 && tree.unplaced.length === 0" class="found-in__status">
        This identity is not linked to any finding yet.
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { FoundInTree } from '../../../types/identityMatches';
import { sectionPath } from '../../../utils/findingCandidateQuery';
import OccurrenceList from '../../worktools/findings/OccurrenceList.vue';

/**
 * Where a confirmed identity is already found: books, then sections, then the mentions
 * grouped under each.
 *
 * This is the comparison half of the screen. Judging a candidate means reading its
 * quotes against the quotes already accepted for the identity, so the same
 * OccurrenceList renders both sides and the two cannot drift apart in wording or layout.
 *
 * Expansion state is passed in rather than held here, so it survives the refetch that
 * follows an accepted candidate - the tree is replaced wholesale, and a local Set would
 * collapse every book the moment a decision landed.
 *
 * Both levels are plain buttons with v-show, not nested sl-details: nothing else in this
 * app nests them, and each level adds chrome that would then have to be stripped back
 * off through ::part.
 */

defineProps<{
  tree: FoundInTree | null;
  loading: boolean;
  error: string;
  openBookIds: Set<number>;
  openSectionIds: Set<number>;
}>();

const emit = defineEmits<{
  (e: 'toggle-book', bookId: number): void;
  (e: 'toggle-section', sectionId: number): void;
}>();

/**
 * Built as a plain string rather than through router.resolve: every section link in this
 * app is an interpolated path, and path_full values ("main.part3.ch9") carry nothing
 * that needs escaping. Staying consistent beats introducing one escaped path.
 */
function sectionHref(machineName: string, pathFull: string): string {
  return sectionPath(machineName, pathFull);
}
</script>

<style scoped>
.found-in {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
}

.found-in__status,
.found-in__totals {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.found-in__error {
  margin: 0;
  font-size: 0.75rem;
  color: var(--sl-color-danger-700);
}

.row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  min-width: 0;
  padding: 0.15rem 0.25rem;
  border: 0;
  border-radius: var(--sl-border-radius-small);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.row:hover {
  background-color: var(--color-bg-muted);
}

.row--book {
  font-weight: 600;
}

.row__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__count,
.row__path {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.row__path {
  font-family: var(--sl-font-mono);
}

.book__sections {
  padding-left: 0.9rem;
}

.section__head {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.section__open {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.25rem;
  color: var(--sl-color-primary-600);
  font-size: 0.75rem;
  border-radius: var(--sl-border-radius-small);
}

.section__open:hover {
  background-color: var(--sl-color-primary-100);
}

.section__contexts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.3rem 0 0.5rem 1.6rem;
}

.context__name {
  margin: 0 0 0.25rem;
  font-weight: 600;
  font-size: 0.75rem;
}

.context {
  border-left: 2px solid var(--sl-color-neutral-200);
  padding-left: 0.6rem;
}

.unplaced {
  margin-top: 0.4rem;
}

.unplaced__heading {
  margin: 0;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.unplaced__row {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
}
</style>
