// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { useThemeStore } from './theme';

type Listener = () => void;

/**
 * jsdom does not implement window.matchMedia, so we install a fake media query
 * list whose `matches` we can flip the way an OS theme switch would.
 */
function installMatchMedia(initialDark: boolean) {
  const listeners: Listener[] = [];
  const mql = {
    matches: initialDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (event: string, cb: Listener) => {
      if (event === 'change') listeners.push(cb);
    },
    removeEventListener: (event: string, cb: Listener) => {
      if (event !== 'change') return;
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    }
  };

  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;

  return {
    /** Flip the OS preference and deliver the `change` event, as a focused tab gets. */
    async flip(dark: boolean) {
      mql.matches = dark;
      listeners.forEach((cb) => cb());
      await nextTick();
    },
    /** Flip the OS preference without delivering any event, as a background tab may. */
    flipSilently(dark: boolean) {
      mql.matches = dark;
    }
  };
}

function theme() {
  return document.documentElement.getAttribute('data-theme');
}

function hasShoelaceDark() {
  return document.documentElement.classList.contains('sl-theme-dark');
}

describe('Theme Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('sl-theme-dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to system mode and applies the current OS preference', () => {
    const os = installMatchMedia(true);
    const store = useThemeStore();

    expect(store.themeMode).toBe('system');
    expect(store.isDark).toBe(true);
    expect(theme()).toBe('dark');
    expect(hasShoelaceDark()).toBe(true);
    expect(os).toBeDefined();
  });

  it('follows the OS switching to dark while in system mode', async () => {
    const os = installMatchMedia(false);
    const store = useThemeStore();

    expect(theme()).toBe('light');

    await os.flip(true);

    expect(store.isDark).toBe(true);
    expect(theme()).toBe('dark');
    expect(hasShoelaceDark()).toBe(true);
  });

  it('follows the OS switching back to light while in system mode', async () => {
    const os = installMatchMedia(true);
    const store = useThemeStore();

    await os.flip(false);

    expect(store.isDark).toBe(false);
    expect(theme()).toBe('light');
    expect(hasShoelaceDark()).toBe(false);
  });

  it('exposes the OS switch through isDark, so theme-dependent colors recompute', async () => {
    const os = installMatchMedia(false);
    const store = useThemeStore();

    // ContentBlockView passes store.isDark into computeSegments(); it must
    // invalidate on an OS switch, not just the <html> attribute.
    expect(store.isDark).toBe(false);
    await os.flip(true);
    expect(store.isDark).toBe(true);
  });

  it('ignores the OS when dark is chosen explicitly', async () => {
    const os = installMatchMedia(true);
    const store = useThemeStore();
    store.setTheme('dark');
    await nextTick();

    await os.flip(false);

    expect(store.isDark).toBe(true);
    expect(theme()).toBe('dark');
  });

  it('ignores the OS when light is chosen explicitly', async () => {
    const os = installMatchMedia(false);
    const store = useThemeStore();
    store.setTheme('light');
    await nextTick();

    await os.flip(true);

    expect(store.isDark).toBe(false);
    expect(theme()).toBe('light');
  });

  it('picks up the current OS preference when switching back to system', async () => {
    const os = installMatchMedia(false);
    const store = useThemeStore();
    store.setTheme('light');
    await nextTick();

    await os.flip(true);
    expect(theme()).toBe('light');

    store.setTheme('system');
    await nextTick();

    expect(store.isDark).toBe(true);
    expect(theme()).toBe('dark');
  });

  it('recovers a switch missed while the tab was in the background', async () => {
    const os = installMatchMedia(false);
    const store = useThemeStore();

    // The tab was hidden, so no 'change' event was ever delivered.
    os.flipSilently(true);
    expect(theme()).toBe('light');

    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    await nextTick();

    expect(store.isDark).toBe(true);
    expect(theme()).toBe('dark');
  });

  it('does not re-read the OS preference while the tab is still hidden', async () => {
    const os = installMatchMedia(false);
    const store = useThemeStore();

    os.flipSilently(true);

    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await nextTick();

    expect(store.isDark).toBe(false);
  });

  it('recovers a missed switch when the window regains focus', async () => {
    const os = installMatchMedia(false);
    const store = useThemeStore();

    os.flipSilently(true);
    window.dispatchEvent(new Event('focus'));
    await nextTick();

    expect(store.isDark).toBe(true);
    expect(theme()).toBe('dark');
  });

  it('persists the chosen mode', () => {
    installMatchMedia(false);
    const store = useThemeStore();

    store.setTheme('dark');

    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('restores a persisted mode over the OS preference', () => {
    localStorage.setItem('theme', 'light');
    installMatchMedia(true);
    const store = useThemeStore();

    expect(store.themeMode).toBe('light');
    expect(theme()).toBe('light');
  });

  it('falls back to system when the stored mode is not recognised', () => {
    localStorage.setItem('theme', 'sepia');
    installMatchMedia(true);
    const store = useThemeStore();

    expect(store.themeMode).toBe('system');
    expect(store.themeIcon).toBe('circle-half');
    expect(theme()).toBe('dark');
  });
});
