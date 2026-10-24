<template>
  <div class="facet-maintenance">
    <header class="section-header">
      <h3>Maintenance Tools</h3>
      <sl-button variant="default" size="small" @click="emit('populate')" :loading="isLoading">
        <sl-icon slot="prefix" name="magic"></sl-icon>
        Populate using LLM
      </sl-button>
    </header>

    <sl-tab-group>
      <sl-tab slot="nav" panel="block">Block Prompts</sl-tab>
      <sl-tab slot="nav" panel="section_one">Section (One)</sl-tab>
      <sl-tab slot="nav" panel="section_few">Section (Few)</sl-tab>
      <sl-tab slot="nav" panel="section_many">Section (Many)</sl-tab>

      <sl-tab-panel name="block">
        <div class="prompts-list">
          <div v-for="lang in languages" :key="lang" class="prompt-editor">
            <header class="prompt-header">
              <sl-badge variant="primary">{{ lang.toUpperCase() }}</sl-badge>
            </header>
            <sl-textarea
                :value="facet.query_block?.[lang] || ''"
                @sl-change="handleSavePrompt(lang, 'query_block', $event.target.value)"
                placeholder="Enter block-level extraction prompt..."
                rows="4"
            ></sl-textarea>
          </div>
        </div>
      </sl-tab-panel>

      <sl-tab-panel name="section_one">
        <div class="prompts-list">
          <div v-for="lang in languages" :key="lang" class="prompt-editor">
            <header class="prompt-header">
              <sl-badge variant="primary">{{ lang.toUpperCase() }}</sl-badge>
            </header>
            <sl-textarea
                :value="facet.query_section_one?.[lang] || ''"
                @sl-change="handleSavePrompt(lang, 'query_section_one', $event.target.value)"
                placeholder="Enter prompt for a single section..."
                rows="4"
            ></sl-textarea>
          </div>
        </div>
      </sl-tab-panel>

      <sl-tab-panel name="section_few">
        <div class="prompts-list">
          <div v-for="lang in languages" :key="lang" class="prompt-editor">
            <header class="prompt-header">
              <sl-badge variant="primary">{{ lang.toUpperCase() }}</sl-badge>
            </header>
            <sl-textarea
                :value="facet.query_section_few?.[lang] || ''"
                @sl-change="handleSavePrompt(lang, 'query_section_few', $event.target.value)"
                placeholder="Enter prompt for a few sections..."
                rows="4"
            ></sl-textarea>
          </div>
        </div>
      </sl-tab-panel>

      <sl-tab-panel name="section_many">
        <div class="prompts-list">
          <div v-for="lang in languages" :key="lang" class="prompt-editor">
            <header class="prompt-header">
              <sl-badge variant="primary">{{ lang.toUpperCase() }}</sl-badge>
            </header>
            <sl-textarea
                :value="facet.query_section_many?.[lang] || ''"
                @sl-change="handleSavePrompt(lang, 'query_section_many', $event.target.value)"
                placeholder="Enter prompt for many sections..."
                rows="4"
            ></sl-textarea>
          </div>
        </div>
      </sl-tab-panel>
    </sl-tab-group>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FacetQuery } from '../../types/library';

const props = defineProps<{
  facet: FacetQuery;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update', data: Partial<FacetQuery>): void;
  (e: 'populate'): void;
}>();

const languages = computed(() => {
  const langs = new Set<string>();
  const fields = ['query_block', 'query_section_one', 'query_section_few', 'query_section_many'] as const;
  
  fields.forEach(field => {
    const val = props.facet[field];
    if (val) Object.keys(val).forEach(l => langs.add(l));
  });
  
  // Default languages if none present
  if (langs.size === 0) {
    langs.add('en');
  }
  return Array.from(langs).sort();
});

const handleSavePrompt = (lang: string, field: keyof FacetQuery, value: string) => {
  const updated = { ...(props.facet[field] as Record<string, any> || {}) };
  updated[lang] = value;
  emit('update', { [field]: updated });
};
</script>

<style scoped>
.facet-maintenance {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h3 {
  margin: 0;
  font-size: 1.1rem;
}

.prompts-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

.prompt-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.prompt-header {
  display: flex;
  align-items: center;
}
</style>
