<template>
  <div class="section-summary">
    <div v-if="summary.theme" class="summary-content">
      <h2 class="summary-theme">{{ summary.theme }}</h2>
      <p v-if="summary.brief_summary" class="summary-brief">{{ summary.brief_summary }}</p>
      <div class="summary-metadata">
        <div v-if="summary.key_people?.length"><strong>Key People:</strong> {{ summary.key_people.join(', ') }}</div>
        <div v-if="summary.key_events?.length"><strong>Key Events:</strong> {{ summary.key_events.join(', ') }}</div>
        <div v-if="summary.key_institutions?.length"><strong>Key Institutions:</strong> {{ summary.key_institutions.join(', ') }}</div>
        <div v-if="summary.central_time_period?.full_description"><strong>Time Period:</strong> {{ summary.central_time_period.full_description }}</div>
        <div v-if="summary.central_geographical_area?.full_description"><strong>Geographical Area:</strong> {{ summary.central_geographical_area.full_description }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SectionSummary } from '../types/library';

defineProps<{
  summary: SectionSummary;
}>();
</script>

<style scoped>
.section-summary {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  text-align: left;
}

.summary-theme {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--sl-color-lime-700);
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-brief {
  margin: 0;
  line-height: 1.6;
}

.summary-metadata {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.9rem;
}
</style>
