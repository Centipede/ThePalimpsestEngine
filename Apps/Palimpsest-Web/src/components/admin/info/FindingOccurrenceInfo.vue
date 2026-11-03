<template>
  <div class="finding-occurrence-info">
    <div class="info-header">
      <h3 class="title">{{ symbol }} {{ label }}</h3>
      <div class="header-badges">
        <sl-badge variant="neutral" pill>{{ bucket }}</sl-badge>
        <sl-badge v-if="renderMethod" variant="primary" pill>{{ renderMethod }}</sl-badge>
        <span v-else class="no-render-method">no render method</span>
      </div>
    </div>

    <div class="occurrence-body">
      <div v-if="occurrence.name" class="occurrence-name">{{ occurrence.name }}</div>

      <blockquote v-if="occurrence.quote" class="quote">{{ occurrence.quote }}</blockquote>

      <!-- Section-level findings carry their payload in extracted_data; the
           prose description is only the fallback for facets without a schema. -->
      <div v-if="occurrence.extracted_data" class="data-list">
        <div v-for="(value, key) in occurrence.extracted_data" :key="key" class="data-row">
          <div class="data-row__key">{{ key }}</div>
          <div class="data-row__val">
            <pre v-if="isComplex(value)">{{ JSON.stringify(value, null, 2) }}</pre>
            <template v-else>{{ formatScalar(value) }}</template>
          </div>
        </div>
      </div>

      <p v-else-if="occurrence.description" class="description">{{ occurrence.description }}</p>

      <div v-else class="no-info">
        No extracted data or description for this finding.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FindingOccurrence } from '../../../types/library';

defineProps<{
  occurrence: FindingOccurrence;
  label: string;
  symbol: string;
  bucket: string;
  renderMethod?: string | null;
}>();

function isComplex(value: unknown) {
  return value !== null && typeof value === 'object';
}

function formatScalar(value: unknown) {
  if (value === null || value === '') return '—';
  return String(value);
}
</script>

<style scoped>
.finding-occurrence-info {
  padding: 1rem;
  background-color: var(--sl-color-neutral-50);
  border-radius: var(--sl-border-radius-medium);
  border: 1px solid var(--sl-color-neutral-200);
}

.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--sl-color-neutral-200);
  padding-bottom: 0.5rem;
}

.title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.header-badges {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.no-render-method {
  font-size: 0.7rem;
  font-style: italic;
  color: var(--sl-color-neutral-400);
}

.occurrence-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.occurrence-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.quote {
  margin: 0;
  padding-left: 0.75rem;
  border-left: 2px solid var(--sl-color-neutral-200);
  font-style: italic;
  font-size: 0.85rem;
  color: var(--sl-color-neutral-700);
}

.data-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.data-row {
  padding: 0.35rem 0.5rem;
  background-color: white;
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-small);
}

.data-row__key {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--sl-color-neutral-500);
  margin-bottom: 0.15rem;
}

.data-row__val {
  font-size: 0.85rem;
  color: var(--sl-color-neutral-800);
  white-space: pre-wrap;
  word-break: break-word;
}

.data-row__val pre {
  margin: 0;
  font-family: var(--sl-font-mono);
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.description {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--sl-color-neutral-700);
}

.no-info {
  text-align: center;
  color: var(--sl-color-neutral-400);
  font-style: italic;
  padding: 1rem;
}
</style>
