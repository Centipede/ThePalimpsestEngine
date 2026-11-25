// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readonly, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { useFacetsStore } from '../../stores/facets';
import { FindingActionError } from '../../api/http';
import type {
  CandidateBrief,
  CandidateDetail,
  FoundIdentityRow,
  FoundInTree,
} from '../../types/identityMatches';
import type { FacetQuery } from '../../types/library';

/**
 * A mount test for the work area, in the spirit of SectionFindings.dom.test.ts: the
 * ordering hazards in a component this size - a watcher whose source reads a const
 * declared below it, a store reached before it is active - type-check perfectly and fail
 * only when run.
 *
 * Beyond mounting, what is asserted here is mostly *what the screen asks the server for*.
 * The param names and the singular/plural facet convention are where the bugs in this
 * feature live, and a wrong one fails silently against a real backend: DRF ignores a
 * filter it does not recognise and cheerfully returns everything.
 */

const isStaff = ref(true);
vi.mock('../../composables/useAuth', () => ({
  useAuth: () => ({
    isStaff: readonly(isStaff),
    token: readonly(ref<string | null>('test-token')),
    isAuthenticated: readonly(ref(true)),
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const api = vi.hoisted(() => ({
  fetchFoundIdentities: vi.fn(),
  fetchFoundIdentityRow: vi.fn(),
  fetchFoundIn: vi.fn(),
  fetchCandidates: vi.fn(),
  fetchCandidate: vi.fn(),
  acceptCandidate: vi.fn(),
  rejectCandidate: vi.fn(),
  dossierSummaries: vi.fn(),
}));

vi.mock('../../api/identityMatches', () => ({
  ...api,
  // The real one: a pure accessor, and the dossier panel's whole content depends on it.
  dossierSummaries: (row: FoundIdentityRow | null | undefined) => ({
    corpus: (row?.llm_corpus ?? '').trim(),
    wikipedia: (row?.llm_wikipedia ?? '').trim(),
    any: !!(row?.llm_corpus ?? row?.llm_wikipedia),
  }),
}));

// The book list is only needed for the filter dropdown.
vi.mock('../../stores/library', () => ({
  useLibraryStore: () => ({ books: [], fetchBooks: vi.fn() }),
}));

import FindingCandidateOverview from './FindingCandidateOverview.vue';

/* ------------------------------------------------------------------- fixtures */

function facet(id: number, singular: string, plural: string, symbol: string): FacetQuery {
  return {
    id,
    name: plural.charAt(0).toUpperCase() + plural.slice(1),
    machine_name_singular: singular,
    machine_name_plural: plural,
    symbol,
    prose_description: null,
    query_block: null,
    query_section_one: null,
    query_section_few: null,
    query_section_many: null,
    query_data: 'full_text',
    schema_scratchpad: null,
    schema_section_one: null,
    schema_section_few: null,
    schema_section_many: null,
  };
}

function identityRow(over: Partial<FoundIdentityRow> = {}): FoundIdentityRow {
  return {
    id: 17,
    name: 'Leopold I',
    wikidata_qid: 'Q150682',
    wikipedia_url: 'https://en.wikipedia.org/wiki/Leopold_I',
    wikimedia_url: null,
    properties: {},
    of_facet: 3,
    dossier_built_at: '2026-11-22T10:12:00Z',
    facet: {
      id: 3,
      name: 'People',
      machine_name_singular: 'person',
      machine_name_plural: 'people',
      symbol: '🧑',
      order_key: 10,
    },
    candidate_counts: { basis: 'identity', of: 17, compared: 3, triage: 72 },
    has_dossier: true,
    context_count: 5,
    book_count: 2,
    llm_corpus: 'Appears as an adviser to the King in three chapters.',
    llm_wikipedia: 'Holy Roman Emperor, 1658-1705.',
    ...over,
  };
}

function candidateBrief(over: Partial<CandidateBrief> = {}): CandidateBrief {
  return {
    id: 890,
    of_identity: { id: 17, name: 'Leopold I', of_facet: 3 },
    of_context: { id: 501, name: 'Emperor Leopold', of_facet: 'person', of_identity: null },
    of_facet: 'person',
    in_book_mn: 'belu-soconreal',
    in_section_pf: 'main.part3.ch9',
    in_book: { id: 44, machine_name: 'belu-soconreal', abbrev: 'SoConReal', title: 'Some Book' },
    in_section: { id: 412, path_full: 'main.part3.ch9', path_coded: 'III.9', title: 'Chapter IX' },
    occurrence_count: 2,
    stage: 'compared',
    triage_probability: 0.83,
    probability: 0.91,
    verdict: 'pending',
    reasoning_preview: 'The candidate is likely the same person because…',
    suggested_at: '2026-11-22T10:12:00Z',
    decided_at: null,
    ...over,
  };
}

function candidateDetail(over: Partial<CandidateDetail> = {}): CandidateDetail {
  const { of_context: _ignored, ...brief } = candidateBrief();
  return {
    ...brief,
    of_context: {
      id: 501,
      name: 'Emperor Leopold',
      of_facet: 'person',
      of_identity: null,
      occurrences: [
        // Reading order, which is NOT lexicographic. The screen must not re-sort these.
        {
          id: 9001, name: 'Leopold', description: 'Advises the King.',
          quote: 'Leopold advised the King', in_block_pi: '2.p', on_page: 123,
          of_context: 501, of_facet: 'person', extracted_data: null,
        },
        {
          id: 9002, name: 'the Emperor', description: 'Signs the treaty.',
          quote: 'the Emperor set his hand to it', in_block_pi: '10.p', on_page: 130,
          of_context: 501, of_facet: 'person', extracted_data: null,
        },
      ],
    },
    reasoning: 'Both describe an emperor advising a king in the same decade.',
    evidence: { decisive_quotes: ['Leopold advised the King'], model: 'test-model' },
    decided_by: null,
    ...over,
  };
}

function foundInTree(): FoundInTree {
  return {
    identity: {
      id: 17,
      name: 'Leopold I',
      wikidata_qid: 'Q150682',
      wikipedia_url: null,
      wikimedia_url: null,
      properties: {},
      of_facet: 3,
      dossier_built_at: null,
    },
    totals: { books: 1, sections: 1, contexts: 1, occurrences: 1 },
    books: [{
      id: 44,
      machine_name: 'belu-soconreal',
      abbrev: 'SoConReal',
      title: 'Some Book',
      section_count: 1,
      context_count: 1,
      occurrence_count: 1,
      sections: [{
        id: 412,
        title: 'Chapter IX',
        path_full: 'main.part3.ch9',
        path_coded: 'III.9',
        context_count: 1,
        occurrence_count: 1,
        contexts: [{
          id: 601, name: 'Leopold I', of_facet: 'person', occurrence_count: 1,
          occurrences: [{
            id: 7001, name: 'Leopold', description: 'Receives the envoy.',
            quote: 'the Emperor received him', in_block_pi: '4.p', on_page: 140,
            of_context: 601, of_facet: 'person', extracted_data: null,
          }],
        }],
      }],
    }],
    unplaced: [],
  };
}

/* ---------------------------------------------------------------------- harness */

function page<T>(results: T[], count = results.length) {
  return { results, count, offset: 0, limit: 25, hasMore: false };
}

let router: Router;

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  vi.clearAllMocks();
  setActivePinia(createPinia());
  const facets = useFacetsStore();
  facets.facetQueries = [facet(3, 'person', 'people', '🧑'), facet(4, 'place', 'places', '📍')];
  facets.fetchFacetQueries = vi.fn().mockResolvedValue(undefined);

  api.fetchFoundIdentities.mockResolvedValue(page([identityRow()]));
  api.fetchCandidates.mockResolvedValue(page([candidateBrief()]));
  api.fetchCandidate.mockResolvedValue(candidateDetail());
  api.fetchFoundIdentityRow.mockResolvedValue(identityRow());
  api.fetchFoundIn.mockResolvedValue(foundInTree());

  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/admin/findings', component: { template: '<div />' } },
    ],
  });
});

async function screen(query: Record<string, string> = {}) {
  await router.push({ path: '/admin/findings', query });
  await router.isReady();
  const wrapper = mount(FindingCandidateOverview, {
    global: {
      plugins: [router],
      config: { compilerOptions: { isCustomElement: (tag: string) => tag.startsWith('sl-') } },
    },
  });
  await flushPromises();
  return wrapper;
}

/* ------------------------------------------------------------------------ tests */

describe('FindingCandidateOverview', () => {
  it('mounts and lists the identities under their facet header', async () => {
    const wrapper = await screen();
    expect(wrapper.text()).toContain('Leopold I');
    expect(wrapper.text()).toContain('People');
    expect(wrapper.text()).toContain('1 identity');
  });

  it('asks for the dossier on the listing, so expanding a row costs no request', async () => {
    await screen();
    expect(api.fetchFoundIdentities).toHaveBeenCalledWith(
      expect.objectContaining({ includeDossier: true, order: 'facet' }),
      { limit: 25, offset: 0 },
      expect.anything(),
    );
  });

  it('asks for nothing in column 2 until something is selected', async () => {
    const wrapper = await screen();
    expect(api.fetchCandidates).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Pick a found identity');
  });

  it('sends the facet filter as plural machine names', async () => {
    // Singular here would silently return every facet: DRF ignores what it cannot parse.
    await screen({ facet: 'people,places' });
    expect(api.fetchFoundIdentities).toHaveBeenCalledWith(
      expect.objectContaining({ facets: ['people', 'places'] }),
      expect.anything(),
      expect.anything(),
    );
  });

  it('pins a deep-linked identity and keys column 2 on it', async () => {
    const wrapper = await screen({ identity: '17' });

    expect(api.fetchFoundIdentityRow).toHaveBeenCalledWith(17);
    expect(wrapper.text()).toContain('Linked from a section');
    expect(api.fetchCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ ofIdentity: 17, ofContext: null }),
      { limit: 25, offset: 0 },
      expect.anything(),
    );
  });

  it('shows the pinned identity its dossier without a second request', async () => {
    const wrapper = await screen({ identity: '17' });
    expect(wrapper.text()).toContain('Appears as an adviser to the King');
    expect(wrapper.text()).toContain('Holy Roman Emperor');
  });

  it('inverts for a context deep link, asking of_context and never of_identity', async () => {
    const wrapper = await screen({ context: '501' });

    expect(api.fetchFoundIdentityRow).not.toHaveBeenCalled();
    expect(api.fetchCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ ofContext: 501, ofIdentity: null }),
      expect.anything(),
      expect.anything(),
    );
    expect(wrapper.text()).toContain('Unidentified finding');
    // The headline is the proposed identity in this direction, not the finding.
    expect(wrapper.text()).toContain('Candidate identities');
  });

  it('drops the facet headers when the ordering is not by facet', async () => {
    // A facet heading over rows that are not grouped by facet is a lie about the order.
    const byFacet = await screen();
    expect(byFacet.text()).toContain('on this page');

    const byName = await screen({ order: 'name' });
    expect(byName.text()).not.toContain('on this page');
    expect(byName.text()).toContain('Leopold I');
  });

  it('shows a candidate its reasoning, evidence and mentions in payload order', async () => {
    const wrapper = await screen({ identity: '17' });
    await wrapper.find('.candidate').trigger('click');
    await flushPromises();

    expect(api.fetchCandidate).toHaveBeenCalledWith(890);
    expect(wrapper.text()).toContain('Both describe an emperor advising a king');
    expect(wrapper.text()).toContain('Decisive quotes');

    /**
     * `2.p` before `10.p`. Read off the rendered list rather than off the whole
     * column: the first quote is also a decisive quote, which renders above the list,
     * so searching the column's text would find that copy and pass whatever the list
     * did.
     */
    const names = wrapper.findAll('.occurrence-name').map(n => n.text());
    expect(names).toEqual(['Leopold', 'the Emperor']);
  });

  it('fetches the found-in tree only once the expander is opened', async () => {
    const wrapper = await screen({ identity: '17' });
    expect(api.fetchFoundIn).not.toHaveBeenCalled();

    await wrapper.find('.identity-row__found-in').trigger('sl-show');
    await flushPromises();

    expect(api.fetchFoundIn).toHaveBeenCalledWith(17);
    expect(wrapper.text()).toContain('Chapter IX');
    const open = wrapper.findAll('a').map(a => a.attributes('href'));
    expect(open).toContain('/study/belu-soconreal/section/main.part3.ch9');
  });

  it('folds the open row from its own header without dropping the selection', async () => {
    // Pinned by the deep link, and deduped out of the listing below it, so the one row
    // on screen is the pinned copy.
    const wrapper = await screen({ identity: '17' });
    expect(wrapper.findAll('.identity-row__body')).toHaveLength(1);
    const firstFetch = api.fetchCandidates.mock.calls.length;

    await wrapper.findAll('.identity-row__head')[0].trigger('click');
    expect(wrapper.findAll('.identity-row__body')).toHaveLength(0);

    // Folded, not deselected: column 2 is keyed on the identity and must not restart,
    // and the pin the URL asked for is still there.
    expect(wrapper.findAll('.identity-row--selected').length).toBeGreaterThan(0);
    expect(api.fetchCandidates.mock.calls.length).toBe(firstFetch);
    expect(wrapper.text()).toContain('Linked from a section');
    expect(wrapper.text()).toContain('Leopold I');

    await wrapper.findAll('.identity-row__head')[0].trigger('click');
    expect(wrapper.findAll('.identity-row__body')).toHaveLength(1);
  });

  it('refreshes both lists after an accept and moves on', async () => {
    const wrapper = await screen({ identity: '17' });
    await wrapper.find('.candidate').trigger('click');
    await flushPromises();

    api.acceptCandidate.mockResolvedValue({
      status: 'success',
      candidate: candidateDetail({ verdict: 'accepted' }),
      context: candidateDetail().of_context,
    });
    // Nothing left to decide once this one is gone.
    api.fetchCandidates.mockResolvedValue(page([], 0));

    const accept = wrapper.findAll('sl-button').find(b => b.text().includes('Accept'));
    await accept!.trigger('click');
    await flushPromises();

    expect(api.acceptCandidate).toHaveBeenCalledWith(890);
    // Both lists: the candidate is gone from one and the counts moved on the other.
    expect(api.fetchCandidates).toHaveBeenCalledTimes(2);
    expect(api.fetchFoundIdentities).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Accepted');
  });

  it('still says what happened when the decision empties the queue', async () => {
    // The case where feedback matters most: column 3 has no candidate left to hang a
    // message off, and the list has just changed under the librarian.
    const wrapper = await screen({ identity: '17' });
    await wrapper.find('.candidate').trigger('click');
    await flushPromises();

    api.acceptCandidate.mockResolvedValue({
      status: 'success',
      candidate: candidateDetail({ verdict: 'accepted' }),
      context: candidateDetail().of_context,
    });
    api.fetchCandidates.mockResolvedValue(page([], 0));

    const accept = wrapper.findAll('sl-button').find(b => b.text().includes('Accept'));
    await accept!.trigger('click');
    await flushPromises();

    const alerts = wrapper.findAll('sl-alert').map(a => a.text());
    expect(alerts.some(text => text.includes('Accepted') && text.includes('Leopold I')))
      .toBe(true);
  });

  it('leaves column 1 alone for a filter that only narrows column 2', async () => {
    // A wasted request on every click of the verdict dropdown, otherwise.
    const wrapper = await screen({ identity: '17' });
    const before = api.fetchFoundIdentities.mock.calls.length;

    wrapper.findComponent({ name: 'IdentityCandidateFilters' })
      .vm.$emit('update', { verdict: 'all' });
    await flushPromises();

    expect(api.fetchFoundIdentities).toHaveBeenCalledTimes(before);
    expect(api.fetchCandidates).toHaveBeenLastCalledWith(
      expect.objectContaining({ verdict: 'all' }),
      expect.anything(),
      expect.anything(),
    );
  });

  it('reloads both columns for a book filter, which narrows both', async () => {
    const wrapper = await screen({ identity: '17' });
    const identityCalls = api.fetchFoundIdentities.mock.calls.length;
    const candidateCalls = api.fetchCandidates.mock.calls.length;

    wrapper.findComponent({ name: 'IdentityCandidateFilters' })
      .vm.$emit('update', { bookMn: 'belu-soconreal' });
    await flushPromises();

    expect(api.fetchFoundIdentities.mock.calls.length).toBe(identityCalls + 1);
    expect(api.fetchCandidates.mock.calls.length).toBe(candidateCalls + 1);
  });

  it('does not list a pinned identity twice when it is also on the page', async () => {
    // The listing has no id filter, so the pinned row very often IS in the listing.
    const wrapper = await screen({ identity: '17' });
    const names = wrapper.findAll('.identity-row__name').map(n => n.text().trim());
    expect(names.filter(name => name.includes('Leopold I'))).toHaveLength(1);
  });

  it('shows the server its own words when an accept loses the race', async () => {
    const message = 'Context 501 already carries the identity "Someone Else". Unlink it first.';
    const wrapper = await screen({ identity: '17' });
    await wrapper.find('.candidate').trigger('click');
    await flushPromises();

    api.acceptCandidate.mockRejectedValue(new FindingActionError(message, 400));

    const accept = wrapper.findAll('sl-button').find(b => b.text().includes('Accept'));
    await accept!.trigger('click');
    await flushPromises();

    /**
     * Verbatim, and beside the button that produced it - not in the page-level banner.
     * The message is about this one candidate, and asserting only that it is somewhere
     * on screen would pass for either placement.
     */
    const conflict = wrapper.find('.conflict__text');
    expect(conflict.exists()).toBe(true);
    expect(conflict.text()).toBe(message);
    // The recovery actions, including the one that turns this into visible state.
    expect(wrapper.find('.conflict__actions').text()).toContain('Reload this candidate');
    // And a failed write never replaces the view.
    expect(wrapper.text()).toContain('Leopold I');
    expect(wrapper.text()).toContain('Why the scan thinks so');
  });

  it('renders a candidate the server could not place in a section', async () => {
    api.fetchCandidates.mockResolvedValue(page([candidateBrief({
      in_book: null,
      in_section: null,
      in_book_mn: null,
      in_section_pf: null,
    })]));

    const wrapper = await screen({ identity: '17' });
    // Rather than throwing on `.machine_name` of null.
    expect(wrapper.text()).toContain('not placed');
  });

  it('reports a listing failure without blanking the screen', async () => {
    api.fetchFoundIdentities.mockRejectedValue(new Error('The server said no.'));
    const wrapper = await screen();
    expect(wrapper.text()).toContain('The server said no.');
    expect(wrapper.text()).toContain('Findings');
  });
});
