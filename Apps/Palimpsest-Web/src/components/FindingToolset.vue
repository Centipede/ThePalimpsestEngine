<template>
  <sl-dialog
    :label="`Finding: ${finding?.name}`"
    :open="open"
    @sl-request-close="$emit('update:open', false)"
    class="finding-toolset-dialog"
    style="--width: 90vw;"
  >
    <div v-if="loadingContext" class="loading-state">
      <sl-spinner></sl-spinner>
      <p>Loading finding details...</p>
    </div>
    <div v-else-if="findingContext" class="toolset-layout">
      <div class="toolset-column toolset-column--tools">
        <div class="column-header">Tools & Lookup</div>
        <div class="toolset-content">
          <section class="current-identity">
            <h3 class="section-title">Current Identity</h3>
            <div v-if="foundIdentity" class="identity-card">
              <div class="identity-info">
                <p class="identity-name">
                  <sl-icon name="person-badge"></sl-icon>
                  <strong>Name:</strong> {{ foundIdentity.name }}
                </p>
                <p class="identity-qid">
                  <sl-icon name="bank"></sl-icon>
                  <strong>Wikidata:</strong>
                  <a :href="`https://www.wikidata.org/wiki/${foundIdentity.wikidata_qid}`" target="_blank">
                    {{ foundIdentity.wikidata_qid }}
                    <sl-icon name="box-arrow-up-right"></sl-icon>
                  </a>
                </p>
              </div>
              <div class="identity-actions">
                <sl-button size="small" @click="showSearch = !showSearch">
                  <sl-icon slot="prefix" :name="showSearch ? 'dash' : 'arrow-repeat'"></sl-icon>
                  {{ showSearch ? 'Cancel Relink' : 'Relink' }}
                </sl-button>
                <sl-button size="small" variant="danger" :loading="unlinking" @click="unlinkIdentity">
                  <sl-icon slot="prefix" name="link-45deg"></sl-icon>
                  Unlink
                </sl-button>
              </div>
            </div>
            <div v-else class="no-identity">
              <p>Not linked to any identity.</p>
              <sl-button size="small" variant="primary" @click="showSearch = true" v-if="!showSearch">
                <sl-icon slot="prefix" name="link"></sl-icon>
                Link to Wikidata
              </sl-button>
            </div>
          </section>

          <section v-if="showSearch" class="wikidata-search-section">
            <sl-divider></sl-divider>
            <h3 class="section-title">Wikidata Lookup</h3>

            <div v-if="uniqueOccurrenceNames.length > 0" class="search-suggestions">
              <span class="suggestions-label">Try alternative names:</span>
              <div class="suggestions-list">
                <sl-button
                    v-for="name in uniqueOccurrenceNames"
                    :key="name"
                    size="small"
                    pill
                    @click="useSuggestedName(name)"
                >
                  {{ name }}
                </sl-button>
              </div>
            </div>

            <div class="search-controls">
              <sl-input
                placeholder="Search query..."
                :value="searchQuery"
                @sl-input="searchQuery = $event.target.value"
                @keydown.enter="performSearch"
                clearable
              ></sl-input>
              <sl-button variant="primary" :loading="searching" @click="performSearch">
                Search
              </sl-button>
            </div>

            <div class="search-results">
              <div v-if="searching" class="searching-state">
                <sl-spinner></sl-spinner>
              </div>
              <template v-else-if="searchResults.length > 0">
                <div v-for="result in searchResults" :key="result.title" class="search-result-item">
                  <div class="result-info">
                    <div class="result-title" v-html="result.titlesnippet"></div>
                    <div class="result-snippet" v-if="result.snippet" v-html="result.snippet"></div>
                    <div class="result-links">
                      <span class="result-qid">{{ result.title }}</span>
                      <a :href="`https://www.wikidata.org/wiki/${result.title}`" target="_blank" class="wikidata-link">
                        wikidata <sl-icon name="box-arrow-up-right"></sl-icon>
                      </a>
                    </div>
                  </div>
                  <sl-button size="small" :loading="linkingQid === result.title" @click="linkTo(result.title)">
                    Link to this
                  </sl-button>
                </div>
              </template>
              <p v-else-if="hasSearched" class="no-results">No candidates found.</p>
            </div>
          </section>
        </div>
      </div>

      <div class="toolset-column toolset-column--occurrences">
        <div class="column-header">Text Mentions</div>
        <h3 class="section-title">Occurrences</h3>
        <div v-if="findingContext.occurrences && findingContext.occurrences.length > 0" class="occurrences-list">
          <div v-for="occ in findingContext.occurrences" :key="occ.id" class="occurrence-item">
            <div class="occurrence-header">
              <span
                  class="occurrence-name clickable"
                  @click="useSuggestedName(occ.name)"
                  title="Search for this name in Wikidata"
              >{{ occ.name }}</span>
              <span class="occurrence-page" v-if="occ.on_page">p. {{ occ.on_page }}</span>
            </div>
            <div class="occurrence-description" v-if="occ.description">{{ occ.description }}</div>
            <div class="occurrence-quote" v-if="occ.quote">
              <sl-icon name="quote"></sl-icon>
              <span class="quote-text">{{ occ.quote }}</span>
            </div>
          </div>
        </div>
        <div v-else class="no-occurrences">
          <p>No occurrences found in the text.</p>
        </div>
      </div>
    </div>

    <sl-button slot="footer" variant="default" @click="$emit('update:open', false)">Close</sl-button>
  </sl-dialog>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import type {FindingContext, FoundIdentity} from '../types/library';
import { apiFetch } from '../api';

const props = defineProps<{
  open: boolean;
  finding: FindingContext | null;
  facetName: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'linked'): void;
}>();

const findingContext = ref<FindingContext | null>(null);
const loadingContext = ref(false);
const foundIdentity = ref<FoundIdentity | null>(null);
const loadingIdentity = ref(false);
const showSearch = ref(false);
const searchQuery = ref('');
const searching = ref(false);
const searchResults = ref<any[]>([]);
const hasSearched = ref(false);
const linkingQid = ref<string | null>(null);
const unlinking = ref(false);

const uniqueOccurrenceNames = computed(() => {
  if (!findingContext.value) return [];
  const canonicalName = findingContext.value.name.toLowerCase();
  const names = new Set<string>();
  findingContext.value.occurrences.forEach(occ => {
    if (occ.name && occ.name.toLowerCase() !== canonicalName) {
      names.add(occ.name);
    }
  });
  return Array.from(names).sort();
});

function useSuggestedName(name: string) {
  searchQuery.value = name;
  showSearch.value = true;
  performSearch();
}

watch(
    () => findingContext.value?.of_identity,
    async (identityId) => {
      foundIdentity.value = null;

      if (!identityId || typeof identityId === 'object') {
        return;
      }

      loadingIdentity.value = true;

      try {
        const response = await apiFetch(`/testbooks/api/v1/found-identity/${identityId}`);

        if (response.ok) {
          foundIdentity.value = await response.json() as FoundIdentity;
        }
      } catch (error) {
        console.error('Failed to load identity:', error);
        foundIdentity.value = null;
      } finally {
        loadingIdentity.value = false;
      }
    }
);

async function performSearch() {
  if (!searchQuery.value) return;
  searching.value = true;
  hasSearched.value = true;
  try {
    const url = new URL('/testbooks/api/v1/lookup/wikidata/', window.location.origin);
    url.searchParams.append('query', searchQuery.value);
    if (props.facetName) {
      url.searchParams.append('facet', props.facetName);
    }
    
    const response = await apiFetch(url.toString());
    if (response.ok) {
      const data = await response.json();
      searchResults.value = data.results || [];
    }
  } catch (error) {
    console.error('Wikidata search failed:', error);
  } finally {
    searching.value = false;
  }
}

async function linkTo(qid: string) {
  if (!props.finding) return;
  linkingQid.value = qid;
  try {
    const response = await apiFetch(`/testbooks/api/v1/finding-context/${props.finding.id}/link_identity/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wikidata_id: qid })
    });
    
    if (response.ok) {
      findingContext.value = await response.json();
      showSearch.value = false;
      emit('linked');
    }
  } catch (error) {
    console.error('Linking failed:', error);
  } finally {
    linkingQid.value = null;
  }
}

async function unlinkIdentity() {
  if (!props.finding) return;
  unlinking.value = true;
  try {
    const response = await apiFetch(`/testbooks/api/v1/finding-context/${props.finding.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ of_identity: null })
    });

    if (response.ok) {
      findingContext.value = await response.json();
      showSearch.value = false;
      emit('linked');
    }
  } catch (error) {
    console.error('Unlinking failed:', error);
  } finally {
    unlinking.value = false;
  }
}

watch(() => props.open, (newVal) => {
  if (newVal) {
    findingContext.value = { ...props.finding! };
    showSearch.value = false;
    searchResults.value = [];
    hasSearched.value = false;
    searchQuery.value = findingContext.value?.name || '';
  }
});
</script>

<style scoped>
.finding-toolset-dialog::part(panel) {
  height: 90vh;
}

.finding-toolset-dialog::part(body) {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.toolset-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  height: 100%;
  overflow: hidden;
}

.toolset-column {
  height: 100%;
  overflow-y: auto;
  padding: 1rem 1.5rem;
}

.column-header {
  margin-bottom: 1.5rem;
}

.toolset-column--tools {
  border-right: 1px solid var(--sl-color-neutral-200);
}

.occurrences-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.occurrence-item {
  padding: 1rem;
  background: var(--sl-color-neutral-50);
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-medium);
}

.occurrence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.occurrence-name {
  font-weight: 600;
  color: var(--sl-color-neutral-900);
}

.occurrence-name.clickable {
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 3px;
  color: var(--sl-color-primary-600);
}

.occurrence-name.clickable:hover {
  color: var(--sl-color-primary-500);
  text-decoration: underline;
}

.occurrence-page {
  font-size: 0.8rem;
  color: var(--sl-color-neutral-500);
}

.occurrence-description {
  font-size: 0.85rem;
  color: var(--sl-color-neutral-700);
  margin-bottom: 0.75rem;
  font-style: italic;
}

.occurrence-quote {
  display: flex;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--sl-color-neutral-600);
  background: white;
  padding: 0.5rem;
  border-left: 3px solid var(--sl-color-neutral-300);
  line-height: 1.5;
}

.occurrence-quote sl-icon {
  flex-shrink: 0;
  margin-top: 0.2rem;
  color: var(--sl-color-neutral-400);
}

.no-occurrences {
  text-align: center;
  padding: 2rem;
  color: var(--sl-color-neutral-500);
  font-style: italic;
}

.loading-state, .searching-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 1rem;
}

.toolset-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: var(--sl-color-neutral-600);
}

.search-suggestions {
  margin-bottom: 1rem;
}

.suggestions-label {
  display: block;
  font-size: 0.75rem;
  color: var(--sl-color-neutral-500);
  margin-bottom: 0.5rem;
}

.suggestions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.identity-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: var(--sl-color-neutral-50);
  padding: 1rem;
  border-radius: var(--sl-border-radius-medium);
  border: 1px solid var(--sl-color-neutral-200);
}

.identity-info p {
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.identity-info sl-icon {
  color: var(--sl-color-neutral-400);
}

.identity-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.identity-qid a {
  color: var(--sl-color-primary-600);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.no-identity {
  text-align: center;
  padding: 1rem;
  background: var(--sl-color-neutral-50);
  border: 1px dashed var(--sl-color-neutral-300);
  border-radius: var(--sl-border-radius-medium);
}

.search-controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 600px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem;
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-small);
  gap: 0.5rem;
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.result-title {
  font-weight: 600;
  line-height: 1.4;
}

.result-snippet {
  font-size: 0.85rem;
  color: var(--sl-color-neutral-600);
  line-height: 1.4;
}

.result-links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.result-qid {
  font-size: 0.75rem;
  color: var(--sl-color-neutral-500);
  font-family: var(--sl-font-mono);
}

.wikidata-link {
  font-size: 0.75rem;
  color: var(--sl-color-primary-600);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.wikidata-link:hover {
  text-decoration: underline;
}

:deep(.searchmatch) {
  font-weight: 600;
  color: var(--sl-color-neutral-900);
  background-color: var(--sl-color-warning-100);
  padding: 0 0.1rem;
  border-radius: 2px;
}

.no-results {
  text-align: center;
  color: var(--sl-color-neutral-500);
  font-style: italic;
}
</style>
