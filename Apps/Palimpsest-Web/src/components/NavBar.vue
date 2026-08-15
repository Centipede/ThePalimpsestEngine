<template>
  <header class="vue-header">
    <nav>
      <div class="nav-start">
        <RouterLink to="/study" custom v-slot="{ navigate, isActive }">
          <sl-button :variant="isActive ? 'primary' : 'text'" @click="navigate">
            Study
          </sl-button>
        </RouterLink>

        <RouterLink to="/admin" custom v-slot="{ navigate, isActive }">
          <sl-button :variant="isActive ? 'primary' : 'text'" @click="navigate">
            Admin
          </sl-button>
        </RouterLink>
      </div>

      <div class="nav-middle"></div>

      <div class="nav-end">
        <sl-button @click="logout_and_redirect">Log out</sl-button>
        <sl-dropdown @sl-select="(e: Event) => setTheme((e as CustomEvent).detail.item.value)">
          <sl-icon-button slot="trigger" :name="themeIcon" label="Theme"></sl-icon-button>
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
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {RouterLink, useRouter} from 'vue-router';
import {useAuth} from "../composables/useAuth.ts";

const router = useRouter();
const { logout } = useAuth();

const ICONS: Record<string, string> = { light: 'sun', system: 'circle-half', dark: 'moon' };

const themeMode = ref(localStorage.getItem('theme') || 'system');
const themeIcon = computed(() => ICONS[themeMode.value] ?? 'circle-half');

function setTheme(mode: string) {
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.documentElement.classList.toggle('sl-theme-dark', dark);
  themeMode.value = mode;
  localStorage.setItem('theme', mode);
}

function onSystemThemeChange() {
  if (themeMode.value === 'system') setTheme('system');
}

const mql = window.matchMedia('(prefers-color-scheme: dark)');

function logout_and_redirect() {
  logout();
  router.push('/');
}

onMounted(() => {
  setTheme(themeMode.value);
  mql.addEventListener('change', onSystemThemeChange);
});

onUnmounted(() => {
  mql.removeEventListener('change', onSystemThemeChange);
});
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
  padding: 0.5rem 1rem;
  height: 100%;
}

.nav-middle {
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

.nav-start,
.nav-end {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
