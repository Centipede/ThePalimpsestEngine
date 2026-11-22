<template>
  <div class="pager">
    <span class="pager__range">{{ label }}</span>

    <div class="pager__controls">
      <sl-select
        class="pager__size"
        size="small"
        :value="String(limit)"
        @sl-change="emit('update:limit', Number(($event.target as HTMLInputElement).value))"
      >
        <sl-option v-for="size in pageSizes" :key="size" :value="String(size)">
          {{ size }} per page
        </sl-option>
      </sl-select>

      <sl-button-group label="Page">
        <sl-button
          size="small"
          :disabled="!hasPrev || busy"
          @click="emit('prev')"
        >
          <sl-icon slot="prefix" name="chevron-left"></sl-icon>
          Prev
        </sl-button>
        <sl-button
          size="small"
          :disabled="!hasNext || busy"
          @click="emit('next')"
        >
          Next
          <sl-icon slot="suffix" name="chevron-right"></sl-icon>
        </sl-button>
      </sl-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Prev/next over a server-paginated list, with the page size and an honest count.
 *
 * Presentational on purpose - props in, events out, no fetching and no knowledge of a
 * composable - so it can be mounted in a test without a server, and so the two lists in
 * the match work area can share it without sharing any state.
 *
 * The range label is passed in rather than computed here: whoever owns the offset knows
 * how many rows actually came back, and a pager that recomputed it from count and limit
 * would lie on the last partial page.
 */

withDefaults(defineProps<{
  label: string;
  hasPrev: boolean;
  hasNext: boolean;
  limit: number;
  /** Disables both arrows while a fetch is in flight. */
  busy?: boolean;
  pageSizes?: number[];
}>(), {
  busy: false,
  // Well under the API's cap of 500; 25 keeps the dossier-bearing identity page light.
  pageSizes: () => [25, 50, 100],
});

const emit = defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
  (e: 'update:limit', value: number): void;
}>();
</script>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.4rem 0;
  border-top: 1px solid var(--color-border);
}

.pager__range {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.pager__controls {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.pager__size {
  width: 8.5rem;
}
</style>
