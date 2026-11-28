<template>
  <div class="overview">
    <header class="view-header">
      <h2>Findings</h2>
      <span class="view-header__count">{{ headline }}</span>
      <sl-button v-if="hasFilters" size="small" variant="default" @click="clearFilters">
        <sl-icon slot="prefix" name="x-lg"></sl-icon>
        Clear filters
      </sl-button>
    </header>

    <!-- Page-level write failures only. The accept race gets its own alert inside
         column 3, beside the button that caused it. -->
    <sl-alert
      v-if="writeError"
      variant="danger"
      open
      closable
      @sl-after-hide="writeError = ''"
    >
      <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
      {{ writeError }}
    </sl-alert>

    <IdentityCandidateFilters
      class="overview__filters"
      :filters="filters"
      :books="libraryStore.books"
      :facets="facetsStore.facetQueries"
      @update="patchFilters"
    />

    <div class="overview__columns">
      <IdentityColumn
        class="overview__column"
        :groups="identityGroups"
        :selected-id="selectedIdentityId"
        :pinned-identity="pinnedIdentity"
        :pinned-context-name="pinnedContextName"
        :is-loading="identities.isLoading.value"
        :show-loading="identitiesFirstLoad"
        :error="identities.error.value"
        :body-open="identityBodyOpen"
        :found-in-open="foundInOpen"
        :found-in="foundIn"
        :found-in-loading="foundInLoading"
        :found-in-error="foundInError"
        :open-book-ids="openBookIds"
        :open-section-ids="openSectionIds"
        :range-label="identities.rangeLabel.value"
        :has-prev="identities.hasPrev.value"
        :has-next="identities.hasNext.value"
        :limit="identities.limit.value"
        @select="selectIdentity"
        @open-found-in="openFoundIn"
        @close-found-in="foundInOpen = false"
        @toggle-book="toggleBook"
        @toggle-section="toggleSection"
        @prev="identities.prev()"
        @next="identities.next()"
        @update:limit="identities.setLimit($event)"
      />

      <CandidateColumn
        class="overview__column"
        :candidates="candidates.items.value"
        :selected-id="selectedCandidateId"
        :has-target="hasTarget"
        :show-identity-name="inContextMode"
        :is-loading="candidates.isLoading.value"
        :show-loading="candidatesFirstLoad"
        :error="candidates.error.value"
        :range-label="candidates.rangeLabel.value"
        :has-prev="candidates.hasPrev.value"
        :has-next="candidates.hasNext.value"
        :limit="candidates.limit.value"
        @select="selectCandidate"
        @prev="candidates.prev()"
        @next="candidates.next()"
        @update:limit="candidates.setLimit($event)"
      />

      <CandidateDetailPanel
        class="overview__column overview__column--last"
        :candidate="candidateDetail"
        :loading="detailLoading"
        :load-error="detailError"
        :conflict="conflictError"
        :notice="decisionNotice"
        :busy="deciding"
        :pending-action="pendingAction"
        @accept="decide('accept')"
        @reject="decide('reject')"
        @dismiss="decide('dismiss')"
        @reload-candidate="reloadCandidate"
        @refresh-lists="refreshLists"
        @close-notice="decisionNotice = ''"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFacetsStore } from '../../stores/facets';
import { useLibraryStore } from '../../stores/library';
import { FindingActionError } from '../../api/http';
import {
  acceptCandidate,
  dismissCandidate,
  fetchCandidate,
  fetchCandidates,
  fetchFoundIdentities,
  fetchFoundIdentityRow,
  fetchFoundIn,
  rejectCandidate,
  type CandidateQuery,
  type IdentityQuery,
} from '../../api/identityMatches';
import type {
  CandidateBrief,
  CandidateDetail,
  FoundIdentityRow,
  FoundInTree,
  MatchFilters,
} from '../../types/identityMatches';
import { usePaginatedList } from '../../composables/usePaginatedList';
import {
  defaultFilters,
  parseFindingsQuery,
  toFindingsQuery,
} from '../../utils/findingCandidateQuery';
import IdentityCandidateFilters from './findings/IdentityCandidateFilters.vue';
import IdentityColumn, { type IdentityGroup } from './findings/IdentityColumn.vue';
import CandidateColumn from './findings/CandidateColumn.vue';
import CandidateDetailPanel from './findings/CandidateDetail.vue';

/**
 * The staff work area for identity matches: confirmed identities, what the background
 * scan proposes for the selected one, and the case for one proposal.
 *
 * The only component here that fetches or holds state. Its children are presentational,
 * which is what makes the whole screen mountable in a test with the API module mocked -
 * and the mount is the test that matters, because the ordering hazards in a file this
 * size type-check perfectly and only fail when run.
 */

const route = useRoute();
const router = useRouter();
const facetsStore = useFacetsStore();
const libraryStore = useLibraryStore();

/* ------------------------------------------------------------------- the filters */

/**
 * Seeded in setup, NOT in onMounted: usePaginatedList fires its first fetch as it is
 * created, a few lines below, so a filter arriving from the URL after that would send a
 * second request and briefly show the wrong page.
 */
const filters = ref<MatchFilters>(parseFindingsQuery(route.query as Record<string, unknown>));

const selectedIdentityId = ref<number | null>(filters.value.identityId);
const selectedCandidateId = ref<number | null>(null);
const pinnedIdentity = ref<FoundIdentityRow | null>(null);
const pinnedContextName = ref('');

/** The inverted question: which identity might this unidentified finding be? */
const inContextMode = computed(() => filters.value.contextId !== null);

const hasTarget = computed(() =>
  selectedIdentityId.value !== null || filters.value.contextId !== null);

const identityQuery = computed<IdentityQuery>(() => ({
  facets: filters.value.facets,
  bookMn: filters.value.bookMn,
  q: filters.value.q.trim(),
  onlyWithCandidates: filters.value.onlyWithCandidates,
  order: filters.value.identityOrder,
  // Always: the dossier then rides on the row, so expanding one costs no request.
  includeDossier: true,
}));

const candidateQuery = computed<CandidateQuery>(() => ({
  // Exactly one of these. Sending both would leave it ambiguous which question column 2
  // is answering, and the server would have to pick for us.
  ofIdentity: inContextMode.value ? null : selectedIdentityId.value,
  ofContext: inContextMode.value ? filters.value.contextId : null,
  inBookMn: filters.value.bookMn,
  stages: filters.value.stages,
  verdict: filters.value.verdict,
  order: filters.value.candidateOrder,
}));

/* --------------------------------------------------------------------- the lists */

const identities = usePaginatedList<FoundIdentityRow>(
  (page, signal) => fetchFoundIdentities(identityQuery.value, page, signal),
);

const candidates = usePaginatedList<CandidateBrief>(
  (page, signal) => fetchCandidates(candidateQuery.value, page, signal),
  // Nothing to ask for until something is selected, and `of_identity`-less list of every
  // candidate in the corpus is not a question anyone asked.
  { immediate: false },
);

/**
 * The guard AdminTopicAssignments uses, for the same reason: a paging fetch flips
 * isLoading, and letting that take over the column would blank it on every click. The
 * spinner is only for the case where there is genuinely nothing on screen yet.
 */
const identitiesFirstLoad = computed(() =>
  identities.isLoading.value && identities.items.value.length === 0);

const candidatesFirstLoad = computed(() =>
  candidates.isLoading.value && candidates.items.value.length === 0);

/* -------------------------------------------------------------- column 1 grouping */

/**
 * The current page, under facet headers.
 *
 * Headers only under the facet ordering. Under name, pending or recent the rows are not
 * grouped by facet at all, so a facet heading would describe a grouping that is not
 * there - those render one flat list with the symbol on each row instead.
 *
 * Counts are labelled "on this page" in the template, never as a facet total: this knows
 * only the 25 rows it was handed.
 */
const identityGroups = computed<IdentityGroup[]>(() => {
  // The pin is rendered above the list, so a listing that happens to include it would
  // show the same identity twice - once explained, once not.
  const pinnedId = pinnedIdentity.value?.id;
  const rows = pinnedId === undefined
    ? identities.items.value
    : identities.items.value.filter(row => row.id !== pinnedId);

  if (filters.value.identityOrder !== 'facet') {
    return rows.length === 0 ? [] : [{ key: 'flat', label: '', symbol: '', identities: rows }];
  }

  const groups = new Map<number, IdentityGroup & { order: number }>();
  for (const row of rows) {
    const facetId = row.facet?.id ?? row.of_facet;
    let group = groups.get(facetId);
    if (!group) {
      // The brief's own symbol first; the store is the fallback for a payload that sent
      // no facet object, and '?' for a facet the store has never heard of.
      const stored = facetsStore.getFacetById(facetId);
      group = {
        key: `facet-${facetId}`,
        label: row.facet?.name || stored?.name || `Facet ${facetId}`,
        symbol: row.facet?.symbol || stored?.symbol || '❓',
        identities: [],
        order: row.facet?.order_key ?? facetId,
      };
      groups.set(facetId, group);
    }
    group.identities.push(row);
  }

  return [...groups.values()]
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map(({ order: _order, ...group }) => group);
});

const headline = computed(() => {
  const parts = [`${identities.count.value} ${identities.count.value === 1 ? 'identity' : 'identities'}`];
  if (hasTarget.value) {
    parts.push(`${candidates.count.value} ${candidates.count.value === 1 ? 'candidate' : 'candidates'}`);
  }
  return parts.join(' · ');
});

const hasFilters = computed(() => {
  const f = filters.value;
  return f.facets.length > 0 || f.bookMn !== null || f.q.trim() !== ''
    || f.onlyWithCandidates || f.identityOrder !== 'facet' || f.stages.length > 0
    || f.verdict !== 'pending' || f.candidateOrder !== 'best'
    || f.identityId !== null || f.contextId !== null;
});

/* ------------------------------------------------------------- the row's body */

/**
 * Whether the selected row shows its body. Held here rather than in the row so that one
 * flag can serve the listing and the pinned copy of the same identity, and so the
 * selection watcher below has a single place to put a newly picked row back open.
 */
const identityBodyOpen = ref(true);

/* ------------------------------------------------------- the found-in expander */

const foundInOpen = ref(false);
const foundIn = ref<FoundInTree | null>(null);
const foundInLoading = ref(false);
const foundInError = ref('');
/** The id the tree in hand belongs to, so a late reply for an old row is discarded. */
let foundInFor: number | null = null;

/**
 * Held here rather than inside the tree so they survive the refetch an accepted
 * candidate triggers: the tree is replaced wholesale, and a local Set would collapse
 * every book the instant a decision landed.
 */
const openBookIds = ref(new Set<number>());
const openSectionIds = ref(new Set<number>());

/**
 * Replaced rather than mutated: a template handler receives the unwrapped Set, so there
 * is no ref to reach through from there, and assigning a fresh Set is also the one way
 * a watcher on it would fire reliably.
 */
function toggleBook(bookId: number) {
  const next = new Set(openBookIds.value);
  if (next.has(bookId)) next.delete(bookId); else next.add(bookId);
  openBookIds.value = next;
}

function toggleSection(sectionId: number) {
  const next = new Set(openSectionIds.value);
  if (next.has(sectionId)) next.delete(sectionId); else next.add(sectionId);
  openSectionIds.value = next;
}

async function loadFoundIn(identityId: number) {
  foundInFor = identityId;
  foundInLoading.value = true;
  foundInError.value = '';
  try {
    const tree = await fetchFoundIn(identityId);
    if (foundInFor !== identityId) return;
    foundIn.value = tree;
  } catch (e) {
    if (foundInFor !== identityId) return;
    foundInError.value = e instanceof Error ? e.message : 'The sections could not be loaded.';
  } finally {
    if (foundInFor === identityId) foundInLoading.value = false;
  }
}

/**
 * Fetched when the expander is first opened rather than with the selection: the tree
 * embeds every mention of every linked context, which for a well-travelled identity is
 * a large payload to pull on a click that may only have been a glance.
 */
function openFoundIn() {
  foundInOpen.value = true;
  const id = selectedIdentityId.value;
  if (id !== null && (foundInFor !== id || foundIn.value === null)) void loadFoundIn(id);
}

/* ------------------------------------------------------------ column 3's payload */

const candidateDetail = ref<CandidateDetail | null>(null);
const detailLoading = ref(false);
const detailError = ref('');
let detailFor: number | null = null;

async function loadCandidate(candidateId: number) {
  detailFor = candidateId;
  detailLoading.value = true;
  detailError.value = '';
  try {
    const detail = await fetchCandidate(candidateId);
    if (detailFor !== candidateId) return;
    candidateDetail.value = detail;
  } catch (e) {
    if (detailFor !== candidateId) return;
    detailError.value = e instanceof Error ? e.message : 'The candidate could not be loaded.';
  } finally {
    if (detailFor === candidateId) detailLoading.value = false;
  }
}

function reloadCandidate() {
  const id = selectedCandidateId.value;
  // Cleared first: the whole point is to see the current truth, and a stale conflict
  // message beside refreshed data reads as though it were still refusing.
  conflictError.value = '';
  if (id !== null) void loadCandidate(id);
}

/* -------------------------------------------------------------------- selection */

/** Ids, not objects: every refetch replaces every row, and an object would go stale. */
function selectIdentity(identityId: number) {
  /**
   * The row already selected: fold its body away and keep the selection. Columns 2 and 3
   * are keyed on the identity, not on whether its dossier is on screen, so folding buys
   * back room in column 1 without interrupting the work. The pin stays too - the
   * librarian has not navigated away from a deep link, they have folded it.
   */
  if (identityId === selectedIdentityId.value) {
    identityBodyOpen.value = !identityBodyOpen.value;
    return;
  }

  // Picking from the list leaves context mode and drops the pin: the URL should stop
  // claiming a deep link the librarian has navigated away from.
  if (inContextMode.value || filters.value.identityId !== null) {
    filters.value = { ...filters.value, identityId: null, contextId: null };
    pinnedIdentity.value = null;
    pinnedContextName.value = '';
  }
  selectedIdentityId.value = identityId;
}

function selectCandidate(candidateId: number) {
  selectedCandidateId.value = candidateId;
}

/* --------------------------------------------------------------------- decisions */

/** The three decisions, in the one spelling the API, the panel and the notices all use. */
type Decision = 'accept' | 'reject' | 'dismiss';

const deciding = ref(false);
const pendingAction = ref<Decision | null>(null);
const writeError = ref('');
const conflictError = ref('');
const decisionNotice = ref('');

async function refreshLists() {
  conflictError.value = '';
  await Promise.all([
    candidates.refresh(),
    identities.refresh(),
  ]);
}

const DECIDERS: Record<Decision, (id: number) => Promise<{ candidate: CandidateDetail }>> = {
  accept: acceptCandidate,
  reject: rejectCandidate,
  dismiss: dismissCandidate,
};

/** Past tense, for the failure sentence when the server gave none of its own. */
const DECISION_VERBS: Record<Decision, string> = {
  accept: 'accepted',
  reject: 'rejected',
  dismiss: 'dismissed',
};

/**
 * Accept, reject or dismiss, then put the screen back in step with the server.
 *
 * Non-optimistic, like the rest of the admin screens: nothing local changes before the
 * server has answered, so a refusal needs no rollback.
 */
async function decide(action: Decision) {
  const candidate = candidateDetail.value;
  if (!candidate || deciding.value) return;

  const id = candidate.id;
  // Remembered before the refetch, so the advance lands on whatever took this row's place.
  const index = candidates.items.value.findIndex(row => row.id === id);
  const subject = candidate.of_context?.name ?? 'the finding';
  const target = candidate.of_identity?.name ?? 'the identity';

  deciding.value = true;
  pendingAction.value = action;
  writeError.value = '';
  conflictError.value = '';

  try {
    const result = await DECIDERS[action](id);

    // Shown decided at once, so the panel does not blank between the two refetches.
    candidateDetail.value = result.candidate;
    /**
     * The dismiss sentence says what did NOT happen, deliberately: a librarian reaching for
     * it has just been told the finding is already linked, and the one thing they need to
     * know is that pressing it did not disturb that.
     */
    decisionNotice.value = {
      accept: `Accepted: “${subject}” is now ${target}.`,
      reject: `Rejected: “${subject}” is not ${target}.`,
      dismiss: `Dismissed: “${subject}” is off the list; nothing was changed.`,
    }[action];

    // Same offset, so a decision two hundred rows in does not throw the librarian back
    // to the first page.
    await candidates.refresh();

    /**
     * Advance to whatever now sits where the decided row was. Deciding is the whole
     * work of this screen and a list of seventy-two coarse candidates at two clicks
     * each is what makes people stop using it. The notice above says what just
     * happened, so the panel never changes silently.
     */
    const rows = candidates.items.value;
    const next = index >= 0 ? rows[index] ?? rows[rows.length - 1] : rows[0];
    selectedCandidateId.value = next?.id ?? null;
    if (!next) candidateDetail.value = null;

    // The counts moved whichever decision it was. On an accept the context also joined the
    // tree, so that is refetched too - but only if it is on screen to be looked at. A
    // dismiss writes nothing but the verdict, so the tree cannot have changed.
    const refreshes: Promise<unknown>[] = [identities.refresh()];
    if (action === 'accept' && foundInOpen.value && selectedIdentityId.value !== null) {
      refreshes.push(loadFoundIn(selectedIdentityId.value));
    }
    await Promise.all(refreshes);
  } catch (e) {
    /**
     * A 400 means the row in hand no longer describes the server's. On an accept that is
     * the race - the context was bound to another identity between the page being drawn
     * and the button being pressed - and on a dismiss it is a candidate deleted meanwhile.
     * Both want the same alert and the same two recovery actions, reload and refresh, so
     * this keys on the status rather than enumerating the messages.
     *
     * The server's sentence says which it was, and on an accept names the rival identity -
     * more than this screen knows - so it is shown exactly as written.
     */
    if (e instanceof FindingActionError && e.status === 400) {
      conflictError.value = e.message;
      // Put the lists right even so: the row is stale and the counts are wrong.
      await Promise.all([candidates.refresh(), identities.refresh()]);
    } else {
      writeError.value = e instanceof Error
        ? e.message
        : `The candidate could not be ${DECISION_VERBS[action]}.`;
    }
  } finally {
    deciding.value = false;
    pendingAction.value = null;
  }
}

/* ----------------------------------------------------------------- the deep link */

/**
 * Seed the pin from the URL.
 *
 * The listing has no id filter, so a chip naming identity 17 cannot be answered by
 * paging to it - it is fetched directly and shown above the list, labelled, so its
 * presence is explained rather than mysterious.
 */
async function seedPins() {
  const { identityId, contextId } = filters.value;

  if (identityId === null) {
    pinnedIdentity.value = null;
  } else if (pinnedIdentity.value?.id !== identityId) {
    pinnedIdentity.value = null;
    try {
      pinnedIdentity.value = await fetchFoundIdentityRow(identityId);
    } catch {
      // A dead link is not an error worth a banner: the screen still works, it simply
      // has nothing pinned, and the listing below is unaffected.
      pinnedIdentity.value = null;
    }
  }

  if (contextId === null) {
    pinnedContextName.value = '';
    return;
  }

  // The context's own name is not on any endpoint this screen calls, so it is taken
  // from the first candidate that mentions it - every one of them carries it.
  pinnedContextName.value = pinnedContextName.value || `Finding #${contextId}`;
}

watch(() => candidates.items.value, rows => {
  if (!inContextMode.value) return;
  const name = rows[0]?.of_context?.name;
  if (name) pinnedContextName.value = name;
});

/* ------------------------------------------------------------------- the wiring */

let qTimer: ReturnType<typeof setTimeout> | null = null;
let urlTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Which column a filter actually narrows. `bookMn` is in both queries and so reloads
 * both; the stage/verdict/order trio narrows column 2 alone, and reloading the
 * identities for it would be a wasted request on every click.
 */
const IDENTITY_KEYS: (keyof MatchFilters)[] = [
  'facets', 'bookMn', 'q', 'onlyWithCandidates', 'identityOrder',
];
const CANDIDATE_KEYS: (keyof MatchFilters)[] = [
  'bookMn', 'stages', 'verdict', 'candidateOrder',
];

function reloadFor(keys: (keyof MatchFilters)[]) {
  if (keys.some(key => IDENTITY_KEYS.includes(key))) void identities.reload();
  if (hasTarget.value && keys.some(key => CANDIDATE_KEYS.includes(key))) void candidates.reload();
}

/**
 * A partial from the filter bar.
 *
 * The search box is debounced and everything else is not: typing is a stream of
 * keystrokes, while a tag or a dropdown is one deliberate act that should answer at once.
 */
function patchFilters(patch: Partial<MatchFilters>) {
  const keys = Object.keys(patch) as (keyof MatchFilters)[];
  const typingOnly = keys.length === 1 && keys[0] === 'q';
  filters.value = { ...filters.value, ...patch };

  if (typingOnly) {
    if (qTimer) clearTimeout(qTimer);
    qTimer = setTimeout(() => { void identities.reload(); }, 250);
    return;
  }
  reloadFor(keys);
}

function clearFilters() {
  filters.value = defaultFilters();
  pinnedIdentity.value = null;
  pinnedContextName.value = '';
  void identities.reload();
  if (hasTarget.value) void candidates.reload();
}

/**
 * Keep the address bar in step, so the screen can be shared and survives a reload.
 *
 * `replace`, never `push`: with `push` every keystroke in the search box would become a
 * back-button stop and the browser's Back would walk the librarian backwards through
 * their own typing.
 */
watch(filters, value => {
  if (urlTimer) clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    void router.replace({ path: '/admin/findings', query: toFindingsQuery(value) });
  }, 400);
}, { deep: true });

/**
 * A deep link arriving while the screen is already mounted - `?identity=1` to
 * `?identity=2` reuses this component, so nothing would re-run without this.
 */
watch(() => [route.query.identity, route.query.context], () => {
  const incoming = parseFindingsQuery(route.query as Record<string, unknown>);
  if (incoming.identityId === filters.value.identityId
    && incoming.contextId === filters.value.contextId) return;

  filters.value = { ...filters.value, identityId: incoming.identityId, contextId: incoming.contextId };
  selectedIdentityId.value = incoming.identityId;
  pinnedContextName.value = '';
  void seedPins();
});

/** The selection changed: column 2 restarts, and column 3 has nothing to show yet. */
watch([selectedIdentityId, () => filters.value.contextId], () => {
  selectedCandidateId.value = null;
  candidateDetail.value = null;
  detailError.value = '';
  conflictError.value = '';
  decisionNotice.value = '';
  identityBodyOpen.value = true;
  foundInOpen.value = false;
  foundIn.value = null;
  foundInFor = null;
  openBookIds.value = new Set();
  openSectionIds.value = new Set();

  if (hasTarget.value) void candidates.reload();
});

watch(selectedCandidateId, id => {
  conflictError.value = '';
  if (id === null) {
    candidateDetail.value = null;
    detailFor = null;
    return;
  }
  void loadCandidate(id);
});

onBeforeUnmount(() => {
  if (qTimer) clearTimeout(qTimer);
  if (urlTimer) clearTimeout(urlTimer);
});

// Both cache on length and early-return, so the filter bar's own needs collapse into
// no-ops if something else already fetched them.
void facetsStore.fetchFacetQueries();
void libraryStore.fetchBooks();
void seedPins();
if (hasTarget.value) void candidates.reload();
</script>

<style scoped>
.overview {
  /* .admin-view is a stretched flex item of a `flex: 1; overflow: hidden` row, so it
     has a definite height and 100% resolves here. */
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  /* The named container everything below sizes itself against, the filter bar included.
     The window is the wrong ruler for this screen: the admin sidebar takes 220px and the
     gaps another 50, so a 1256px window leaves the three columns about 940. */
  container-type: inline-size;
  container-name: findings;
}

/* Never compressed by the columns below it. A wrapping flex bar that is handed less
   height than its rows need does not scroll - it draws its last row outside its own box,
   over whatever follows. */
.overview__filters {
  flex: none;
}

.view-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.view-header h2 {
  margin: 0;
}

.view-header__count {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.overview__columns {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(280px, 1fr) minmax(320px, 1.4fr);
  gap: 1rem;
}

.overview__column {
  min-width: 0;
  min-height: 0;
  padding-right: 1rem;
  border-right: 1px solid var(--sl-color-neutral-200);
}

.overview__column--last {
  padding-right: 0;
  border-right: none;
}

/* Three scrolling columns need a width this pane does not have once it is narrow.
   Stacked, each one gets a usable height of its own instead.

   The pane, not the window: as a window query this read 1100px and so fired about 280px
   late, leaving the columns cramped for a wide band of window sizes. 900px is the
   breakpoint the rest of the app uses. */
@container findings (max-width: 900px) {
  .overview__columns {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .overview__column {
    min-height: 20rem;
    padding-right: 0;
    border-right: none;
    border-bottom: 1px solid var(--sl-color-neutral-200);
  }
}
</style>
