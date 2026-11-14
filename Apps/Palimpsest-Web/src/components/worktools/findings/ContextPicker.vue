<template>
  <sl-radio-group
    class="context-picker"
    :value="modelValue === null ? '' : String(modelValue)"
    @sl-change="onChange"
  >
    <sl-radio
      v-for="candidate in contexts"
      :key="candidate.id"
      :value="String(candidate.id)"
      :disabled="!isAllowed(candidate.id)"
      class="picker-row"
    >
      <span class="picker-name">
        {{ candidate.name }}
        <sl-badge v-if="candidate.of_identity" variant="primary" pill class="picker-identity">
          {{ candidate.of_identity.wikidata_qid }}
        </sl-badge>
      </span>
      <span class="picker-quotes">{{ condenseQuotes(candidate.occurrences) }}</span>
    </sl-radio>

    <p v-if="contexts.length === 0" class="picker-empty">
      No other findings of this kind in this section.
    </p>
  </sl-radio-group>
</template>

<script setup lang="ts">
import type { FindingContext } from '../../../types/library';
import { condenseQuotes } from '../../../utils/text';

/**
 * Pick one finding out of a list - the merge survivor, or the destination of a move.
 *
 * Each row carries a condensed strip of the finding's own quotes, because the names
 * are exactly what fails to distinguish the candidates: a section can hold five
 * findings all called "Caesar", and the quotes are the only thing that says which is
 * which.
 *
 * Deliberately a radio list rather than an sl-select: sl-select builds its closed
 * label from the selected option's textContent, so every quote in the chosen row
 * would be dumped into the combobox.
 */

const props = defineProps<{
  contexts: FindingContext[];
  modelValue: number | null;
  /** When given, only these ids may be chosen; the rest render disabled. */
  allowedIds?: number[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

function isAllowed(id: number) {
  return !props.allowedIds || props.allowedIds.includes(id);
}

function onChange(event: Event) {
  const value = (event.target as HTMLInputElement | null)?.value;
  if (value) emit('update:modelValue', Number(value));
}
</script>

<style scoped>
.context-picker {
  display: block;
  max-height: 18rem;
  overflow-y: auto;
}

/* The name and the quote strip stack, so the row needs the full width of the group. */
.picker-row::part(label) {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
  width: 100%;
}

.picker-row::part(base) {
  align-items: flex-start;
  padding: 0.2rem 0;
}

.picker-name {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.picker-identity {
  font-size: 0.65rem;
}

.picker-quotes {
  font-size: 0.7rem;
  color: var(--sl-color-neutral-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.picker-empty {
  margin: 0;
  font-size: 0.8rem;
  font-style: italic;
  color: var(--sl-color-neutral-400);
}
</style>
