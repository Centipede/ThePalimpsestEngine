<template>
  <div class="section-summary">
    <sl-details v-if="summary.theme">
      <div slot="summary" class="summary-header">{{ summary.theme }}</div>
      <div class="summary-content">
        <p v-if="summary.brief_summary" class="summary-brief">{{ summary.brief_summary }}</p>
        <div class="summary-metadata">
          <div v-if="summary.key_people?.length"><strong>Key People:</strong> {{ summary.key_people.join(', ') }}</div>
          <div v-if="summary.key_events?.length"><strong>Key Events:</strong> {{ summary.key_events.join(', ') }}</div>
          <div v-if="summary.key_institutions?.length"><strong>Key Institutions:</strong> {{ summary.key_institutions.join(', ') }}</div>
          <div v-if="summary.central_time_period?.full_description"><strong>Time Period:</strong> {{ summary.central_time_period.full_description }}</div>
          <div v-if="summary.central_geographical_area?.full_description"><strong>Geographical Area:</strong> {{ summary.central_geographical_area.full_description }}</div>
        </div>
      </div>
    </sl-details>

    <sl-details v-if="summary.paragraph_segments?.length">
      <div slot="summary" class="summary-header">Segments: {{ summary.paragraph_segments.length }}</div>
      <div class="segments-list">
        <div v-for="(seg, idx) in summary.paragraph_segments" :key="idx" class="segment-item">
          <div class="segment-header">
            <sl-badge variant="success" pill>{{ seg.ranges.join(', ') }}</sl-badge>
            <span class="segment-caption">{{ seg.caption }}</span>
          </div>
          <p v-if="seg.description" class="segment-description">{{ seg.description }}</p>
          <div v-if="seg.keywords?.length" class="segment-keywords">
            <strong>Keywords:</strong> {{ seg.keywords.join(', ') }}
          </div>
        </div>
      </div>
    </sl-details>
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

sl-details::part(base) {
  border: 1px solid var(--sl-color-neutral-200);;
  border-radius: 8px;
  background: var(--sl-color-neutral-50);
  overflow: hidden;
}

sl-details::part(header) {
  padding: 0.75rem 1rem;
}

sl-details::part(content) {
  padding: 1rem;
  border-top: 1px solid var(--sl-color-neutral-200);;
  background: var(--sl-color-neutral-50);
}

.summary-header {
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

.segments-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.segment-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.segment-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.segment-caption {
  font-weight: 200;
  color: var(--sl-color-lime-800);
}

.segment-description {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.segment-keywords {
  font-size: 0.85rem;
  color: var(--sl-color-primary-600);
  opacity: 0.8;
}
</style>
