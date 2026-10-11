<template>
  <div v-if="hasFindings" class="section-findings">
    <div class="categories-grid">
      <div v-for="facetGroup in sortedFacets" :key="facetGroup.facetName" class="category-column">
        <p class="category-title">{{ facetGroup.label }}</p>
        <div class="entities-list">
          <template v-for="finding in facetGroup.linked" :key="`linked-${finding.id}`">
            <div class="entity-item" :title="formatTooltip(finding)">
              {{ facetGroup.symbol }} {{ finding.name }}
            </div>
          </template>
          
          <hr v-if="facetGroup.linked.length > 0 && facetGroup.unlinked.length > 0" />

          <template v-for="finding in facetGroup.unlinked" :key="`unlinked-${finding.id}`">
            <div class="entity-item" :title="formatTooltip(finding)">
              {{ facetGroup.symbol }} {{ finding.name }}
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FindingFacetMap, FindingContext } from '../types/library';
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

const formatTooltip = (finding: FindingContext) => {
  return finding.occurrences
    .map(o => `${o.quote}\n(${o.description})`)
    .join('\n\n');
};
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
  gap: 0.4rem;
}

.entity-item {
  padding: 0.2rem 0;
}

hr {
  border: 0;
  border-top: 1px solid var(--sl-color-neutral-200);
  margin: 0.5rem 0;
}
</style>
