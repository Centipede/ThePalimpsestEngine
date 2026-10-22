<template>
  <div v-if="hasFindings" class="section-findings">
    <div class="categories-grid">
      <div v-for="facetGroup in sortedFacets" :key="facetGroup.facetName" class="category-column">
        <p class="category-title">{{ facetGroup.label }}</p>
        <div class="entities-list">
          <template v-for="finding in facetGroup.linked" :key="`linked-${finding.id}`">
            <sl-details class="entity-details">
              <div slot="summary" class="summary-content">
                <span>{{ facetGroup.symbol }} {{ finding.name }}</span>
                <sl-icon-button
                  v-if="isStaff"
                  name="gear"
                  label="Manage Finding"
                  class="manage-button"
                  @click.stop="openToolset(finding, facetGroup.facetName)"
                ></sl-icon-button>
              </div>
              <div class="occurrences-list">
                <template v-if="finding.occurrences.length > 0">
                  <div v-for="occurrence in finding.occurrences" :key="occurrence.id" class="occurrence-item">
                    <div class="occurrence-name">{{ occurrence.name }}</div>
                    <blockquote class="occurrence-quote">{{ occurrence.quote }}</blockquote>
                    <div class="occurrence-description">{{ occurrence.description }}</div>
                  </div>
                </template>
                <div v-else class="no-occurrences">No occurrences found.</div>
              </div>
            </sl-details>
          </template>
          
          <hr v-if="facetGroup.linked.length > 0 && facetGroup.unlinked.length > 0" />

          <template v-for="finding in facetGroup.unlinked" :key="`unlinked-${finding.id}`">
            <sl-details class="entity-details">
              <div slot="summary" class="summary-content">
                <span>{{ facetGroup.symbol }} {{ finding.name }}</span>
                <sl-icon-button
                  v-if="isStaff"
                  name="gear"
                  label="Manage Finding"
                  class="manage-button"
                  @click.stop="openToolset(finding, facetGroup.facetName)"
                ></sl-icon-button>
              </div>
              <div class="occurrences-list">
                <template v-if="finding.occurrences.length > 0">
                  <div v-for="occurrence in finding.occurrences" :key="occurrence.id" class="occurrence-item">
                    <div class="occurrence-name">{{ occurrence.name }}</div>
                    <blockquote class="occurrence-quote">{{ occurrence.quote }}</blockquote>
                    <div class="occurrence-description">{{ occurrence.description }}</div>
                  </div>
                </template>
                <div v-else class="no-occurrences">No occurrences found.</div>
              </div>
            </sl-details>
          </template>
        </div>
      </div>
    </div>
  </div>

  <FindingToolset
    v-model:open="showToolset"
    :finding="selectedFinding"
    :facet-name="selectedFacetName"
    @linked="handleLinked"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FindingContext, FindingFacetMap } from '../types/library';
import { useFacetsStore } from '../stores/facets';
import { useAuth } from '../composables/useAuth';
import FindingToolset from './FindingToolset.vue';

const props = defineProps<{
  facets: FindingFacetMap;
}>();

const facetsStore = useFacetsStore();
const { isStaff } = useAuth();

const emit = defineEmits<{
  (e: 'refresh'): void;
}>();

const selectedFinding = ref<FindingContext | null>(null);
const selectedFacetName = ref<string | null>(null);
const showToolset = ref(false);

function openToolset(finding: FindingContext, facetNamePlural: string) {
  selectedFinding.value = finding;
  const facet = facetsStore.getFacetByPluralName(facetNamePlural);
  selectedFacetName.value = facet?.machine_name_singular || facetNamePlural;
  showToolset.value = true;
}

function handleLinked() {
  emit('refresh');
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const hasFindings = computed(() => {
  return Object.values(props.facets).some(findings => findings.length > 0);
});

const sortedFacets = computed(() => {
  return Object.entries(props.facets)
    .filter(([_, findings]) => findings.length > 0)
    .map(([facetName, findings]) => {
      const facet = facetsStore.getFacetByPluralName(facetName);
      const linked = findings.filter(f => f.of_identity !== null);
      const unlinked = findings.filter(f => f.of_identity === null);

      return {
        facetName,
        label: capitalize(facetName),
        symbol: facet?.symbol || '❓',
        facetId: facet?.id ?? Infinity,
        linked,
        unlinked
      };
    })
    .sort((a, b) => a.facetId - b.facetId);
});
</script>

<style scoped>
.section-findings {
  margin-bottom: 2rem;
  text-align: left;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.category-title {
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--sl-color-neutral-200);
  padding-bottom: 0.25rem;
}

.entities-list {
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.entity-details::part(base) {
  border: none;
  background: none;
}

.entity-details::part(header) {
  padding: 0.1rem 0;
  cursor: pointer;
}

.summary-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 0.5rem;
}

.manage-button {
  font-size: 1rem;
}

.manage-button::part(base) {
  padding: 0;
}

.entity-details::part(header):hover {
  background-color: var(--sl-color-neutral-100);
}

.entity-details::part(content) {
  padding: 0.4rem 0 0.6rem 1rem;
}

.occurrences-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border-left: 2px solid var(--sl-color-neutral-200);
  padding-left: 0.75rem;
}

.occurrence-name {
  font-weight: 600;
  color: var(--sl-color-neutral-800);
  margin-bottom: 0.1rem;
}

.occurrence-quote {
  margin: 0;
  font-style: italic;
  color: var(--sl-color-neutral-700);
  line-height: 1.4;
}

.occurrence-description {
  font-size: 0.75rem;
  color: var(--sl-color-neutral-500);
  margin-top: 0.2rem;
}

.no-occurrences {
  font-size: 0.75rem;
  color: var(--sl-color-neutral-400);
  font-style: italic;
}

hr {
  border: 0;
  border-top: 1px solid var(--sl-color-neutral-200);
  margin: 0.5rem 0;
}
</style>
