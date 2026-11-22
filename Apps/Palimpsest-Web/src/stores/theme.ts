import { defineStore } from 'pinia';
import { ref, computed, watchEffect } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];
const STORAGE_KEY = 'theme';

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return THEME_MODES.includes(stored as ThemeMode) ? (stored as ThemeMode) : 'system';
}

export const useThemeStore = defineStore('theme', () => {
  const themeMode = ref<ThemeMode>(readStoredMode());

  // Reactive mirror of the OS preference. Reading matchMedia().matches directly
  // inside a computed would not be tracked by Vue, so the computed would cache
  // the value it saw first and never notice the OS switching.
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const systemDark = ref(mql.matches);

  // NOTE: keep this resolution logic in sync with the inline script in index.html.
  const isDark = computed(() => {
    if (themeMode.value === 'system') {
      return systemDark.value;
    }
    return themeMode.value === 'dark';
  });

  const themeIcon = computed(() => {
    const icons: Record<ThemeMode, string> = {
      light: 'sun',
      dark: 'moon',
      system: 'circle-half'
    };
    return icons[themeMode.value];
  });

  function applyTheme() {
    const dark = isDark.value;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('sl-theme-dark', dark);
  }

  function setTheme(mode: ThemeMode) {
    themeMode.value = mode;
    localStorage.setItem(STORAGE_KEY, mode);
  }

  // Re-read the OS preference. Idempotent: an unchanged value is a no-op
  // assignment and does not re-run the watcher.
  function syncSystem() {
    systemDark.value = mql.matches;
  }

  // Applies the theme now and on every later change, whatever caused it.
  watchEffect(applyTheme);

  mql.addEventListener('change', syncSystem);

  // A background tab may never be handed the 'change' event, so recover any
  // switch we missed as soon as the tab is looked at again.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      syncSystem();
    }
  });
  window.addEventListener('focus', syncSystem);

  return {
    themeMode,
    isDark,
    themeIcon,
    setTheme
  };
});
