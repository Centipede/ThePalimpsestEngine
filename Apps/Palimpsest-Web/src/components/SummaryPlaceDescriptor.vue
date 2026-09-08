<template>
  <div class="toc-summary__tag-group">
    <span class="toc-summary__tag-label">Place:</span>
    <div class="toc-summary__descriptor-content">
      <div v-if="data.full_description" class="toc-summary__descriptor-prose">{{ data.full_description }}</div>
      <div v-if="data.placenames?.length" class="toc-summary__tag-list">
        <sl-badge v-for="p in data.placenames" :key="p" variant="neutral" pill>{{ p }}</sl-badge>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SectionSummary } from '../types/library';

defineProps<{
  data: SectionSummary['central_geographical_area'];
}>();
</script>

<style scoped>
.toc-summary__tag-group {
  margin-bottom: 0.75rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.toc-summary__tag-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  width: 80px;
  flex-shrink: 0;
  padding-top: 2px;
}

.toc-summary__descriptor-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toc-summary__descriptor-prose {
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--color-text);
}

.toc-summary__tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
</style>
