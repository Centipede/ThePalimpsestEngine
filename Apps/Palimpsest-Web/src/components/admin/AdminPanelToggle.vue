<template>
  <sl-tooltip :content="label" hoist>
    <sl-icon-button
        class="admin-panel-toggle"
        :class="{ 'admin-panel-toggle--open': open }"
        :name="icon"
        :label="label"
        @click="emit('toggle')"
    ></sl-icon-button>
  </sl-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  /** Which end of the split panel this toggle governs. */
  side: 'start' | 'end';
  open: boolean;
}>();

const emit = defineEmits<{ toggle: [] }>();

const icon = computed(() => props.side === 'start' ? 'layout-sidebar-inset' : 'layout-sidebar-inset-reverse');

const label = computed(() => {
  const pane = props.side === 'start' ? 'admin info' : 'admin tools';
  return `${props.open ? 'Hide' : 'Show'} ${pane}`;
});
</script>

<style scoped>
/* The toolbar's info cells are only 80px wide, so the button carries no padding of its own. */
.admin-panel-toggle {
  font-size: 1.1rem;
  color: var(--color-text-muted);
}

.admin-panel-toggle::part(base) {
  padding: 0;
}

.admin-panel-toggle--open {
  color: var(--sl-color-primary-600);
}
</style>
