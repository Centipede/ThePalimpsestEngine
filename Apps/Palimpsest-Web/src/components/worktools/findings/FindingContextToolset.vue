<template>
  <!-- The label reads the local copy, not the prop: a rename is held here until the
       dialog closes, so until then the prop still carries the old name. -->
  <sl-dialog
    :label="`Finding: ${editedContext?.name ?? findingContext?.name ?? ''}`"
    :open="open"
    @sl-request-close="$emit('update:open', false)"
    class="finding-toolset-dialog"
    style="--width: 90vw;"
  >
    <div v-if="editedContext" class="toolset-layout">
      <div class="toolset-column toolset-column--tools">
        <div class="column-header">Tools &amp; Lookup</div>
        <div class="toolset-content">
          <section class="finding-name">
            <h3 class="section-title">Name</h3>
            <div v-if="!isEditingName" class="name-display" @click="startEditingName">
              <span class="name-text">{{ editedContext.name }}</span>
              <sl-icon name="pencil" class="edit-icon"></sl-icon>
            </div>
            <div v-else class="name-edit">
              <sl-input
                ref="nameInput"
                :value="editedName"
                size="small"
                :disabled="isSavingName"
                @sl-input="editedName = ($event.target as HTMLInputElement).value"
                @sl-blur="saveName"
                @keydown.enter="saveName"
                @keydown.esc="cancelEditingName"
              ></sl-input>
            </div>
            <p v-if="nameError" class="inline-error">{{ nameError }}</p>
          </section>

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
                <p class="identity-wikipedia">
                  <sl-icon name="globe"></sl-icon>
                  <strong>Wikipedia:</strong>
                  <a v-if="foundIdentity.wikipedia_url" :href="foundIdentity.wikipedia_url" target="_blank">
                    Link
                    <sl-icon name="box-arrow-up-right"></sl-icon>
                  </a>
                  <span v-else>None</span>
                  <sl-button size="small" circle variant="text" class="retry-button" :loading="retryingWikipedia" @click="retryWikipedia">
                    <sl-icon name="arrow-clockwise"></sl-icon>
                  </sl-button>
                </p>
              </div>
              <div class="identity-actions">
                <sl-button size="small" @click="showSearch = !showSearch">
                  <sl-icon slot="prefix" :name="showSearch ? 'dash' : 'arrow-repeat'"></sl-icon>
                  {{ showSearch ? 'Cancel Relink' : 'Relink' }}
                </sl-button>
                <sl-button size="small" variant="danger" :loading="unlinking" @click="unlinkIdentityAction">
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
            <p v-if="identityError" class="inline-error">{{ identityError }}</p>
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
                @sl-input="searchQuery = ($event.target as HTMLInputElement).value"
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

        <OccurrenceTools
          v-if="editedContext.occurrences.length > 0"
          :context="editedContext"
          :sibling-contexts="siblingContexts ?? []"
          :selected-ids="selectedOccurrenceIds"
          @applied="handleApplied"
          @clear-selection="selectedOccurrenceIds = []"
        />

        <div class="occurrences-heading">
          <sl-checkbox
            v-if="editedContext.occurrences.length > 0"
            size="small"
            :checked="allOccurrencesSelected"
            :indeterminate="someOccurrencesSelected"
            @sl-change="toggleAllOccurrences(($event.target as HTMLInputElement).checked)"
          >
            Occurrences
          </sl-checkbox>
          <h3 v-else class="section-title">Occurrences</h3>
        </div>

        <div v-if="editedContext.occurrences.length > 0" class="occurrences-list">
          <div v-for="occ in editedContext.occurrences" :key="occ.id" class="occurrence-item">
            <div class="occurrence-header">
              <div class="occurrence-heading-left">
                <sl-checkbox
                  size="small"
                  :checked="selectedOccurrenceIds.includes(occ.id)"
                  @sl-change="setOccurrenceSelected(occ.id, ($event.target as HTMLInputElement).checked)"
                ></sl-checkbox>
                <span
                    class="occurrence-name clickable"
                    @click="useSuggestedName(occ.name)"
                    title="Search for this name in Wikidata"
                >{{ occ.name }}</span>
              </div>
              <span class="occurrence-page" v-if="occ.on_page">p. {{ occ.on_page }}</span>
            </div>
            <div class="occurrence-description" v-if="occ.description">{{ occ.description }}</div>
            <div class="occurrence-quote" v-if="occ.quote">
              <sl-icon name="quote"></sl-icon>
              <span class="quote-text">{{ occ.quote }}</span>
            </div>
            <div v-if="occ.extracted_data" class="occurrence-data">
              <pre>{{ JSON.stringify(occ.extracted_data, null, 2) }}</pre>
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
import { computed, nextTick, ref, watch } from 'vue';
import type { FindingContext, FoundIdentity } from '../../../types/library.ts';
import {
  FindingActionError,
  fetchFoundIdentity,
  linkIdentity,
  lookupWikidata,
  renameContext,
  retryWikipediaLink,
  unlinkIdentity,
  type WikidataCandidate,
} from '../../../api/findings.ts';
import OccurrenceTools from './OccurrenceTools.vue';

const props = defineProps<{
  open: boolean;
  findingContext: FindingContext | null;
  facetName: string | null;
  /** Other findings of the same facet in this section: the move destinations. */
  siblingContexts?: FindingContext[];
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  /** Something structural changed; the parent should refetch the section. */
  (e: 'changed'): void;
}>();

const editedContext = ref<FindingContext | null>(null);
const foundIdentity = ref<FoundIdentity | null>(null);
const showSearch = ref(false);
const searchQuery = ref('');
const searching = ref(false);
const searchResults = ref<WikidataCandidate[]>([]);
const hasSearched = ref(false);
const linkingQid = ref<string | null>(null);
const unlinking = ref(false);
const retryingWikipedia = ref(false);
const identityError = ref('');
const selectedOccurrenceIds = ref<number[]>([]);

const isEditingName = ref(false);
const editedName = ref('');
const isSavingName = ref(false);
const nameError = ref('');
const nameInput = ref<HTMLElement & { focus: () => void } | null>(null);

/**
 * Whether anything here has changed the section's data.
 *
 * The refresh is deliberately deferred to the close: fetchSection raises `loading`, and
 * the section body renders behind it, so a refresh mid-session tears this dialog down
 * along with the grid. Updating the local copy from each response instead lets the
 * librarian move several mentions in one sitting, and one refetch on close rebuilds the
 * grid properly - the responses carry no occurrences, so they could never do that.
 */
const isDirty = ref(false);

const uniqueOccurrenceNames = computed(() => {
  if (!editedContext.value) return [];
  const canonicalName = editedContext.value.name.toLowerCase();
  const names = new Set<string>();
  editedContext.value.occurrences.forEach(occ => {
    if (occ.name && occ.name.toLowerCase() !== canonicalName) {
      names.add(occ.name);
    }
  });
  return Array.from(names).sort();
});

const allOccurrencesSelected = computed(() => {
  const total = editedContext.value?.occurrences.length ?? 0;
  return total > 0 && selectedOccurrenceIds.value.length === total;
});

const someOccurrencesSelected = computed(() =>
  selectedOccurrenceIds.value.length > 0 && !allOccurrencesSelected.value);

function reseed(context: FindingContext) {
  editedContext.value = { ...context, occurrences: [...context.occurrences] };
  showSearch.value = false;
  searchResults.value = [];
  hasSearched.value = false;
  searchQuery.value = context.name;
  selectedOccurrenceIds.value = [];
  identityError.value = '';
  nameError.value = '';
  isEditingName.value = false;
}

/**
 * Watches the context as well as the open flag. A refetch triggered elsewhere can
 * replace or remove the finding this dialog is pointed at, and editing a context that
 * no longer exists is worse than closing.
 */
watch([() => props.open, () => props.findingContext], ([isOpen]) => {
  if (!isOpen) return;
  if (!props.findingContext) {
    emit('update:open', false);
    return;
  }
  reseed(props.findingContext);
}, { immediate: true });

/** The one refresh, on the way out. */
watch(() => props.open, (isOpen, wasOpen) => {
  if (wasOpen && !isOpen && isDirty.value) {
    isDirty.value = false;
    emit('changed');
  }
});

watch(
    () => editedContext.value?.of_identity,
    async (identityData) => {
      foundIdentity.value = null;

      if (!identityData) {
        return;
      }

      if (typeof identityData === 'object') {
        foundIdentity.value = identityData as FoundIdentity;
        return;
      }

      try {
        foundIdentity.value = await fetchFoundIdentity(identityData);
      } catch (error) {
        console.error('Failed to load identity:', error);
        foundIdentity.value = null;
      }
    }
);

function describe(e: unknown, fallback: string) {
  return e instanceof FindingActionError ? e.message : fallback;
}

/* ------------------------------------------------------------- occurrence ticks */

function setOccurrenceSelected(id: number, checked: boolean) {
  const next = new Set(selectedOccurrenceIds.value);
  if (checked) next.add(id); else next.delete(id);
  selectedOccurrenceIds.value = [...next];
}

function toggleAllOccurrences(checked: boolean) {
  selectedOccurrenceIds.value = checked
    ? (editedContext.value?.occurrences ?? []).map(o => o.id)
    : [];
}

/**
 * An operation finished: drop what left, and close if the finding itself went with it.
 */
function handleApplied(payload: { departedIds: number[]; contextDeleted: boolean }) {
  isDirty.value = true;
  selectedOccurrenceIds.value = [];

  if (payload.contextDeleted) {
    emit('update:open', false);
    return;
  }

  if (editedContext.value) {
    const departed = new Set(payload.departedIds);
    editedContext.value = {
      ...editedContext.value,
      occurrences: editedContext.value.occurrences.filter(o => !departed.has(o.id)),
    };
  }
}

/* -------------------------------------------------------------------- renaming */

function startEditingName() {
  editedName.value = editedContext.value?.name ?? '';
  nameError.value = '';
  isEditingName.value = true;
  nextTick(() => nameInput.value?.focus());
}

function cancelEditingName() {
  isEditingName.value = false;
  nameError.value = '';
}

async function saveName() {
  if (!isEditingName.value || isSavingName.value || !editedContext.value) return;

  const newName = editedName.value.trim();
  if (!newName || newName === editedContext.value.name) {
    isEditingName.value = false;
    return;
  }

  isSavingName.value = true;
  nameError.value = '';
  try {
    // The field is `name` to read and `name_probably` to write; the api module maps it.
    const updated = await renameContext(editedContext.value.id, newName);
    editedContext.value = { ...editedContext.value, name: updated.name ?? newName };
    isEditingName.value = false;
    isDirty.value = true;
  } catch (e) {
    nameError.value = describe(e, 'Renaming failed.');
  } finally {
    isSavingName.value = false;
  }
}

/* ------------------------------------------------------------------- identities */

async function performSearch() {
  if (!searchQuery.value) return;
  searching.value = true;
  hasSearched.value = true;
  try {
    const data = await lookupWikidata(searchQuery.value, props.facetName);
    searchResults.value = data.results || [];
  } catch (error) {
    console.error('Wikidata search failed:', error);
    searchResults.value = [];
  } finally {
    searching.value = false;
  }
}

function useSuggestedName(name: string) {
  searchQuery.value = name;
  showSearch.value = true;
  performSearch();
}

async function linkTo(qid: string) {
  if (!editedContext.value) return;
  linkingQid.value = qid;
  identityError.value = '';
  try {
    editedContext.value = await linkIdentity(editedContext.value.id, qid);
    showSearch.value = false;
    isDirty.value = true;
  } catch (e) {
    identityError.value = describe(e, 'Linking failed.');
  } finally {
    linkingQid.value = null;
  }
}

async function unlinkIdentityAction() {
  if (!editedContext.value) return;
  unlinking.value = true;
  identityError.value = '';
  try {
    editedContext.value = await unlinkIdentity(editedContext.value.id);
    showSearch.value = false;
    isDirty.value = true;
  } catch (e) {
    identityError.value = describe(e, 'Unlinking failed.');
  } finally {
    unlinking.value = false;
  }
}

async function retryWikipedia() {
  if (!editedContext.value) return;
  retryingWikipedia.value = true;
  identityError.value = '';
  try {
    editedContext.value = await retryWikipediaLink(editedContext.value.id);
    isDirty.value = true;
  } catch (e) {
    identityError.value = describe(e, 'Looking the Wikipedia article up again failed.');
  } finally {
    retryingWikipedia.value = false;
  }
}
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

.name-display {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.4rem;
  margin-left: -0.4rem;
  border-radius: var(--sl-border-radius-small);
  cursor: pointer;
}

.name-display:hover {
  background-color: var(--sl-color-neutral-100);
}

.name-text {
  font-size: 1rem;
  font-weight: 600;
}

.edit-icon {
  font-size: 0.8rem;
  opacity: 0;
  color: var(--sl-color-neutral-500);
  transition: opacity 0.15s ease;
}

.name-display:hover .edit-icon {
  opacity: 1;
}

.inline-error {
  margin: 0.4rem 0 0 0;
  font-size: 0.78rem;
  color: var(--sl-color-danger-600);
}

.occurrences-heading {
  margin-bottom: 0.75rem;
}

.occurrences-heading sl-checkbox::part(label) {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--sl-color-neutral-600);
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
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.occurrence-heading-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
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
  flex-shrink: 0;
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
  background: var(--color-surface);
  padding: 0.5rem;
  border-left: 3px solid var(--sl-color-neutral-300);
  line-height: 1.5;
}

.occurrence-quote sl-icon {
  flex-shrink: 0;
  margin-top: 0.2rem;
  color: var(--sl-color-neutral-400);
}

.occurrence-data {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: var(--color-surface);
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-small);
  font-family: var(--sl-font-mono);
  font-size: 0.8rem;
  overflow-x: auto;
}

.occurrence-data pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
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

.identity-wikipedia a {
  color: var(--sl-color-primary-600);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.retry-button {
  margin-left: 0.25rem;
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
