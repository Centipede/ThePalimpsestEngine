<template>
  <div class="section-outline">
    <div v-if="outline?.paragraph_segments?.length" class="segments-list">
      <div v-for="(seg, idx) in outline.paragraph_segments" :key="idx" class="segment-item">
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
  </div>
</template>

<script setup lang="ts">
import type { ParagraphSegments } from '../types/library';

defineProps<{
  outline: ParagraphSegments;
}>();
</script>

<style scoped>
.section-outline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  text-align: left;
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
