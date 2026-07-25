<template>
  <div class="vue-app-root">
    <NavBar />
    <main class="vue-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import NavBar from './components/NavBar.vue';
</script>

<style>
.vue-app-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--color-bg, #f8f9fa);
  font-family: var(--sl-font-sans, sans-serif);
  color: var(--color-text, #212529);
}

.vue-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
