<template>
  <Teleport to=".nav-mid-title-portal">
    Search
  </Teleport>

  <div class="search-layout">
    <div class="search-page">
      <div class="search-header">
        <div class="search-input-group">
          <sl-input
              v-model="searchQuery"
              placeholder="Type your search query here..."
              clearable
              @sl-input="searchError = null"
              @keydown.enter="performSearch"
          >
            <sl-icon name="search" slot="prefix"></sl-icon>
          </sl-input>
          <sl-input
              v-model.number="numResults"
              type="number"
              min="1"
              class="num-results-input"
              placeholder="Num. results"
          >
            <sl-icon name="hash" slot="prefix"></sl-icon>
          </sl-input>
          <sl-select v-model="searchStyle" class="style-selector">
            <sl-option value="plain">Plain words</sl-option>
            <sl-option value="phrase">Phrase</sl-option>
            <sl-option value="raw">Raw PostgreSQL expression</sl-option>
            <sl-option value="websearch">Web search expression</sl-option>
          </sl-select>
          <sl-button v-if="isSearching" variant="neutral" outline @click="cancelSearch">
            Cancel
          </sl-button>
          <sl-button variant="primary" :loading="isSearching" :disabled="!searchQuery" @click="performSearch">
            Search
          </sl-button>
        </div>
      </div>

      <div class="search-content">
        <div class="search-config">
          <div class="scope-section">
            <CorpusScopeSelector @add-materials="handleAddMaterials" />
          </div>

          <div class="materials-section">
            <div class="column-header">Picked material</div>
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
        </div>

        <div v-if="searchResults.length > 0 || searchError || isSearching" class="results-section">
          <div class="results-header">
            <h3>Search Results <span v-if="!isSearching">{{ searchResults.length }}</span></h3>
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
            <sl-button variant="text" size="small" @click="cancelSearch">Cancel search</sl-button>
          </div>

          <div v-else-if="searchResults.length > 0" class="results-list">
            <SearchHitItem
                v-for="(hit, index) in searchResults"
                :key="index"
                :hit="hit"
                :index="index"
            />
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
import SearchHitItem from '../components/corpus/SearchHitItem.vue';
import type { CorpusMaterialItem, SearchHit, SearchResponse, SearchStyle } from '../types/library';
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
const numResults = ref(100);
const searchStyle = ref<SearchStyle>('plain');
const materials = ref<CorpusMaterialItem[]>([]);
const isSearching = ref(false);
const searchResults = ref<SearchHit[]>([]);
const searchError = ref<string | null>(null);
const searchAbortController = ref<AbortController | null>(null);

function cancelSearch() {
  if (searchAbortController.value) {
    searchAbortController.value.abort();
    searchAbortController.value = null;
  }
}

async function performSearch() {
  if (!searchQuery.value) return;

  cancelSearch();

  isSearching.value = true;
  searchError.value = null;
  searchResults.value = [];

  searchAbortController.value = new AbortController();

  try {
    const response = await apiFetch('/testbooks/api/v1/search/corpus/', {
      method: 'POST',
      signal: searchAbortController.value.signal,
      body: JSON.stringify({
        expression: searchQuery.value,
        style: searchStyle.value,
        num_results: numResults.value,
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
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log('Search aborted');
    } else {
      searchError.value = err instanceof Error ? err.message : 'An error occurred during search';
    }
  } finally {
    isSearching.value = false;
    searchAbortController.value = null;
  }
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
  box-sizing: border-box;
  width: 100%;
  margin: 0 auto;
  padding: 1rem;
}

.search-page {
  box-sizing: border-box;
  width: 100%;
  margin: 0 auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-header {
  width: 100%;
  margin: 0 auto;
}

.search-input-group {
  display: flex;
  gap: 0.5rem;
}

.search-input-group sl-input {
  flex: 1;
}

.num-results-input {
  width: 100px;
}

.style-selector {
  width: 180px;
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
  gap: 1rem;
}

.search-config {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.scope-section {
  flex: 5;
}

.materials-section {
  flex: 1;
  min-width: 200px;
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
  height: 500px;
  overflow-y: auto;
}

.material-items {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
}

.material-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.2rem 0.5rem;
  border-radius: var(--sl-border-radius-small);
  font-size: 0.85rem;
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

  .search-page {
    width: 100%;
  }
}

@media (max-width: 1200px) {
  .search-config {
    flex-direction: column;
    gap: 2rem;
  }

  .materials-section {
    width: 100%;
  }
}
</style>
