<template>
  <div class="admin-facets">
    <header class="view-header">
      <h2>Facet Management</h2>
      <sl-button variant="primary" @click="showAddDialog = true">
        <sl-icon slot="prefix" name="plus-lg"></sl-icon>
        Add Facet
      </sl-button>
    </header>

    <div v-if="isLoading && facetQueries.length === 0" class="loading">
      <sl-spinner></sl-spinner>
      Loading facets...
    </div>

    <div v-else-if="error" class="error">
      <sl-alert variant="danger" open>
        <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
        <strong>Error</strong><br />
        {{ error }}
      </sl-alert>
    </div>

    <div v-else class="facet-list">
      <sl-card v-for="facet in facetQueries" :key="facet.id" class="facet-card" @click="$router.push(`/admin/facets/${facet.id}`)">
        <div slot="header" class="card-header">
          <strong>{{ facet.name }}</strong>
          <sl-badge variant="neutral">{{ facet.symbol }}</sl-badge>
        </div>
        <div class="card-content">
          <p class="description">{{ facet.prose_description }}</p>
          <div class="machine-names">
            <code>{{ facet.machine_name_singular }}</code> / <code>{{ facet.machine_name_plural }}</code>
          </div>
        </div>
      </sl-card>
    </div>

    <sl-dialog label="Add New Facet" :open="showAddDialog" @sl-after-hide.self="showAddDialog = false">
      <FacetForm @submit="handleCreate" @cancel="showAddDialog = false" />
    </sl-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useFacetsStore } from '../stores/facets';
import { storeToRefs } from 'pinia';
import FacetForm from '../components/admin/FacetForm.vue';

const facetsStore = useFacetsStore();
const { facetQueries, isLoading, error } = storeToRefs(facetsStore);

const showAddDialog = ref(false);

onMounted(() => {
  facetsStore.fetchFacetQueries();
});

const handleCreate = async (data: any) => {
  try {
    await facetsStore.createFacetQuery(data);
    showAddDialog.value = false;
  } catch (e) {
    // Error is handled by store
  }
};
</script>

<style scoped>
.admin-facets {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.facet-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.facet-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.facet-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--sl-shadow-medium);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.description {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.9rem;
  color: var(--sl-color-neutral-600);
  margin-bottom: 1rem;
}

.machine-names {
  font-size: 0.85rem;
}

code {
  background: var(--sl-color-neutral-100);
  padding: 0.2rem 0.4rem;
  border-radius: var(--sl-border-radius-small);
}
</style>