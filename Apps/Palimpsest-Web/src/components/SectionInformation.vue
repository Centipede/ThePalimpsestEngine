<template>
  <div class="summary-info-record" :class="[depth !== undefined ? `summary-info-record--depth-${depth}` : '']">
    <div v-if="loading" class="summary-info-record__loading">
      <sl-spinner></sl-spinner>
      <span>Loading information...</span>
    </div>
    <div v-else-if="error" class="summary-info-record__error">
      <sl-badge variant="danger">{{ error }}</sl-badge>
    </div>
    <div v-else-if="data && hasInformation" class="summary-info-record__content">
      <div class="summary-info-record__grid">
        <div class="summary-info-record__main">
          <h4 v-if="data.essentials?.digest?.theme" class="summary-info-record__theme">{{ data.essentials.digest.theme }}</h4>
          <p v-if="data.essentials?.digest?.brief_summary" class="summary-info-record__brief">{{ data.essentials.digest.brief_summary }}</p>

          <br v-if="sectionOneDescriptors.length > 0">

          <component
            v-for="descriptor in sectionOneDescriptors"
            :key="descriptor.key"
            :is="descriptor.component"
            v-bind="descriptor.props"
          />
        </div>
        <div class="summary-info-record__tags">
          <div v-for="(occurrences, facetPlural) in data.findings?.section_few || {}" :key="facetPlural" class="summary-info-record__tag-group">
            <span class="summary-info-record__tag-label">{{ getFacetLabel(facetPlural) }}:</span>
            <div class="summary-info-record__tag-list">
              <template v-for="occ in occurrences" :key="occ.id">
                <button
                  v-if="hasNameRoleText(occ.extracted_data)"
                  type="button"
                  class="facet-badge-button"
                  :aria-expanded="activeOccurrence?.id === occ.id"
                  :aria-controls="activeOccurrence?.id === occ.id ? popupId : undefined"
                  @click="toggleOccurrence(occ, $event)"
                >
                  <sl-badge
                    pill
                    class="facet-badge"
                    :style="{ '--facet-color': getFacetColor(facetPlural) }"
                  >
                    {{ occ.name }}
                  </sl-badge>
                </button>
                <sl-badge
                  v-else
                  pill
                  class="facet-badge"
                  :style="{ '--facet-color': getFacetColor(facetPlural) }"
                >
                  {{ occ.name }}
                </sl-badge>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="data && !hasInformation" class="summary-info-record__empty">
      (no information)
    </div>

    <DescriptorPopup
      :anchor="anchorEl"
      :open="!!activeDescriptor"
      :card-id="popupId"
      :label="activeOccurrence?.name"
      @close="closePopup"
    >
      <component
        v-if="activeDescriptor"
        :is="activeDescriptor.component"
        v-bind="activeDescriptor.props"
      />
    </DescriptorPopup>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, useId, watch } from 'vue';
import type {
  SectionInformationResponse,
  SectionFindings,
  SectionEssentials,
  FindingOccurrence
} from '../types/library';
import { apiFetch } from '../api';
import { useFacetsStore } from '../stores/facets';
import DescriptorPopup from './descriptors/DescriptorPopup.vue';
import { resolveDescriptor, hasNameRoleText, type ResolvedDescriptor } from '../utils/descriptors';

const props = defineProps<{
  machineName: string;
  sectionPath: string;
  depth?: number;
  findings?: SectionFindings | null;
  essentials?: SectionEssentials | null;
}>();

const facetsStore = useFacetsStore();

const internalData = ref<SectionInformationResponse | null>(null);

const data = computed<SectionInformationResponse | null>(() => {
  if (props.findings !== undefined || props.essentials !== undefined) {
    return {
      findings: props.findings ?? { contexts: {}, section_one: {}, section_few: {}, section_many: {} },
      essentials: props.essentials ?? null
    };
  }
  return internalData.value;
});

const loading = ref(false);
const error = ref<string | null>(null);

async function fetchData() {
  if (!props.machineName || !props.sectionPath) return;

  // Ensure stores are populated
  const storesPromise = Promise.all([
    facetsStore.fetchFacetQueries(),
    facetsStore.fetchFacetApplications(),
  ]);

  if (props.findings !== undefined || props.essentials !== undefined) {
    await storesPromise;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    await storesPromise;
    const response = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/section/${props.sectionPath}/info/`);
    if (response.ok) {
      internalData.value = await response.json();
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

watch(() => props.sectionPath, () => {
  // Never leave a card hanging over a section it does not belong to.
  closePopup();
  fetchData();
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

const sectionOneDescriptors = computed<(ResolvedDescriptor & { key: string })[]>(() => {
  if (!data.value || !data.value.findings?.section_one) return [];

  return Object.entries(data.value.findings.section_one).flatMap(([facetPlural, occurrences]) => {
    const descriptor = resolveDescriptor(getRenderMethod(facetPlural), occurrences[0]?.extracted_data);
    return descriptor ? [{ key: facetPlural, ...descriptor }] : [];
  });
});

// --- section_few: click a pill to see its extracted data ---------------------

const activeOccurrence = ref<FindingOccurrence | null>(null);
const anchorEl = ref<HTMLElement | null>(null);
// Unique per information record — a table of contents mounts many of these.
const popupId = useId();

// section_few has no render method of its own yet, so we tacitly pretend the
// facet is configured for 'name_role_text'. Once a section_few render method is
// configurable, this is the single line to change.
const SECTION_FEW_RENDER_METHOD = 'name_role_text';

const activeDescriptor = computed<ResolvedDescriptor | null>(() =>
  activeOccurrence.value
    ? resolveDescriptor(SECTION_FEW_RENDER_METHOD, activeOccurrence.value.extracted_data)
    : null
);

function toggleOccurrence(occ: FindingOccurrence, event: MouseEvent) {
  if (activeOccurrence.value?.id === occ.id) {
    closePopup();
    return;
  }
  anchorEl.value = event.currentTarget as HTMLElement;
  activeOccurrence.value = occ;
}

function closePopup() {
  activeOccurrence.value = null;
  anchorEl.value = null;
}

const hasInformation = computed(() => {
  if (!data.value) return false;
  const hasDigest = !!(data.value.essentials?.digest && (data.value.essentials.digest.theme || data.value.essentials.digest.brief_summary || data.value.essentials.digest.prose_summary));
  const hasSectionOne = sectionOneDescriptors.value.length > 0;
  const hasSectionFew = !!data.value.findings?.section_few && Object.values(data.value.findings.section_few).some(occ => occ.length > 0);
  return hasDigest || hasSectionOne || hasSectionFew;
});

function getRenderMethod(facetPlural: string) {
  return facetsStore.getRenderMethodByPluralName(facetPlural);
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

.summary-info-record__empty {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-style: italic;
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

/* A pill that can be opened. Looks exactly like a plain pill; the button is
   only there for the pointer, keyboard activation and focus ring. */
.facet-badge-button {
  display: inline-flex;
  padding: 0;
  margin: 0;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  border-radius: 999px;
}

.facet-badge-button:focus-visible {
  outline: var(--sl-focus-ring);
  outline-offset: var(--sl-focus-ring-offset, 1px);
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
