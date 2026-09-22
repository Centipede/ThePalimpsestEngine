<template>
  <Teleport to=".nav-mid-title-portal">
    Search
  </Teleport>

  <div class="search-layout">
    <aside class="logo-sidebar">
      <img src="/logos/palimpsest-logo.png" alt="Palimpsest Logo" class="main-logo" />
    </aside>

    <div class="search-page">
      <div class="search-header">
        <div class="search-input-group">
          <sl-input
              v-model="searchQuery"
              placeholder="Type your search query here..."
              size="large"
              clearable
              @sl-input="searchError = null"
              @keydown.enter="performSearch"
          >
            <sl-icon name="search" slot="prefix"></sl-icon>
          </sl-input>
          <sl-button variant="primary" size="large" :loading="isSearching" :disabled="!searchQuery" @click="performSearch">
            Search
          </sl-button>
        </div>
      </div>

      <div class="search-content">
        <div class="scope-section">
          <h3>Search Scope</h3>
          <p class="description">Select the authors, books, or chapters to search within.</p>
          <CorpusScopeSelector @add-materials="handleAddMaterials" />
        </div>

        <div class="materials-section">
          <h3>Selected Materials</h3>
          <div class="material-list">
            <div v-if="materials.length === 0" class="empty-material">
              No material added yet. Use the selector above to scope your search.
            </div>
            <div v-else class="material-items">
              <div
                  v-for="(item, index) in materials"
                  :key="index"
                  :class="['material-item', `material-item--${item.strategy}`]"
              >
                <div class="item-content">
                  <sl-icon :name="getItemIcon(item)" class="item-icon"></sl-icon>
                  <span class="item-label">{{ getItemLabel(item) }}</span>
                </div>
                <sl-button variant="text" size="small" @click="removeMaterial(index)">
                  <sl-icon name="x-lg" slot="prefix"></sl-icon>
                </sl-button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="searchResults.length > 0 || searchError || isSearching" class="results-section">
          <div class="results-header">
            <h3>Search Results</h3>
            <span v-if="searchResults.length > 0" class="results-count">
              Found {{ searchResults.length }} hits
            </span>
          </div>

          <div v-if="searchError" class="search-error">
            <sl-icon name="exclamation-triangle"></sl-icon>
            {{ searchError }}
          </div>

          <div v-if="isSearching" class="search-loading">
            <sl-spinner></sl-spinner>
            <span>Searching corpus...</span>
          </div>

          <div v-else-if="searchResults.length > 0" class="results-list">
            <div v-for="(hit, index) in searchResults" :key="index" class="search-hit">
              <div class="hit-meta">
                <span class="hit-book">{{ getBookTitle(hit.in_book) }}</span>
                <span class="hit-author">by {{ getAuthorName(hit.by_author) }}</span>
                <span class="hit-page">Page {{ hit.on_page }}</span>
              </div>
              <div class="hit-snippet" v-html="hit.html_highlighted"></div>
              <div class="hit-footer">
                <sl-badge variant="neutral" pill>Rank: {{ hit.rank.toFixed(4) }}</sl-badge>
              </div>
            </div>
          </div>

          <div v-else-if="!isSearching && searchQuery && !searchError" class="no-results">
            No matches found for "{{ searchQuery }}" in the selected scope.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useHead } from '@unhead/vue';
import CorpusScopeSelector from '../components/corpus/CorpusScopeSelector.vue';
import type { CorpusMaterialItem, SearchHit, SearchResponse } from '../types/library';
import { apiFetch } from '../api';
import { useLibraryStore } from '../stores/library';

useHead({
  title: 'Search | Palimpsest Engine',
});

const libraryStore = useLibraryStore();

onMounted(async () => {
  await Promise.all([
    libraryStore.fetchAuthors(),
    libraryStore.fetchBooks()
  ]);
});

const searchQuery = ref('');
const materials = ref<CorpusMaterialItem[]>([]);
const isSearching = ref(false);
const searchResults = ref<SearchHit[]>([]);
const searchError = ref<string | null>(null);

async function performSearch() {
  if (!searchQuery.value) return;

  isSearching.value = true;
  searchError.value = null;
  searchResults.value = [];

  try {
    const response = await apiFetch('/testbooks/api/v1/search/corpus/', {
      method: 'POST',
      body: JSON.stringify({
        expression: searchQuery.value,
        style: 'plain',
        corpus: {
          items: materials.value
        }
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data: SearchResponse = await response.json();
    searchResults.value = data.hits;
  } catch (err) {
    searchError.value = err instanceof Error ? err.message : 'An error occurred during search';
  } finally {
    isSearching.value = false;
  }
}

function getBookTitle(id: number) {
  const book = libraryStore.books.find(b => b.id === id);
  return book?.title || `Book #${id}`;
}

function getAuthorName(id: number) {
  const author = libraryStore.authors.find(a => a.id === id);
  return author?.abbrev || `Author #${id}`;
}

function handleAddMaterials(newItems: CorpusMaterialItem[]) {
  materials.value.push(...newItems);
}

function removeMaterial(index: number) {
  materials.value.splice(index, 1);
}

function getItemIcon(item: CorpusMaterialItem) {
  switch (item.type) {
    case 'author': return 'person';
    case 'book': return 'book';
    case 'section': return 'hash';
    default: return 'dot';
  }
}

function getItemLabel(item: CorpusMaterialItem) {
  if (item.type === 'author' && item.author) {
    return `Author: ${item.author.abbrev}`;
  }
  if (item.type === 'book' && item.book) {
    return `Book: ${item.book.abbrev} (${item.book.author_abbrev})`;
  }
  if (item.type === 'section' && item.section) {
    const subtree = item.section.subtree_strategy === 'tree' ? ' (and subchapters)' : '';
    return `Chapter: ${item.section.path_coded} in ${item.section.book_abbrev} (${item.section.author_abbrev})${subtree}`;
  }
  return 'Unknown item';
}
</script>

<style scoped>
.search-layout {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 80rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.logo-sidebar {
  position: absolute;
  top: 2rem;
  left: 1rem;
  width: 12rem;
  padding-top: 1rem;
}

.main-logo {
  width: 100%;
  height: auto;
  opacity: 0.9;
}

.search-page {
  box-sizing: border-box;
  width: min(100%, 48rem);
  margin: 0 auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.search-header {
  width: 100%;
}

.search-input-group {
  display: flex;
  gap: 0.5rem;
}

.search-input-group sl-input {
  flex: 1;
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1rem;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.results-count {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-hit {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--sl-border-radius-medium);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hit-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.85rem;
  align-items: center;
}

.hit-book {
  font-weight: 600;
  color: var(--color-accent);
}

.hit-author {
  color: var(--color-text-muted);
}

.hit-page {
  background-color: var(--color-bg-muted);
  padding: 0.1rem 0.4rem;
  border-radius: var(--sl-border-radius-small);
  color: var(--color-text);
}

.hit-snippet {
  font-family: var(--sl-font-serif, serif);
  line-height: 1.6;
  color: var(--color-text);
}

.hit-snippet :deep(em) {
  font-style: normal;
  font-weight: 600;
  background-color: var(--sl-color-warning-200);
  color: var(--sl-color-neutral-900);
  padding: 0 0.1rem;
  border-radius: 2px;
}

[data-theme="dark"] .hit-snippet :deep(em) {
  background-color: var(--sl-color-warning-800);
  color: var(--sl-color-warning-50);
}

.hit-footer {
  display: flex;
  justify-content: flex-end;
}

.search-loading, .search-error, .no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem;
  background-color: var(--color-bg-muted);
  border-radius: var(--sl-border-radius-medium);
  color: var(--color-text-muted);
}

.search-error {
  color: var(--sl-color-danger-700);
  background-color: var(--sl-color-danger-50);
}

[data-theme="dark"] .search-error {
  color: var(--sl-color-danger-200);
  background-color: var(--sl-color-danger-950);
}

.search-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.description {
  margin: 0 0 1rem 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.material-list {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--sl-border-radius-medium);
  min-height: 100px;
}

.material-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
}

.material-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: var(--sl-border-radius-small);
  font-size: 0.9rem;
}

.material-item--include {
  background-color: var(--sl-color-success-50);
  border-left: 4px solid var(--sl-color-success-600);
  color: var(--sl-color-success-900);
}

[data-theme="dark"] .material-item--include {
  background-color: var(--sl-color-success-950);
  color: var(--sl-color-success-200);
}

.material-item--exclude {
  background-color: var(--sl-color-warning-50);
  border-left: 4px solid var(--sl-color-warning-600);
  color: var(--sl-color-warning-900);
}

[data-theme="dark"] .material-item--exclude {
  background-color: var(--sl-color-warning-950);
  color: var(--sl-color-warning-200);
}

.item-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.item-icon {
  font-size: 1.1rem;
  opacity: 0.7;
}

.empty-material {
  padding: 2rem;
  font-size: 0.9rem;
  color: var(--color-text-dimmed);
  font-style: italic;
  text-align: center;
}

@media (max-width: 900px) {
  .search-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }

  .logo-sidebar {
    position: static;
    width: 8rem;
    padding-top: 0;
  }

  .search-page {
    width: 100%;
  }
}
</style>
