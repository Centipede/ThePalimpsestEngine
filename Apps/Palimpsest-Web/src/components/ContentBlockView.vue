<template>
  <div class="content-block-study-view">
    <div v-if="isStaff" class="admin-actions-row">
      <div class="admin-actions-spacer-left"></div>
      <div class="admin-actions-content">
        <sl-button variant="warning" size="small" :loading="isGathering" @click="gatherBlockInfo">
          <sl-icon slot="prefix" name="gear"></sl-icon>
          Gather block info
        </sl-button>
      </div>
      <div class="admin-actions-spacer-right"></div>
    </div>

    <div
        :id="'block-' + block.path_id"
        class="content-block"
        :class="{ 'is-folded': isFolded }"
        :style="{ '--block-border-color': borderColor }"
    >

      <!-- Left outer: Block link -->
      <div class="block-info">
        <div class="block-link" :title="block.path_id">
          <router-link v-if="blockLink" :to="blockLink" class="block-link__marker">
            ¶ {{ index + 1 }}
          </router-link>
          <span v-else>
            ¶ {{ index + 1 }}
          </span>

          <sl-icon-button
              :name="isFolded ? 'chevron-right' : 'chevron-down'"
              label="Toggle Content"
              size="small"
              @click="isFolded = !isFolded"
          ></sl-icon-button>

        </div>
      </div>

      <template v-if="isFolded">
        <!-- Center: Wide Summary (folded) -->
        <div class="block-summary">
          <div class="block-summary__caption" v-if="summaryCaption"><i>{{ summaryCaption }}</i></div>
          <div class="block-summary__text" v-if="summaryText"><i>{{ summaryText }}</i></div>
        </div>
      </template>

      <template v-else>
        <!-- Left inner: Summary (caption) -->
        <div class="block-summary">
          <div class="block-summary__text" v-if="summaryCaption"><i>{{ summaryCaption }}</i></div>
        </div>

        <!-- Center: Content -->
        <div class="block-content">
          <div class="content-text">
            <span
                v-for="segment in segments"
                :key="`${segment.start}-${segment.end}`"
                :style="{ backgroundImage: segment.mixedColor }"
            >
              {{ block.content_text.slice(segment.start, segment.end) }}
            </span>
          </div>
        </div>

        <!-- Right inner: Entities -->
        <div class="block-entities">
          <div v-for="group in sortedOccurrencesByFacet" :key="group.facetName">
            <small>
              <i>
                <span
                    v-for="occurrence in group.occurrences"
                    :key="occurrence.id"
                    class="finding-occurrence-link"
                    :title="`${occurrence.description}\n\n${occurrence.quote}`"
                    @click="emit('occurrence-selected', occurrence)"
                >
                  <span v-if="group.facet" class="finding-occurrence-icon">{{ group.facet.symbol }}</span>
                  {{ occurrence.name }}{{ ' ' }}
                </span>
              </i>
            </small>
          </div>
        </div>
      </template>

      <!-- Right outer: Page link -->
      <div class="block-pages">
        <template v-if="firstPage || lastPage">
          p.
          <span v-if="firstPage">{{ firstPage }}</span>
          <span v-if="firstPage && lastPage !== firstPage"> - </span>
          <span v-if="lastPage && lastPage !== firstPage">{{ lastPage }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { apiFetch } from '../api';
import { useAuth } from '../composables/useAuth';
import type { ContentBlock, ContentSummary, FoldTrigger, Highlight, ContentEmphasis, ToolbarToggle, FindingOccurrence } from '../types/library';
import { computeSegments, searchForFragments } from '../utils/text';
import { useThemeStore } from '../stores/theme';
import { useFacetsStore } from '../stores/facets';

const props = defineProps<{
  block: ContentBlock;
  index: number;
  machineName?: string;
  sectionPath?: string;
  foldTrigger?: FoldTrigger;
  availableHighlights?: ToolbarToggle[];
  activeFacetTypes?: Set<string>;
  borderColor?: string;
  blockLink?: string;
}>();

const emit = defineEmits<{
  (e: 'occurrence-selected', occurrence: FindingOccurrence): void;
}>();

const themeStore = useThemeStore();
const facetsStore = useFacetsStore();
const { isStaff } = useAuth();

const isGathering = ref(false);

async function gatherBlockInfo() {
  if (!props.machineName || !props.sectionPath) {
    console.error('Missing context for gathering block info');
    return;
  }

  isGathering.value = true;
  try {
    const res = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/section/${props.sectionPath}/content/${props.block.path_id}/maintenance/job/run_gather_info`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error('Failed to gather block info:', e);
  } finally {
    isGathering.value = false;
  }
}

watch(
    () => props.availableHighlights,
    value => {
      console.log('availableHighlights changed in ContentBlockView:', value);
    },
    { deep: true }
);

const isFolded = ref(false);

watch(() => props.foldTrigger?.count, () => {
  if (props.foldTrigger) {
    if (props.foldTrigger.command === 'expand-all') {
      isFolded.value = false;
    } else if (props.foldTrigger.command === 'collapse-all') {
      isFolded.value = true;
    }
  }
});

const summaryCaption = computed(() => {
  const record = props.block.inforecords.find(r => r.kind === 'summary');
  return (record?.content_js as ContentSummary)?.caption;
});

const summaryText = computed(() => {
  const record = props.block.inforecords.find(r => r.kind === 'summary');
  return (record?.content_js as ContentSummary)?.summary;
});

const sortedOccurrencesByFacet = computed(() => {
  if (!props.block.finding_occurrences?.length) return [];

  // Group by of_facet
  const groups: Record<string, FindingOccurrence[]> = {};
  props.block.finding_occurrences.forEach(occ => {
    const facetNameSingular = occ.of_facet || 'unknown';
    if (props.activeFacetTypes && facetNameSingular !== 'unknown') {
      const facet = facetsStore.getFacetBySingularName(facetNameSingular);
      if (facet && !props.activeFacetTypes.has(facet.machine_name_plural)) {
        return;
      }
    }
    if (!groups[facetNameSingular]) groups[facetNameSingular] = [];
    groups[facetNameSingular].push(occ);
  });

  // Map to objects with facet info and sort by facet ID
  return Object.entries(groups)
    .map(([facetName, occurrences]) => {
      const facet = facetsStore.getFacetBySingularName(facetName);
      const order = facetsStore.facetQueries.findIndex(fq => fq.id === facet?.id);
      return {
        facetName,
        facet,
        order: order === -1 ? Infinity : order,
        occurrences
      };
    })
    .sort((a, b) => a.order - b.order);
});

const firstPage = computed(() => {
  return props.block.pageinfo?.first_page?.page_name || props.block.content_json?.first_page?.page_number || props.block.content_json?.first_block;
});

const lastPage = computed(() => {
  return props.block.pageinfo?.last_page?.page_name || props.block.content_json?.last_page?.page_number || props.block.content_json?.last_block;
});

const allHighlights = computed(() => {
  const showSummaryQuotes = props.availableHighlights?.find(h => h.type === 'summary-quotes')?.checked ?? true;

  const emphasisHighlights = showSummaryQuotes ? props.block.inforecords
    .filter(r => r.kind === 'emphasis')
    .flatMap(r => {
      const content = r.content_js as ContentEmphasis;
      if (!content.fragment) return [];

      return searchForFragments(props.block.content_text, content.fragment, content.color || 'green');
    }) : [];

  const entityQuoteHighlights: Highlight[] = []; // Placeholder
  const studyAnnotations: Highlight[] = []; // Placeholder

  return [...emphasisHighlights, ...entityQuoteHighlights, ...studyAnnotations];
});

const segments = computed(() => {
  return computeSegments(props.block.content_text, allHighlights.value, themeStore.isDark);
});

// watch(
//     segments,
//     (newSegments) => {
//       console.log(`Segments for block ${props.block.path_id}:`, newSegments);
//     },
//     { immediate: true }
// );



</script>

<style scoped>
.content-block {
  display: grid;
  grid-template-columns: 80px 1fr 4fr 1fr 80px;
  grid-template-areas: "infoleft summary content entities inforight";
  grid-gap: 0.5rem;
  align-items: first baseline;
  width: 100%;
  padding: 0.5rem 0 0.5rem 0.5rem;
  border-left: 4px solid var(--block-border-color, transparent);
  box-sizing: border-box;
}

.content-block.is-folded {
  grid-template-columns: 80px 1fr 80px;
  grid-template-areas: "infoleft summary inforight";
}

.content-block:last-child {
  border-bottom: none;
}

.block-info {
  grid-area: infoleft;
  font-size: 0.85rem;
  line-height: 1.3;
  font-weight: 300;
}

.block-link {
  color: var(--sl-color-success-700);
  text-decoration: none;
}

.block-link__marker {
  color: inherit;
  text-decoration: none;
  font-weight: 500;
}

.block-link__marker:hover {
  text-decoration: underline;
}

.block-summary {
  grid-area: summary;
  font-size: 0.85rem;
  line-height: 1.4;
  word-break: break-word;
  font-weight: 400;
}

.block-summary__caption {
  color: var(--sl-color-cyan-700);
}

.block-summary__text {
  color: var(--sl-color-neutral-400);
}

.block-entities {
  grid-area: entities;
  color: var(--sl-color-neutral-600);
  font-size: 0.875rem;
  line-height: 1.4;
  word-break: break-word;
  white-space: pre-wrap;
  font-weight: 400;
}

.finding-occurrence-link {
  cursor: pointer;
  display: inline-block;
}

.finding-occurrence-link:hover {
  text-decoration: underline;
  color: var(--sl-color-primary-600);
}

.finding-occurrence-icon {
  margin-right: 0.1rem;
  font-style: normal;
}

.block-content {
  grid-area: content;
  width: 100%;
}

.content-text {
  margin: 0;
  line-height: 1.6;
  font-size: 1.05rem;
  color: var(--sl-color-neutral-900);
  white-space: pre-wrap;
}

.block-pages {
  grid-area: inforight;
  font-size: 0.85rem;
  color: var(--sl-color-neutral-500);
  text-align: right;
  white-space: nowrap;
  font-weight: 300;
}

.block-spacer {
  grid-area: spacer;
}

@media (max-width: 1024px) {
  .content-block {
    grid-template-columns: 30px 80px 1fr 1fr 80px 30px;
    grid-template-areas:
      "toggle info content content pages spacer"
      ". . summary entities . .";
  }

  .content-block.is-folded {
    grid-template-columns: 30px 80px 1fr 80px 30px;
    grid-template-areas: "toggle info summary pages spacer";
  }
}

.content-block-study-view {
  width: 100%;
}

.admin-actions-row {
  display: grid;
  grid-template-columns: 80px 1fr 4fr 1fr 80px;
  grid-gap: 0.5rem;
  padding-left: 0.5rem;
  margin-bottom: 2px;
}

.admin-actions-content {
  grid-column: 2 / span 3;
  display: flex;
  gap: 0.5rem;
  padding: 4px 0;
  border-bottom: 1px dashed var(--sl-color-warning-300);
}

@media (max-width: 1024px) {
  .admin-actions-row {
    grid-template-columns: 30px 80px 1fr 1fr 80px 30px;
  }
  .admin-actions-content {
    grid-column: 2 / span 4;
  }
}
</style>
