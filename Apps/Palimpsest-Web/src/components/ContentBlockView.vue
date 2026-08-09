<template>
  <div :id="'block-' + block.path_id" class="content-block">
    <!-- Left outer: Block link -->
    <div class="block-info">
      <div class="block-link">
        Paragraph {{ index + 1 }}<br>
        {{ block.path_id }}
      </div>
    </div>

    <!-- Left inner: Summary (caption) -->
    <div class="block-summary">
      <small v-if="summaryCaption"><i>{{ summaryCaption }}</i></small>
    </div>

    <!-- Center: Content -->
    <div class="block-content">
      <div class="content-text">{{ block.content_text }}</div>
    </div>

    <!-- Right inner: Entities -->
    <div class="block-entities">
      <small v-if="entitiesFuzzy"><i>{{ entitiesFuzzy }}</i></small>
    </div>

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
import { computed } from 'vue';
import type { ContentBlock, SummaryInfoContent, EntitiesInfoContent } from '../types/library';

const props = defineProps<{
  block: ContentBlock;
  index: number;
}>();

const summaryCaption = computed(() => {
  const record = props.block.inforecords.find(r => r.kind === 'summary');
  return (record?.content_js as SummaryInfoContent)?.caption;
});

const entitiesFuzzy = computed(() => {
  const record = props.block.inforecords.find(r => r.kind === 'named_entities');
  return (record?.content_js as EntitiesInfoContent)?.entities?.fuzzy_answer;
});

const firstPage = computed(() => {
  return props.block.content_json?.first_page?.page_number || props.block.content_json?.first_block;
});

const lastPage = computed(() => {
  return props.block.content_json?.last_page?.page_number || props.block.content_json?.last_block;
});
</script>

<style scoped>
.content-block {
  display: grid;
  grid-template-columns: 100px 1fr 4fr 1fr 70px;
  grid-gap: 1.5rem;
  align-items: first baseline;
  width: 100%;
  padding: 1rem 0;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.content-block:last-child {
  border-bottom: none;
}

.block-info {
  font-size: 0.75rem;
  line-height: 1.3;
}

.block-link {
  color: var(--sl-color-success-700);
  font-weight: 600;
  text-decoration: none;
}

.block-summary, .block-entities {
  color: var(--sl-color-neutral-600);
  font-size: 0.875rem;
  line-height: 1.4;
  word-break: break-word;
}

.block-entities {
  white-space: pre-wrap;
}

.block-content {
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
  font-size: 0.75rem;
  color: var(--sl-color-neutral-500);
  text-align: right;
  white-space: nowrap;
}

@media (max-width: 1024px) {
  .content-block {
    grid-template-columns: 80px 1fr 1fr 80px;
    grid-template-areas: 
      "info content content pages"
      ". summary entities .";
  }
  
  /* Simplifying for mobile/smaller screens if needed, 
     but keeping the requested grid for now as primary */
}
</style>
