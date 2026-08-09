<template>
  <div class="section-entities">
    <!-- fuzzy_answer is ignored for now per requirements -->
    <sl-details v-if="hasEntities">
      <div slot="summary" class="entities-header">Entities</div>
      <div class="categories-grid">
        <div v-for="category in sortedCategories" :key="category" class="category-column">
          <p class="category-title">{{ categoryLabel(category) }}</p>
          <div class="entities-list">
            <template v-for="(entity, index) in entities.linked[category]" :key="`linked-${category}-${index}`">
              <div class="entity-item">
                {{ getSymbol(category) }} {{ entity.name }}
              </div>
            </template>
            
            <hr v-if="shouldShowHrAfterLinked(category)" />

            <template v-for="(entity, index) in entities.unlinked[category]" :key="`unlinked-${category}-${index}`">
              <div class="entity-item">
                {{ getSymbol(category) }} {{ entity.name }}
              </div>
            </template>

            <hr v-if="shouldShowHrAfterUnlinked(category)" />

            <template v-for="(entity, index) in entities.unlinkable[category]" :key="`unlinkable-${category}-${index}`">
              <div class="entity-item">
                {{ getSymbol(category) }} {{ entity.name }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </sl-details>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SectionEntities } from '../types/library';

const props = defineProps<{
  entities: SectionEntities;
}>();

const symbolMap: Record<string, string> = {
  people: '👤',
  times: '🕑',
  places: '📍',
  works: '📜'
};

const getSymbol = (category: string) => symbolMap[category.toLowerCase()] || '❓';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const categoryLabel = (category: string) => capitalize(category);

const hasEntities = computed(() => {
  return props.entities.linked_count > 0 || props.entities.unlinked_count > 0 || props.entities.unlinkable_count > 0;
});

const sortedCategories = computed(() => {
  const cats = new Set<string>();
  const keys: (keyof SectionEntities)[] = ['linked', 'unlinked', 'unlinkable'];
  keys.forEach(key => {
    const records = props.entities[key] as Record<string, any>;
    if (records && typeof records === 'object') {
      Object.keys(records).forEach(cat => {
        if (Array.isArray(records[cat]) && records[cat].length > 0) {
          cats.add(cat);
        }
      });
    }
  });
  return Array.from(cats).sort();
});

const shouldShowHrAfterLinked = (category: string) => {
  const hasLinked = props.entities.linked[category]?.length > 0;
  const hasOthers = props.entities.unlinked[category]?.length > 0 || props.entities.unlinkable[category]?.length > 0;
  return hasLinked && hasOthers;
};

const shouldShowHrAfterUnlinked = (category: string) => {
  const hasUnlinked = props.entities.unlinked[category]?.length > 0;
  const hasUnlinkable = props.entities.unlinkable[category]?.length > 0;
  return hasUnlinked && hasUnlinkable;
};
</script>

<style scoped>
.section-entities {
  margin-bottom: 2rem;
}

sl-details::part(base) {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  overflow: hidden;
}

sl-details::part(header) {
  padding: 0.75rem 1rem;
}

sl-details::part(content) {
  padding: 1rem;
  border-top: 1px solid var(--border);
  background: var(--code-bg);
}

.entities-header {
  font-weight: 600;
  color: var(--text-h);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.category-title {
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.25rem;
}

.entities-list {
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.entity-item {
  padding: 0.2rem 0;
}

hr {
  border: 0;
  border-top: 1px solid var(--border);
  margin: 0.5rem 0;
}
</style>
