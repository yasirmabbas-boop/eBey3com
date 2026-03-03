/**
 * Shared scroll position storage using sessionStorage.
 * Used by ScrollToTop (App.tsx) and page-level scroll restore (search.tsx).
 * Survives back/forward navigation AND tab refresh (unlike an in-memory Map).
 *
 * Entries expire after TTL_MS to avoid stale scroll positions accumulating.
 */

const STORAGE_KEY = "__scroll_positions__";
const MAX_ENTRIES = 50;
/** Entries older than 30 minutes are considered stale */
const TTL_MS = 30 * 60 * 1000;

interface ScrollEntry {
  y: number;
  /** Timestamp (ms) when the position was last saved */
  ts: number;
}

type ScrollMap = Record<string, ScrollEntry>;

function loadMap(): ScrollMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);

    // Migrate legacy format (plain number values) → { y, ts }
    const map: ScrollMap = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === "number") {
        // Legacy entry — assign current time so it'll expire naturally
        map[key] = { y: val, ts: Date.now() };
      } else if (val && typeof val === "object" && "y" in (val as any)) {
        map[key] = val as ScrollEntry;
      }
    }
    return map;
  } catch {
    return {};
  }
}

function persistMap(map: ScrollMap): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota exceeded or private browsing — degrade silently
  }
}

/** Remove entries older than TTL and trim to MAX_ENTRIES (FIFO). */
function evict(map: ScrollMap): ScrollMap {
  const now = Date.now();
  const live: ScrollMap = {};

  for (const [key, entry] of Object.entries(map)) {
    if (now - entry.ts < TTL_MS) {
      live[key] = entry;
    }
  }

  // If still over limit, drop the oldest entries
  const keys = Object.keys(live);
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys.sort((a, b) => live[a].ts - live[b].ts);
    const excess = sorted.length - MAX_ENTRIES;
    for (let i = 0; i < excess; i++) {
      delete live[sorted[i]];
    }
  }

  return live;
}

/**
 * Returns the actual scroll container used by the app.
 *
 * The ebey3 layout uses `<main class="despia-content">` with `overflow-y: auto`
 * as the scroll container, while `html`/`body` have `overflow: hidden`.
 * `window.scrollY` is always 0 — use this helper instead.
 */
let _cachedContainer: Element | null = null;
export function getScrollContainer(): Element {
  // Re-query if the cached element was disconnected (React may replace
  // the <main> element during route transitions).
  if (_cachedContainer && _cachedContainer.isConnected) return _cachedContainer;
  _cachedContainer = document.querySelector("main.despia-content") || document.documentElement;
  return _cachedContainer;
}

/** Force-clear the cached container so the next call re-queries the DOM. */
export function invalidateScrollContainer(): void {
  _cachedContainer = null;
}

/** Read scrollTop from the app's scroll container */
export function readScrollY(): number {
  return getScrollContainer().scrollTop;
}

/** Scroll the app's scroll container to a given Y position */
export function writeScrollTo(y: number): void {
  getScrollContainer().scrollTo(0, y);
}

export function saveScrollY(key: string, y: number): void {
  const map = evict(loadMap());
  map[key] = { y, ts: Date.now() };
  persistMap(map);
}

export function getScrollY(key: string): number | undefined {
  const map = loadMap();
  const entry = map[key];
  if (!entry) return undefined;

  // Treat expired entries as missing
  if (Date.now() - entry.ts >= TTL_MS) return undefined;

  return entry.y;
}
