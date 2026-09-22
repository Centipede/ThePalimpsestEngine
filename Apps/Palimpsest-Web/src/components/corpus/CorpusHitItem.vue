<template>
  <div class="hit-item">
    <div class="hit-meta">
      <img v-if="thumbnail" :src="thumbnail" class="hit-thumbnail" />
      <div class="hit-info">
        <div class="hit-book">{{ bookTitle }}</div>
        <div class="hit-location">Page {{ hit.page_name }} • Score: {{ hit.rank.toFixed(3) }}</div>
      </div>
    </div>
    <div class="hit-text" v-html="hit.sb_text_highlighted || hit.sb_text"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLibraryStore } from '../../stores/library';
import type { CorpusHit } from '../../types/study';

const props = defineProps<{
  hit: CorpusHit;
}>();

const libraryStore = useLibraryStore();

const book = computed(() => {
  if (!props.hit.book_id) return null;
  return libraryStore.books.find(b => b.id === props.hit.book_id);
});

const bookTitle = computed(() => {
  return book.value ? book.value.title : (props.hit.book_id ? `Book #${props.hit.book_id}` : 'Unknown Book');
});

const thumbnail = computed(() => {
  if (!book.value) return null;
  return book.value.thumbnail_url || book.value.thumbnail_local || null;
});
</script>

<style scoped>
.hit-item {
  border: 1px solid var(--color-border);
  border-radius: var(--sl-border-radius-medium);
  padding: 0.75rem;
  background-color: var(--color-surface);
}

.hit-meta {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  align-items: flex-start;
}

.hit-thumbnail {
  width: 40px;
  height: 60px;
  object-fit: cover;
  border-radius: var(--sl-border-radius-small);
  border: 1px solid var(--color-border);
}

.hit-book {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--color-text);
}

.hit-location {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.hit-text {
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--color-text);
}

.hit-text :deep(em) {
  font-weight: 600;
  font-style: normal;
  background-color: var(--sl-color-warning-100);
  color: var(--sl-color-warning-900);
  padding: 0 0.1rem;
}

[data-theme="dark"] .hit-text :deep(em) {
  background-color: var(--sl-color-warning-900);
  color: var(--sl-color-warning-100);
}
</style>
