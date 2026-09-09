<template>
  <div class="summary-info-record" :class="[depth !== undefined ? `summary-info-record--depth-${depth}` : '']">
    <div v-if="loading" class="summary-info-record__loading">
      <sl-spinner></sl-spinner>
      <span>Loading summary...</span>
    </div>
    <div v-else-if="error" class="summary-info-record__error">
      <sl-badge variant="danger">{{ error }}</sl-badge>
    </div>
    <div v-else-if="data" class="summary-info-record__content">
      <div v-if="data.summary" class="summary-info-record__markdown" v-html="renderedSummary"></div>
      <div v-else class="summary-info-record__grid">
        <div class="summary-info-record__main">
          <h4 class="summary-info-record__theme">{{ data.theme }}</h4>
          <p class="summary-info-record__brief">{{ data.brief_summary }}</p>
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
        <div class="summary-info-record__tags">
          <div v-if="data.tag_descriptors.people?.length" class="summary-info-record__tag-group">
            <span class="summary-info-record__tag-label">People:</span>
            <div class="summary-info-record__tag-list">
              <sl-badge v-for="p in data.tag_descriptors.people" :key="p.title" variant="primary" pill>{{ p.title }}</sl-badge>
            </div>
          </div>
          <div v-if="data.tag_descriptors.events?.length" class="summary-info-record__tag-group">
            <span class="summary-info-record__tag-label">Events:</span>
            <div class="summary-info-record__tag-list">
              <sl-badge v-for="e in data.tag_descriptors.events" :key="e.title" variant="success" pill>{{ e.title }}</sl-badge>
            </div>
          </div>
          <div v-if="data.tag_descriptors.institutions?.length" class="summary-info-record__tag-group">
            <span class="summary-info-record__tag-label">Institutions:</span>
            <div class="summary-info-record__tag-list">
              <sl-badge v-for="i in data.tag_descriptors.institutions" :key="i.title" variant="warning" pill>{{ i.title }}</sl-badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { marked } from 'marked';
import type { SectionSummaryNew } from '../types/library';
import { apiFetch } from '../api';
import SummaryTimeDescriptor from './SummaryTimeDescriptor.vue';
import SummaryPlaceDescriptor from './SummaryPlaceDescriptor.vue';

const props = defineProps<{
  machineName: string;
  sectionPath: string;
  depth?: number;
}>();

const data = ref<SectionSummaryNew | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function fetchData() {
  if (!props.machineName || !props.sectionPath) return;

  loading.value = true;
  error.value = null;
  try {
    const response = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/section/${props.sectionPath}/summary/`);
    if (response.ok) {
      data.value = await response.json();
    } else {
      error.value = `Error: ${response.statusText}`;
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);

watch(() => props.sectionPath, fetchData);

const renderedSummary = computed(() => {
  if (data.value?.summary) {
    return marked.parse(data.value.summary);
  }
  return '';
});
</script>

<style scoped>
.summary-info-record {
  padding: 1rem;
  background: var(--color-bg-muted, #f8f9fa);
  border-bottom: 1px solid var(--color-border, #dee2e6);
}

.summary-info-record__loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.summary-info-record__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.summary-info-record__theme {
  margin: 0 0 0.5rem 0;
  color: var(--sl-color-primary-700);
  font-size: 1rem;
  font-weight: 400;
}

.summary-info-record__brief {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text);
  line-height: 1.5;
}

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

.summary-info-record__tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.summary-info-record__markdown :deep(p) {
  margin-bottom: 1rem;
  line-height: 1.6;
}

.summary-info-record__markdown :deep(p:last-child) {
  margin-bottom: 0;
}

div.summary-info-record--depth-0 { padding-left: 8rem; }
div.summary-info-record--depth-1 { padding-left: 9.5rem; }
div.summary-info-record--depth-2 { padding-left: 11rem; }
div.summary-info-record--depth-3 { padding-left: 12.5rem; }
div.summary-info-record--depth-4 { padding-left: 14rem; }
div.summary-info-record--depth-5 { padding-left: 15.5rem; }

@media (max-width: 768px) {
  .summary-info-record__grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>
