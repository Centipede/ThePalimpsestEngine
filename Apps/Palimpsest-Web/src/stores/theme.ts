import { defineStore } from 'pinia';
import { ref, computed, onMounted, onUnmounted } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'system';

export const useThemeStore = defineStore('theme', () => {
  const themeMode = ref<ThemeMode>((localStorage.getItem('theme') as ThemeMode) || 'system');
  
  const isDark = computed(() => {
    if (themeMode.value === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
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
    localStorage.setItem('theme', mode);
    applyTheme();
  }

  // Initial application and system listener
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => {
    if (themeMode.value === 'system') {
      applyTheme();
    }
  };

  // We use a manual initialization function to be called in App.vue or similar if needed,
  // but we can also do it here if we ensure it only runs on client side.
  if (typeof window !== 'undefined') {
    applyTheme();
    mql.addEventListener('change', onSystemChange);
  }

  return {
    themeMode,
    isDark,
    themeIcon,
    setTheme,
    init: () => {
        applyTheme();
    }
  };
});
