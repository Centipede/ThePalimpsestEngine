<template>
  <div class="finding-context-info">
    <div class="info-header">
      <h3 class="title">{{ symbol }} {{ label }}</h3>
    </div>

    <div v-if="contexts && contexts.length > 0" class="contexts-list">
      <div v-for="context in contexts" :key="context.id" class="context-item">
        <div class="context-header">
          <span class="context-name">{{ context.name }}</span>
          <a v-if="context.of_identity?.wikipedia_url" :href="context.of_identity.wikipedia_url" target="_blank" rel="noopener" class="identity-link">
            <sl-icon name="link-45deg"></sl-icon>
          </a>
        </div>
        <div class="occurrences-list">
          <div v-for="occ in context.occurrences" :key="occ.id" class="occurrence-item">
            <blockquote class="quote">{{ occ.quote }}</blockquote>
            <p v-if="occ.description" class="description">{{ occ.description }}</p>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-info">
      No findings found for this facet.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FindingContext } from '../../../types/library';

defineProps<{
  contexts: FindingContext[];
  label: string;
  symbol: string;
}>();
</script>

<style scoped>
.finding-context-info {
  padding: 1rem;
  background-color: var(--sl-color-neutral-50);
  border-radius: var(--sl-border-radius-medium);
  border: 1px solid var(--sl-color-neutral-200);
}

.info-header {
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--sl-color-neutral-200);
  padding-bottom: 0.5rem;
}

.title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.contexts-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.context-item {
  padding: 0.5rem 0.75rem;
  background-color: white;
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-small);
}

.context-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--sl-color-neutral-100);
  padding-bottom: 0.25rem;
}

.context-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.identity-link {
  color: var(--sl-color-primary-600);
  font-size: 1.1rem;
}

.occurrences-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.occurrence-item {
  padding-left: 0.75rem;
  border-left: 2px solid var(--sl-color-neutral-200);
}

.quote {
  margin: 0;
  font-style: italic;
  font-size: 0.85rem;
  color: var(--sl-color-neutral-700);
}

.description {
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  color: var(--sl-color-neutral-500);
}

.no-info {
  text-align: center;
  color: var(--sl-color-neutral-400);
  font-style: italic;
  padding: 1rem;
}
</style>
