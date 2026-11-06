<template>
  <div class="name-role-text">
    <h5 v-if="name_role_text.name" class="name-role-text__name">{{ name_role_text.name }}</h5>
    <div v-if="name_role_text.role" class="name-role-text__role">{{ name_role_text.role }}</div>
    <div v-if="hasBody" class="name-role-text__divider"></div>
    <p v-if="name_role_text.full_description" class="name-role-text__prose">{{ name_role_text.full_description }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { NameRoleText } from '../../types/library';

const props = defineProps<{
  name_role_text: NameRoleText;
}>();

// The divider only earns its place when there is a header above it and prose below it.
const hasBody = computed(() =>
  !!props.name_role_text.full_description &&
  !!(props.name_role_text.name || props.name_role_text.role)
);
</script>

<style scoped>
.name-role-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.name-role-text__name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
}

.name-role-text__role {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.name-role-text__divider {
  margin: 0.4rem 0 0.1rem 0;
  border-top: 1px solid var(--sl-panel-border-color);
}

.name-role-text__prose {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--color-text);
  white-space: pre-wrap;
}
</style>
