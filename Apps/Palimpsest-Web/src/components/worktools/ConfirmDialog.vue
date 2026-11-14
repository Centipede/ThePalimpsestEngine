<template>
  <sl-dialog
    :label="label"
    :open="open"
    class="confirm-dialog"
    @sl-request-close="onRequestClose"
  >
    <div class="confirm-body">
      <slot></slot>

      <sl-alert v-if="warning" variant="warning" open class="confirm-alert">
        <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
        {{ warning }}
      </sl-alert>

      <sl-alert v-if="error" variant="danger" open class="confirm-alert">
        <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
        {{ error }}
      </sl-alert>
    </div>

    <div slot="footer" class="confirm-footer">
      <sl-button variant="default" :disabled="busy" @click="emit('update:open', false)">Cancel</sl-button>
      <sl-button :variant="variant ?? 'danger'" :loading="busy" @click="emit('confirm')">
        {{ confirmLabel ?? 'Confirm' }}
      </sl-button>
    </div>
  </sl-dialog>
</template>

<script setup lang="ts">
/**
 * The confirmation shell for the curation tools. The body is a slot because every case
 * needs different wording and sometimes an extra control - the "also remove them from
 * the paragraphs" checkbox, for instance - while the chrome is identical every time,
 * and the chrome is the part that drifts when it is written out five times.
 *
 * `busy` and `error` are what make this more than a yes/no: the server call runs while
 * the dialog is open, so a failure has to stay on screen next to the button that caused
 * it rather than vanishing with the dialog.
 */

const props = defineProps<{
  open: boolean;
  label: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  /** A consequence of going ahead, stated before the fact. */
  warning?: string;
  /** The server's own explanation of a refusal. */
  error?: string;
  busy?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
}>();

/** An in-flight call must not be abandoned by an Escape press or an overlay click. */
function onRequestClose(event: Event) {
  if (props.busy) {
    event.preventDefault();
    return;
  }
  emit('update:open', false);
}
</script>

<style scoped>
.confirm-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-size: 0.9rem;
  line-height: 1.5;
}

.confirm-alert::part(message) {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
}

.confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
