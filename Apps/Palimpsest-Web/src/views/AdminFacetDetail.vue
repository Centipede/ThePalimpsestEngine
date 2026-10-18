<template>
  <div class="facet-detail">
    <div v-if="isLoading && !facet" class="loading">
      <sl-spinner></sl-spinner>
      Loading facet details...
    </div>

    <div v-else-if="error" class="error">
      <sl-alert variant="danger" open>
        <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
        <strong>Error</strong><br />
        {{ error }}
      </sl-alert>
    </div>

    <div v-else-if="facet" class="content">
      <header class="detail-header">
        <div class="title-area">
          <sl-button variant="default" size="small" @click="$router.push('/admin/facets')">
            <sl-icon name="arrow-left"></sl-icon>
          </sl-button>
          <h2>{{ facet.name }}</h2>
          <sl-badge variant="neutral">{{ facet.symbol }}</sl-badge>
        </div>
      </header>

      <div class="detail-grid">
        <div class="stats-section">
          <sl-card>
            <div slot="header">Statistics</div>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">Occurrences</span>
                <span class="stat-value">{{ facet.occurrences_count || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Contexts</span>
                <span class="stat-value">{{ facet.contexts_count || 0 }}</span>
              </div>
            </div>
          </sl-card>
        </div>

        <div class="form-section">
          <sl-card>
            <div slot="header">Configuration</div>
            <FacetForm
                :initial-data="facet"
                :is-edit="true"
                @submit="handleUpdate"
            />
          </sl-card>
        </div>
      </div>

      <div class="associations-section">
        <sl-card>
          <div slot="header">Associations</div>
          <div class="associations-grid">
            <FacetAssociationManager
                type="book"
                :ids="facet.by_books"
                title="Books"
                @add="handleAddBook"
                @remove="handleRemoveBook"
            />
            <sl-divider></sl-divider>
            <FacetAssociationManager
                type="topic"
                :ids="facet.by_topics"
                title="Topics"
                @add="handleAddTopic"
                @remove="handleRemoveTopic"
            />
          </div>
        </sl-card>
      </div>

      <div class="maintenance-section">
        <sl-card>
          <FacetMaintenance
              :facet="facet"
              :is-loading="isLoading"
              @update="handleUpdate"
              @populate="handlePopulate"
          />
        </sl-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useFacetsStore } from '../stores/facets';
import { storeToRefs } from 'pinia';
import FacetForm from '../components/admin/FacetForm.vue';
import FacetAssociationManager from '../components/admin/FacetAssociationManager.vue';
import FacetMaintenance from '../components/admin/FacetMaintenance.vue';

const props = defineProps<{
  id: string;
}>();

const facetsStore = useFacetsStore();
const { isLoading, error } = storeToRefs(facetsStore);
const facet = ref<any>(null);

onMounted(async () => {
  const facetId = parseInt(props.id);
  if (!isNaN(facetId)) {
    facet.value = await facetsStore.fetchFacetDetail(facetId);
  }
});

const handleUpdate = async (data: any) => {
  try {
    const payload: any = {};

    if ('prose_description' in data) {
      payload.prose_description = data.prose_description;
    }

    if ('query_block_lang' in data) {
      payload.query_block_lang = data.query_block_lang;
    }

    if ('query_section_lang' in data) {
      payload.query_section_lang = data.query_section_lang;
    }

    const updated = await facetsStore.updateFacetQuery(facet.value.id, payload);
    facet.value = updated;
  } catch (e) {
    // Error handled by store
  }
};

const handleAddBook = async (bookId: number) => {
  facet.value = await facetsStore.addBook(facet.value.id, bookId);
};

const handleRemoveBook = async (bookId: number) => {
  facet.value = await facetsStore.removeBook(facet.value.id, bookId);
};

const handleAddTopic = async (topicId: number) => {
  facet.value = await facetsStore.addTopic(facet.value.id, topicId);
};

const handleRemoveTopic = async (topicId: number) => {
  facet.value = await facetsStore.removeTopic(facet.value.id, topicId);
};

const handlePopulate = async () => {
  facet.value = await facetsStore.populatePrompts(facet.value.id);
};
</script>

<style scoped>
.facet-detail {
  padding-bottom: 2rem;
}

.detail-header {
  margin-bottom: 2rem;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

h2 {
  margin: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
  align-items: start;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  text-align: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--sl-color-neutral-500);
  text-transform: uppercase;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
}

.associations-section {
  margin-top: 2rem;
}

.associations-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.maintenance-section {
  margin-top: 2rem;
}

@media (max-width: 900px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
