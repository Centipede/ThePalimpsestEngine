<script setup lang="ts">
import { ref } from 'vue';
import { useHead } from '@unhead/vue';
import CorpusScopeSelector from '../components/corpus/CorpusScopeSelector.vue';
import type { CorpusMaterialItem } from '../types/library';

useHead({
  title: 'Search | Palimpsest Engine',
});

const searchQuery = ref('');
const materials = ref<CorpusMaterialItem[]>([]);

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
        <sl-input
          v-model="searchQuery"
          placeholder="Type your search query here..."
          size="large"
          clearable
        >
          <sl-icon name="search" slot="prefix"></sl-icon>
        </sl-input>
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
      </div>
    </div>
  </div>
</template>

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
  color: var(--sl-color-neutral-600);
  font-size: 0.9rem;
}

.material-list {
  background-color: white;
  border: 1px solid var(--sl-color-neutral-200);
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

.material-item--exclude {
  background-color: var(--sl-color-warning-50);
  border-left: 4px solid var(--sl-color-warning-600);
  color: var(--sl-color-warning-900);
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
  color: var(--sl-color-neutral-400);
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
