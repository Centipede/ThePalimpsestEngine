import { defineStore } from 'pinia';
import { apiFetch } from '../api';
import type { FacetQuery } from '../types/library';

export const useFacetsStore = defineStore('facets', {
  state: () => ({
    facetQueries: [] as FacetQuery[],
    isLoading: false,
    error: '' as string,
  }),

  getters: {
    getFacetById: (state) => (id: number) => {
      return state.facetQueries.find((f) => f.id === id);
    },
    getFacetBySingularName: (state) => (name: string) => {
      return state.facetQueries.find((f) => f.machine_name_singular === name);
    },
    getFacetByPluralName: (state) => (name: string) => {
      return state.facetQueries.find((f) => f.machine_name_plural === name);
    },
  },

  actions: {
    async fetchFacetQueries(force = false) {
      if (!force && this.facetQueries.length > 0) return;
      if (!force && this.isLoading) return;

      this.isLoading = true;
      this.error = '';
      try {
        const res = await apiFetch('/testbooks/api/v1/facet-query/');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.facetQueries = await res.json();
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to load facet queries';
        console.error(this.error);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchFacetDetail(id: number) {
      this.isLoading = true;
      this.error = '';
      try {
        const res = await apiFetch(`/testbooks/api/v1/facet-query/${id}/?stats=1`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const facet = await res.json();
        const index = this.facetQueries.findIndex((f) => f.id === id);
        if (index !== -1) {
          this.facetQueries[index] = facet;
        } else {
          this.facetQueries.push(facet);
        }
        return facet;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to fetch facet detail';
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async createFacetQuery(data: Partial<FacetQuery>) {
      this.isLoading = true;
      this.error = '';
      try {
        const res = await apiFetch('/testbooks/api/v1/facet-query/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const newFacet = await res.json();
        this.facetQueries.push(newFacet);
        return newFacet;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to create facet query';
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async updateFacetQuery(id: number, data: Partial<FacetQuery>) {
      this.isLoading = true;
      this.error = '';
      try {
        const res = await apiFetch(`/testbooks/api/v1/facet-query/${id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updatedFacet = await res.json();
        const index = this.facetQueries.findIndex((f) => f.id === id);
        if (index !== -1) {
          this.facetQueries[index] = updatedFacet;
        }
        return updatedFacet;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to update facet query';
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async populatePrompts(id: number) {
      this.isLoading = true;
      this.error = '';
      try {
        const res = await apiFetch(`/testbooks/api/v1/facet-query/${id}/populate/`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updatedFacet = await res.json();
        const index = this.facetQueries.findIndex((f) => f.id === id);
        if (index !== -1) {
          this.facetQueries[index] = updatedFacet;
        }
        return updatedFacet;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to populate prompts';
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async addBook(facetId: number, bookId: number) {
      const facet = this.getFacetById(facetId);
      if (!facet) return;
      const by_books = [...new Set([...(facet.by_books || []), bookId])];
      return this.updateFacetQuery(facetId, { by_books });
    },

    async removeBook(facetId: number, bookId: number) {
      const facet = this.getFacetById(facetId);
      if (!facet) return;
      const by_books = (facet.by_books || []).filter(id => id !== bookId);
      return this.updateFacetQuery(facetId, { by_books });
    },

    async addTopic(facetId: number, topicId: number) {
      const facet = this.getFacetById(facetId);
      if (!facet) return;
      const by_topics = [...new Set([...(facet.by_topics || []), topicId])];
      return this.updateFacetQuery(facetId, { by_topics });
    },

    async removeTopic(facetId: number, topicId: number) {
      const facet = this.getFacetById(facetId);
      if (!facet) return;
      const by_topics = (facet.by_topics || []).filter(id => id !== topicId);
      return this.updateFacetQuery(facetId, { by_topics });
    },
  },
});
