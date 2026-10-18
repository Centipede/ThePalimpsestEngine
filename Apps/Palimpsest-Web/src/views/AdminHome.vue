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
          <sl-menu-item value="facets">
            <sl-icon name="funnel" slot="prefix"></sl-icon>
            Facets
          </sl-menu-item>
          <!-- Other admin tools can be added here later -->
        </sl-menu>
      </div>
      <div class="admin-view">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const router = useRouter();

const breadcrumbs = computed(() => {
  const parts = route.path.split('/').filter(Boolean);
  const crumbs = [];
  let path = '';
  for (const part of parts) {
    path += `/${part}`;
    crumbs.push({
      name: part.charAt(0).toUpperCase() + part.slice(1),
      path,
    });
  }
  return crumbs;
});

const handleMenuSelect = (event: CustomEvent) => {
  const value = event.detail.item.value;
  if (value === 'facets') {
    router.push('/admin/facets');
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
  width: 200px;
  flex-shrink: 0;
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