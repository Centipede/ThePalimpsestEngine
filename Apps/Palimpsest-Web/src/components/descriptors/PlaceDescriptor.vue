<template>
  <div class="summary-info-record__tag-group">
    <span class="summary-info-record__tag-label">Place:</span>
    <div class="summary-info-record__descriptor-content">
      <div v-if="central_geographical_area.full_description" class="summary-info-record__descriptor-prose">{{ central_geographical_area.full_description }}</div>
      <div v-if="central_geographical_area.placenames?.length" class="summary-info-record__tag-list">
        <sl-badge v-for="p in central_geographical_area.placenames" :key="p" pill class="place-badge">{{ p }}</sl-badge>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CentralGeographicalArea } from '../../types/library';

defineProps<{
  central_geographical_area: CentralGeographicalArea;
}>();
</script>

<style scoped>
.summary-info-record__tag-group {
  margin-bottom: 0.75rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.summary-info-record__tag-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  width: 80px;
  flex-shrink: 0;
  padding-top: 2px;
}

.summary-info-record__descriptor-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-info-record__descriptor-prose {
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--color-text-muted);
}

.place-badge::part(base) {
  background-color: var(--sl-color-teal-600);
  border-color: var(--sl-color-teal-600);
  color: #fff;
}

.summary-info-record__tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
</style>
