/**
 * Shared scroll position storage using sessionStorage.
 * Used by ScrollToTop (App.tsx) and page-level scroll restore (search.tsx).
 * Survives back/forward navigation AND tab refresh (unlike an in-memory Map).
 */

const STORAGE_KEY = "__scroll_positions__";
const MAX_ENTRIES = 50;

export function saveScrollY(key: string, y: number): void {
  try {
    const map = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    map[key] = y;
    // Evict oldest entries if over limit
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) delete map[keys[0]];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota exceeded or private browsing — degrade silently
  }
}

export function getScrollY(key: string): number | undefined {
  try {
    const map = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    const val = map[key];
    return typeof val === "number" ? val : undefined;
  } catch {
    return undefined;
  }
}
