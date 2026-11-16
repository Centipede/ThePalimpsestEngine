<template>
  <sl-dialog
    :label="`New ${facetLabel} mention`"
    :open="open"
    class="new-occurrence-dialog"
    @sl-request-close="onRequestClose"
  >
    <div v-if="result" class="new-occurrence-body">
      <sl-alert :variant="result.quote_located ? 'success' : 'warning'" open class="new-occurrence-alert">
        <sl-icon slot="icon" :name="result.quote_located ? 'check2-circle' : 'exclamation-triangle'"></sl-icon>
        {{ outcome }}
      </sl-alert>
    </div>

    <div v-else class="new-occurrence-body">
      <section class="new-occurrence-section">
        <h3 class="section-title">The words in the paragraph</h3>
        <blockquote class="quoted">{{ quote }}</blockquote>
        <p v-if="quoteNote" class="quote-note">{{ quoteNote }}</p>
      </section>

      <section class="new-occurrence-section">
        <h3 class="section-title">What it is called here</h3>
        <sl-input
          :value="name"
          :disabled="busy"
          placeholder="The name this paragraph uses"
          @sl-input="name = ($event.target as HTMLInputElement).value"
        ></sl-input>
        <sl-textarea
          :value="description"
          :disabled="busy"
          rows="2"
          placeholder="A short description (optional)"
          @sl-input="description = ($event.target as HTMLTextAreaElement).value"
        ></sl-textarea>
      </section>

      <section class="new-occurrence-section">
        <h3 class="section-title">Which finding it belongs to</h3>

        <sl-radio-group :value="mode" @sl-change="setMode(($event.target as HTMLInputElement).value)">
          <sl-radio value="existing" :disabled="contexts.length === 0">An existing finding</sl-radio>
          <sl-radio value="new">A new finding</sl-radio>
        </sl-radio-group>

        <ContextPicker
          v-if="mode === 'existing'"
          v-model="contextId"
          :contexts="contexts"
        />

        <sl-input
          v-else
          :value="newName"
          :disabled="busy"
          placeholder="Name of the new finding"
          @sl-input="newName = ($event.target as HTMLInputElement).value"
        ></sl-input>
      </section>

      <sl-alert v-if="error" variant="danger" open class="new-occurrence-alert">
        <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
        {{ error }}
      </sl-alert>

      <p v-if="!check.ok && check.reason" class="inline-reason">{{ check.reason }}</p>
    </div>

    <div slot="footer" class="new-occurrence-footer">
      <sl-button v-if="result" variant="primary" @click="emit('update:open', false)">Close</sl-button>
      <template v-else>
        <sl-button variant="default" :disabled="busy" @click="emit('update:open', false)">Cancel</sl-button>
        <sl-button variant="primary" :loading="busy" :disabled="!check.ok" @click="confirm">
          Add the mention
        </sl-button>
      </template>
    </div>
  </sl-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ContentBlock, FindingContext } from '../../../types/library';
import {
  canCreateOccurrence,
  quoteWarning,
  type Eligibility,
} from '../../../utils/findingEligibility';
import {
  FindingActionError,
  createOccurrence,
  type OccurrenceCreateResult,
} from '../../../api/findings';
import ContextPicker from './ContextPicker.vue';

/**
 * Creating a mention the extraction missed.
 *
 * The quote and the facet are decided in the toolbar and shown here read-only, so there
 * is one place to edit them rather than two that can disagree. What is left is the prose
 * and the one real decision: which finding this mention joins.
 *
 * The create flow always ends in a finding. The endpoint would accept neither context
 * key and file the mention nowhere, but a mention outside a finding is precisely the
 * orphan the rest of this toolset exists to clean up.
 */

const props = defineProps<{
  open: boolean;
  machineName: string;
  sectionPath: string;
  block: ContentBlock | null;
  quote: string;
  facet: string;
  /** The facet's readable name, for the dialog title. */
  facetLabel: string;
  /** Findings of that facet in this section: the candidate homes. */
  contexts: FindingContext[];
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  /** Created. The parent refetches - these responses cannot rebuild the grid. */
  (e: 'created'): void;
}>();

const name = ref('');
const description = ref('');
const mode = ref<'existing' | 'new'>('new');
const contextId = ref<number | null>(null);
const newName = ref('');
const busy = ref(false);
const error = ref('');

/**
 * The server's verdict, held so it can be read.
 *
 * Set on success and never cleared while open: the parent's refetch raises `loading` in
 * SectionDetailView and unmounts this dialog along with the section body, so the
 * creation is reported here first and the refresh is deferred to the close - the same
 * deferral FindingContextToolset makes for the same reason.
 */
const result = ref<OccurrenceCreateResult | null>(null);

watch(() => props.open, isOpen => {
  if (!isOpen) {
    // Only on the way out, so the parent's refetch cannot tear the dialog down early.
    if (result.value) {
      result.value = null;
      emit('created');
    }
    return;
  }

  // The quote is the best available default for both names: a manual mention is
  // usually added because the paragraph names the thing outright.
  name.value = props.quote;
  newName.value = props.quote;
  description.value = '';
  mode.value = props.contexts.length > 0 ? 'existing' : 'new';
  contextId.value = null;
  error.value = '';
  busy.value = false;
  result.value = null;
}, { immediate: true });

const quoteNote = computed(() => quoteWarning(props.block?.content_text ?? '', props.quote));

const check = computed<Eligibility>(() => canCreateOccurrence({
  quote: props.quote,
  facet: props.facet,
  name: name.value,
  blockText: props.block?.content_text ?? '',
  contextId: mode.value === 'existing' ? contextId.value : null,
  newName: mode.value === 'new' ? newName.value : '',
}));

/**
 * `quote_located: false` is not a failure - the mention exists either way - so this is
 * the sentence that distinguishes the two, and the server's answer is the authoritative
 * one. The pre-flight note above only guesses with the same fuzzy search.
 */
const outcome = computed(() => {
  if (!result.value) return '';
  const where = result.value.target_context
    ? `“${result.value.target_context.name}”`
    : 'no finding';
  const filed = result.value.context_created
    ? `Added under the new finding ${where}.`
    : `Added under ${where}.`;

  return result.value.quote_located
    ? filed
    : `${filed} The quote could not be found in the paragraph, so it will not be highlighted.`;
});

function setMode(value: string) {
  mode.value = value === 'existing' ? 'existing' : 'new';
}

function onRequestClose(event: Event) {
  if (busy.value) {
    event.preventDefault();
    return;
  }
  emit('update:open', false);
}

async function confirm() {
  if (!check.value.ok || busy.value || !props.block) return;

  busy.value = true;
  error.value = '';
  try {
    const created = await createOccurrence({
      machineName: props.machineName,
      sectionPath: props.sectionPath,
      blockPi: props.block.path_id,
      facet: props.facet,
      quote: props.quote,
      name: name.value.trim(),
      description: description.value.trim(),
      contextId: mode.value === 'existing' ? contextId.value : null,
      newContextName: mode.value === 'new' ? newName.value.trim() : undefined,
    });
    result.value = created;

    // Nothing to report when the quote landed: close, and the watch above refreshes.
    if (created.quote_located) emit('update:open', false);
  } catch (e) {
    error.value = e instanceof FindingActionError ? e.message : 'Adding the mention failed.';
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.new-occurrence-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.new-occurrence-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--sl-color-neutral-500);
}

.quoted {
  margin: 0;
  padding: 0.4rem 0.75rem;
  border-left: 3px solid var(--sl-color-neutral-300);
  font-style: italic;
  font-size: 0.9rem;
  color: var(--sl-color-neutral-700);
}

.quote-note,
.inline-reason {
  margin: 0;
  font-size: 0.75rem;
  font-style: italic;
  line-height: 1.35;
  color: var(--sl-color-warning-700);
}

.new-occurrence-alert::part(message) {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
}

.new-occurrence-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
