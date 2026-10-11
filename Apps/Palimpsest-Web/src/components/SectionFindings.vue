<template>
  <div v-if="hasFindings" class="section-findings">
    <div class="categories-grid">
      <div v-for="facetGroup in sortedFacets" :key="facetGroup.facetName" class="category-column">
        <p class="category-title">{{ facetGroup.label }}</p>
        <div class="entities-list">
          <template v-for="finding in facetGroup.linked" :key="`linked-${finding.id}`">
            <sl-details class="entity-details">
              <div slot="summary">{{ facetGroup.symbol }} {{ finding.name }}</div>
              <div class="occurrences-list">
                <template v-if="finding.occurrences.length > 0">
                  <div v-for="occurrence in finding.occurrences" :key="occurrence.id" class="occurrence-item">
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
              <div slot="summary">{{ facetGroup.symbol }} {{ finding.name }}</div>
              <div class="occurrences-list">
                <template v-if="finding.occurrences.length > 0">
                  <div v-for="occurrence in finding.occurrences" :key="occurrence.id" class="occurrence-item">
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
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FindingFacetMap } from '../types/library';
import { useFacetsStore } from '../stores/facets';

const props = defineProps<{
  facets: FindingFacetMap;
}>();

const facetsStore = useFacetsStore();

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
