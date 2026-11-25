<template>
  <div class="column">
    <div class="column-header">Why the scan thinks so</div>

    <div class="column__scroll">
      <!-- Above the branch below, not inside it: the list advances on its own after a
           decision, and the decision that empties the queue leaves no candidate to
           hang this off - which is exactly when saying what happened matters most. -->
      <sl-alert v-if="notice" variant="success" open closable @sl-after-hide="emit('close-notice')">
        <sl-icon slot="icon" name="check2-circle"></sl-icon>
        {{ notice }}
      </sl-alert>

      <p v-if="loading" class="column__status">
        <sl-spinner></sl-spinner>
        Loading the candidate…
      </p>

      <p v-else-if="loadError" class="column__error">{{ loadError }}</p>

      <p v-else-if="!candidate" class="column__status">
        Pick a candidate to read the reasoning behind it.
      </p>

      <template v-else>
        <section class="pair">
          <div class="pair__side">
            <p class="pair__label">Confirmed identity</p>
            <p class="pair__name">{{ candidate.of_identity?.name ?? 'Unknown' }}</p>
            <a
              v-if="candidate.of_identity?.wikidata_qid"
              class="pair__qid"
              :href="`https://www.wikidata.org/wiki/${candidate.of_identity.wikidata_qid}`"
              target="_blank"
              rel="noopener noreferrer"
            >{{ candidate.of_identity.wikidata_qid }}</a>
          </div>

          <sl-icon name="arrow-left-right" class="pair__arrow"></sl-icon>

          <div class="pair__side">
            <p class="pair__label">Candidate finding</p>
            <p class="pair__name">{{ candidate.of_context?.name ?? 'Unknown' }}</p>
            <a
              v-if="sectionHref"
              class="pair__where"
              :href="sectionHref"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ whereLabel }}
              <sl-icon name="box-arrow-up-right"></sl-icon>
            </a>
            <span v-else class="pair__where pair__where--none">not placed in a section</span>
          </div>
        </section>

        <p class="scoreline">
          <sl-tag size="small" :variant="candidate.stage === 'compared' ? 'primary' : 'neutral'">
            {{ candidate.stage === 'compared' ? 'compared' : 'triage' }}
          </sl-tag>
          <span class="scoreline__score">{{ score }}</span>
          <span class="scoreline__note">{{ scoreNote }}</span>
        </p>

        <section v-if="candidate.reasoning" class="block">
          <h4 class="block__heading">Reasoning</h4>
          <p class="block__prose">{{ candidate.reasoning }}</p>
        </section>
        <p v-else class="block__muted">
          The coarse pass found this on name and context alone and wrote no reasoning.
          A close-reading pass would score it properly.
        </p>

        <section v-if="decisiveQuotes.length > 0" class="block">
          <h4 class="block__heading">Decisive quotes</h4>
          <blockquote v-for="(quote, i) in decisiveQuotes" :key="i" class="block__quote">
            {{ quote }}
          </blockquote>
        </section>

        <sl-details v-if="hasEvidence" class="evidence">
          <span slot="summary" class="evidence__summary">Evidence as recorded</span>
          <pre class="evidence__dump">{{ evidenceDump }}</pre>
        </sl-details>

        <section class="block">
          <h4 class="block__heading">
            The candidate's mentions
            <span class="block__count">{{ occurrences.length }}</span>
          </h4>
          <OccurrenceList
            :occurrences="occurrences"
            empty-label="This finding has no mentions recorded."
          />
        </section>
      </template>
    </div>

    <div v-if="candidate" class="decide">
      <!-- The race. Inside this column and above the buttons, not in the page banner:
           the message is about this one candidate and belongs beside the button that
           produced it. The columns stay rendered either way. -->
      <sl-alert v-if="conflict" variant="warning" open>
        <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
        <p class="conflict__text">{{ conflict }}</p>
        <div class="conflict__actions">
          <sl-button size="small" @click="emit('reload-candidate')">
            Reload this candidate
          </sl-button>
          <sl-button size="small" @click="emit('refresh-lists')">
            Refresh the lists
          </sl-button>
          <!-- Unlinking happens in the section's own toolset, deliberately. Offering it
               here would let one librarian discard another's decision from a screen that
               cannot show what is being discarded. -->
          <sl-button v-if="sectionHref" size="small" :href="sectionHref" target="_blank">
            Open the section
          </sl-button>
        </div>
      </sl-alert>

      <!-- A refusal and a caveat read the same way to a librarian - both say "before you
           press that" - so one line carries whichever the accept rule produced. -->
      <p v-if="acceptNote" class="decide__reason">{{ acceptNote }}</p>

      <div class="decide__buttons">
        <sl-button
          variant="success"
          size="small"
          :disabled="!acceptCheck.ok || busy"
          :loading="busy && pendingAction === 'accept'"
          @click="emit('accept')"
        >
          <sl-icon slot="prefix" name="check-lg"></sl-icon>
          Accept
        </sl-button>
        <sl-button
          variant="danger"
          size="small"
          :disabled="!rejectCheck.ok || busy"
          :loading="busy && pendingAction === 'reject'"
          @click="emit('reject')"
        >
          <sl-icon slot="prefix" name="x-lg"></sl-icon>
          Reject
        </sl-button>
        <!-- Third and quietest: the escape hatch, not the common path. Reject stays a real
             reject. The one exception is the state dismiss exists for - see dismissVariant. -->
        <sl-tooltip content="Already resolved — take it off the list without changing anything.">
          <sl-button
            class="decide__dismiss"
            :variant="dismissVariant"
            size="small"
            :disabled="!dismissCheck.ok || busy"
            :loading="busy && pendingAction === 'dismiss'"
            @click="emit('dismiss')"
          >
            <sl-icon slot="prefix" name="slash-circle"></sl-icon>
            Dismiss
          </sl-button>
        </sl-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FindingOccurrence } from '../../../types/library';
import type { CandidateDetail } from '../../../types/identityMatches';
import {
  candidateSectionPath,
  effectiveScore,
  formatScore,
} from '../../../utils/findingCandidateQuery';
import {
  canAcceptCandidate,
  canDismissCandidate,
  canRejectCandidate,
} from '../../../utils/findingEligibility';
import OccurrenceList from '../../worktools/findings/OccurrenceList.vue';

/**
 * Column 3: the case for one proposed match, and the three buttons that settle it.
 *
 * Presentational - the screen owns the fetching, the decision and the refetch that
 * follows - which is what lets the conflict alert and the decided state be driven
 * entirely from props and tested without a server.
 */

const props = defineProps<{
  candidate: CandidateDetail | null;
  loading: boolean;
  loadError: string;
  /** The server's own sentence from a refused decision. Shown verbatim. */
  conflict: string;
  notice: string;
  busy: boolean;
  pendingAction: 'accept' | 'reject' | 'dismiss' | null;
}>();

const emit = defineEmits<{
  (e: 'accept'): void;
  (e: 'reject'): void;
  (e: 'dismiss'): void;
  (e: 'reload-candidate'): void;
  (e: 'refresh-lists'): void;
  /** The success notice was closed. Named apart from `dismiss`, which settles a candidate. */
  (e: 'close-notice'): void;
}>();

const acceptCheck = computed(() => canAcceptCandidate(props.candidate));
const rejectCheck = computed(() => canRejectCandidate(props.candidate));
const dismissCheck = computed(() => canDismissCandidate(props.candidate));

/** Whichever of the two the accept rule produced; they are never both set. */
const acceptNote = computed(() => acceptCheck.value.reason || acceptCheck.value.warning || '');

/**
 * Dismiss is emphasised in exactly one state: Accept refused because the finding carries a
 * rival identity. That is the dead end the endpoint was added for, and leaving the only way
 * out as the faintest button on the row is how librarians ended up rejecting correct links.
 *
 * Keyed on the accept rule rather than on the identity directly, so the button and the
 * sentence above it cannot come to disagree about what state the row is in.
 */
const dismissVariant = computed(() => (
  !acceptCheck.value.ok && dismissCheck.value.ok ? 'primary' : 'default'
));

/** Payload order, never re-sorted: the server sends these in reading order. */
const occurrences = computed<FindingOccurrence[]>(() =>
  props.candidate?.of_context?.occurrences ?? []);

const sectionHref = computed(() =>
  (props.candidate ? candidateSectionPath(props.candidate) : null));

const whereLabel = computed(() => {
  const candidate = props.candidate;
  if (!candidate) return '';
  const book = candidate.in_book?.abbrev || candidate.in_book?.title || candidate.in_book_mn;
  const path = candidate.in_section?.path_coded || candidate.in_section_pf;
  return [book, path].filter(Boolean).join(' · ');
});

const score = computed(() => (props.candidate ? formatScore(props.candidate) : '—'));

const scoreNote = computed(() => {
  const candidate = props.candidate;
  if (!candidate) return '';
  if (effectiveScore(candidate) === null) return 'not scored yet';
  return candidate.probability !== null
    ? 'from the close reading'
    : 'from the nightly coarse pass';
});

/**
 * `evidence` is free-form, so only the one documented key is given a shape. Anything
 * else is dumped as JSON behind a fold rather than guessed at.
 */
const decisiveQuotes = computed<string[]>(() => {
  const raw = props.candidate?.evidence?.decisive_quotes;
  if (!Array.isArray(raw)) return [];
  return raw.map(item => (typeof item === 'string' ? item : JSON.stringify(item)));
});

const hasEvidence = computed(() => {
  const evidence = props.candidate?.evidence;
  return !!evidence && Object.keys(evidence).length > 0;
});

const evidenceDump = computed(() => JSON.stringify(props.candidate?.evidence ?? {}, null, 2));
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
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
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

.pair {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--sl-border-radius-medium);
  background-color: var(--color-surface);
}

.pair__side {
  min-width: 0;
}

.pair__arrow {
  color: var(--color-text-dimmed);
}

.pair__label {
  margin: 0;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.pair__name {
  margin: 0.1rem 0;
  font-weight: 600;
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}

.pair__qid {
  font-family: var(--sl-font-mono);
  font-size: 0.7rem;
  color: var(--sl-color-primary-600);
  text-decoration: none;
}

.pair__where {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  color: var(--sl-color-primary-600);
  text-decoration: none;
}

.pair__where--none {
  color: var(--color-text-dimmed);
  font-style: italic;
}

.scoreline {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
}

.scoreline__score {
  font-family: var(--sl-font-mono);
  font-weight: 600;
  color: var(--sl-color-primary-700);
}

.scoreline__note {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.block {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.block__heading {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  margin: 0;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.block__count {
  font-size: 0.65rem;
  color: var(--color-text-dimmed);
}

.block__prose {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.block__quote {
  margin: 0;
  padding-left: 0.6rem;
  border-left: 2px solid var(--sl-color-primary-300);
  font-style: italic;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--sl-color-neutral-700);
}

.block__muted {
  margin: 0;
  font-size: 0.75rem;
  font-style: italic;
  color: var(--color-text-dimmed);
}

.evidence::part(base) {
  border: none;
  background: none;
}

.evidence::part(header) {
  padding: 0.2rem 0;
}

.evidence__summary {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.evidence__dump {
  margin: 0;
  font-size: 0.7rem;
  line-height: 1.35;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--color-text-muted);
}

.decide {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.conflict__text {
  margin: 0 0 0.4rem;
  line-height: 1.4;
}

.conflict__actions {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.decide__reason {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--color-text-muted);
}

.decide__buttons {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
</style>
