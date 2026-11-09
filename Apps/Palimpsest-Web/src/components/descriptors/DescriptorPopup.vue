<template>
  <sl-popup
    v-if="anchor"
    :anchor.prop="anchor"
    :active.prop="open"
    placement="bottom-start"
    strategy="fixed"
    distance="8"
    arrow
    flip
    shift
    auto-size="vertical"
    auto-size-padding="16"
    class="descriptor-popup"
  >
    <div
      ref="cardEl"
      :id="cardId"
      class="descriptor-popup__card"
      role="dialog"
      tabindex="-1"
      :aria-label="label || 'Finding details'"
    >
      <sl-icon-button
        class="descriptor-popup__close"
        name="x-lg"
        label="Close"
        @click="closeAndRestoreFocus"
      ></sl-icon-button>
      <div class="descriptor-popup__body">
        <slot />
      </div>
    </div>
  </sl-popup>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  anchor: HTMLElement | null;
  open: boolean;
  label?: string;
  /** Id put on the card, so the opening control can point at it with aria-controls. */
  cardId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const cardEl = ref<HTMLElement | null>(null);

function closeAndRestoreFocus() {
  const anchor = props.anchor;
  emit('close');
  // Hand focus back to the pill that opened the card, the way a dialog would.
  anchor?.focus({ preventScroll: true });
}

function onKeydown(event: KeyboardEvent) {
  if (!props.open) return;
  if (event.key === 'Escape') {
    event.stopPropagation();
    closeAndRestoreFocus();
  }
}

function onPointerDown(event: Event) {
  if (!props.open) return;
  const target = event.target as Node | null;
  if (!target) return;
  // Clicks inside the card are ours; clicks on the anchor are handled by the
  // anchor itself (it toggles), so neither should close here.
  if (cardEl.value?.contains(target)) return;
  if (props.anchor?.contains(target)) return;
  emit('close');
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('pointerdown', onPointerDown, true);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('pointerdown', onPointerDown, true);
});

watch(
  () => [props.open, props.anchor] as const,
  async ([isOpen]) => {
    if (!isOpen) return;
    await nextTick();
    cardEl.value?.focus({ preventScroll: true });
  }
);
</script>

<style scoped>
.descriptor-popup {
  --arrow-color: var(--sl-panel-background-color);
  --arrow-size: 6px;
}

.descriptor-popup::part(popup) {
  z-index: var(--sl-z-index-dropdown, 900);
}

.descriptor-popup__card {
  position: relative;
  box-sizing: border-box;
  width: max-content;
  max-width: min(28rem, calc(100vw - 2rem));
  max-height: var(--auto-size-available-height, none);
  overflow-y: auto;
  padding: 0.75rem 2.25rem 0.85rem 0.9rem;
  background: var(--sl-panel-background-color);
  border: 1px solid var(--sl-panel-border-color);
  border-radius: var(--sl-border-radius-medium);
  box-shadow: var(--sl-shadow-large);
  outline: none;
  animation: descriptor-popup-in 120ms ease-out;
}

.descriptor-popup__close {
  position: absolute;
  top: 0.15rem;
  right: 0.15rem;
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

@keyframes descriptor-popup-in {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .descriptor-popup__card {
    animation: none;
  }
}
</style>
