<template>
  <header class="vue-header">
    <nav>
      <div class="nav-start">
        <RouterLink to="/study" custom>
          <sl-icon-button
            src="/logos/palimpsest-menu-icon.svg"
            label="Home"
            class="nav-link nav-logo-palimpsest"
            href="/study"
          ></sl-icon-button>
        </RouterLink>
      </div>

      <div class="nav-mid-title-portal"></div>

      <div class="nav-end-tools-portal"></div>

      <div class="nav-end">
        <sl-icon-button
          v-if="isAuthenticated"
          name="box-arrow-right"
          label="Log out"
          @click="logout_and_redirect"
        ></sl-icon-button>
        <sl-icon-button
          v-else
          name="box-arrow-left"
          label="Log in"
          @click="router.push('/')"
        ></sl-icon-button>

        <sl-dropdown @sl-select="(e: Event) => themeStore.setTheme((e as CustomEvent).detail.item.value)">
          <sl-icon-button slot="trigger" :name="themeStore.themeIcon" label="Theme"></sl-icon-button>
          <sl-menu>
            <sl-menu-item value="light">
              <sl-icon slot="prefix" name="sun"></sl-icon>
              Light
            </sl-menu-item>
            <sl-menu-item value="system">
              <sl-icon slot="prefix" name="circle-half"></sl-icon>
              System
            </sl-menu-item>
            <sl-menu-item value="dark">
              <sl-icon slot="prefix" name="moon"></sl-icon>
              Dark
            </sl-menu-item>
          </sl-menu>
        </sl-dropdown>

        <sl-dropdown v-if="isStaff" @sl-select="(e: Event) => router.push((e as CustomEvent).detail.item.value)">
          <sl-icon-button slot="trigger" name="list" label="Menu"></sl-icon-button>
          <sl-menu>
            <sl-menu-item value="/admin">
              <sl-icon slot="prefix" name="shield-lock"></sl-icon>
              Admin
            </sl-menu-item>
          </sl-menu>
        </sl-dropdown>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router';
import { useAuth } from "../composables/useAuth.ts";
import { useThemeStore } from '../stores/theme';

const router = useRouter();
const { logout, isAuthenticated, isStaff } = useAuth();
const themeStore = useThemeStore();

function logout_and_redirect() {
  logout();
  router.push('/');
}
</script>

<style scoped>
.vue-header {
  height: var(--header-height, 56px);
  background: var(--color-surface, #ffffff);
  border-bottom: 1px solid var(--color-border, #dee2e6);
  flex-shrink: 0;
}

nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.1rem 1rem 0.5rem 0;
  height: 100%;
}

.nav-mid-title-portal {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 0 1rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.nav-end-tools-portal {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.nav-start {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-end {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-link {
  color: var(--color-text-muted)
}

*.nav-logo-palimpsest {
  width: calc(var(--header-height, 56px) - 0.2rem);
  height: calc(var(--header-height, 56px) - 0.2rem);
  font-size: calc(var(--header-height, 56px) - 0.2rem);
}

*.nav-logo-palimpsest::part(base) {
  width: 100%;
  height: 100%;
  padding: 0;
}

*.nav-logo-palimpsest::part(icon) {
  width: 100%;
  height: 100%;
}


</style>
