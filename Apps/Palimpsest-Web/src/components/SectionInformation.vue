<template>
  <div class="summary-info-record" :class="[depth !== undefined ? `summary-info-record--depth-${depth}` : '']">
    <div v-if="loading" class="summary-info-record__loading">
      <sl-spinner></sl-spinner>
      <span>Loading information...</span>
    </div>
    <div v-else-if="error" class="summary-info-record__error">
      <sl-badge variant="danger">{{ error }}</sl-badge>
    </div>
    <div v-else-if="data" class="summary-info-record__content">
      <div class="summary-info-record__grid">
        <div class="summary-info-record__main">
          <h4 v-if="data.digest.theme" class="summary-info-record__theme">{{ data.digest.theme }}</h4>
          <p v-if="data.digest.brief_summary" class="summary-info-record__brief">{{ data.digest.brief_summary }}</p>
          <div v-if="data.digest.prose_summary" class="summary-info-record__markdown" v-html="renderedProse"></div>
          
          <br v-if="sectionOneDescriptors.length > 0">

          <component
            v-for="descriptor in sectionOneDescriptors"
            :key="descriptor.key"
            :is="descriptor.component"
            v-bind="descriptor.props"
          />
        </div>
        <div class="summary-info-record__tags">
          <div v-for="(occurrences, facetPlural) in data.findings.section_few" :key="facetPlural" class="summary-info-record__tag-group">
            <span class="summary-info-record__tag-label">{{ getFacetLabel(facetPlural) }}:</span>
            <div class="summary-info-record__tag-list">
              <sl-badge
                v-for="occ in occurrences"
                :key="occ.id"
                pill
                class="facet-badge"
                :style="{ '--facet-color': getFacetColor(facetPlural) }"
              >
                {{ occ.name }}
              </sl-badge>
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
import type {
  SectionInformationResponse,
  CentralTimePeriod,
  CentralGeographicalArea
} from '../types/library';
import { apiFetch } from '../api';
import { useFacetsStore } from '../stores/facets';
import { useLibraryStore } from '../stores/library';
import TimeDescriptor from './descriptors/TimeDescriptor.vue';
import PlaceDescriptor from './descriptors/PlaceDescriptor.vue';

const props = defineProps<{
  machineName: string;
  sectionPath: string;
  depth?: number;
}>();

const facetsStore = useFacetsStore();
const libraryStore = useLibraryStore();

const data = ref<SectionInformationResponse | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function fetchData() {
  if (!props.machineName || !props.sectionPath) return;

  loading.value = true;
  error.value = null;

  // Ensure stores are populated
  await Promise.all([
    facetsStore.fetchFacetQueries(),
    facetsStore.fetchFacetApplications(),
    libraryStore.fetchBooks()
  ]);

  try {
    const response = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/section/${props.sectionPath}/info/`);
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

const renderedProse = computed(() => {
  if (data.value?.digest?.prose_summary) {
    return marked.parse(data.value.digest.prose_summary);
  }
  return '';
});

const facetColors: Record<string, string> = {
  people: 'var(--sl-color-indigo-600)',
  events: 'var(--sl-color-emerald-600)',
  institutions: 'var(--sl-color-amber-600)',
  places: 'var(--sl-color-teal-600)',
  times: 'var(--sl-color-purple-600)',
  works: 'var(--sl-color-rose-600)',
};

function getFacetColor(facetPlural: string) {
  const facet = facetsStore.getFacetByPluralName(facetPlural);
  const name = facet?.machine_name_plural || facetPlural;
  return facetColors[name] || 'var(--sl-color-neutral-600)';
}

type SectionOneDescriptor =
  | {
      key: string;
      component: any;
      props: {
        central_time_period: CentralTimePeriod;
      };
    }
  | {
      key: string;
      component: any;
      props: {
        central_geographical_area: CentralGeographicalArea;
      };
    };

const sectionOneDescriptors = computed<SectionOneDescriptor[]>(() => {
  if (!data.value) return [];

  return Object.entries(data.value.findings.section_one).flatMap(([facetPlural, occurrences]): SectionOneDescriptor[] => {
    const occurrence = occurrences[0];
    if (!occurrence?.extracted_data) return [];

    const method = getRenderMethod(facetPlural);
    console.log('method', facetPlural, method, ' extracted_data: ', occurrence.extracted_data);
    if (method === 'time_period') {
      return [{
        key: facetPlural,
        component: TimeDescriptor,
        props: {
          central_time_period: occurrence.extracted_data as CentralTimePeriod
        }
      }];
    }

    if (method === 'geographical_area') {
      return [{
        key: facetPlural,
        component: PlaceDescriptor,
        props: {
          central_geographical_area: occurrence.extracted_data as CentralGeographicalArea
        }
      }];
    }

    return [];
  });
});

const bookId = computed(() => {
  return libraryStore.books.find(b => b.machine_name === props.machineName)?.id;
});

function getFacetApplication(facetPlural: string) {
  const facet = facetsStore.getFacetByPluralName(facetPlural);
  if (!facet) return null;

  return facetsStore.facetApplications.find(a => a.facet === facet.id);
}

function getRenderMethod(facetPlural: string) {
  const app = getFacetApplication(facetPlural);
  return app?.render_method?.method;
}

function getFacetLabel(facetPlural: string) {
  const facet = facetsStore.getFacetByPluralName(facetPlural);
  return facet?.name || facetPlural;
}
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

.facet-badge::part(base) {
  background-color: var(--facet-color);
  border-color: var(--facet-color);
  color: #fff;
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
