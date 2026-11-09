<template>
  <div class="outline-info">
    <div class="info-header">
      <h3 class="title">Section Outline</h3>
    </div>

    <div v-if="outline.segments && outline.segments.paragraph_segments.length > 0" class="segments-list">
      <div v-for="(segment, index) in outline.segments.paragraph_segments" :key="index" class="segment-item">
        <div class="segment-header">
          <span class="segment-ranges">
            <sl-badge variant="neutral" size="small" v-for="range in segment.ranges" :key="range">{{ range }}</sl-badge>
          </span>
          <span class="segment-caption">{{ segment.caption }}</span>
        </div>
        <p class="segment-description">{{ segment.description }}</p>
        <div v-if="segment.keywords && segment.keywords.length > 0" class="segment-keywords">
          <sl-tag v-for="keyword in segment.keywords" :key="keyword" size="small" pill>{{ keyword }}</sl-tag>
        </div>
      </div>
    </div>

    <div v-else class="no-info">
      No outline segments available for this section.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EssentialOutline } from '../../../types/library';

defineProps<{
  outline: EssentialOutline;
}>();
</script>

<style scoped>
.outline-info {
  padding: 1rem;
  background-color: var(--sl-color-neutral-50);
  border-radius: var(--sl-border-radius-medium);
  border: 1px solid var(--sl-color-neutral-200);
}

.info-header {
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--sl-color-neutral-200);
  padding-bottom: 0.5rem;
}

.title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.segments-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.segment-item {
  padding: 0.75rem;
  background-color: var(--color-surface);
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-small);
}

.segment-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.segment-ranges {
  display: flex;
  gap: 0.25rem;
}

.segment-caption {
  font-weight: 600;
  font-size: 0.9rem;
}

.segment-description {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  color: var(--sl-color-neutral-700);
}

.segment-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.no-info {
  text-align: center;
  color: var(--sl-color-neutral-400);
  font-style: italic;
  padding: 1rem;
}
</style>
