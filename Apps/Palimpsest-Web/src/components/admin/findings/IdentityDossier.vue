<template>
  <div class="dossier">
    <div class="dossier__links">
      <a
        class="dossier__link"
        :href="`https://www.wikidata.org/wiki/${identity.wikidata_qid}`"
        target="_blank"
        rel="noopener noreferrer"
      >
        <sl-icon name="bank"></sl-icon>
        <span class="dossier__qid">{{ identity.wikidata_qid }}</span>
        <sl-icon name="box-arrow-up-right" class="dossier__external"></sl-icon>
      </a>

      <a
        v-if="identity.wikipedia_url"
        class="dossier__link"
        :href="identity.wikipedia_url"
        target="_blank"
        rel="noopener noreferrer"
      >
        <sl-icon name="globe"></sl-icon>
        Wikipedia
        <sl-icon name="box-arrow-up-right" class="dossier__external"></sl-icon>
      </a>
      <span v-else class="dossier__muted">No Wikipedia article linked</span>
    </div>

    <p class="dossier__stats">
      {{ identity.context_count }} {{ identity.context_count === 1 ? 'finding' : 'findings' }}
      in {{ identity.book_count }} {{ identity.book_count === 1 ? 'book' : 'books' }}
      <template v-if="identity.dossier_built_at">
        · dossier built {{ builtAt }}
      </template>
    </p>

    <!-- Dense LLM prose, shown as written. Deliberately not run through marked: these
         summaries are packed with underscores, asterisks and bracketed dates, and a
         markdown pass turns a stray pair of them into silent emphasis.

         Behind expanders, and collapsed: at full length either summary is taller than the
         rest of the row put together, and an opened identity should still leave the
         listing it was picked from on screen. Uncontrolled on purpose - each one is a
         glance the row itself has no reason to remember or to report upwards. -->
    <sl-details v-if="summaries.corpus" class="dossier__expander">
      <span slot="summary" class="dossier__heading">From the corpus</span>
      <p class="dossier__prose">{{ summaries.corpus }}</p>
    </sl-details>

    <sl-details v-if="summaries.wikipedia" class="dossier__expander">
      <span slot="summary" class="dossier__heading">From Wikipedia</span>
      <p class="dossier__prose">{{ summaries.wikipedia }}</p>
    </sl-details>

    <p v-if="!summaries.any" class="dossier__muted">
      No dossier has been built for this identity yet, so the close-reading pass has
      nothing to compare a candidate against.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FoundIdentityRow } from '../../../types/identityMatches';
import { dossierSummaries } from '../../../api/identityMatches';

/**
 * What is known about a confirmed identity: its Wikidata and Wikipedia links, how far it
 * already reaches into the library, and the two dense summaries the compared pass
 * reasons against.
 *
 * Both summaries ride on the column-1 row - the listing is fetched with
 * `include_dossier=1` - so expanding a row costs no request and shows no spinner.
 */

const props = defineProps<{
  identity: FoundIdentityRow;
}>();

const summaries = computed(() => dossierSummaries(props.identity));

/** Date only: the hour a background job ran is noise to the person reading this. */
const builtAt = computed(() => {
  const raw = props.identity.dossier_built_at;
  if (!raw) return '';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
});
</script>

<style scoped>
.dossier {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.dossier__links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.dossier__link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--sl-color-primary-600);
  text-decoration: none;
  font-weight: 500;
}

.dossier__link:hover {
  text-decoration: underline;
}

.dossier__qid {
  font-family: var(--sl-font-mono);
  font-size: 0.75rem;
}

.dossier__external {
  font-size: 0.65rem;
  opacity: 0.8;
}

.dossier__stats {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.dossier__expander::part(base) {
  border: none;
  background: none;
}

.dossier__expander::part(header) {
  padding: 0.2rem 0;
}

.dossier__expander::part(content) {
  padding: 0.3rem 0 0;
}

.dossier__heading {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.dossier__prose {
  margin: 0;
  line-height: 1.45;
  white-space: pre-wrap;
  color: var(--color-text);
}

.dossier__muted {
  margin: 0;
  font-size: 0.75rem;
  font-style: italic;
  color: var(--color-text-dimmed);
}
</style>
