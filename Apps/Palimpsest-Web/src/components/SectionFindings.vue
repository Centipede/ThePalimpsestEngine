<template>
  <!-- Outside the hasFindings guard below: with a block in focus this bar is the only
       way to create the very first finding in a section, which is exactly the case
       where there are none to show. -->
  <FindingsToolbar
    v-if="isStaff"
    class="findings-bar"
    :count="selected.length"
    :merge-check="mergeCheck"
    :remove-check="removeCheck"
    :selectable="hasFindings"
    :focused-block="focusedBlock"
    :facet-options="facetOptions"
    :clear-token="clearToken"
    @merge="showMerge = true"
    @remove="openRemoveConfirm"
    @clear="clearSelection"
    @add-occurrence="startAddOccurrence"
  />

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
    @changed="handleChanged"
  />

  <MergeDialog
    v-model:open="showMerge"
    :selection="selected"
    @merged="handleChanged"
  />

  <NewOccurrenceDialog
    v-model:open="showNewOccurrence"
    :machine-name="machineName"
    :section-path="sectionPath"
    :block="focusedBlock ?? null"
    :quote="newQuote"
    :facet="newFacet"
    :facet-label="newFacetLabel"
    :contexts="newFacetContexts"
    @created="handleCreated"
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
    <p v-if="emptyTargetNames.length > 0" class="remove-warning">
      {{ emptyTargetWarning }}
    </p>
  </ConfirmDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type {
  ContentBlock,
  FacetQuery,
  FindingContext,
  FindingContextMap,
  FindingOccurrence,
} from '../types/library';
import { useFacetsStore } from '../stores/facets';
import { useAuth } from '../composables/useAuth';
import {
  canMerge,
  canRemoveSelection,
  visibleSelection,
  type SelectedContext,
} from '../utils/findingEligibility';
import { FindingActionError, removeOccurrences } from '../api/findings';
import FindingContextToolset from './worktools/findings/FindingContextToolset.vue';
import ContextRow from './worktools/findings/ContextRow.vue';
import FindingsToolbar from './worktools/findings/FindingsToolbar.vue';
import MergeDialog from './worktools/findings/MergeDialog.vue';
import NewOccurrenceDialog from './worktools/findings/NewOccurrenceDialog.vue';
import ConfirmDialog from './worktools/ConfirmDialog.vue';

const props = defineProps<{
  facets: FindingContextMap;
  selectedOccurrence?: FindingOccurrence | null;
  activeFacetTypes?: Set<string>;
  openFindingIds: Record<number, boolean>;
  /** Needed by the create call, which is addressed to one block. */
  machineName: string;
  sectionPath: string;
  /** The single block the URL is focused on; without one, nothing can be added. */
  focusedBlock?: ContentBlock | null;
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

/* ------------------------------------------------------- the grid's own groups */
/* Declared before the selection: watch(visible) evaluates its source at setup, and
   `visible` reads sortedFacets - a const, so a later declaration is a TDZ crash. */

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

/* ------------------------------------------------------------ a new occurrence */

const showNewOccurrence = ref(false);
const newQuote = ref('');
const newFacet = ref('');

/** Bumped only once the mention exists, so a failed attempt keeps the typing. */
const clearToken = ref(0);

/**
 * Every facet the library defines, not only the ones this section already has findings
 * for: the point of adding by hand is the facet the gather missed entirely. Already
 * fetched - SectionDetailView awaits fetchFacetQueries inside fetchSection.
 */
const facetOptions = computed<FacetQuery[]>(() =>
  [...facetsStore.facetQueries].sort((a, b) => a.id - b.id));

const newFacetQuery = computed(() => facetsStore.getFacetBySingularName(newFacet.value));

const newFacetLabel = computed(() => newFacetQuery.value?.name || newFacet.value);

/**
 * The candidate homes for the new mention: findings of that facet in this section.
 *
 * Reached through the plural machine name, since the bucket keys are plural while an
 * occurrence's facet - the one the toolbar hands up - is singular.
 */
const newFacetContexts = computed<FindingContext[]>(() => {
  const plural = newFacetQuery.value?.machine_name_plural;
  if (!plural) return [];
  return [...(props.facets[plural] ?? [])].sort(byName);
});

function startAddOccurrence(payload: { quote: string; facet: string }) {
  newQuote.value = payload.quote;
  newFacet.value = payload.facet;
  showNewOccurrence.value = true;
}

function handleCreated() {
  clearToken.value += 1;
  handleChanged();
}

/* --------------------------------------------------------------------- remove */

/**
 * Frozen when the dialog opens. The confirmation names specific findings and counts
 * their mentions, so it must not re-aim at a different set if the grid changes
 * underneath while the librarian is reading it.
 */
const removeTargets = ref<FindingContext[]>([]);

const removeLabel = computed(() =>
  removeTargets.value.length === 1 ? 'Remove finding' : 'Remove findings');

/**
 * Removal works by detaching mentions, so a finding with none is out of reach of it -
 * there is nothing to send. Named up front rather than discovered afterwards, when the
 * grid would simply still show it.
 */
const emptyTargetNames = computed(() =>
  removeTargets.value.filter(c => c.occurrences.length === 0).map(c => c.name));

const emptyTargetWarning = computed(() => {
  const names = emptyTargetNames.value;
  if (names.length === 0) return '';
  return names.length === 1
    ? `${names[0]} holds no mentions, so it cannot be removed this way and will stay behind.`
    : `${names.join(', ')} hold no mentions, so they cannot be removed this way and will stay behind.`;
});

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
    // Nothing to detach means nothing would reach the server and the findings would all
    // survive. Say so rather than appear to do nothing.
    removeError.value = removeTargets.value.length === 1
      ? 'This finding holds no mentions, so there is nothing to detach. Remove it with the '
        + 'section admin tools instead.'
      : 'None of these findings hold any mentions, so there is nothing to detach. Remove '
        + 'them with the section admin tools instead.';
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

/** A structural change: only a refetch can rebuild the grid correctly. */
function handleChanged() {
  clearSelection();
  emit('refresh');
}

</script>

<style scoped>
.section-findings {
  margin-bottom: 2rem;
  text-align: left;
}

/* The bar sits outside .section-findings so it survives an empty section, and so it
   carries that block's left alignment itself. */
.findings-bar {
  text-align: left;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

/* A grid item's own min-width:auto would let a long finding name widen the track past
   its 1fr share; the ellipsis in ContextRow only works if the column can shrink. */
.category-column {
  min-width: 0;
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

.remove-warning {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.4;
  font-weight: 500;
  color: var(--sl-color-warning-700);
}

.remove-note {
  margin: 0;
  font-size: 0.8rem;
  font-style: italic;
  color: var(--sl-color-neutral-500);
}
</style>
