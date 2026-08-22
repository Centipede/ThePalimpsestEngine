import { defineStore } from 'pinia';
import { apiFetch } from '../api';
import type { AnnotationPurpose } from '../types/annotations';

export const useAnnotationsStore = defineStore('annotations', {
  state: () => ({
    annotationPurposes: [] as AnnotationPurpose[],
    isLoadingPurposes: false,
    error: '' as string,
  }),

  getters: {
    getPurposeById: (state) => (id: number) => {
      return state.annotationPurposes.find((p) => p.id === id);
    },
  },

  actions: {
    async fetchAnnotationPurposes(force = false) {
      if (!force && this.annotationPurposes.length > 0) return;

      this.isLoadingPurposes = true;
      this.error = '';
      try {
        const res = await apiFetch('/teststudy/api/v1/annotation/purpose');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.annotationPurposes = await res.json();
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to load annotation purposes';
        console.error(this.error);
      } finally {
        this.isLoadingPurposes = false;
      }
    },
  },
});
