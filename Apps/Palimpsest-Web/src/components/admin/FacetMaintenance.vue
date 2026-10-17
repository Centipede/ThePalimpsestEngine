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
      <sl-tab slot="nav" panel="section">Section Prompts</sl-tab>

      <sl-tab-panel name="block">
        <div class="prompts-list">
          <div v-for="lang in languages" :key="lang" class="prompt-editor">
            <header class="prompt-header">
              <sl-badge variant="primary">{{ lang.toUpperCase() }}</sl-badge>
            </header>
            <sl-textarea
                :value="facet.query_block_lang?.[lang] || ''"
                @sl-change="handleSavePrompt(lang, 'block', $event.target.value)"
                placeholder="Enter block-level extraction prompt..."
                rows="4"
            ></sl-textarea>
          </div>
        </div>
      </sl-tab-panel>

      <sl-tab-panel name="section">
        <div class="prompts-list">
          <div v-for="lang in languages" :key="lang" class="prompt-editor">
            <header class="prompt-header">
              <sl-badge variant="primary">{{ lang.toUpperCase() }}</sl-badge>
            </header>
            <sl-textarea
                :value="facet.query_section_lang?.[lang] || ''"
                @sl-change="handleSavePrompt(lang, 'section', $event.target.value)"
                placeholder="Enter section-level extraction prompt..."
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
  if (props.facet.query_block_lang) Object.keys(props.facet.query_block_lang).forEach(l => langs.add(l));
  if (props.facet.query_section_lang) Object.keys(props.facet.query_section_lang).forEach(l => langs.add(l));
  
  // Default languages if none present
  if (langs.size === 0) {
    langs.add('en');
  }
  return Array.from(langs).sort();
});

const handleSavePrompt = (lang: string, type: 'block' | 'section', value: string) => {
  const field = type === 'block' ? 'query_block_lang' : 'query_section_lang';
  const updated = { ...(props.facet[field] || {}) };
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
