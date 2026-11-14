<template>
  <div class="selection-bar">
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
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Eligibility } from '../../../utils/findingEligibility';

/**
 * The staff action bar above the findings grid. Pure display: it owns no selection and
 * makes no server call, it just reports what the rules said.
 *
 * Shown whenever the viewer is staff, not only once something is ticked - otherwise the
 * grid jumps the moment the first box is clicked, and nothing tells the librarian that
 * the checkboxes lead anywhere.
 */

const props = defineProps<{
  count: number;
  mergeCheck: Eligibility;
  removeCheck: Eligibility;
}>();

const emit = defineEmits<{
  (e: 'merge'): void;
  (e: 'remove'): void;
  (e: 'clear'): void;
}>();

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
</script>

<style scoped>
/* Reads as staff chrome, like the admin panels' warning-bordered cards. Not sticky:
   the section toolbar above is already position:sticky in this scroll container. */
.selection-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
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

.selection-reason {
  flex: 1 1 14rem;
  min-width: 0;
  font-size: 0.75rem;
  font-style: italic;
  line-height: 1.35;
  color: var(--sl-color-warning-700);
}
</style>
