<template>
  <div class="section-admin-info-portal">
    <div class="admin-jobs-header">
      <h3 class="portal-section-title">Active Jobs</h3>
      <sl-icon-button name="arrow-clockwise" label="Reload" @click="fetchActiveBackgroundTask"></sl-icon-button>
    </div>

    <div v-if="activeBackgroundTask" class="active-task">
      <div class="active-task__goal">{{ activeBackgroundTask.goal }}</div>
      <div v-if="activeBackgroundTask.title" class="active-task__title">{{ activeBackgroundTask.title }}</div>
      <div v-if="taskRoot" class="active-task__root">{{ taskRoot }}</div>

      <div class="job-list">
        <template v-for="row in jobRows" :key="row.job.id">
          <div
            class="job-row"
            :class="[
              `job-row--${row.state}`,
              {
                'job-row--current': row.job.in_section === props.sectionPath,
                'job-row--open': expandedJobId === row.job.id,
              },
            ]"
            :style="{ paddingLeft: `${row.depth * 0.6}rem` }"
            @click="toggleJob(row.job.id)"
          >
            <sl-tooltip :content="jobStateTooltip(row)" hoist>
              <span class="job-row__glyph">{{ jobGlyph(row.state) }}</span>
            </sl-tooltip>
            <span class="job-row__path" :title="row.job.in_section">{{ row.label }}</span>
            <sl-tooltip :content="row.job.gather_info_status.phase" hoist>
              <span class="job-row__phase">{{ phaseAbbrev(row.job.gather_info_status.phase) }}</span>
            </sl-tooltip>
            <span class="job-row__facets">
              <sl-tooltip
                v-for="facetName in row.job.gather_info_status.remaining_facets || []"
                :key="facetName"
                :content="facetLabel(facetName)"
                hoist
              >
                <sl-badge variant="neutral" pill size="small" class="job-row__facet">{{ facetSymbol(facetName) }}</sl-badge>
              </sl-tooltip>
            </span>
            <sl-tooltip
              v-if="row.job.gather_info_status.remaining_blocks?.length"
              content="Blocks left for the first remaining facet"
              hoist
            >
              <span class="job-row__blocks">{{ row.job.gather_info_status.remaining_blocks.length }}b</span>
            </sl-tooltip>
          </div>

          <transition name="expand">
            <div v-if="expandedJobId === row.job.id" class="job-detail">
              <div class="job-detail__rows">
                <div class="job-detail__row"><span class="job-detail__key">job</span><span class="job-detail__val">#{{ row.job.id }}</span></div>
                <div class="job-detail__row"><span class="job-detail__key">section</span><span class="job-detail__val">{{ row.job.in_section }}</span></div>
                <div class="job-detail__row"><span class="job-detail__key">started</span><span class="job-detail__val">{{ formatStamp(row.job.started_at) }}</span></div>
                <div class="job-detail__row"><span class="job-detail__key">stopped</span><span class="job-detail__val">{{ formatStamp(row.job.stopped_at) }}</span></div>
                <div class="job-detail__row"><span class="job-detail__key">finished</span><span class="job-detail__val">{{ formatStamp(row.job.finished_at) }}</span></div>
              </div>
              <pre class="job-detail__json">{{ JSON.stringify(row.job, null, 2) }}</pre>
            </div>
          </transition>
        </template>
      </div>
    </div>
    <div v-else class="no-active-task">No active background tasks</div>

    <sl-divider></sl-divider>

    <h3 class="portal-section-title">Section Insight</h3>
    <div class="section-insight-badges">
      <div class="insight-group">
        <div class="insight-group__label">Essentials</div>
        <div class="insight-group__badges">
          <sl-tooltip v-if="sectionData?.section.essentials?.digest" content="Digest Present" hoist>
            <sl-badge variant="success" pill size="small" class="interactive-badge" @click="toggleInfo('digest', 'digest', sectionData.section.essentials.digest)">D</sl-badge>
          </sl-tooltip>
          <sl-tooltip v-if="sectionData?.section.essentials?.outline" content="Outline Present" hoist>
            <sl-badge variant="success" pill size="small" class="interactive-badge" @click="toggleInfo('outline', 'outline', sectionData.section.essentials.outline)">O</sl-badge>
          </sl-tooltip>
          <span v-if="!sectionData?.section.essentials?.digest && !sectionData?.section.essentials?.outline" class="no-badges">-</span>
        </div>
      </div>

      <div v-for="group in sectionFindingGroups" :key="group.bucket" class="insight-group">
        <div class="insight-group__label">Findings ({{ group.bucket }})</div>
        <div class="insight-group__badges">
          <sl-tooltip v-for="badge in group.badges" :key="badge.key" :content="badge.facet.name" hoist>
            <sl-badge variant="neutral" pill size="small" class="facet-badge interactive-badge" @click="toggleInfo('occurrences', badge.key, badge)">
              {{ badge.facet.symbol }}
            </sl-badge>
          </sl-tooltip>
          <span v-if="group.badges.length === 0" class="no-badges">-</span>
        </div>
      </div>
    </div>

    <transition name="expand">
      <div v-if="expandedInfoType && expandedInfoType !== 'context'" class="expanded-info-container">
        <DigestInfo
            v-if="expandedInfoType === 'digest'"
            :digest="expandedInfoData"
        />

        <OutlineInfo
            v-else-if="expandedInfoType === 'outline'"
            :outline="expandedInfoData"
        />

        <div v-else class="occurrence-info-stack">
          <FindingOccurrenceInfo
              v-for="occ in expandedInfoData.occurrences"
              :key="occ.id"
              :occurrence="occ"
              :label="expandedInfoData.facet.name"
              :symbol="expandedInfoData.facet.symbol"
              :bucket="expandedInfoData.bucket"
              :render-method="facetsStore.getRenderMethodByPluralName(expandedInfoData.facet.machine_name_plural)"
          />
        </div>
      </div>
    </transition>

    <sl-divider></sl-divider>

    <h3 class="portal-section-title">Block Insight</h3>
    <div class="section-insight-badges">
      <div class="insight-group">
        <div class="insight-group__label">Contexts</div>
        <div class="insight-group__badges">
          <sl-tooltip v-for="badge in blockContextBadges" :key="badge.key" :content="badge.facet.name" hoist>
            <sl-badge variant="neutral" pill size="small" class="facet-badge interactive-badge" @click="toggleInfo('context', badge.key, badge)">
              {{ badge.facet.symbol }}
            </sl-badge>
          </sl-tooltip>
          <span v-if="blockContextBadges.length === 0" class="no-badges">-</span>
        </div>
      </div>
    </div>

    <transition name="expand">
      <div v-if="expandedInfoType === 'context'" class="expanded-info-container">
        <FindingContextInfo
            :contexts="expandedInfoData.contexts"
            :label="expandedInfoData.facet.name"
            :symbol="expandedInfoData.facet.symbol"
        />
      </div>
    </transition>

    <sl-divider></sl-divider>

    <h3 class="portal-section-title">Processing Manifest</h3>
    <div v-if="processingManifest" class="pm-manifest">
      <div class="insight-group">
        <div class="insight-group__label">Essentials</div>
        <div class="insight-group__badges">
          <sl-tooltip content="Digest" hoist>
            <sl-badge :variant="isEssentialCompleted('digest') ? 'success' : 'neutral'" pill size="small">D</sl-badge>
          </sl-tooltip>
          <sl-tooltip content="Outline" hoist>
            <sl-badge :variant="isEssentialCompleted('outline') ? 'success' : 'neutral'" pill size="small">O</sl-badge>
          </sl-tooltip>
        </div>
      </div>

      <div class="insight-group">
        <div class="insight-group__label">Facets</div>
        <div class="insight-group__badges">
          <sl-tooltip v-for="exp in sectionLevelFacets" :key="exp.facet.id" :content="exp.facet.name" hoist>
            <sl-badge
              :variant="hasSectionFacet(manifestCompleted, exp) ? 'success' : 'neutral'"
              pill
              size="small"
              class="facet-badge"
            >
              {{ exp.facet.symbol || exp.facet.machine_name_plural[0].toUpperCase() }}
            </sl-badge>
          </sl-tooltip>
          <span v-if="sectionLevelFacets.length === 0" class="no-badges">-</span>
        </div>
      </div>

      <div class="insight-group">
        <div class="insight-group__label">Contexts</div>
        <div class="insight-group__badges">
          <sl-tooltip
            v-for="exp in contextLevelFacets"
            :key="exp.facet.id"
            :content="`${exp.facet.name}: ${hasFacetContexts(manifestCompleted, exp) ? 'clustered' : 'not clustered'}`"
            hoist
          >
            <sl-badge
              :variant="hasFacetContexts(manifestCompleted, exp) ? 'success' : 'neutral'"
              pill
              size="small"
              class="facet-badge"
            >
              {{ exp.facet.symbol || exp.facet.machine_name_plural[0].toUpperCase() }}
            </sl-badge>
          </sl-tooltip>
          <span v-if="contextLevelFacets.length === 0" class="no-badges">-</span>
        </div>
      </div>

      <sl-details summary="Processing Log" class="pm-log-details">
        <div class="pm-log">
          <div v-for="(entry, index) in formattedLog" :key="index" class="pm-log-entry" :class="{ 'pm-log-entry--error': entry.errors?.length > 0 }">
            <div class="pm-log-entry__header">
              <span class="pm-log-entry__time">{{ new Date(entry.when).toLocaleString() }}</span>
            </div>
            <div v-if="Object.keys(entry.notes || {}).length > 0" class="pm-log-entry__notes">
              <div v-for="(val, key) in entry.notes" :key="key" class="pm-log-note">
                <span class="pm-log-note__key">{{ key }}:</span>
                <span class="pm-log-note__val">{{ val }}</span>
              </div>
            </div>
            <div v-if="entry.errors?.length > 0" class="pm-log-entry__errors">
              <div v-for="(err, errIdx) in entry.errors" :key="errIdx" class="pm-log-error">
                {{ err }}
              </div>
            </div>
          </div>
          <div v-if="formattedLog.length === 0" class="pm-log-empty">No log entries</div>
        </div>
      </sl-details>
    </div>
    <div v-else class="no-manifest">No manifest available</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useAuth } from '../../../composables/useAuth';
import { apiFetch } from '../../../api';
import type {
  BackgroundJobStatus,
  BackgroundTask,
  BookStructure,
  FacetQuery,
  FindingContext,
  FindingContextMap,
  FindingOccurrence,
  SectionContentResponse,
} from '../../../types/library';
import DigestInfo from '../info/DigestInfo.vue';
import OutlineInfo from '../info/OutlineInfo.vue';
import FindingContextInfo from '../info/FindingContextInfo.vue';
import FindingOccurrenceInfo from '../info/FindingOccurrenceInfo.vue';
import { useFacetsStore } from '../../../stores/facets.ts';
import { useFacetExpectations } from '../../../composables/useFacetExpectations.ts';
import { buildJobRows, jobGlyph, taskRootPath, type JobRow } from '../../../utils/backgroundJobs';

/**
 * The left-hand admin pane for a section: what the backend is currently doing to it
 * (the background task tree), what it has found (section and block insight) and what
 * its processing manifest records as done.
 *
 * Read-only on the section itself - everything here is either fetched by the pane or
 * read off the payload the view already holds. The one write path is the Reload button.
 */

const props = defineProps<{
  machineName: string;
  sectionPath: string;
  bookStructure?: BookStructure;
  sectionData: SectionContentResponse | null;
}>();

const { isStaff } = useAuth();
const facetsStore = useFacetsStore();

const activeBackgroundTask = ref<BackgroundTask | null>(null);
// The task tree arrives whole, whichever section we query it from, so the expanded row is
// kept by job id rather than by position.
const expandedJobId = ref<number | null>(null);

// 'digest' | 'outline' | 'occurrences' (section-level findings) | 'context' (block-level)
const expandedInfoType = ref<string | null>(null);
// Identifies the badge that opened the panel ('digest', 'One:places', 'context:people', ...).
// Keyed rather than compared by payload identity: the badge payloads are rebuilt
// by a computed on every render, so identity comparison would never match.
const expandedInfoKey = ref<string | null>(null);
const expandedInfoData = ref<any>(null);

function toggleInfo(type: string, key: string, payload: any) {
  if (expandedInfoKey.value === key) {
    expandedInfoType.value = null;
    expandedInfoKey.value = null;
    expandedInfoData.value = null;
  } else {
    expandedInfoType.value = type;
    expandedInfoKey.value = key;
    expandedInfoData.value = payload;
  }
}

const processingManifest = computed(() => props.sectionData?.section.info?.processing_manifest);

function isEssentialCompleted(key: string) {
  return processingManifest.value?.completed.essentials.includes(key) ?? false;
}

// Which manifest list a facet is expected in depends on how it is applied, so the
// Facets and Contexts rows each show their own level's facets only. Clustering of block
// findings into FindingContexts is tracked separately from the facet extraction itself:
// a facet can be fully extracted at section level while its contexts are not yet grouped.
const manifestCompleted = computed(() => processingManifest.value?.completed);

const {
  sectionLevelFacets,
  contextLevelFacets,
  hasSectionFacet,
  hasFacetContexts,
} = useFacetExpectations(() => props.bookStructure?.book);

const formattedLog = computed(() => {
  if (!processingManifest.value?.log) return [];
  return [...processingManifest.value.log].reverse();
});

async function jsonOrNull<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  return text ? JSON.parse(text) as T : null;
}

/** The section the task was started on; printed once above the rows. */
const taskRoot = computed(() => activeBackgroundTask.value ? taskRootPath(activeBackgroundTask.value.jobs) : '');

/** The task's jobs in tree order: the root section's job first, descendants indented. */
const jobRows = computed<JobRow[]>(() => activeBackgroundTask.value ? buildJobRows(activeBackgroundTask.value.jobs) : []);

function toggleJob(id: number) {
  expandedJobId.value = expandedJobId.value === id ? null : id;
}

function formatStamp(stamp: string | null): string {
  return stamp ? new Date(stamp).toLocaleString() : '—';
}

/** The glyph is a single character, so the tooltip has to carry the whole story. */
function jobStateTooltip(row: JobRow): string {
  switch (row.state) {
    case 'running': return `Processing since ${formatStamp(row.job.started_at)}`;
    case 'stopped': return `Started ${formatStamp(row.job.started_at)}, stopped ${formatStamp(row.job.stopped_at)}`;
    case 'finished': return `Finished ${formatStamp(row.job.finished_at)}`;
    default: return 'Queued: no thread has picked it up yet';
  }
}

// The phase names are far too long for a 20%-wide panel; the tooltip gives the full name.
const PHASE_ABBREV: Record<string, string> = {
  blocks_summarize: 'BS',
  blocks_find_facets: 'BF',
  section_cluster_findings: 'SC',
  section_digest_essentials: 'SD',
};

function phaseAbbrev(phase: BackgroundJobStatus['phase']): string {
  return PHASE_ABBREV[phase] ?? phase;
}

/** The facet's own symbol, falling back to its initial when the facet store has no entry. */
function facetSymbol(namePlural: string): string {
  return facetsStore.getFacetByPluralName(namePlural)?.symbol || namePlural.charAt(0).toUpperCase();
}

function facetLabel(namePlural: string): string {
  return facetsStore.getFacetByPluralName(namePlural)?.name || namePlural;
}

async function fetchActiveBackgroundTask() {
  if (!isStaff.value) return;
  try {
    const res = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/section/${props.sectionPath}/active_background_task/`);
    if (res.ok) {
      activeBackgroundTask.value = await jsonOrNull<BackgroundTask>(res);
    }
  } catch (e) {
    console.error('Failed to fetch active background task:', e);
  }
}

interface SectionFindingBadge {
  key: string;
  bucket: string;
  facet: FacetQuery;
  occurrences: FindingOccurrence[];
}

/**
 * Concern: SECTION INSIGHT - the occurrences the section itself owns, per
 * bucket. These are NOT the block-level finding contexts; a badge here expands
 * the section_one/section_few/section_many occurrences that produced it, with
 * their extracted_data. One row per bucket; 'Many' is only shown once the
 * backend starts filling it.
 */
const sectionFindingGroups = computed<{ bucket: string; badges: SectionFindingBadge[] }[]>(() => {
  const findings = props.sectionData?.section.findings;

  const buildBadges = (bucket: 'section_one' | 'section_few' | 'section_many', label: string) => {
    const map = findings?.[bucket] ?? {};
    return Object.entries(map)
      .flatMap(([pluralName, occurrences]): SectionFindingBadge[] => {
        if (!occurrences?.length) return [];
        const facet = facetsStore.getFacetByPluralName(pluralName);
        if (!facet) return [];
        return [{ key: `${label}:${pluralName}`, bucket: label, facet, occurrences }];
      })
      .sort((a, b) => a.facet.id - b.facet.id);
  };

  const groups = [
    { bucket: 'One', badges: buildBadges('section_one', 'One') },
    { bucket: 'Few', badges: buildBadges('section_few', 'Few') },
  ];

  const many = buildBadges('section_many', 'Many');
  if (many.length > 0) groups.push({ bucket: 'Many', badges: many });

  return groups;
});

/** The real FindingContexts the API delivered for this section. */
const sectionContexts = computed<FindingContextMap>(() => props.sectionData?.section.findings?.contexts ?? {});

/**
 * Concern: BLOCK INSIGHT - the finding contexts, which group occurrences across
 * content blocks. They are delivered on the section only because a context can
 * span several blocks.
 */
const blockContextBadges = computed<{ key: string; facet: FacetQuery; contexts: FindingContext[] }[]>(() => {
  return Object.entries(sectionContexts.value)
    .flatMap(([pluralName, contexts]) => {
      if (!contexts?.length) return [];
      const facet = facetsStore.getFacetByPluralName(pluralName);
      if (!facet) return [];
      return [{ key: `context:${pluralName}`, facet, contexts }];
    })
    .sort((a, b) => a.facet.id - b.facet.id);
});

onMounted(() => {
  fetchActiveBackgroundTask();
  // Only this pane reads render_method off the facet applications, so the fetch lives
  // here. Not fatal if it fails - the occurrence info just loses its render method.
  facetsStore.fetchFacetApplications().catch(() => []);
});

watch(() => props.sectionPath, fetchActiveBackgroundTask);

// The expanded info holds slices of the payload, so a fresh one invalidates it.
watch(() => props.sectionData, () => {
  expandedInfoType.value = null;
  expandedInfoKey.value = null;
  expandedInfoData.value = null;
});

defineExpose({ refreshTask: fetchActiveBackgroundTask });
</script>

<style scoped>
.section-admin-info-portal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.portal-section-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--sl-color-warning-700);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.admin-jobs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.active-task {
  background: var(--sl-color-neutral-100);
  padding: 0.75rem;
  border-radius: var(--sl-border-radius-medium);
  font-size: 0.85rem;
}

.active-task__goal {
  font-weight: 700;
  text-transform: uppercase;
  color: var(--sl-color-primary-700);
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.active-task__title {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.active-task__root {
  font-family: var(--sl-font-mono);
  font-size: 0.7rem;
  color: var(--sl-color-neutral-500);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-list {
  border-top: 1px solid var(--sl-color-neutral-300);
  margin-top: 0.5rem;
  padding-top: 0.35rem;
}

.job-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: 0.3rem;
  padding: 0.1rem 0.2rem;
  border-left: 2px solid transparent;
  border-radius: var(--sl-border-radius-small);
  font-size: 0.75rem;
  cursor: pointer;
}

.job-row:hover {
  background: var(--sl-color-neutral-200);
}

.job-row--open {
  background: var(--sl-color-neutral-200);
}

/* The job for the section we are looking at; the rest of the tree is shown regardless. */
.job-row--current {
  border-left-color: var(--sl-color-primary-500);
}

.job-row__glyph {
  display: inline-block;
  width: 1ch;
  text-align: center;
  font-family: var(--sl-font-mono);
  color: var(--sl-color-neutral-600);
}

.job-row__path {
  font-family: var(--sl-font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-row__phase {
  font-family: var(--sl-font-mono);
  font-size: 0.7rem;
  color: var(--sl-color-neutral-500);
}

.job-row__facets {
  display: flex;
  gap: 0.1rem;
}

.job-row__facet::part(base) {
  font-size: 0.6rem;
  padding: 0 0.3rem;
}

.job-row__blocks {
  font-family: var(--sl-font-mono);
  font-size: 0.7rem;
  color: var(--sl-color-neutral-500);
}

.job-row--queued {
  color: var(--sl-color-neutral-400);
}

.job-row--queued .job-row__glyph {
  color: var(--sl-color-neutral-400);
}

.job-row--running .job-row__glyph {
  color: var(--sl-color-primary-600);
  animation: job-glyph-pulse 1.6s ease-in-out infinite;
}

.job-row--finished,
.job-row--finished .job-row__phase,
.job-row--finished .job-row__blocks {
  color: var(--sl-color-success-700);
}

.job-row--finished .job-row__glyph {
  color: var(--sl-color-success-600);
}

[data-theme="dark"] .job-row--finished,
[data-theme="dark"] .job-row--finished .job-row__phase,
[data-theme="dark"] .job-row--finished .job-row__blocks {
  color: var(--sl-color-success-300);
}

[data-theme="dark"] .job-row--finished .job-row__glyph {
  color: var(--sl-color-success-400);
}

@keyframes job-glyph-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

@media (prefers-reduced-motion: reduce) {
  .job-row--running .job-row__glyph {
    animation: none;
  }
}

.job-detail {
  margin: 0.25rem 0 0.5rem;
  padding: 0.4rem;
  /* The shared `expand` transition animates max-height, so the box has to clip. */
  overflow: hidden;
  background: var(--sl-color-neutral-50);
  border-radius: var(--sl-border-radius-small);
}

.job-detail__rows {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.1rem 0.4rem;
  font-size: 0.7rem;
  margin-bottom: 0.35rem;
}

.job-detail__row {
  display: contents;
}

.job-detail__key {
  color: var(--sl-color-neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.job-detail__val {
  font-family: var(--sl-font-mono);
  overflow-wrap: anywhere;
}

.job-detail__json {
  margin: 0;
  font-family: var(--sl-font-mono);
  font-size: 0.65rem;
  line-height: 1.35;
  max-height: 16rem;
  overflow: auto;
  background: var(--sl-color-neutral-100);
  padding: 0.35rem;
  border-radius: var(--sl-border-radius-small);
}

.no-active-task {
  font-size: 0.85rem;
  color: var(--sl-color-neutral-400);
  font-style: italic;
  text-align: center;
  padding: 1rem 0;
}

.section-insight-badges {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.insight-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.insight-group__label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--sl-color-neutral-500);
}

.insight-group__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}

.facet-badge {
  font-family: var(--sl-font-sans);
}

.no-badges {
  color: var(--sl-color-neutral-300);
  font-size: 0.8rem;
}

.pm-manifest {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pm-log-details {
  margin-top: 0.5rem;
}

.pm-log-details::part(base) {
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-medium);
}

.pm-log-details::part(header) {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
}

.pm-log-details::part(content) {
  padding: 0;
}

.pm-log {
  max-height: 300px;
  overflow-y: auto;
  font-size: 0.8rem;
  background: var(--sl-color-neutral-50);
}

.pm-log-entry {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--sl-color-neutral-200);
}

.pm-log-entry:last-child {
  border-bottom: none;
}

.pm-log-entry--error {
  background-color: var(--sl-color-danger-50);
}

.pm-log-entry__header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.pm-log-entry__time {
  color: var(--sl-color-neutral-500);
  font-size: 0.75rem;
}

.pm-log-entry__notes {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.pm-log-note {
  display: flex;
  gap: 0.5rem;
}

.pm-log-note__key {
  font-weight: 600;
  color: var(--sl-color-neutral-600);
  min-width: 60px;
}

.pm-log-note__val {
  color: var(--sl-color-neutral-800);
  word-break: break-all;
}

.pm-log-entry__errors {
  margin-top: 0.25rem;
  color: var(--sl-color-danger-600);
  font-weight: 500;
}

.pm-log-empty, .no-manifest {
  padding: 1rem;
  text-align: center;
  color: var(--sl-color-neutral-400);
  font-style: italic;
  font-size: 0.85rem;
}

.interactive-badge {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.interactive-badge:hover {
  transform: scale(1.1);
}

.expanded-info-container {
  margin: 0.5rem 0;
  overflow: hidden;
}

.occurrence-info-stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 2000px;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  margin-bottom: 0;
}
</style>
