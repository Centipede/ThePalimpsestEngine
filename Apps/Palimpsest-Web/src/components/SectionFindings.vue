<template>
  <div v-if="hasFindings" class="section-findings">
    <div class="categories-grid">
      <div v-for="facetGroup in sortedFacets" :key="facetGroup.facetName" class="category-column">
        <p class="category-title">{{ facetGroup.label }}</p>
        <div class="entities-list">
          <ContextRow
            v-for="finding in facetGroup.linked"
            :key="`linked-${finding.id}`"
            :context="finding"
            :symbol="facetGroup.symbol"
            :is-staff="isStaff"
            :open="props.openFindingIds[finding.id] || false"
            :selected-occurrence="props.selectedOccurrence"
            @update:open="setOpen(finding.id, $event)"
            @open-toolset="openToolset(finding, facetGroup.facetName)"
            @jump-to-block="emit('jump-to-block', $event)"
          />

          <hr v-if="facetGroup.linked.length > 0 && facetGroup.unlinked.length > 0" />

          <ContextRow
            v-for="finding in facetGroup.unlinked"
            :key="`unlinked-${finding.id}`"
            :context="finding"
            :symbol="facetGroup.symbol"
            :is-staff="isStaff"
            :open="props.openFindingIds[finding.id] || false"
            :selected-occurrence="props.selectedOccurrence"
            @update:open="setOpen(finding.id, $event)"
            @open-toolset="openToolset(finding, facetGroup.facetName)"
            @jump-to-block="emit('jump-to-block', $event)"
          />
        </div>
      </div>
    </div>
  </div>

  <FindingContextToolset
    v-model:open="showToolset"
    :findingContext="selectedFindingContext"
    :facet-name="selectedFacetName"
    @linked="handleLinked"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FindingContext, FindingContextMap, FindingOccurrence } from '../types/library';
import { useFacetsStore } from '../stores/facets';
import { useAuth } from '../composables/useAuth';
import FindingContextToolset from './FindingContextToolset.vue';
import ContextRow from './worktools/findings/ContextRow.vue';

const props = defineProps<{
  facets: FindingContextMap;
  selectedOccurrence?: FindingOccurrence | null;
  activeFacetTypes?: Set<string>;
  openFindingIds: Record<number, boolean>;
}>();

const facetsStore = useFacetsStore();
const { isStaff } = useAuth();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'update:openFindingIds', val: Record<number, boolean>): void;
  (e: 'jump-to-block', occurrence: FindingOccurrence): void;
}>();

const selectedFindingContext = ref<FindingContext | null>(null);
const selectedFacetName = ref<string | null>(null);
const showToolset = ref(false);

function setOpen(findingId: number, isOpen: boolean) {
  emit('update:openFindingIds', { ...props.openFindingIds, [findingId]: isOpen });
}

function openToolset(finding: FindingContext, facetNamePlural: string) {
  selectedFindingContext.value = finding;
  const facet = facetsStore.getFacetByPluralName(facetNamePlural);
  selectedFacetName.value = facet?.machine_name_singular || facetNamePlural;
  showToolset.value = true;
}

function handleLinked() {
  emit('refresh');
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const byName = (a: FindingContext, b: FindingContext) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });

type SortedFacetGroup = {
  facetName: string;
  label: string;
  symbol: string;
  order: number;
  linked: FindingContext[];
  unlinked: FindingContext[];
};

const hasFindings = computed(() => {
  return Object.values(props.facets).some(findings => findings.length > 0);
});

const sortedFacets = computed<SortedFacetGroup[]>(() => {
  return Object.entries(props.facets)
    .filter(([facetName, findings]) => {
      if (findings.length === 0) return false;
      if (!props.activeFacetTypes) return true;
      return props.activeFacetTypes.has(facetName);
    })
    .map(([facetName, findings]) => {
      const facet = facetsStore.getFacetByPluralName(facetName);
      const linked = findings.filter(f => f.of_identity !== null).sort(byName);
      const unlinked = findings.filter(f => f.of_identity === null).sort(byName);

      return {
        facetName,
        label: capitalize(facetName),
        symbol: facet?.symbol || '❓',
        order: facet?.id ?? Infinity,
        linked,
        unlinked
      };
    })
    .sort((a, b) => a.order - b.order);
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

hr {
  border: 0;
  border-top: 1px solid var(--sl-color-neutral-200);
  margin: 0.5rem 0;
}
</style>
