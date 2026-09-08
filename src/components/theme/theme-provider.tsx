"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * Theme management.
 *
 * Hand-rolled rather than pulling in a theme library, because the whole
 * behaviour is: read a stored preference, resolve "system" against a media
 * query, and toggle one class on <html>.
 *
 * Both the stored preference and the OS colour-scheme are state that lives
 * outside React (`localStorage`, `matchMedia`), so they're read via
 * `useSyncExternalStore` rather than "read once in a mount effect and
 * setState" — the latter renders a wrong value first and corrects it a beat
 * later (and is exactly the pattern `react-hooks/set-state-in-effect` flags).
 * `useSyncExternalStore` instead renders `getServerSnapshot` during hydration,
 * so the first client render matches the server, then updates once the real
 * client value is known.
 *
 * `THEME_SCRIPT` below runs before first paint to prevent a flash of the wrong
 * theme; this provider takes over for the rest of the session.
 */

export type Theme = "light" | "dark" | "system";
/** The theme actually in effect, with "system" already resolved. */
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "linkbrain.theme";

interface ThemeContextValue {
  /** The user's preference, which may be "system". */
  theme: Theme;
  /** What that preference currently resolves to. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  /** Flip between light and dark, resolving "system" first. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Inline script for the document head.
 *
 * This must run synchronously before the first paint, which is why it is a
 * string rather than a component: React would only apply the class after
 * hydration, by which point the wrong theme has already been shown.
 *
 * It is authored to fail silently — a browser with storage blocked should get
 * the system theme, not a broken page.
 */
export const THEME_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var theme = stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : 'system';
    var isDark = theme === 'dark' || (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

// --- External store #1: the stored theme preference. ---

const storedThemeListeners = new Set<() => void>();

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage unavailable (private mode, blocked cookies) — fall back below.
  }
  return "system";
}

function writeStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // A theme that does not persist is better than a crash.
  }
  storedThemeListeners.forEach((listener) => listener());
}

function subscribeToStoredTheme(listener: () => void) {
  storedThemeListeners.add(listener);

  // Pick up a preference changed from another tab.
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    storedThemeListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getStoredThemeServerSnapshot(): Theme {
  return "system";
}

// --- External store #2: the OS colour-scheme preference. ---

function getSystemScheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribeToSystemScheme(listener: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function getSystemSchemeServerSnapshot(): ResolvedTheme {
  return "light";
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToStoredTheme,
    readStoredTheme,
    getStoredThemeServerSnapshot,
  );
  const systemScheme = useSyncExternalStore(
    subscribeToSystemScheme,
    getSystemScheme,
    getSystemSchemeServerSnapshot,
  );

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemScheme : theme;

  // Keep the <html> class in sync with the resolved theme. This is a real
  // synchronization with an external system (the DOM), not a setState call —
  // THEME_SCRIPT already applied the correct class before paint, so this is a
  // no-op on first render and only does work when the theme actually changes.
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    writeStoredTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
