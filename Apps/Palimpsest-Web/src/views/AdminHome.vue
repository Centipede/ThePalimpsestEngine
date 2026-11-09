<template>
  <div class="admin-layout">
    <header class="admin-header">
      <nav class="breadcrumbs">
        <sl-breadcrumb>
          <sl-breadcrumb-item href="/study">Library</sl-breadcrumb-item>
          <sl-breadcrumb-item v-for="crumb in breadcrumbs" :key="crumb.path" :href="crumb.path">
            {{ crumb.name }}
          </sl-breadcrumb-item>
        </sl-breadcrumb>
      </nav>
      <h1>Administration</h1>
    </header>

    <main class="admin-content">
      <div class="admin-sidebar">
        <sl-menu @sl-select="handleMenuSelect">
          <sl-menu-item v-for="tool in ADMIN_TOOLS" :key="tool.key" :value="tool.key">
            <sl-icon :name="tool.icon" slot="prefix"></sl-icon>
            {{ tool.label }}
          </sl-menu-item>
        </sl-menu>
      </div>
      <div class="admin-view">
        <p v-if="route.path === '/admin'" class="admin-hint">
          Pick a tool from the list to begin.
        </p>
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';
import { ADMIN_TOOLS } from '../config/adminTools';

const route = useRoute();
const router = useRouter();

const breadcrumbs = computed(() => {
  const parts = route.path.split('/').filter(Boolean);
  const crumbs = [];
  let path = '';
  for (const part of parts) {
    path += `/${part}`;
    crumbs.push({
      // Route segments are kebab-case; "topic-assignments" should read as prose.
      name: part.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      path,
    });
  }
  return crumbs;
});

const handleMenuSelect = (event: Event) => {
  const value = (event as CustomEvent).detail.item.value;
  const tool = ADMIN_TOOLS.find((t) => t.key === value);
  if (tool) {
    router.push(tool.path);
  }
};
</script>

<style scoped>
.admin-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 1rem;
  box-sizing: border-box;
}

.admin-header {
  margin-bottom: 2rem;
}

.admin-content {
  display: flex;
  gap: 2rem;
  flex: 1;
  overflow: hidden;
}

.admin-sidebar {
  width: 220px;
  flex-shrink: 0;
}

.admin-hint {
  color: var(--color-text-muted);
}

.admin-view {
  flex: 1;
  overflow-y: auto;
  padding-right: 1rem;
}

h1 {
  margin: 0.5rem 0;
}
</style>