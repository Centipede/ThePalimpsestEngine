<template>
  <div :id="'block-' + block.path_id" class="content-block">
    <!-- Leftmost: Toggle -->
    <div class="block-toggle">
      <sl-icon-button
        :name="isFolded ? 'chevron-right' : 'chevron-down'"
        label="Toggle Content"
        size="small"
        @click="isFolded = !isFolded"
      ></sl-icon-button>
    </div>

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
    <div v-show="!isFolded" class="block-content">
      <div class="content-text">{{ block.content_text }}</div>
    </div>

    <!-- Right inner: Entities -->
    <div v-show="!isFolded" class="block-entities">
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

    <!-- Rightmost: Spacer -->
    <div class="block-spacer"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ContentBlock, SummaryInfoContent, EntitiesInfoContent } from '../types/library';

const props = defineProps<{
  block: ContentBlock;
  index: number;
}>();

const isFolded = ref(false);

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
  grid-template-columns: 30px 100px 1fr 4fr 1fr 70px 30px;
  grid-gap: 1.5rem;
  align-items: first baseline;
  width: 100%;
  padding: 1rem 0;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.content-block:last-child {
  border-bottom: none;
}

.block-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
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
  grid-column: 6;
  font-size: 0.75rem;
  color: var(--sl-color-neutral-500);
  text-align: right;
  white-space: nowrap;
}

.block-spacer {
  grid-column: 7;
}

@media (max-width: 1024px) {
  .content-block {
    grid-template-columns: 30px 80px 1fr 1fr 80px 30px;
    grid-template-areas: 
      "toggle info content content pages spacer"
      ". . summary entities . .";
  }
}
</style>
