<template>
  <div class="digest-info">
    <div class="info-header">
      <h3 class="caption">{{ digest.caption }}</h3>
      <sl-badge variant="primary" pill>{{ digest.theme }}</sl-badge>
    </div>

    <div class="summary-section">
      <div v-if="digest.brief_summary" class="summary-item">
        <label>Brief Summary</label>
        <p>{{ digest.brief_summary }}</p>
      </div>

      <div v-if="digest.prose_summary" class="summary-item">
        <label>Prose Summary</label>
        <div class="prose-content" v-html="digest.prose_summary"></div>
      </div>

      <div v-if="digest.llm_summary" class="summary-item llm-summary">
        <label><sl-icon name="robot"></sl-icon> LLM Summary</label>
        <p>{{ digest.llm_summary }}</p>
      </div>
    </div>

    <div v-if="!digest.brief_summary && !digest.prose_summary && !digest.llm_summary" class="no-info">
      No summary information available for this digest.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EssentialDigest } from '../../../types/library';

defineProps<{
  digest: EssentialDigest;
}>();
</script>

<style scoped>
.digest-info {
  padding: 1rem;
  background-color: var(--sl-color-neutral-50);
  border-radius: var(--sl-border-radius-medium);
  border: 1px solid var(--sl-color-neutral-200);
}

.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--sl-color-neutral-200);
  padding-bottom: 0.5rem;
}

.caption {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.summary-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-item label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--sl-color-neutral-500);
  margin-bottom: 0.25rem;
}

.summary-item p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.prose-content {
  font-size: 0.95rem;
  line-height: 1.5;
}

.llm-summary {
  background-color: var(--sl-color-primary-50);
  padding: 0.75rem;
  border-radius: var(--sl-border-radius-small);
  border-left: 3px solid var(--sl-color-primary-300);
}

.no-info {
  text-align: center;
  color: var(--sl-color-neutral-400);
  font-style: italic;
  padding: 1rem;
}
</style>
