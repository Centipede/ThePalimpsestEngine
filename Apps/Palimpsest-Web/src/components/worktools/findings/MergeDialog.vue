<template>
  <sl-dialog
    label="Merge findings"
    :open="open"
    class="merge-dialog"
    @sl-request-close="onRequestClose"
  >
    <div class="merge-body">
      <p class="merge-intro">
        All mentions will end up under one finding; the others are deleted.
      </p>

      <section class="merge-section">
        <h3 class="section-title">Which finding survives</h3>

        <sl-alert v-if="forcedTarget" variant="primary" open class="merge-alert">
          <sl-icon slot="icon" name="link-45deg"></sl-icon>
          {{ forcedTarget.name }} is linked to an identity, so it is the one that survives.
        </sl-alert>

        <ContextPicker
          v-model="keepId"
          :contexts="contexts"
          :allowed-ids="candidateIds"
        />
      </section>

      <section class="merge-section">
        <h3 class="section-title">Name of the merged finding</h3>
        <sl-input
          :value="name"
          :disabled="busy"
          placeholder="Name of the merged finding"
          @sl-input="name = ($event.target as HTMLInputElement).value"
        ></sl-input>
      </section>

      <sl-alert v-if="error" variant="danger" open class="merge-alert">
        <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
        {{ error }}
      </sl-alert>
    </div>

    <div slot="footer" class="merge-footer">
      <sl-button variant="default" :disabled="busy" @click="emit('update:open', false)">Cancel</sl-button>
      <sl-button variant="primary" :loading="busy" :disabled="keepId === null" @click="confirm">
        Merge {{ contexts.length }} findings
      </sl-button>
    </div>
  </sl-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { FindingContext } from '../../../types/library';
import {
  mergeCandidateKeepIds,
  mergeTarget,
  suggestMergedName,
  type SelectedContext,
} from '../../../utils/findingEligibility';
import { FindingActionError, mergeContexts } from '../../../api/findings';
import ContextPicker from './ContextPicker.vue';

/**
 * The merge form. Not a ConfirmDialog: it carries a survivor choice and an editable
 * name, so it is a form that happens to be destructive rather than a yes/no.
 *
 * The survivor choice mirrors the server's own rule. The server keeps an identified
 * context whichever id the request addresses, so when exactly one of the selection is
 * identified there is nothing to choose and the picker says why instead of offering a
 * choice it would silently override.
 */

const props = defineProps<{
  open: boolean;
  selection: SelectedContext[];
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'merged'): void;
}>();

const keepId = ref<number | null>(null);
const name = ref('');
const busy = ref(false);
const error = ref('');

const contexts = computed<FindingContext[]>(() => props.selection.map(s => s.context));
const candidateIds = computed(() => mergeCandidateKeepIds(props.selection));
const forcedTarget = computed(() => mergeTarget(props.selection));

/**
 * Re-seeded on open rather than on selection change: the librarian's edit to the name
 * must survive a background refetch handing us new context objects.
 */
watch(() => props.open, isOpen => {
  if (!isOpen) return;
  error.value = '';
  busy.value = false;
  keepId.value = forcedTarget.value?.id ?? defaultKeepId();
  name.value = keepId.value === null ? '' : suggestMergedName(props.selection, keepId.value);
});

// Picking up the name as the survivor changes is the useful default; a name the
// librarian has typed over is not reset, because only an untouched field is replaced.
watch(keepId, id => {
  if (id === null) return;
  const suggested = suggestMergedName(props.selection, id);
  if (!name.value || contexts.value.some(c => name.value === c.name || name.value === c.of_identity?.name)) {
    name.value = suggested;
  }
});

/** Of the contexts allowed to survive, the one carrying the most mentions. */
function defaultKeepId(): number | null {
  const allowed = contexts.value.filter(c => candidateIds.value.includes(c.id));
  if (allowed.length === 0) return null;
  return allowed.reduce((best, c) =>
    c.occurrences.length > best.occurrences.length ? c : best, allowed[0]).id;
}

function onRequestClose(event: Event) {
  if (busy.value) {
    event.preventDefault();
    return;
  }
  emit('update:open', false);
}

async function confirm() {
  if (keepId.value === null || busy.value) return;

  busy.value = true;
  error.value = '';
  try {
    await mergeContexts({
      keepId: keepId.value,
      sourceIds: contexts.value.map(c => c.id).filter(id => id !== keepId.value),
      name: name.value.trim() || undefined,
    });
    emit('merged');
    emit('update:open', false);
  } catch (e) {
    // The server's rules are finer-grained than anything checkable from the section
    // payload - it also knows which section a context belongs to - so its own wording
    // stays on screen instead of the dialog closing on a refusal.
    error.value = e instanceof FindingActionError ? e.message : 'The merge failed.';
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.merge-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.merge-intro {
  margin: 0;
  font-size: 0.85rem;
  color: var(--sl-color-neutral-600);
}

.merge-section {
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

.merge-alert::part(message) {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
}

.merge-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
