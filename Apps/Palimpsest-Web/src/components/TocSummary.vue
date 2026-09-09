<template>
  <div class="toc-summary" :class="[`toc-summary--depth-${depth}`]">
    <div v-if="loading" class="toc-summary__loading">
      <sl-spinner></sl-spinner>
      <span>Loading summary...</span>
    </div>
    <div v-else-if="error" class="toc-summary__error">
      <sl-badge variant="danger">{{ error }}</sl-badge>
    </div>
    <div v-else-if="data" class="toc-summary__content">
      <div v-if="data.summary" class="toc-summary__markdown" v-html="renderedSummary"></div>
      <div v-else class="toc-summary__grid">
        <div class="toc-summary__main">
          <h4 class="toc-summary__theme">{{ data.theme }}</h4>
          <p class="toc-summary__brief">{{ data.brief_summary }}</p>
          <br>
          <SummaryTimeDescriptor
              v-if="data.prose_descriptors?.time"
              :data="data.prose_descriptors.time"
          />
          <SummaryPlaceDescriptor
              v-if="data.prose_descriptors?.place"
              :data="data.prose_descriptors.place"
          />
        </div>
        <div class="toc-summary__tags">
          <div v-if="data.tag_descriptors.people?.length" class="toc-summary__tag-group">
            <span class="toc-summary__tag-label">People:</span>
            <div class="toc-summary__tag-list">
              <sl-badge v-for="p in data.tag_descriptors.people" :key="p" variant="primary" pill>{{ p.title }}</sl-badge>
            </div>
          </div>
          <div v-if="data.tag_descriptors.events?.length" class="toc-summary__tag-group">
            <span class="toc-summary__tag-label">Events:</span>
            <div class="toc-summary__tag-list">
              <sl-badge v-for="e in data.tag_descriptors.events" :key="e" variant="success" pill>{{ e.title }}</sl-badge>
            </div>
          </div>
          <div v-if="data.tag_descriptors.institutions?.length" class="toc-summary__tag-group">
            <span class="toc-summary__tag-label">Institutions:</span>
            <div class="toc-summary__tag-list">
              <sl-badge v-for="i in data.tag_descriptors.institutions" :key="i" variant="warning" pill>{{ i.title }}</sl-badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import type { SectionSummaryNew } from '../types/library';
import SummaryTimeDescriptor from './SummaryTimeDescriptor.vue';
import SummaryPlaceDescriptor from './SummaryPlaceDescriptor.vue';

const props = defineProps<{
  data?: SectionSummaryNew;
  loading?: boolean;
  error?: string;
  depth: number;
}>();

const renderedSummary = computed(() => {
  if (props.data?.summary) {
    return marked.parse(props.data.summary);
  }
  return '';
});
</script>

<style scoped>
.toc-summary {
  padding: 1rem;
  background: var(--color-bg-muted, #f8f9fa);
  border-bottom: 1px solid var(--color-border, #dee2e6);
}

.toc-summary__loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.toc-summary__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.toc-summary__theme {
  margin: 0 0 0.5rem 0;
  color: var(--sl-color-primary-700);
  font-size: 1rem;
  font-weight: 400;
}

.toc-summary__brief {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text);
  line-height: 1.5;
}

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

.toc-summary__tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.toc-summary__markdown :deep(p) {
  margin-bottom: 1rem;
  line-height: 1.6;
}

.toc-summary__markdown :deep(p:last-child) {
  margin-bottom: 0;
}

div.toc-summary--depth-0 { padding-left: 2rem; }
div.toc-summary--depth-1 { padding-left: 3.5rem; }
div.toc-summary--depth-2 { padding-left: 5rem; }
div.toc-summary--depth-3 { padding-left: 6.5rem; }
div.toc-summary--depth-4 { padding-left: 8rem; }
div.toc-summary--depth-5 { padding-left: 9.5rem; }

@media (max-width: 768px) {
  .toc-summary__grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>
