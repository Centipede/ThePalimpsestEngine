import { defineStore } from 'pinia';
import { apiFetch } from '../api';
import type { FacetQuery, FacetApplication } from '../types/library';

export const useFacetsStore = defineStore('facets', {
  state: () => ({
    facetQueries: [] as FacetQuery[],
    facetApplications: [] as FacetApplication[],
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

    async fetchFacetApplications(facetId?: number) {
      this.isLoading = true;
      this.error = '';
      try {
        let url = '/testbooks/api/v1/facet-application/';
        if (facetId) {
          url += `?facet=${facetId}`;
        }
        const res = await apiFetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const apps = await res.json();
        this.facetApplications = apps;
        return apps;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to load facet applications';
        console.error(this.error);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async createFacetApplication(data: Partial<FacetApplication>) {
      this.isLoading = true;
      this.error = '';
      try {
        const res = await apiFetch('/testbooks/api/v1/facet-application/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const newApp = await res.json();
        this.facetApplications.push(newApp);
        return newApp;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to create facet application';
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async updateFacetApplication(id: number, data: Partial<FacetApplication>) {
      this.isLoading = true;
      this.error = '';
      try {
        const res = await apiFetch(`/testbooks/api/v1/facet-application/${id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updatedApp = await res.json();
        const index = this.facetApplications.findIndex((a) => a.id === id);
        if (index !== -1) {
          this.facetApplications[index] = updatedApp;
        }
        return updatedApp;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to update facet application';
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async deleteFacetApplication(id: number) {
      this.isLoading = true;
      this.error = '';
      try {
        const res = await apiFetch(`/testbooks/api/v1/facet-application/${id}/`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.facetApplications = this.facetApplications.filter((a) => a.id !== id);
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to delete facet application';
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async addBook(facetId: number, bookId: number) {
      return this.createFacetApplication({
        facet: facetId,
        book: bookId,
        use_section_one: true,
        use_section_few: true,
        use_section_many: true,
        use_segment_one: true,
        use_segment_few: true,
        use_segment_many: true,
        use_content_all: true,
      });
    },

    async removeBook(facetId: number, bookId: number) {
      const app = this.facetApplications.find((a) => a.facet === facetId && a.book === bookId);
      if (app) {
        return this.deleteFacetApplication(app.id);
      }
    },

    async addTopic(facetId: number, topicId: number) {
      return this.createFacetApplication({
        facet: facetId,
        topic: topicId,
        use_section_one: true,
        use_section_few: true,
        use_section_many: true,
        use_segment_one: true,
        use_segment_few: true,
        use_segment_many: true,
        use_content_all: true,
      });
    },

    async removeTopic(facetId: number, topicId: number) {
      const app = this.facetApplications.find((a) => a.facet === facetId && a.topic === topicId);
      if (app) {
        return this.deleteFacetApplication(app.id);
      }
    },
  },
});
