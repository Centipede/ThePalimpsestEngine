<template>
  <div class="search-hit-item">
    <div class="hit-header">
      <img v-if="thumbnail" :src="thumbnail" class="hit-thumbnail" />
      <div class="hit-meta">
        <div class="hit-title-row">
          <span class="hit-book">{{ bookTitle }}</span>
          <span class="hit-author">by {{ authorName }}</span>
        </div>
        <div class="hit-section-row">
          <span class="hit-section">{{ hit.in_section.title }}</span>
          <span class="hit-page">Page {{ hit.on_page }}</span>
        </div>
      </div>
      <div class="hit-actions">
        <sl-badge variant="neutral" pill>Rank: {{ hit.rank.toFixed(4) }}</sl-badge>
        <sl-tooltip content="Jump to section">
          <sl-icon-button name="box-arrow-in-right" label="Jump to section" @click="jumpToSection"></sl-icon-button>
        </sl-tooltip>
      </div>
    </div>
    
    <div class="hit-content">
      <div class="expansion-trigger expansion-trigger--up">
        <sl-button variant="text" size="small" @click="expandUp">
          <sl-icon name="chevron-compact-up" slot="prefix"></sl-icon>
          Expand Up
        </sl-button>
      </div>

      <div class="hit-snippet" v-html="hit.html_highlighted"></div>

      <div class="expansion-trigger expansion-trigger--down">
        <sl-button variant="text" size="small" @click="expandDown">
          <sl-icon name="chevron-compact-down" slot="prefix"></sl-icon>
          Expand Down
        </sl-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useLibraryStore } from '../../stores/library';
import type { SearchHit } from '../../types/library';

const props = defineProps<{
  hit: SearchHit;
}>();

const router = useRouter();
const libraryStore = useLibraryStore();

const book = computed(() => {
  return libraryStore.books.find(b => b.id === props.hit.in_book);
});

const bookTitle = computed(() => {
  return book.value?.title || `Book #${props.hit.in_book}`;
});

const authorName = computed(() => {
  const author = libraryStore.authors.find(a => a.id === props.hit.by_author);
  return author?.abbrev || `Author #${props.hit.by_author}`;
});

const thumbnail = computed(() => {
  if (!book.value) return null;
  return book.value.thumbnail_url || book.value.thumbnail_local || null;
});

function jumpToSection() {
  if (!book.value) return;
  
  router.push({
    path: `/study/${book.value.machine_name}/section/${props.hit.in_section.path_full}`,
    query: props.hit.in_block_pi ? { pi: props.hit.in_block_pi } : {}
  });
}

function expandUp() {
  // Empty handler as requested
  console.log('Expand UP requested for hit:', props.hit.in_section.path_full);
}

function expandDown() {
  // Empty handler as requested
  console.log('Expand DOWN requested for hit:', props.hit.in_section.path_full);
}
</script>

<style scoped>
.search-hit-item {
  border: 1px solid var(--color-border);
  border-radius: var(--sl-border-radius-medium);
  padding: 1rem;
  background-color: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: border-color 0.2s;
}

.search-hit-item:hover {
  border-color: var(--sl-color-primary-300);
}

.hit-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.hit-thumbnail {
  width: 40px;
  height: 60px;
  object-fit: cover;
  border-radius: var(--sl-border-radius-small);
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

.hit-meta {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hit-title-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.hit-book {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-text);
}

.hit-author {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.hit-section-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.hit-section {
  color: var(--color-accent, var(--sl-color-primary-600));
  font-weight: 500;
}

.hit-page {
  color: var(--color-text-muted);
}

.hit-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.hit-content {
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-muted, var(--sl-color-neutral-50));
  border-radius: var(--sl-border-radius-small);
  border: 1px solid var(--color-border);
}

.hit-snippet {
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--color-text);
}

.hit-snippet :deep(em) {
  font-weight: 600;
  font-style: normal;
  background-color: var(--sl-color-warning-100);
  color: var(--sl-color-warning-900);
  padding: 0 0.1rem;
  border-radius: 2px;
}

.expansion-trigger {
  display: flex;
  justify-content: center;
  border-color: var(--color-border);
  border-style: solid;
}

.expansion-trigger--up {
  border-width: 0 0 1px 0;
}

.expansion-trigger--down {
  border-width: 1px 0 0 0;
}

.expansion-trigger sl-button::part(base) {
  width: 100%;
  color: var(--color-text-muted);
}

.expansion-trigger sl-button:hover::part(base) {
  color: var(--color-accent, var(--sl-color-primary-600));
  background-color: var(--color-bg-muted, var(--sl-color-primary-50));
}
</style>