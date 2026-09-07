<template>
  <div class="toc-summary__tag-group">
    <span class="toc-summary__tag-label">Time:</span>
    <div class="toc-summary__descriptor-content">
      <div v-if="data.full_description" class="toc-summary__descriptor-prose">{{ data.full_description }}</div>
      <div v-if="badges.length" class="toc-summary__tag-list">
        <sl-badge v-for="b in badges" :key="b" variant="neutral" pill>{{ b }}</sl-badge>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SectionSummary } from '../types/library';

const props = defineProps<{
  data: SectionSummary['central_time_period'];
}>();

const badges = computed(() => {
  const result: string[] = [];
  
  if (props.data.interval_years) {
    props.data.interval_years.forEach(interval => {
      if (interval.length === 2) {
        result.push(`${interval[0]}–${interval[1]}`);
      } else if (interval.length === 1) {
        result.push(`${interval[0]}`);
      }
    });
  }
  
  if (props.data.specific_years) {
    props.data.specific_years.forEach(year => {
      result.push(`${year}`);
    });
  }
  
  if (props.data.specific_full_dates) {
    props.data.specific_full_dates.forEach(date => {
      result.push(date);
    });
  }
  
  return [...new Set(result)];
});
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
