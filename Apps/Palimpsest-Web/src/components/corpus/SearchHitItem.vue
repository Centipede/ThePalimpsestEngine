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
          <router-link
            v-if="book"
            :to="{
              path: `/study/${book.machine_name}/section/${hit.in_section.path_full}`,
              query: hit.in_block_pi ? { pi: hit.in_block_pi } : {}
            }"
            class="hit-section"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="hit-section-link-text">{{ hit.in_section.title }} <sl-icon name="box-arrow-in-right"></sl-icon></span>
          </router-link>
          <span v-else class="hit-section">{{ hit.in_section.title }}</span>
          <span class="hit-page">Page {{ hit.on_page }}</span>
        </div>
      </div>
      <div class="hit-actions">
        <sl-badge variant="neutral" pill>Hit: {{ index + 1}} - Rank: {{ hit.rank.toFixed(4) }}</sl-badge>
      </div>
    </div>
    
    <div class="hit-content">
      <div class="expansion-trigger expansion-trigger--up">
        <sl-button variant="text" size="small" @click="expandUp" :loading="loadingUp" :disabled="!hasMoreUp">
          <sl-icon name="chevron-compact-up" slot="prefix"></sl-icon>
          {{ hasMoreUp ? 'Expand Up' : 'Beginning of section' }}
        </sl-button>
      </div>

      <div v-for="block in contentBefore" :key="block.path_id" class="hit-extra-block">
        {{ block.content_text }}
      </div>

      <div class="hit-snippet" v-html="hit.html_highlighted"></div>

      <div v-for="block in contentAfter" :key="block.path_id" class="hit-extra-block">
        {{ block.content_text }}
      </div>

      <div class="expansion-trigger expansion-trigger--down">
        <sl-button variant="text" size="small" @click="expandDown" :loading="loadingDown" :disabled="!hasMoreDown">
          <sl-icon name="chevron-compact-down" slot="prefix"></sl-icon>
          {{ hasMoreDown ? 'Expand Down' : 'End of section' }}
        </sl-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useLibraryStore } from '../../stores/library';
import { apiFetch } from '../../api';
import type { SearchHit, ContentBlock, SurroundingContentResponse } from '../../types/library';

const props = defineProps<{
  hit: SearchHit;
  index: number;
}>();

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

const contentBefore = ref<ContentBlock[]>([]);
const contentAfter = ref<ContentBlock[]>([]);
const loadingUp = ref(false);
const loadingDown = ref(false);
const hasMoreUp = ref(true);
const hasMoreDown = ref(true);

async function fetchSurrounding(direction: 'up' | 'down') {
  if (!book.value || !props.hit.in_block_pi) return;
  
  const isLoading = direction === 'up' ? loadingUp : loadingDown;
  if (isLoading.value) return;
  
  const anchorPi = direction === 'up' 
    ? (contentBefore.value.length > 0 ? contentBefore.value[0].path_id : props.hit.in_block_pi)
    : (contentAfter.value.length > 0 ? contentAfter.value[contentAfter.value.length - 1].path_id : props.hit.in_block_pi);
    
  isLoading.value = true;
  
  const bookMn = book.value.machine_name;
  const secPf = props.hit.in_section.path_full;
  const before = direction === 'up' ? 1 : 0;
  const after = direction === 'down' ? 1 : 0;
  
  try {
    const url = `/testbooks/api/v1/book/${bookMn}/section/${secPf}/fetch_surrounding_content/?path_id=${anchorPi}&before=${before}&after=${after}`;
    const res = await apiFetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data: SurroundingContentResponse = await res.json();
    
    if (direction === 'up') {
      // Data should be [NewBlock?, AnchorBlock]
      // filter out the anchor block and any nulls for the content array
      const newItems = data.filter(item => item.content && item.content.path_id !== anchorPi);
      if (newItems.length > 0) {
        contentBefore.value = [...newItems.map(i => i.content!), ...contentBefore.value];
      }
      // Check if we reached the boundary (the first item is null)
      if (data.length > 0 && data[0].content === null) {
        hasMoreUp.value = false;
      }
    } else {
      // Data should be [AnchorBlock, NewBlock?]
      const newItems = data.filter(item => item.content && item.content.path_id !== anchorPi);
      if (newItems.length > 0) {
        contentAfter.value = [...contentAfter.value, ...newItems.map(i => i.content!)];
      }
      // Check if we reached the boundary (the last item is null)
      if (data.length > 0 && data[data.length - 1].content === null) {
        hasMoreDown.value = false;
      }
    }
  } catch (e) {
    console.error('Failed to fetch surrounding content:', e);
  } finally {
    isLoading.value = false;
  }
}

function expandUp() {
  fetchSurrounding('up');
}

function expandDown() {
  fetchSurrounding('down');
}
</script>

<style scoped>
.search-hit-item {
  border: 1px solid var(--color-border);
  border-radius: var(--sl-border-radius-medium);
  padding: 0.75rem;
  background-color: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: border-color 0.2s;
}

.search-hit-item:hover {
  border-color: var(--sl-color-primary-300);
}

.hit-section-link-text {
  display: flex;
  align-items: center;
  gap: 0.25rem;
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
  text-decoration: none;
}

a.hit-section:hover {
  text-decoration: underline;
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
  overflow: hidden;
}

.hit-content > *:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.hit-snippet {
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--color-text);
}

.hit-extra-block {
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--color-text-muted);
  background-color: var(--color-bg-subtle, var(--sl-color-neutral-100));
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