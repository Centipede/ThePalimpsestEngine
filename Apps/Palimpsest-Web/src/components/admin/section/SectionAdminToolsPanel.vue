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

        <div class="portal-group-title">Section</div>
        <div class="portal-checkbox-group">
          <sl-checkbox size="small" :checked="gatherOptions.section.essentials.includes('digest')" @sl-change="toggleGatherOption('section', 'essentials', 'digest', $event.target.checked)">Digest</sl-checkbox>
          <sl-checkbox size="small" :checked="gatherOptions.section.essentials.includes('outline')" @sl-change="toggleGatherOption('section', 'essentials', 'outline', $event.target.checked)">Outline</sl-checkbox>

          <div v-if="bookFacetTypes.length > 0" class="portal-divider"></div>

          <sl-checkbox
            v-for="facetType in bookFacetTypes"
            :key="facetType"
            size="small"
            :checked="gatherOptions.section.facets.includes(facetType)"
            @sl-change="toggleGatherOption('section', 'facets', facetType, $event.target.checked)"
          >
            {{ facetsStore.getFacetByPluralName(facetType)?.name || facetType }}
          </sl-checkbox>
        </div>

        <div class="portal-group-title">Content</div>
        <div class="portal-checkbox-group">
          <sl-checkbox size="small" :checked="gatherOptions.content.essentials.includes('digest')" @sl-change="toggleGatherOption('content', 'essentials', 'digest', $event.target.checked)">Digest</sl-checkbox>
          <sl-checkbox size="small" :checked="gatherOptions.content.essentials.includes('outline')" @sl-change="toggleGatherOption('content', 'essentials', 'outline', $event.target.checked)">Outline</sl-checkbox>

          <div v-if="bookFacetTypes.length > 0" class="portal-divider"></div>

          <sl-checkbox
            v-for="facetType in bookFacetTypes"
            :key="facetType"
            size="small"
            :checked="gatherOptions.content.facets.includes(facetType)"
            @sl-change="toggleGatherOption('content', 'facets', facetType, $event.target.checked)"
          >
            {{ facetsStore.getFacetByPluralName(facetType)?.name || facetType }}
          </sl-checkbox>
        </div>
      </div>
    </sl-details>

    <sl-details summary="Remove Records">
      <div class="admin-actions-group">
        <sl-button variant="danger" size="small" :loading="isRemoving" @click="removeRecords">
          <sl-icon slot="prefix" name="trash"></sl-icon>
          Remove
        </sl-button>

        <div class="portal-group-title">Section</div>
        <div class="portal-checkbox-group">
          <sl-checkbox size="small" :checked="deleteOptions.section.essentials.includes('digest')" @sl-change="toggleDeleteOption('section', 'essentials', 'digest', $event.target.checked)">Digest</sl-checkbox>
          <sl-checkbox size="small" :checked="deleteOptions.section.essentials.includes('outline')" @sl-change="toggleDeleteOption('section', 'essentials', 'outline', $event.target.checked)">Outline</sl-checkbox>

          <div v-if="bookFacetTypes.length > 0" class="portal-divider"></div>

          <sl-checkbox
            v-for="facetType in bookFacetTypes"
            :key="facetType"
            size="small"
            :checked="deleteOptions.section.facets.includes(facetType)"
            @sl-change="toggleDeleteOption('section', 'facets', facetType, $event.target.checked)"
          >
            {{ facetsStore.getFacetByPluralName(facetType)?.name || facetType }}
          </sl-checkbox>
        </div>

        <div class="portal-group-title">Content</div>
        <div class="portal-checkbox-group">
          <sl-checkbox size="small" :checked="deleteOptions.content.essentials.includes('digest')" @sl-change="toggleDeleteOption('content', 'essentials', 'digest', $event.target.checked)">Digest</sl-checkbox>
          <sl-checkbox size="small" :checked="deleteOptions.content.essentials.includes('outline')" @sl-change="toggleDeleteOption('content', 'essentials', 'outline', $event.target.checked)">Outline</sl-checkbox>

          <div v-if="bookFacetTypes.length > 0" class="portal-divider"></div>

          <sl-checkbox
            v-for="facetType in bookFacetTypes"
            :key="facetType"
            size="small"
            :checked="deleteOptions.content.facets.includes(facetType)"
            @sl-change="toggleDeleteOption('content', 'facets', facetType, $event.target.checked)"
          >
            {{ facetsStore.getFacetByPluralName(facetType)?.name || facetType }}
          </sl-checkbox>
        </div>
      </div>
    </sl-details>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { apiFetch } from '../../../api';
import type { BookStructure, SectionContentResponse } from '../../../types/library';
import { useFacetsStore } from '../../../stores/facets.ts';
import { useFacetExpectations } from '../../../composables/useFacetExpectations.ts';
import {
  cloneGatherOptions,
  emptyGatherOptions,
  isGatherOptionsEmpty,
  suggestGatherOptions,
  type GatherOptions,
} from '../../../utils/gatherSuggestion';

/**
 * The right-hand admin pane for a section: the two maintenance jobs that write to it.
 *
 * Both effects reach past this pane - a started job belongs in the info pane's task tree,
 * and removed records change the payload the view is rendering - so they leave as events
 * rather than being wired to the other pane directly.
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

interface GranularDeleteOptions {
  essentials: string[];
  facets: string[];
}

interface DeleteOptions {
  section: GranularDeleteOptions;
  content: GranularDeleteOptions;
}

const deleteOptions = ref<DeleteOptions>({
  section: { essentials: [], facets: [] },
  content: { essentials: [], facets: [] },
});

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

function resetGatherOptions() {
  gatherOptions.value = cloneGatherOptions(suggestedGatherOptions.value);
}

// Keyed on the serialised suggestion, not the computed itself: the computed hands back a
// fresh object on every evaluation, which would discard the admin's own ticks on any
// unrelated re-render. Loading another section replaces the manifests and so re-seeds,
// which is what we want.
watch(() => JSON.stringify(suggestedGatherOptions.value), resetGatherOptions, { immediate: true });

function toggleDeleteOption(type: 'section' | 'content', category: 'essentials' | 'facets', value: string, checked: boolean) {
  const options = deleteOptions.value[type][category];
  if (checked) {
    if (!options.includes(value)) {
      options.push(value);
    }
  } else {
    const index = options.indexOf(value);
    if (index > -1) {
      options.splice(index, 1);
    }
  }
}

function toggleGatherOption(type: 'section' | 'content', category: 'essentials' | 'facets', value: string, checked: boolean) {
  const options = gatherOptions.value[type][category];
  if (checked) {
    if (!options.includes(value)) {
      options.push(value);
    }
  } else {
    const index = options.indexOf(value);
    if (index > -1) {
      options.splice(index, 1);
    }
  }
}

async function gatherSectionInfo() {
  isGathering.value = true;
  try {
    const res = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/section/${props.sectionPath}/maintenance/job/start_gather_info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gatherOptions.value)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    emit('job-started');
    // Cleared, not re-seeded: the job has started but not finished, so the suggestion
    // still names everything it is working on and would invite a double submit. The next
    // fetchSection() seeds again from the updated manifests.
    gatherOptions.value = emptyGatherOptions();
  } catch (e) {
    console.error('Failed to start gather info job:', e);
  } finally {
    isGathering.value = false;
  }
}

async function removeRecords() {
  isRemoving.value = true;
  try {
    const res = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/section/${props.sectionPath}/maintenance/remove_records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deleteOptions.value)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    emit('records-removed');
    deleteOptions.value = {
      section: { essentials: [], facets: [] },
      content: { essentials: [], facets: [] },
    };
  } catch (e) {
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

.portal-group-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--sl-color-neutral-500);
  text-transform: uppercase;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
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
</style>
