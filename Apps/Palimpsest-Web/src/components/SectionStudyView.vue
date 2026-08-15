<template>
  <div class="section-study">
    <div class="section-study__nav">

    </div>

    <p v-if="loading" class="section-study__status">Loading…</p>
    <p v-else-if="error" class="section-study__status section-study__status--error">{{ error }}</p>
    <template v-else-if="data">
      <Teleport to=".nav-mid-title-portal">
        <div class="nav-portal-content">
          <sl-breadcrumb>
            <sl-breadcrumb-item v-for="crumb in breadcrumbs.slice(1)" :key="crumb.path">
              <router-link :to="crumb.path" class="breadcrumb-link">{{ crumb.title }}</router-link>
            </sl-breadcrumb-item>
          </sl-breadcrumb>

          <sl-button-group v-if="data.section.info?.summary?.paragraph_segments?.length" class="organise-toggle">
            <sl-button
                size="small"
                :variant="organiseMode === 'linear' ? 'primary' : 'default'"
                @click="organiseMode = 'linear'"
                title="Linear View"
            >
              <sl-icon name="list"></sl-icon>
            </sl-button>
            <sl-button
                size="small"
                :variant="organiseMode === 'segmented' ? 'primary' : 'default'"
                @click="organiseMode = 'segmented'"
                title="Segmented View"
            >
              <sl-icon name="layers-half"></sl-icon>
            </sl-button>
          </sl-button-group>
        </div>
      </Teleport>
      <header class="section-study__header">
        <h1 class="section-study__title">{{ data.section.title_text }}</h1>
      </header>

      <TableOfContents
          v-if="props.bookStructure"
          :flows="props.bookStructure.flows"
          :machine-name="props.machineName"
          :root_section_pf="props.sectionPath"
      />

      <SectionSummary v-if="data.section.info?.summary" :summary="data.section.info.summary"/>
      <SectionEntities v-if="data.section.info?.entities" :entities="data.section.info.entities"/>

      <article class="section-study__content">
        <h2 class="section-study__content-title">Content</h2>

        <template v-if="organiseMode === 'linear'">
          <ContentBlockView
              v-for="(block, index) in data.contents"
              :key="block.path_id"
              :block="block"
              :index="index"
          />
        </template>

        <template v-else-if="organiseMode === 'segmented'">
          <div class="segments-container">
            <sl-details
                v-for="(seg, idx) in segmentedData.segments"
                :key="idx"
                class="segment-details"
                @sl-show="toggleSegment(idx, true)"
                @sl-hide="toggleSegment(idx, false)"
            >
              <div slot="summary" class="segment-summary-header">
                <sl-badge variant="success" pill class="segment-range-badge">{{ seg.ranges.join(', ') }}</sl-badge>
                <span class="segment-caption">{{ seg.caption }}</span>
                <span v-if="!openSegments[idx]" class="segment-description-preview">
                  &nbsp; - <i>{{ seg.description }}</i>
                </span>
              </div>

              <div class="segment-content">
                <p v-if="seg.description" class="segment-description-full">{{ seg.description }}</p>
                <ContentBlockView
                    v-for="block in seg.blocks"
                    :key="block.path_id"
                    :block="block"
                    :index="data.contents.indexOf(block)"
                />
              </div>
            </sl-details>

            <div v-if="segmentedData.orphans.length > 0" class="orphans-section">
              <h3 class="orphans-title">Other Paragraphs</h3>
              <ContentBlockView
                  v-for="block in segmentedData.orphans"
                  :key="block.path_id"
                  :block="block"
                  :index="data.contents.indexOf(block)"
              />
            </div>
          </div>
        </template>
      </article>
    </template>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import {apiFetch} from '../api';
import type {SectionContentResponse, BookStructure, Section} from '../types/library';
import SectionSummary from './SectionSummary.vue';
import SectionEntities from './SectionEntities.vue';
import ContentBlockView from './ContentBlockView.vue';
import TableOfContents from './TableOfContents.vue';

const props = defineProps<{
  machineName: string;
  sectionPath: string;
  bookStructure?: BookStructure;
}>();

const data = ref<SectionContentResponse | null>(null);
const loading = ref(true);
const error = ref('');
const organiseMode = ref<'linear' | 'segmented'>('linear');
const openSegments = ref<Record<number, boolean>>({});

function toggleSegment(index: number, isOpen: boolean) {
  openSegments.value[index] = isOpen;
}

const parseRanges = (ranges: string[]): Set<number> => {
  const indices = new Set<number>();
  for (const range of ranges) {
    if (!range) continue;
    const parts = range.split('-').map(s => parseInt(s.trim(), 10));
    if (parts.length === 1) {
      if (!isNaN(parts[0])) indices.add(parts[0] - 1);
    } else if (parts.length === 2) {
      const [start, end] = parts;
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) indices.add(i - 1);
      }
    }
  }
  return indices;
};

const segmentedData = computed(() => {
  if (!data.value) return {segments: [], orphans: []};

  const paragraphSegments = data.value.section.info?.summary?.paragraph_segments;
  if (!paragraphSegments || paragraphSegments.length === 0) {
    return {segments: [], orphans: data.value.contents};
  }

  const allSegmentedIndices = new Set<number>();
  const segments = paragraphSegments.map(seg => {
    const indices = parseRanges(seg.ranges);
    indices.forEach(i => allSegmentedIndices.add(i));
    const blocks = data.value!.contents.filter((_, i) => indices.has(i));
    return {
      ...seg,
      blocks
    };
  });

  const orphans = data.value.contents.filter((_, i) => !allSegmentedIndices.has(i));

  return {segments, orphans};
});


const breadcrumbs = computed(() => {
  if (!props.bookStructure) return [];
  const mainFlow = props.bookStructure.flows.find(f => f.name === 'main');
  const tree = mainFlow?.tree;
  if (!tree) return [];

  const crumbs = [];
  crumbs.push({
    title: props.bookStructure.book.title,
    path: `/study/${props.machineName}`
  });

  const parts = props.sectionPath.split('.').slice(1);

  let currentTree: Section | null = tree;

  let currentPath = '';
  for (const part of parts) {
    if (currentPath) currentPath += '.';
    currentPath += part;

    const found: Section | undefined = currentTree?.subsections?.find(s => s.path_id === part);
    if (found) {
      crumbs.push({
        title: found.title_text,
        path: `/study/${props.machineName}/section/${found.path_full}`
      });
      currentTree = found;
    } else {
      break;
    }
  }

  return crumbs;
});

async function fetchSection() {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/section/${props.sectionPath}/?sec_info=sum,ents&cont_info=sum,ents`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data.value = await res.json();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load section';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchSection);
watch(() => props.sectionPath, fetchSection);
</script>

<style scoped>
.section-study {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
  padding: 2rem;
}

.section-study__nav {
  margin-bottom: 2rem;
  padding: 0.5rem 0;
}

.breadcrumb-link {
  color: var(--sl-color-neutral-600);
  text-decoration: none;
  font-size: 0.9rem;
}

.breadcrumb-link:hover {
  color: var(--sl-color-primary-600);
}

.nav-portal-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.organise-toggle {
  margin-left: 0.5rem;
}

.segments-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.segment-details::part(base) {
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-medium);
  background-color: var(--sl-color-neutral-50);
  overflow: hidden;
}

.segment-summary-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.segment-range-badge {
  flex-shrink: 0;
}

.segment-description-preview {
  font-weight: normal;
  color: var(--sl-color-neutral-500);
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.segment-content {
  padding: 1rem;
  background-color: var(--sl-color-white);
  border-top: 1px solid var(--sl-color-neutral-200);
}

.segment-description-full {
  margin: 0 0 1.5rem 0;
  font-style: italic;
  color: var(--sl-color-neutral-700);
}

.orphans-section {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 2px dashed var(--sl-color-neutral-200);
}

.orphans-title {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--sl-color-neutral-600);
}

.section-study__header {
  margin-bottom: 2.5rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  padding-bottom: 1rem;
}

.section-study__title {
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text, #111827);
}

.section-study__content {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: 1200px;
  margin: 2rem auto;
  width: 100%;
}

.section-study__content-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: var(--color-text, #111827);
  border-bottom: 2px solid var(--sl-color-neutral-200);
  padding-bottom: 0.5rem;
}

.section-study__status {
  padding: 3rem;
  text-align: center;
  color: var(--color-text-muted, #6b7280);
  font-size: 1.1rem;
}

.section-study__status--error {
  color: var(--sl-color-danger-600, #dc2626);
}
</style>