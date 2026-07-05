<template>
  <div class="vue-app-root">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<style>
.vue-app-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--color-bg, #f8f9fa);
  font-family: var(--sl-font-sans, sans-serif);
  color: var(--color-text, #212529);
}
</style>
