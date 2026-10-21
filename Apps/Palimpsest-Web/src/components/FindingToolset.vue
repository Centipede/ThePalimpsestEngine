<template>
  <sl-dialog
    :label="`Finding: ${finding?.name}`"
    :open="open"
    @sl-request-close="$emit('update:open', false)"
    class="finding-toolset-dialog"
  >
    <div v-if="loadingContext" class="loading-state">
      <sl-spinner></sl-spinner>
      <p>Loading finding details...</p>
    </div>
    <div v-else-if="findingContext" class="toolset-content">
      <section class="current-identity">
        <h3 class="section-title">Current Identity</h3>
        <div v-if="foundIdentity" class="identity-card">
          <div class="identity-info">
            <p class="identity-name"><strong>Name:</strong> {{ foundIdentity.name }}</p>
            <p class="identity-qid"><strong>Wikidata:</strong> <a :href="`https://www.wikidata.org/wiki/${foundIdentity.wikidata_qid}`" target="_blank">{{
                foundIdentity.wikidata_qid
              }}
              <sl-icon name="box-arrow-up-right"></sl-icon></a></p>
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
                <div class="result-title">{{ result.titlesnippet }}</div>
                <div class="result-qid">{{ result.title }}</div>
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
async function loadFatFinding() {
  if (!props.finding) return;
  loadingContext.value = true;
  try {
    const response = await apiFetch(`/testbooks/api/v1/finding-context/${props.finding.id}/`);
    if (response.ok) {
      findingContext.value = await response.json();
      searchQuery.value = findingContext.value?.name || '';
    }
  } catch (error) {
    console.error('Failed to load finding details:', error);
  } finally {
    loadingContext.value = false;
  }
}

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
    loadFatFinding();
    showSearch.value = false;
    searchResults.value = [];
    hasSearched.value = false;
  }
});
</script>

<style scoped>
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
  max-height: 300px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-small);
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.result-title {
  font-weight: 600;
}

.result-qid {
  font-size: 0.8rem;
  color: var(--sl-color-neutral-500);
}

.no-results {
  text-align: center;
  color: var(--sl-color-neutral-500);
  font-style: italic;
}
</style>
