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
  },
});
