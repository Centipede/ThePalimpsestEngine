<template>
  <div class="section-admin-actions-portal">
    <h3 class="portal-section-title">Section Admin</h3>

    <sl-details summary="Gather Info">
      <div class="admin-actions-group">
        <div class="admin-actions-row">
          <sl-button variant="warning" size="small" :loading="isGathering" :disabled="nothingToGather" @click="gatherSectionInfo">
            <sl-icon slot="prefix" name="gear"></sl-icon>
            Gather info
          </sl-button>
          <sl-tooltip content="Reset to the work this section still owes" hoist>
            <sl-icon-button name="arrow-counterclockwise" label="Reset to suggested" @click="resetGatherOptions"></sl-icon-button>
          </sl-tooltip>
        </div>

        <sl-alert v-if="gatherError" class="portal-alert" variant="danger" open closable @sl-after-hide="gatherError = ''">
          {{ gatherError }}
        </sl-alert>

        <div v-for="group in LEVEL_GROUPS" :key="`gather-${group.key}`" class="portal-level" :data-level="group.key">
          <div class="portal-group-title">
            <sl-tooltip :content="group.hint" hoist>
              <span class="portal-group-title__label">{{ group.title }}</span>
            </sl-tooltip>
            <sl-tooltip :content="masterTooltip(group)" hoist>
              <sl-checkbox
                class="portal-group-all"
                size="small"
                :checked="masterState('gather', group.key) === 'all'"
                :indeterminate="masterState('gather', group.key) === 'some'"
                :disabled="relevantItems(group.key).length === 0"
                @sl-change="toggleMaster('gather', group.key)"
              >All</sl-checkbox>
            </sl-tooltip>
          </div>
          <div class="portal-checkbox-group">
            <sl-checkbox
              v-for="key in group.essentials"
              :key="key"
              size="small"
              :data-value="key"
              :checked="isTicked('gather', group.key, 'essentials', key)"
              @sl-change="toggleOption('gather', group.key, 'essentials', key, $event.target.checked)"
            >
              {{ essentialLabel(key) }}
            </sl-checkbox>

            <div v-if="group.essentials.length > 0 && bookFacetTypes.length > 0" class="portal-divider"></div>

            <sl-checkbox
              v-for="facetType in bookFacetTypes"
              :key="facetType"
              size="small"
              :data-value="facetType"
              :checked="isTicked('gather', group.key, 'facets', facetType)"
              @sl-change="toggleOption('gather', group.key, 'facets', facetType, $event.target.checked)"
            >
              {{ facetLabel(facetType) }}
            </sl-checkbox>
          </div>
        </div>
      </div>
    </sl-details>

    <sl-details summary="Remove Records">
      <div class="admin-actions-group">
        <sl-button variant="danger" size="small" :loading="isRemoving" :disabled="nothingToRemove" @click="requestRemove">
          <sl-icon slot="prefix" name="trash"></sl-icon>
          Remove
        </sl-button>

        <sl-alert v-if="removeError" class="portal-alert" variant="danger" open closable @sl-after-hide="removeError = ''">
          {{ removeError }}
        </sl-alert>

        <sl-alert
          v-if="removalOutcome"
          class="portal-alert"
          :variant="removalOutcome.variant"
          open
          closable
          @sl-after-hide="removalOutcome = null"
        >
          {{ removalOutcome.text }}
        </sl-alert>

        <div v-for="group in LEVEL_GROUPS" :key="`delete-${group.key}`" class="portal-level" :data-level="group.key">
          <div class="portal-group-title">
            <sl-tooltip :content="group.hint" hoist>
              <span class="portal-group-title__label">{{ group.title }}</span>
            </sl-tooltip>
            <sl-tooltip :content="masterTooltip(group)" hoist>
              <sl-checkbox
                class="portal-group-all"
                size="small"
                :checked="masterState('delete', group.key) === 'all'"
                :indeterminate="masterState('delete', group.key) === 'some'"
                :disabled="relevantItems(group.key).length === 0"
                @sl-change="toggleMaster('delete', group.key)"
              >All</sl-checkbox>
            </sl-tooltip>
          </div>
          <div class="portal-checkbox-group">
            <sl-checkbox
              v-for="key in group.essentials"
              :key="key"
              size="small"
              :data-value="key"
              :checked="isTicked('delete', group.key, 'essentials', key)"
              @sl-change="toggleOption('delete', group.key, 'essentials', key, $event.target.checked)"
            >
              {{ essentialLabel(key) }}
            </sl-checkbox>

            <div v-if="group.essentials.length > 0 && bookFacetTypes.length > 0" class="portal-divider"></div>

            <sl-checkbox
              v-for="facetType in bookFacetTypes"
              :key="facetType"
              size="small"
              :data-value="facetType"
              :checked="isTicked('delete', group.key, 'facets', facetType)"
              @sl-change="toggleOption('delete', group.key, 'facets', facetType, $event.target.checked)"
            >
              {{ facetLabel(facetType) }}
            </sl-checkbox>

            <template v-if="group.key === 'contexts'">
              <div class="portal-divider"></div>
              <sl-checkbox
                class="portal-checkbox-grave"
                size="small"
                :checked="deleteOptions.contexts.include_identified"
                @sl-change="deleteOptions.contexts.include_identified = $event.target.checked"
              >
                Include identified groupings
              </sl-checkbox>
              <p class="portal-group-note">
                A grouping tied to a found identity is kept by default, along with its identity
                candidates. Ticking this throws that work away too.
              </p>
              <p class="portal-group-note">
                Removing a grouping leaves its mentions in place and loose. Gather Contexts
                afterwards to group them again; in between, this facet having no groupings is
                expected and not a fault.
              </p>
            </template>
          </div>
        </div>
      </div>
    </sl-details>

    <ConfirmDialog
      v-model:open="showRemoveConfirm"
      label="Remove identified groupings"
      confirm-label="Remove"
      variant="danger"
      :busy="isRemoving"
      :error="removeError"
      @confirm="performRemove"
    >
      <p>
        {{ confirmFacetNames.length === 1
          ? `Every grouping of ${confirmFacetNames[0]} in this section and its subsections will be removed`
          : `Every grouping of ${joinNames(confirmFacetNames)} in this section and its subsections will be removed` }},
        the ones a human has tied to a found identity included — and each of those takes its
        identity candidates with it. The mentions themselves stay behind.
      </p>
      <p v-if="identifiedHereCount > 0" class="confirm-count">
        {{ identifiedHereCount === 1
          ? 'This section alone holds 1 identified grouping'
          : `This section alone holds ${identifiedHereCount} identified groupings` }};
        the subsections are included too and are not counted here.
      </p>
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { BookStructure, SectionContentResponse } from '../../../types/library';
import { useFacetsStore } from '../../../stores/facets.ts';
import { useFacetExpectations } from '../../../composables/useFacetExpectations.ts';
import ConfirmDialog from '../../worktools/ConfirmDialog.vue';
import {
  removeSectionRecords,
  startSectionGatherInfo,
  type DeleteOptions,
} from '../../../api/maintenance';
import { describeRemoval, type RemovalOutcome } from '../../../utils/maintenanceOutcome';
import {
  cloneGatherOptions,
  emptyGatherOptions,
  isGatherOptionsEmpty,
  relevantOptions,
  suggestGatherOptions,
  type GatherOptions,
} from '../../../utils/gatherSuggestion';

/**
 * The right-hand admin pane for a section: the two maintenance jobs that write to it.
 *
 * Both effects reach past this pane - a started job belongs in the info pane's task tree,
 * and removed records change the payload the view is rendering - so they leave as events
 * rather than being wired to the other pane directly.
 *
 * The two halves ask for the same three levels and differ only in what they do with
 * them, so the checkbox columns are rendered from one description of the levels rather
 * than written out six times.
 */

const props = defineProps<{
  machineName: string;
  sectionPath: string;
  bookStructure?: BookStructure;
  sectionData: SectionContentResponse | null;
}>();

const emit = defineEmits<{
  'job-started': [];
  'records-removed': [];
}>();

const facetsStore = useFacetsStore();

const isGathering = ref(false);
const isRemoving = ref(false);
const gatherError = ref('');
const removeError = ref('');
const removalOutcome = ref<RemovalOutcome | null>(null);
const showRemoveConfirm = ref(false);

type Side = 'gather' | 'delete';
type Level = 'section' | 'contexts' | 'content';
type Category = 'essentials' | 'facets';

interface LevelGroup {
  key: Level;
  title: string;
  hint: string;
  /** Empty for the mid level, which has nothing of the digest/outline kind. */
  essentials: string[];
}

// Content keeps both essentials even though BlockEssentials.outline is still marked for
// future use: the box has always been there, and the server decides what it can do.
const LEVEL_GROUPS: LevelGroup[] = [
  {
    key: 'section',
    title: 'Section',
    hint: 'What the section itself owns: its digest, its outline and its section-level findings.',
    essentials: ['digest', 'outline'],
  },
  {
    key: 'contexts',
    title: 'Contexts',
    hint: 'The groupings of this section’s block findings. Removing a grouping leaves its mentions in place.',
    essentials: [],
  },
  {
    key: 'content',
    title: 'Content',
    hint: 'The block-level findings themselves. Removing a facet here takes its groupings with it as well.',
    essentials: ['digest', 'outline'],
  },
];

const ESSENTIAL_LABELS: Record<string, string> = { digest: 'Digest', outline: 'Outline' };

function essentialLabel(key: string): string {
  return ESSENTIAL_LABELS[key] ?? key;
}

function facetLabel(plural: string): string {
  return facetsStore.getFacetByPluralName(plural)?.name || plural;
}

function emptyDeleteOptions(): DeleteOptions {
  return {
    section: { essentials: [], facets: [] },
    contexts: { facets: [], include_identified: false },
    content: { essentials: [], facets: [] },
  };
}

const deleteOptions = ref<DeleteOptions>(emptyDeleteOptions());
const gatherOptions = ref<GatherOptions>(emptyGatherOptions());

const { expectations } = useFacetExpectations(() => props.bookStructure?.book);

const bookFacetTypes = computed(() => {
  if (!props.bookStructure?.book.facet_applications_cascaded) return [];
  const types = props.bookStructure.book.facet_applications_cascaded
    .map(fa => facetsStore.getFacetById(fa.facet as number)?.machine_name_plural)
    .filter((t): t is string => !!t);
  return Array.from(new Set(types)).sort();
});

/**
 * The work this section still owes: the facet application scheme minus what the
 * manifests record as done. Checking that off by hand means re-deriving a scheme the
 * frontend already knows, so the panel opens on the gaps instead.
 */
const suggestedGatherOptions = computed<GatherOptions>(() => suggestGatherOptions({
  expectations: expectations.value,
  sectionCompleted: props.sectionData?.section.info?.processing_manifest?.completed,
  blockCompleteds: (props.sectionData?.contents ?? []).map(block => block.info?.processing_manifest?.completed),
}));

const nothingToGather = computed(() => isGatherOptionsEmpty(gatherOptions.value));
// DeleteOptions is a GatherOptions with include_identified alongside the context facets,
// and that flag on its own removes nothing, so the same emptiness test answers for both.
const nothingToRemove = computed(() => isGatherOptionsEmpty(deleteOptions.value));

function resetGatherOptions() {
  gatherOptions.value = cloneGatherOptions(suggestedGatherOptions.value);
}

// Keyed on the serialised suggestion, not the computed itself: the computed hands back a
// fresh object on every evaluation, which would discard the admin's own ticks on any
// unrelated re-render. Loading another section replaces the manifests and so re-seeds,
// which is what we want.
watch(() => JSON.stringify(suggestedGatherOptions.value), resetGatherOptions, { immediate: true });

/* ------------------------------------------------------------------ the checkboxes */

/**
 * The array behind one checkbox column. Undefined where a level does not carry that
 * category at all, which is the mid level and essentials.
 */
function listFor(side: Side, level: Level, category: Category): string[] | undefined {
  const options = side === 'gather' ? gatherOptions.value : deleteOptions.value;
  const group = options[level] as { essentials?: string[]; facets: string[] };
  return category === 'essentials' ? group.essentials : group.facets;
}

function isTicked(side: Side, level: Level, category: Category, value: string): boolean {
  return listFor(side, level, category)?.includes(value) ?? false;
}

function toggleOption(side: Side, level: Level, category: Category, value: string, checked: boolean) {
  const options = listFor(side, level, category);
  if (!options) return;
  const index = options.indexOf(value);
  if (checked) {
    if (index === -1) options.push(value);
  } else if (index > -1) {
    options.splice(index, 1);
  }
}

/** Everything the book's facet scheme applies at a level - what "All" means. */
const relevant = computed<GatherOptions>(() => relevantOptions(expectations.value));

function relevantItems(level: Level): { category: Category; value: string }[] {
  const group = relevant.value[level] as { essentials?: string[]; facets: string[] };
  return [
    ...(group.essentials ?? []).map(value => ({ category: 'essentials' as Category, value })),
    ...group.facets.map(value => ({ category: 'facets' as Category, value })),
  ];
}

function masterState(side: Side, level: Level): 'all' | 'some' | 'none' {
  const items = relevantItems(level);
  if (items.length === 0) return 'none';
  const ticked = items.filter(item => isTicked(side, level, item.category, item.value)).length;
  if (ticked === 0) return 'none';
  return ticked === items.length ? 'all' : 'some';
}

/**
 * Ticks everything the scheme applies here, or clears the level outright once it is all
 * ticked. Clearing takes the boxes outside the scheme with it: they are the ones a hand
 * put there, and leaving them behind would make "All" off look like nothing is selected
 * while a facet is still armed.
 */
function toggleMaster(side: Side, level: Level) {
  const clearing = masterState(side, level) === 'all';

  for (const category of ['essentials', 'facets'] as Category[]) {
    const options = listFor(side, level, category);
    if (!options) continue;
    if (clearing) options.splice(0);
  }
  if (clearing) return;

  for (const item of relevantItems(level)) {
    toggleOption(side, level, item.category, item.value, true);
  }
}

function masterTooltip(group: LevelGroup): string {
  return relevantItems(group.key).length === 0
    ? `No facet is applied to this book at the ${group.title.toLowerCase()} level`
    : `Everything this book applies at the ${group.title.toLowerCase()} level`;
}

/* ----------------------------------------------------------------------- the calls */

async function gatherSectionInfo() {
  isGathering.value = true;
  gatherError.value = '';
  try {
    await startSectionGatherInfo({
      machineName: props.machineName,
      sectionPath: props.sectionPath,
      options: gatherOptions.value,
    });

    emit('job-started');
    // Cleared, not re-seeded: the job has started but not finished, so the suggestion
    // still names everything it is working on and would invite a double submit. The next
    // fetchSection() seeds again from the updated manifests.
    gatherOptions.value = emptyGatherOptions();
  } catch (e) {
    gatherError.value = e instanceof Error ? e.message : 'Failed to start the gather info job.';
    console.error('Failed to start gather info job:', e);
  } finally {
    isGathering.value = false;
  }
}

/** The facets whose identified groupings the pending removal would take. */
const confirmFacetNames = computed(() => deleteOptions.value.contexts.facets.map(facetLabel));

/**
 * The identified groupings this section holds for those facets.
 *
 * A floor, not a total: the endpoint reaches every descendant, while the payload the
 * panel was given covers this section only. The dialog says so rather than printing a
 * number that reads as the whole cost.
 */
const identifiedHereCount = computed(() => {
  const contexts = props.sectionData?.section.findings?.contexts ?? {};
  return deleteOptions.value.contexts.facets.reduce(
    (total, plural) => total + (contexts[plural] ?? []).filter(c => c.of_identity !== null).length,
    0,
  );
});

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Removing a human's own work is the one case here that gets a confirmation. Everything
 * else this panel deletes, the pipeline can make again.
 */
const removalNeedsConfirming = computed(
  () => deleteOptions.value.contexts.include_identified && deleteOptions.value.contexts.facets.length > 0,
);

function requestRemove() {
  removeError.value = '';
  removalOutcome.value = null;
  if (removalNeedsConfirming.value) {
    showRemoveConfirm.value = true;
    return;
  }
  void performRemove();
}

async function performRemove() {
  isRemoving.value = true;
  removeError.value = '';
  try {
    const result = await removeSectionRecords({
      machineName: props.machineName,
      sectionPath: props.sectionPath,
      options: deleteOptions.value,
    });

    removalOutcome.value = describeRemoval(result);
    showRemoveConfirm.value = false;
    emit('records-removed');
    deleteOptions.value = emptyDeleteOptions();
  } catch (e) {
    // Stays on screen beside the button that caused it, which is inside the dialog when
    // the dialog is what started the call.
    removeError.value = e instanceof Error ? e.message : 'Failed to remove the records.';
    console.error('Failed to remove records:', e);
  } finally {
    isRemoving.value = false;
  }
}
</script>

<style scoped>
.section-admin-actions-portal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--sl-color-warning-200);
  border-radius: var(--sl-border-radius-medium);
  margin-bottom: 2rem;
}

.portal-section-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--sl-color-warning-700);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.admin-actions-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.admin-actions-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.portal-level {
  display: flex;
  flex-direction: column;
}

.portal-group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--sl-color-neutral-500);
  text-transform: uppercase;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
}

.portal-group-all::part(label) {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--sl-color-neutral-500);
}

.portal-divider {
  height: 1px;
  background-color: var(--sl-color-neutral-200);
  margin: 0.25rem 0;
}

.portal-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 0.5rem;
}

.portal-checkbox-group sl-checkbox::part(label) {
  font-size: 0.8rem;
}

.portal-checkbox-grave::part(label) {
  color: var(--sl-color-danger-700);
}

/*
 * The pane is about a fifth of the window wide, and an alert's icon and close button eat
 * into that before any text is laid out. Without this the lines come out two words long.
 */
.portal-alert::part(message) {
  padding: 0.5rem;
  font-size: 0.7rem;
  line-height: 1.4;
}

.portal-alert::part(close-button) {
  font-size: 0.7rem;
  padding: 0 0.25rem;
}

.portal-group-note {
  margin: 0;
  font-size: 0.7rem;
  line-height: 1.4;
  color: var(--sl-color-neutral-500);
}

.confirm-count {
  margin: 0;
  color: var(--sl-color-neutral-600);
}
</style>
