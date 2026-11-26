// Global Light & Dark Mode Controller (CSP-safe, persists to localStorage, syncs 3D & canvases)

const STORAGE_KEY = 'rnid-theme';
const listeners = new Set();

export function detectPreferredTheme() {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Ignore storage privacy restrictions
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)')?.matches) {
    return 'dark';
  }
  return 'light';
}

let currentTheme = detectPreferredTheme();

export function getTheme() {
  return currentTheme;
}

export function setTheme(nextTheme, { persist = true } = {}) {
  const mode = nextTheme === 'dark' ? 'dark' : 'light';
  currentTheme = mode;
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }
  if (persist) {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage restrictions
    }
  }
  for (const fn of listeners) {
    try {
      fn(mode);
    } catch {
      // Ignore listener errors
    }
  }
  return mode;
}

export function toggleTheme() {
  return setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

export function onThemeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function connectThemeToggle(root = document) {
  // Apply initial theme immediately on boot
  setTheme(detectPreferredTheme(), { persist: false });

  const btn = root.querySelector('#theme-toggle');
  const labelEl = root.querySelector('#theme-toggle-label');

  function syncButton() {
    if (!btn) return;
    const isDark = currentTheme === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    btn.title = isDark ? 'Switch to Light mode' : 'Switch to Dark mode';
    if (labelEl) {
      labelEl.textContent = isDark ? 'Dark' : 'Light';
    }
  }

  btn?.addEventListener('click', () => {
    toggleTheme();
    syncButton();
  });

  onThemeChange(syncButton);
  syncButton();

  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', (ev) => {
      try {
        if (!globalThis.localStorage?.getItem(STORAGE_KEY)) {
          setTheme(ev.matches ? 'dark' : 'light', { persist: false });
        }
      } catch {
        setTheme(ev.matches ? 'dark' : 'light', { persist: false });
      }
    });
  }

  return { getTheme, setTheme, toggleTheme };
}
