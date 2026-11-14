<template>
  <div v-if="hasFindings" class="section-findings">
    <SelectionBar
      v-if="isStaff"
      :count="selected.length"
      :merge-check="mergeCheck"
      :remove-check="removeCheck"
      @merge="showMerge = true"
      @remove="openRemoveConfirm"
      @clear="clearSelection"
    />

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
            :selected="selectedIds.has(finding.id)"
            :selected-occurrence="props.selectedOccurrence"
            @update:open="setOpen(finding.id, $event)"
            @toggle-select="setSelected"
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
            :selected="selectedIds.has(finding.id)"
            :selected-occurrence="props.selectedOccurrence"
            @update:open="setOpen(finding.id, $event)"
            @toggle-select="setSelected"
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
    :sibling-contexts="siblingContexts"
    @linked="handleLinked"
  />

  <MergeDialog
    v-model:open="showMerge"
    :selection="selected"
    @merged="handleChanged"
  />

  <ConfirmDialog
    v-model:open="showRemoveConfirm"
    :label="removeLabel"
    confirm-label="Remove"
    variant="danger"
    :busy="removing"
    :error="removeError"
    @confirm="confirmRemove"
  >
    <p>
      {{ removeTargets.length === 1 ? 'This finding will be removed' : `These ${removeTargets.length} findings will be removed` }}
      from this section:
    </p>
    <ul class="remove-list">
      <li v-for="target in removeTargets" :key="target.id">
        <strong>{{ target.name }}</strong>
        <span class="remove-count">
          {{ target.occurrences.length }} {{ target.occurrences.length === 1 ? 'mention' : 'mentions' }}
        </span>
      </li>
    </ul>
    <sl-checkbox
      size="small"
      :checked="removeFromBlocks"
      @sl-change="removeFromBlocks = ($event.target as HTMLInputElement).checked"
    >
      Also delete the mentions from the paragraphs they were found in
    </sl-checkbox>
    <p class="remove-note">
      {{ removeFromBlocks
        ? 'The mentions will be deleted outright. Gathering info for this section again is the only way back.'
        : 'The grouping is removed; the mentions stay in their paragraphs as unclustered findings.' }}
    </p>
  </ConfirmDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { FindingContext, FindingContextMap, FindingOccurrence } from '../types/library';
import { useFacetsStore } from '../stores/facets';
import { useAuth } from '../composables/useAuth';
import {
  canMerge,
  canRemoveSelection,
  visibleSelection,
  type SelectedContext,
} from '../utils/findingEligibility';
import { FindingActionError, removeOccurrences } from '../api/findings';
import FindingContextToolset from './FindingContextToolset.vue';
import ContextRow from './worktools/findings/ContextRow.vue';
import SelectionBar from './worktools/findings/SelectionBar.vue';
import MergeDialog from './worktools/findings/MergeDialog.vue';
import ConfirmDialog from './worktools/ConfirmDialog.vue';

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

const showToolset = ref(false);
const showMerge = ref(false);
const showRemoveConfirm = ref(false);
const removeFromBlocks = ref(false);
const removing = ref(false);
const removeError = ref('');

function setOpen(findingId: number, isOpen: boolean) {
  emit('update:openFindingIds', { ...props.openFindingIds, [findingId]: isOpen });
}

/* ------------------------------------------------------------------ selection */

/**
 * The selection lives here rather than in a composable or in SectionDetailView: it has
 * no consumer outside this panel (unlike openFindingIds, which drives the paragraph
 * highlighting), and a module-scoped singleton in the style of useAdminPanels would
 * wrongly share one selection between two sections open in two tabs.
 */
const selectedIds = ref<Set<number>>(new Set());

/** Flattened from sortedFacets, which activeFacetTypes has already filtered. */
const visible = computed<SelectedContext[]>(() =>
  sortedFacets.value.flatMap(group =>
    [...group.linked, ...group.unlinked].map(context => ({ context, facetKey: group.facetName }))));

const selected = computed<SelectedContext[]>(() =>
  visible.value.filter(entry => selectedIds.value.has(entry.context.id)));

/**
 * Pruning against what is on screen covers both ways a selection goes stale: a merge
 * absorbed the context, or the librarian switched its facet off in the Entities menu.
 * Keeping a hidden tick would let Merge act on findings nobody can see and make the
 * "N selected" count a lie.
 */
watch(visible, entries => {
  const pruned = visibleSelection(selectedIds.value, entries);
  if (pruned.size !== selectedIds.value.size) selectedIds.value = pruned;
});

function setSelected(contextId: number, checked: boolean) {
  const next = new Set(selectedIds.value);
  if (checked) next.add(contextId); else next.delete(contextId);
  selectedIds.value = next;
}

function clearSelection() {
  selectedIds.value = new Set();
}

const facetLabel = (facetKey: string) =>
  facetsStore.getFacetByPluralName(facetKey)?.name || capitalize(facetKey);

const mergeCheck = computed(() => canMerge(selected.value, facetLabel));
const removeCheck = computed(() => canRemoveSelection(selected.value));

/* --------------------------------------------------------------------- remove */

/**
 * Frozen when the dialog opens. The confirmation names specific findings and counts
 * their mentions, so it must not re-aim at a different set if the grid changes
 * underneath while the librarian is reading it.
 */
const removeTargets = ref<FindingContext[]>([]);

const removeLabel = computed(() =>
  removeTargets.value.length === 1 ? 'Remove finding' : 'Remove findings');

function openRemoveConfirm() {
  removeTargets.value = selected.value.map(entry => entry.context);
  removeFromBlocks.value = false;
  removeError.value = '';
  showRemoveConfirm.value = true;
}

/**
 * There is no delete route for a context. Detaching every occurrence it holds is the
 * documented way: the server deletes a context left empty.
 */
async function confirmRemove() {
  if (removing.value) return;

  const occurrenceIds = removeTargets.value.flatMap(c => c.occurrences.map(o => o.id));
  if (occurrenceIds.length === 0) {
    // A context with no mentions has no occurrence to detach, so nothing would reach
    // the server and it would survive. Say so rather than appear to do nothing.
    removeError.value = 'This finding holds no mentions, so there is nothing to detach. '
      + 'It has to be removed in the admin tools.';
    return;
  }

  removing.value = true;
  removeError.value = '';
  try {
    await removeOccurrences({ occurrenceIds, deleteFromBlock: removeFromBlocks.value });
    showRemoveConfirm.value = false;
    handleChanged();
  } catch (e) {
    removeError.value = e instanceof FindingActionError ? e.message : 'The removal failed.';
  } finally {
    removing.value = false;
  }
}

/* -------------------------------------------------------------------- toolset */

/**
 * Held as an id, not as the object: a refresh replaces every FindingContext in the
 * payload, and a dialog pointed at the old object would be editing a ghost.
 */
const selectedContextId = ref<number | null>(null);
const selectedFacetKey = ref<string | null>(null);

const selectedFindingContext = computed<FindingContext | null>(() =>
  Object.values(props.facets).flat().find(c => c.id === selectedContextId.value) ?? null);

const selectedFacetName = computed<string | null>(() => {
  if (!selectedFacetKey.value) return null;
  return facetsStore.getFacetByPluralName(selectedFacetKey.value)?.machine_name_singular
    || selectedFacetKey.value;
});

/**
 * The move targets the toolset may offer. Drawn from the same facet bucket, which
 * satisfies the server's same-facet and same-section requirements by construction.
 */
const siblingContexts = computed<FindingContext[]>(() =>
  (props.facets[selectedFacetKey.value ?? ''] ?? [])
    .filter(c => c.id !== selectedContextId.value)
    .sort(byName));

function openToolset(finding: FindingContext, facetNamePlural: string) {
  selectedContextId.value = finding.id;
  selectedFacetKey.value = facetNamePlural;
  showToolset.value = true;
}

function handleLinked() {
  emit('refresh');
}

/** A structural change: only a refetch can rebuild the grid correctly. */
function handleChanged() {
  clearSelection();
  emit('refresh');
}

/* ----------------------------------------------------------------- the groups */

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

.remove-list {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.remove-count {
  margin-left: 0.4rem;
  font-size: 0.75rem;
  color: var(--sl-color-neutral-500);
}

.remove-note {
  margin: 0;
  font-size: 0.8rem;
  font-style: italic;
  color: var(--sl-color-neutral-500);
}
</style>
