<template>
  <div :id="'block-' + block.path_id" class="content-block" :class="{ 'is-folded': isFolded }">

    <!-- Left outer: Block link -->
    <div class="block-info">
      <div class="block-link" title="{{ block.path_id }}">
        ¶ {{ index + 1 }}
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
        <span v-if="summaryText"><i>{{ summaryText }}</i></span>
      </div>
    </template>

    <template v-else>
      <!-- Left inner: Summary (caption) -->
      <div class="block-summary">
        <small v-if="summaryCaption"><i>{{ summaryCaption }}</i></small>
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
        <small v-if="entitiesFuzzy"><i>{{ entitiesFuzzy }}</i></small>
      </div>
    </template>

    <!-- Right outer: Page link -->
    <div class="block-pages">
      <template v-if="firstPage || lastPage">
        p.
        <span v-if="firstPage">{{ firstPage }}</span>
        <span v-if="firstPage && lastPage"> - </span>
        <span v-if="lastPage && lastPage !== firstPage">{{ lastPage }}</span>
      </template>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ContentBlock, ContentSummary, ContentEntities, FoldTrigger, Highlight, ContentEmphasis } from '../types/library';
import { computeSegments, searchForFragments } from '../utils/text';

const props = defineProps<{
  block: ContentBlock;
  index: number;
  foldTrigger?: FoldTrigger;
}>();

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

const entitiesFuzzy = computed(() => {
  const record = props.block.inforecords.find(r => r.kind === 'named_entities');
  return (record?.content_js as ContentEntities)?.entities?.fuzzy_answer;
});

const firstPage = computed(() => {
  return props.block.content_json?.first_page?.page_number || props.block.content_json?.first_block;
});

const lastPage = computed(() => {
  return props.block.content_json?.last_page?.page_number || props.block.content_json?.last_block;
});

const allHighlights = computed(() => {
  const emphasisHighlights = props.block.inforecords
    .filter(r => r.kind === 'emphasis')
    .flatMap(r => {
      const content = r.content_js as ContentEmphasis;
      if (!content.fragment) return [];

      return searchForFragments(props.block.content_text, content.fragment, content.color || 'green');
    });

  const entityQuoteHighlights: Highlight[] = []; // Placeholder
  const studyAnnotations: Highlight[] = []; // Placeholder

  return [...emphasisHighlights, ...entityQuoteHighlights, ...studyAnnotations];
});

const segments = computed(() => {
  return computeSegments(props.block.content_text, allHighlights.value);
});

watch(
    segments,
    (newSegments) => {
      console.log(`Segments for block ${props.block.path_id}:`, newSegments);
    },
    { immediate: true }
);



</script>

<style scoped>
.content-block {
  display: grid;
  grid-template-columns: 80px 1fr 4fr 1fr 80px;
  grid-template-areas: "infoleft summary content entities inforight";
  grid-gap: 0.5rem;
  align-items: first baseline;
  width: 100%;
  padding: 0.5rem 0;
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

.block-summary {
  grid-area: summary;
  color: var(--sl-color-neutral-500);
  font-size: 0.9rem;
  line-height: 1.4;
  word-break: break-word;
  font-weight: 400;
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
</style>
