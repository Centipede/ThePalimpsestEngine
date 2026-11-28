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

    <!-- Dense LLM prose, written as markdown and rendered as markdown: the headings,
         lists and emphasis the dossier pass puts in are what make a long summary
         skimmable, and they are the difference between reading one and giving up on it.
         `v-html` through marked is the idiom the study notes and the workspace panels
         already use for prose from this backend.

         Behind expanders, and collapsed: at full length either summary is taller than the
         rest of the row put together, and an opened identity should still leave the
         listing it was picked from on screen. Uncontrolled on purpose - each one is a
         glance the row itself has no reason to remember or to report upwards. -->
    <sl-details v-if="summaries.corpus" class="dossier__expander">
      <span slot="summary" class="dossier__heading">From the corpus</span>
      <div class="dossier__prose" v-html="corpusHtml"></div>
    </sl-details>

    <sl-details v-if="summaries.wikipedia" class="dossier__expander">
      <span slot="summary" class="dossier__heading">From Wikipedia</span>
      <div class="dossier__prose" v-html="wikipediaHtml"></div>
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
import { renderMarkdown } from '../../../utils/renderMarkdown';

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

/**
 * `breaks` on, because the dossier pass writes in wrapped lines and its paragraphs
 * collapse into a wall without them. The sanitizing the TODO here asked for lives in
 * renderMarkdown now, with the app's four other `v-html` panels behind it.
 *
 * Computed rather than rendered in the template, so the markdown and the sanitizer run
 * once per identity and not again on every unrelated re-render of the row.
 */
const corpusHtml = computed(() => renderMarkdown(summaries.value.corpus, { breaks: true }));
const wikipediaHtml = computed(
  () => renderMarkdown(summaries.value.wikipedia, { breaks: true }));

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
  line-height: 1.45;
  color: var(--color-text);
}

/* Deep, because the markdown is rendered rather than written in this template. Trimmed
   to the row's scale: the dossier sits in a 0.8rem column beside two other columns, so a
   heading the pass wrote as h2 must not come out looking like the screen's own. */
.dossier__prose :deep(p) {
  margin: 0 0 0.5rem;
}

.dossier__prose :deep(:last-child) {
  margin-bottom: 0;
}

.dossier__prose :deep(h1),
.dossier__prose :deep(h2),
.dossier__prose :deep(h3),
.dossier__prose :deep(h4),
.dossier__prose :deep(h5),
.dossier__prose :deep(h6) {
  margin: 0.6rem 0 0.2rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.dossier__prose :deep(ul),
.dossier__prose :deep(ol) {
  margin: 0 0 0.5rem;
  padding-left: 1.1rem;
}

.dossier__prose :deep(li) {
  margin: 0.1rem 0;
}

.dossier__prose :deep(a) {
  color: var(--sl-color-primary-600);
}

.dossier__prose :deep(code) {
  font-family: var(--sl-font-mono);
  font-size: 0.75rem;
}

.dossier__prose :deep(blockquote) {
  margin: 0 0 0.5rem;
  padding-left: 0.6rem;
  border-left: 2px solid var(--sl-color-neutral-200);
  color: var(--color-text-muted);
}

.dossier__prose :deep(hr) {
  border: 0;
  border-top: 1px solid var(--color-border);
  margin: 0.5rem 0;
}

.dossier__prose :deep(table) {
  border-collapse: collapse;
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
}

.dossier__prose :deep(th),
.dossier__prose :deep(td) {
  border: 1px solid var(--color-border);
  padding: 0.15rem 0.35rem;
  text-align: left;
}

.dossier__muted {
  margin: 0;
  font-size: 0.75rem;
  font-style: italic;
  color: var(--color-text-dimmed);
}
</style>
