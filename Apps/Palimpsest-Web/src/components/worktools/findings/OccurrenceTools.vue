<template>
  <div class="occurrence-tools">
    <div class="tools-header">
      <span class="tools-count">
        {{ selectedIds.length }} of {{ context.occurrences.length }} mentions ticked
      </span>
      <sl-button size="small" variant="text" :disabled="selectedIds.length === 0" @click="emit('clear-selection')">
        Clear
      </sl-button>
    </div>

    <sl-details summary="Move to another finding">
      <div class="admin-actions-group">
        <div class="admin-actions-row">
          <sl-button
            variant="primary"
            size="small"
            :loading="busy === 'move'"
            :disabled="!moveCheck.ok || busy !== null"
            @click="runMove"
          >
            <sl-icon slot="prefix" name="box-arrow-right"></sl-icon>
            Move
          </sl-button>
          <sl-tooltip content="Clear the chosen destination" hoist>
            <sl-icon-button
              name="arrow-counterclockwise"
              label="Reset destination"
              @click="moveTargetId = null"
            ></sl-icon-button>
          </sl-tooltip>
        </div>

        <p v-if="!moveCheck.ok" class="tool-reason">{{ moveCheck.reason }}</p>
        <p v-else-if="moveCheck.warning" class="tool-warning">{{ moveCheck.warning }}</p>

        <div class="portal-group-title">Destination</div>
        <ContextPicker v-model="moveTargetId" :contexts="siblingContexts" />
      </div>
    </sl-details>

    <sl-details summary="Split off into a new finding">
      <div class="admin-actions-group">
        <div class="admin-actions-row">
          <sl-button
            variant="primary"
            size="small"
            :loading="busy === 'split'"
            :disabled="!splitCheck.ok || busy !== null"
            @click="runSplit"
          >
            <sl-icon slot="prefix" name="arrows-angle-expand"></sl-icon>
            Split off
          </sl-button>
        </div>

        <p v-if="!splitCheck.ok" class="tool-reason">{{ splitCheck.reason }}</p>
        <p v-else-if="splitCheck.warning" class="tool-warning">{{ splitCheck.warning }}</p>

        <div class="portal-group-title">Name of the new finding</div>
        <sl-input
          size="small"
          :value="splitName"
          :placeholder="splitPlaceholder"
          @sl-input="splitName = ($event.target as HTMLInputElement).value"
        ></sl-input>
        <p class="tool-note">Left blank, the new finding is named after its first mention.</p>
      </div>
    </sl-details>

    <sl-details summary="Remove mentions">
      <div class="admin-actions-group">
        <div class="admin-actions-row">
          <sl-button
            variant="danger"
            size="small"
            :disabled="selectedIds.length === 0 || busy !== null"
            @click="openRemoveConfirm"
          >
            <sl-icon slot="prefix" name="trash"></sl-icon>
            Remove
          </sl-button>
        </div>

        <p v-if="selectedIds.length === 0" class="tool-reason">Tick the mentions to remove.</p>

        <sl-checkbox
          size="small"
          :checked="removeFromBlock"
          @sl-change="removeFromBlock = ($event.target as HTMLInputElement).checked"
        >
          Also delete them from their paragraphs
        </sl-checkbox>
        <p class="tool-note">
          {{ removeFromBlock
            ? 'The mentions are deleted outright.'
            : 'The mentions leave this finding but stay in their paragraphs as unclustered findings.' }}
        </p>
      </div>
    </sl-details>

    <sl-alert v-if="error" variant="danger" open class="tool-alert">
      <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
      {{ error }}
    </sl-alert>

    <ConfirmDialog
      v-model:open="showRemoveConfirm"
      label="Remove mentions"
      confirm-label="Remove"
      variant="danger"
      :busy="busy === 'remove'"
      :error="confirmError"
      @confirm="runRemove"
    >
      <p>
        {{ selectedIds.length === 1 ? 'This mention' : `These ${selectedIds.length} mentions` }}
        will be removed from <strong>{{ context.name }}</strong>:
      </p>
      <ul class="confirm-list">
        <li v-for="occ in selectedOccurrences" :key="occ.id">
          <strong>{{ occ.name }}</strong>
          <span v-if="occ.quote" class="confirm-quote">{{ occ.quote }}</span>
        </li>
      </ul>
      <p class="tool-note">
        {{ removeFromBlock
          ? 'They will be deleted from their paragraphs too. Gathering info for this section again is the only way back.'
          : 'They stay in their paragraphs as unclustered findings.' }}
      </p>
      <p v-if="removesEverything" class="tool-warning">
        That is every mention this finding has, so the finding itself will be deleted.
      </p>
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { FindingContext } from '../../../types/library';
import { canMoveOccurrences, canSplit } from '../../../utils/findingEligibility';
import {
  FindingActionError,
  moveOccurrences,
  removeOccurrences,
  splitContext,
  type MoveResult,
} from '../../../api/findings';
import ContextPicker from './ContextPicker.vue';
import ConfirmDialog from '../ConfirmDialog.vue';

/**
 * The three things a librarian can do to the mentions ticked inside a finding's
 * toolset: move them elsewhere, split them off, or remove them.
 *
 * Laid out as sl-details miniforms in the shape SectionAdminToolsPanel established -
 * an action row at the top, the form below - so a sidebar's worth of tools stays
 * collapsible.
 *
 * Every action reports back through `applied` with the ids that left and whether the
 * finding itself survived, so the dialog can update in place instead of being torn
 * down by a refetch after each single move.
 */

const props = defineProps<{
  context: FindingContext;
  siblingContexts: FindingContext[];
  selectedIds: number[];
}>();

const emit = defineEmits<{
  /** Ids that are no longer in this finding, plus whether the finding itself is gone. */
  (e: 'applied', payload: { departedIds: number[]; contextDeleted: boolean }): void;
  (e: 'clear-selection'): void;
}>();

type Operation = 'move' | 'split' | 'remove';

const busy = ref<Operation | null>(null);
const error = ref('');
const confirmError = ref('');
const moveTargetId = ref<number | null>(null);
const splitName = ref('');
const removeFromBlock = ref(false);
const showRemoveConfirm = ref(false);

const selectedOccurrences = computed(() =>
  props.context.occurrences.filter(o => props.selectedIds.includes(o.id)));

const splitPlaceholder = computed(() =>
  selectedOccurrences.value[0]?.name || 'Name of the new finding');

const moveTarget = computed<FindingContext | null>(() =>
  props.siblingContexts.find(c => c.id === moveTargetId.value) ?? null);

const moveCheck = computed(() => canMoveOccurrences({
  from: props.context,
  to: moveTarget.value,
  occurrenceIds: props.selectedIds,
}));

const splitCheck = computed(() => canSplit({
  context: props.context,
  occurrenceIds: props.selectedIds,
}));

const removesEverything = computed(() =>
  props.context.occurrences.length > 0
  && props.selectedIds.length === props.context.occurrences.length);

/** A destination that has since been merged away must not stay selected. */
watch(() => props.siblingContexts, siblings => {
  if (moveTargetId.value !== null && !siblings.some(c => c.id === moveTargetId.value)) {
    moveTargetId.value = null;
  }
});

function fail(e: unknown, fallback: string) {
  return e instanceof FindingActionError ? e.message : fallback;
}

async function runMove() {
  if (!moveCheck.value.ok || moveTargetId.value === null || busy.value) return;

  busy.value = 'move';
  error.value = '';
  try {
    const result = await moveOccurrences({
      fromContextId: props.context.id,
      toContextId: moveTargetId.value,
      occurrenceIds: props.selectedIds,
    });
    finish(result);
  } catch (e) {
    error.value = fail(e, 'The move failed.');
  } finally {
    busy.value = null;
  }
}

async function runSplit() {
  if (!splitCheck.value.ok || busy.value) return;

  busy.value = 'split';
  error.value = '';
  try {
    const result = await splitContext({
      contextId: props.context.id,
      occurrenceIds: props.selectedIds,
      // Blank means "let the server name it after the first moved mention".
      name: splitName.value.trim() || undefined,
    });
    splitName.value = '';
    finish(result);
  } catch (e) {
    error.value = fail(e, 'The split failed.');
  } finally {
    busy.value = null;
  }
}

function openRemoveConfirm() {
  confirmError.value = '';
  showRemoveConfirm.value = true;
}

async function runRemove() {
  if (busy.value) return;

  busy.value = 'remove';
  confirmError.value = '';
  try {
    const result = await removeOccurrences({
      occurrenceIds: props.selectedIds,
      deleteFromBlock: removeFromBlock.value,
    });
    const departedIds = [...result.detached_occurrence_ids, ...result.deleted_occurrence_ids];
    showRemoveConfirm.value = false;
    // Reset, so the next removal in the same sitting does not silently inherit a
    // decision to delete mentions outright.
    removeFromBlock.value = false;
    emit('applied', {
      departedIds,
      contextDeleted: result.deleted_context_ids.includes(props.context.id),
    });
  } catch (e) {
    confirmError.value = fail(e, 'The removal failed.');
  } finally {
    busy.value = null;
  }
}

function finish(result: MoveResult) {
  moveTargetId.value = null;
  emit('applied', {
    departedIds: result.moved_occurrence_ids,
    contextDeleted: result.source_deleted,
  });
}
</script>

<style scoped>
/* The admin-actions-* classes are scoped to SectionAdminToolsPanel, so the shape it
   established is restated here rather than imported. */
.occurrence-tools {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--sl-color-warning-200);
  border-radius: var(--sl-border-radius-medium);
}

.tools-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.tools-count {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sl-color-neutral-500);
}

.admin-actions-group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.admin-actions-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.portal-group-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--sl-color-neutral-500);
  text-transform: uppercase;
  margin-top: 0.25rem;
}

.tool-reason {
  margin: 0;
  font-size: 0.75rem;
  font-style: italic;
  line-height: 1.35;
  color: var(--sl-color-warning-700);
}

.tool-warning {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--sl-color-warning-700);
  font-weight: 500;
}

.tool-note {
  margin: 0;
  font-size: 0.72rem;
  font-style: italic;
  line-height: 1.35;
  color: var(--sl-color-neutral-500);
}

.tool-alert::part(message) {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
}

.confirm-list {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.confirm-quote {
  display: block;
  font-size: 0.78rem;
  font-style: italic;
  color: var(--sl-color-neutral-600);
}
</style>
