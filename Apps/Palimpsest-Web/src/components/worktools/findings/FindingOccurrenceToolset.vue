<template>
  <sl-dialog
    :label="`Mention: ${edited?.name ?? occurrence?.name ?? ''}`"
    :open="open"
    class="occurrence-toolset"
    @sl-request-close="onRequestClose"
  >
    <div v-if="edited" class="toolset-body">
      <p class="toolset-home">
        <template v-if="homeName">
          In <strong>{{ homeName }}</strong><span v-if="facetLabel"> · {{ facetLabel }}</span>
        </template>
        <template v-else>
          <sl-badge variant="warning" pill>Not in any finding</sl-badge>
          <span class="toolset-home-note">
            This mention was never clustered, so it appears in the paragraph but under no
            finding. Attaching it below is what files it.
          </span>
        </template>
      </p>

      <section class="toolset-section">
        <h3 class="section-title">What it says</h3>

        <sl-input
          :value="name"
          :disabled="busy !== null"
          placeholder="The name this paragraph uses"
          @sl-input="name = ($event.target as HTMLInputElement).value"
        ></sl-input>

        <sl-textarea
          :value="quote"
          :disabled="busy !== null"
          rows="2"
          placeholder="The words in the paragraph"
          @sl-input="quote = ($event.target as HTMLTextAreaElement).value"
        ></sl-textarea>
        <p v-if="quoteNote" class="tool-warning">{{ quoteNote }}</p>

        <sl-textarea
          :value="description"
          :disabled="busy !== null"
          rows="3"
          placeholder="A short description"
          @sl-input="description = ($event.target as HTMLTextAreaElement).value"
        ></sl-textarea>

        <div class="toolset-row">
          <sl-button
            variant="primary"
            size="small"
            :loading="busy === 'prose'"
            :disabled="!proseChanged || !name.trim() || busy !== null"
            @click="saveProse"
          >
            <sl-icon slot="prefix" name="check2"></sl-icon>
            Save
          </sl-button>
          <sl-button
            size="small"
            variant="text"
            :disabled="!proseChanged || busy !== null"
            @click="reseedProse"
          >
            Revert
          </sl-button>
          <span v-if="!name.trim()" class="tool-reason">A mention needs a name.</span>
        </div>

        <p v-if="proseError" class="inline-error">{{ proseError }}</p>
      </section>

      <section class="toolset-section">
        <h3 class="section-title">{{ homeName ? 'Move to another finding' : 'Attach to a finding' }}</h3>

        <sl-radio-group :value="mode" @sl-change="setMode(($event.target as HTMLInputElement).value)">
          <sl-radio value="existing" :disabled="candidateContexts.length === 0">An existing finding</sl-radio>
          <sl-radio value="new">A new finding</sl-radio>
        </sl-radio-group>

        <ContextPicker
          v-if="mode === 'existing'"
          v-model="targetId"
          :contexts="candidateContexts"
        />
        <sl-input
          v-else
          size="small"
          :value="newName"
          :placeholder="name || 'Name of the new finding'"
          :disabled="busy !== null"
          @sl-input="newName = ($event.target as HTMLInputElement).value"
        ></sl-input>
        <p v-if="mode === 'new'" class="tool-note">
          Left blank, the new finding is named after this mention.
        </p>

        <div class="toolset-row">
          <sl-button
            variant="primary"
            size="small"
            :loading="busy === 'attach'"
            :disabled="!attachCheck.ok || busy !== null"
            @click="runAttach"
          >
            <sl-icon slot="prefix" name="box-arrow-in-right"></sl-icon>
            {{ homeName ? 'Move' : 'Attach' }}
          </sl-button>
        </div>

        <p v-if="!attachCheck.ok" class="tool-reason">{{ attachCheck.reason }}</p>
        <p v-else-if="attachCheck.warning" class="tool-warning">{{ attachCheck.warning }}</p>
        <p v-if="attachError" class="inline-error">{{ attachError }}</p>
      </section>

      <section class="toolset-section">
        <h3 class="section-title">Take it out</h3>

        <div class="toolset-row">
          <sl-button
            size="small"
            variant="warning"
            :loading="busy === 'detach'"
            :disabled="!homeName || busy !== null || !deleteCheck.ok"
            @click="runDetach"
          >
            <sl-icon slot="prefix" name="box-arrow-left"></sl-icon>
            Detach
          </sl-button>
          <sl-button
            size="small"
            variant="danger"
            :disabled="busy !== null || !deleteCheck.ok"
            @click="openDeleteConfirm"
          >
            <sl-icon slot="prefix" name="trash"></sl-icon>
            Delete
          </sl-button>
        </div>

        <p class="tool-note">
          Detaching leaves the mention in its paragraph as an unclustered finding.
          Deleting removes it from the paragraph too; gathering info for this section
          again is the only way back.
        </p>
        <p v-if="!deleteCheck.ok" class="tool-reason">{{ deleteCheck.reason }}</p>
        <p v-else-if="!homeName" class="tool-reason">This mention is in no finding to detach from.</p>
        <p v-else-if="deleteCheck.warning" class="tool-warning">{{ deleteCheck.warning }}</p>
        <p v-if="detachError" class="inline-error">{{ detachError }}</p>
      </section>
    </div>

    <sl-button slot="footer" variant="default" @click="emit('update:open', false)">Close</sl-button>

    <ConfirmDialog
      v-model:open="showDeleteConfirm"
      label="Delete this mention"
      confirm-label="Delete"
      variant="danger"
      :busy="busy === 'delete'"
      :warning="deleteCheck.warning"
      :error="deleteError"
      @confirm="runDelete"
    >
      <p>
        <strong>{{ edited?.name }}</strong> will be deleted from its paragraph.
      </p>
      <p v-if="edited?.quote" class="confirm-quote">{{ edited.quote }}</p>
    </ConfirmDialog>
  </sl-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { FindingContext, FindingOccurrence } from '../../../types/library';
import {
  canAttachOccurrence,
  canClusterToNew,
  canDeleteOccurrence,
  quoteWarning,
  type Eligibility,
} from '../../../utils/findingEligibility';
import {
  FindingActionError,
  addOccurrencesToContext,
  clusterToNewContext,
  removeOccurrences,
  updateOccurrence,
} from '../../../api/findings';
import ContextPicker from './ContextPicker.vue';
import ConfirmDialog from '../ConfirmDialog.vue';

/**
 * Everything that can be done to one mention: fix its prose, file it under a finding,
 * move it, detach it or delete it.
 *
 * The counterpart to FindingContextToolset, reached from the other end - the facet
 * symbol beside the mention in the paragraph rather than the findings grid. It is the
 * only route to an occurrence whose `of_context` is null, since every tool in the
 * finding's own toolset is keyed on a finding the orphan does not have.
 */

const props = defineProps<{
  open: boolean;
  occurrence: FindingOccurrence | null;
  /** The finding it sits in, when it has one. */
  context?: FindingContext | null;
  /** Findings of its facet in this section: the destinations it may join. */
  candidateContexts: FindingContext[];
  /** Its facet's readable name, for the header. */
  facetLabel?: string | null;
  /** The paragraph's text, for the quote check. */
  blockText?: string;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  /** Something structural changed; the parent should refetch the section. */
  (e: 'changed'): void;
}>();

type Operation = 'prose' | 'attach' | 'detach' | 'delete';

const edited = ref<FindingOccurrence | null>(null);
const name = ref('');
const quote = ref('');
const description = ref('');

const mode = ref<'existing' | 'new'>('existing');
const targetId = ref<number | null>(null);
const newName = ref('');

const busy = ref<Operation | null>(null);
const proseError = ref('');
const attachError = ref('');
const detachError = ref('');
const deleteError = ref('');
const showDeleteConfirm = ref(false);

/**
 * The finding this mention is in, as this dialog currently understands it.
 *
 * Held locally rather than read from the prop: an attach or a detach changes it, and
 * the prop cannot follow until the deferred refetch runs on close.
 */
const homeName = ref('');
const sourceContext = ref<FindingContext | null>(null);

/**
 * Whether anything here has changed the section's data.
 *
 * The refresh is deferred to the close for the same reason FindingContextToolset defers
 * it: fetchSection raises `loading` in SectionDetailView and the section body renders
 * behind this dialog, so a refetch mid-session tears it down. Patching the local copy
 * from each response instead lets the librarian fix the name and file the mention in one
 * sitting, with one refetch on the way out.
 */
const isDirty = ref(false);

function reseedProse() {
  if (!edited.value) return;
  name.value = edited.value.name ?? '';
  quote.value = edited.value.quote ?? '';
  description.value = edited.value.description ?? '';
}

function reseed(occurrence: FindingOccurrence) {
  edited.value = { ...occurrence };
  reseedProse();

  sourceContext.value = props.context ?? null;
  homeName.value = occurrence.of_context ? (props.context?.name ?? 'a finding') : '';

  mode.value = props.candidateContexts.length > 0 ? 'existing' : 'new';
  targetId.value = null;
  newName.value = '';
  proseError.value = '';
  attachError.value = '';
  detachError.value = '';
  deleteError.value = '';
  showDeleteConfirm.value = false;
}

/**
 * Watches the occurrence as well as the open flag. A refetch triggered elsewhere can
 * remove the mention this dialog is pointed at, and editing a record that no longer
 * exists is worse than closing.
 */
watch([() => props.open, () => props.occurrence], ([isOpen]) => {
  if (!isOpen) return;
  if (!props.occurrence) {
    emit('update:open', false);
    return;
  }
  reseed(props.occurrence);
}, { immediate: true });

/** The one refresh, on the way out. */
watch(() => props.open, (isOpen, wasOpen) => {
  if (wasOpen && !isOpen && isDirty.value) {
    isDirty.value = false;
    emit('changed');
  }
});

/** A destination that has since been merged away must not stay selected. */
watch(() => props.candidateContexts, candidates => {
  if (targetId.value !== null && !candidates.some(c => c.id === targetId.value)) {
    targetId.value = null;
  }
});

const proseChanged = computed(() =>
  !!edited.value
  && (name.value !== (edited.value.name ?? '')
    || quote.value !== (edited.value.quote ?? '')
    || description.value !== (edited.value.description ?? '')));

const quoteNote = computed(() => quoteWarning(props.blockText ?? '', quote.value));

const target = computed<FindingContext | null>(() =>
  props.candidateContexts.find(c => c.id === targetId.value) ?? null);

const attachCheck = computed<Eligibility>(() => {
  if (!edited.value) return { ok: false, reason: '' };

  if (mode.value === 'new') {
    return canClusterToNew({ occurrence: edited.value, from: sourceContext.value });
  }

  // No targetFacet: the parent draws the candidates from this mention's own facet
  // bucket, so a mismatch cannot be built here and claiming to check one would be
  // comparing the facet with itself.
  return canAttachOccurrence({
    occurrence: edited.value,
    to: target.value,
    from: sourceContext.value,
  });
});

const deleteCheck = computed<Eligibility>(() => {
  if (!edited.value) return { ok: true, reason: '' };
  return canDeleteOccurrence({ occurrence: edited.value, context: sourceContext.value });
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

function describe(e: unknown, fallback: string) {
  return e instanceof FindingActionError ? e.message : fallback;
}

async function saveProse() {
  if (!edited.value || !proseChanged.value || busy.value) return;

  busy.value = 'prose';
  proseError.value = '';
  try {
    const updated = await updateOccurrence(edited.value.id, {
      name: name.value.trim(),
      quote: quote.value,
      description: description.value.trim(),
    });
    edited.value = { ...edited.value, ...updated };
    reseedProse();
    isDirty.value = true;
  } catch (e) {
    proseError.value = describe(e, 'Saving the mention failed.');
  } finally {
    busy.value = null;
  }
}

/**
 * Attach and move are one action.
 *
 * `add_occurrences` takes occurrences out of any context as well as out of none, so the
 * orphan case and the move case need no branch here - which is the whole reason the
 * toolset does not reach for moveOccurrences, whose source id an orphan cannot supply.
 */
async function runAttach() {
  if (!edited.value || !attachCheck.value.ok || busy.value) return;

  busy.value = 'attach';
  attachError.value = '';
  try {
    const result = mode.value === 'existing' && targetId.value !== null
      ? await addOccurrencesToContext({
        contextId: targetId.value,
        occurrenceIds: [edited.value.id],
      })
      : await clusterToNewContext({
        occurrenceIds: [edited.value.id],
        // Blank means "let the server name it after this mention".
        name: newName.value.trim() || undefined,
      });

    edited.value = { ...edited.value, of_context: result.target_context.id };
    homeName.value = result.target_context.name;
    // The source, if there was one, has either lost a mention or been deleted; either
    // way its warnings no longer apply to where this mention now sits.
    sourceContext.value = null;
    targetId.value = null;
    newName.value = '';
    isDirty.value = true;
  } catch (e) {
    attachError.value = describe(e, 'Attaching the mention failed.');
  } finally {
    busy.value = null;
  }
}

async function runDetach() {
  if (!edited.value || busy.value) return;

  busy.value = 'detach';
  detachError.value = '';
  try {
    await removeOccurrences({ occurrenceIds: [edited.value.id], deleteFromBlock: false });
    edited.value = { ...edited.value, of_context: null };
    homeName.value = '';
    sourceContext.value = null;
    isDirty.value = true;
  } catch (e) {
    detachError.value = describe(e, 'Detaching the mention failed.');
  } finally {
    busy.value = null;
  }
}

function openDeleteConfirm() {
  deleteError.value = '';
  showDeleteConfirm.value = true;
}

/**
 * The one action that does not defer its refresh: the record is gone, so there is
 * nothing left for this dialog to show. Closes first, then reports.
 */
async function runDelete() {
  if (!edited.value || busy.value) return;

  busy.value = 'delete';
  deleteError.value = '';
  try {
    await removeOccurrences({ occurrenceIds: [edited.value.id], deleteFromBlock: true });
    showDeleteConfirm.value = false;
    isDirty.value = true;
    emit('update:open', false);
  } catch (e) {
    deleteError.value = describe(e, 'Deleting the mention failed.');
  } finally {
    busy.value = null;
  }
}
</script>

<style scoped>
.occurrence-toolset {
  --width: 42rem;
}

.toolset-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.toolset-home {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  font-size: 0.85rem;
  color: var(--sl-color-neutral-600);
}

.toolset-home-note {
  flex: 1 1 16rem;
  min-width: 0;
  font-size: 0.75rem;
  line-height: 1.35;
}

.toolset-section {
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

.toolset-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tool-note,
.tool-reason,
.tool-warning,
.inline-error,
.confirm-quote {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.35;
}

.tool-note {
  color: var(--sl-color-neutral-500);
}

.tool-reason {
  font-style: italic;
  color: var(--sl-color-neutral-600);
}

.tool-warning {
  font-style: italic;
  color: var(--sl-color-warning-700);
}

.inline-error {
  color: var(--sl-color-danger-600);
}

.confirm-quote {
  font-style: italic;
  color: var(--sl-color-neutral-600);
}
</style>
