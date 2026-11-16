<template>
  <div class="findings-toolbar">
    <div v-if="selectable" class="selection-bar">
      <span class="selection-count">{{ count }} selected</span>

      <sl-tooltip :content="mergeCheck.reason" :disabled="mergeCheck.ok" hoist>
        <sl-button size="small" variant="primary" :disabled="!mergeCheck.ok" @click="emit('merge')">
          <sl-icon slot="prefix" name="arrows-angle-contract"></sl-icon>
          Merge
        </sl-button>
      </sl-tooltip>

      <sl-tooltip :content="removeCheck.reason" :disabled="removeCheck.ok" hoist>
        <sl-button size="small" variant="danger" :disabled="!removeCheck.ok" @click="emit('remove')">
          <sl-icon slot="prefix" name="trash"></sl-icon>
          Remove
        </sl-button>
      </sl-tooltip>

      <sl-button size="small" variant="text" :disabled="count === 0" @click="emit('clear')">
        Clear
      </sl-button>

      <span v-if="blockingReason" class="selection-reason">{{ blockingReason }}</span>
    </div>

    <div v-if="focusedBlock" class="add-mention-row">
      <span class="selection-count">Add a mention</span>

      <sl-input
        class="add-quote"
        size="small"
        :value="quote"
        placeholder="Paste the words from this paragraph"
        @sl-input="quote = ($event.target as HTMLInputElement).value"
      ></sl-input>

      <sl-select
        class="add-facet"
        size="small"
        :value="facet"
        placeholder="Kind"
        hoist
        @sl-change="facet = ($event.target as HTMLInputElement).value"
      >
        <sl-option v-for="option in facetOptions" :key="option.id" :value="option.machine_name_singular">
          {{ option.symbol }} {{ option.name }}
        </sl-option>
      </sl-select>

      <sl-tooltip :content="startCheck.reason" :disabled="startCheck.ok" hoist>
        <sl-button size="small" variant="primary" :disabled="!startCheck.ok" @click="startAdd">
          <sl-icon slot="prefix" name="plus-lg"></sl-icon>
          Add occurrence
        </sl-button>
      </sl-tooltip>

      <span v-if="addReason" class="selection-reason">{{ addReason }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ContentBlock, FacetQuery } from '../../../types/library';
import { canStartOccurrence, type Eligibility } from '../../../utils/findingEligibility';

/**
 * The staff bar above the findings grid. Pure display and local field state: it owns no
 * selection, holds no store and makes no server call, it just reports what the rules
 * said and hands the quote and facet up.
 *
 * The selection row is shown whenever the viewer is staff, not only once something is
 * ticked - otherwise the grid jumps the moment the first box is clicked, and nothing
 * tells the librarian that the checkboxes lead anywhere. `selectable` is what hides it
 * in a section that has no findings to tick at all, where the second row is the whole
 * point of the bar being on screen.
 */

const props = defineProps<{
  count: number;
  mergeCheck: Eligibility;
  removeCheck: Eligibility;
  /** False in a section with no findings yet: nothing to merge, remove or clear. */
  selectable: boolean;
  /** The single block the URL is focused on, if any. Without one there is nothing to add to. */
  focusedBlock?: ContentBlock | null;
  facetOptions: FacetQuery[];
  /** Bumped by the parent after a successful create; wipes the fields. */
  clearToken: number;
}>();

const emit = defineEmits<{
  (e: 'merge'): void;
  (e: 'remove'): void;
  (e: 'clear'): void;
  (e: 'add-occurrence', payload: { quote: string; facet: string }): void;
}>();

const quote = ref('');
const facet = ref('');

/**
 * Shoelace does show a tooltip over a disabled button, but a reason nobody hovers is
 * not a visible reason, so the most relevant one is also written out in the bar. The
 * "nothing selected" case is left silent: an empty selection explains itself.
 */
const blockingReason = computed(() => {
  if (props.count === 0) return '';
  if (!props.removeCheck.ok && props.removeCheck.reason) return props.removeCheck.reason;
  if (!props.mergeCheck.ok && props.count >= 2) return props.mergeCheck.reason;
  return '';
});

const startCheck = computed<Eligibility>(() => canStartOccurrence({
  quote: quote.value,
  facet: facet.value,
  blockText: props.focusedBlock?.content_text ?? '',
}));

/**
 * An empty row is not a complaint, so nothing is said until the librarian has started
 * typing. Past that the refusal and the "this will not highlight" warning share the
 * line, since only one of the two can be present at a time.
 */
const addReason = computed(() => {
  if (!quote.value.trim() && !facet.value) return '';
  return startCheck.value.ok ? (startCheck.value.warning ?? '') : startCheck.value.reason;
});

/**
 * Watches the counter rather than a boolean, the FoldTrigger convention in
 * types/view_state.ts: a second create in the same sitting has to clear the fields
 * again, which a flag flipping to the same value would not do.
 */
watch(() => props.clearToken, () => {
  quote.value = '';
  facet.value = '';
});

function startAdd() {
  if (!startCheck.value.ok) return;
  emit('add-occurrence', { quote: quote.value.trim(), facet: facet.value });
}
</script>

<style scoped>
.findings-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

/* Reads as staff chrome, like the admin panels' warning-bordered cards. Not sticky:
   the section toolbar above is already position:sticky in this scroll container. */
.selection-bar,
.add-mention-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--sl-color-warning-200);
  border-radius: var(--sl-border-radius-medium);
}

.selection-count {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sl-color-neutral-500);
  margin-right: 0.35rem;
}

/* The quote takes what is left; the facet select stays narrow enough to read as a
   companion to it rather than a second field of equal weight. */
.add-quote {
  flex: 1 1 12rem;
  min-width: 0;
}

.add-facet {
  flex: 0 0 10rem;
}

.selection-reason {
  flex: 1 1 14rem;
  min-width: 0;
  font-size: 0.75rem;
  font-style: italic;
  line-height: 1.35;
  color: var(--sl-color-warning-700);
}
</style>
