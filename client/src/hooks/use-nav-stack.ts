/**
 * Tracks in-app navigation depth so BackButton can reliably determine
 * whether `window.history.back()` will stay within the app.
 *
 * `window.history.length` is unreliable:
 * - Safari may reset it
 * - PWAs start with length=1
 * - It doesn't distinguish in-app vs external entries
 *
 * Instead we stamp each history entry with a monotonic index via
 * `_navIdx` in history.state. On pushState the index increments.
 * On popstate we compare the target index with the current one to
 * determine direction (back vs forward) — so forward nav doesn't
 * incorrectly decrement the depth.
 */

let currentIdx = 0;
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;

  // Assign an index to the initial history entry if it doesn't have one
  if (typeof history.state?._navIdx === "number") {
    currentIdx = history.state._navIdx;
  } else {
    const state = history.state && typeof history.state === "object" ? history.state : {};
    history.replaceState({ ...state, _navIdx: currentIdx }, "");
  }

  // Patch pushState — every forward navigation gets the next index
  const originalPush = history.pushState;
  history.pushState = function (...args) {
    currentIdx++;
    const stateObj = args[0] && typeof args[0] === "object" ? args[0] : {};
    args[0] = { ...stateObj, _navIdx: currentIdx };
    return originalPush.apply(history, args);
  };

  // Patch replaceState — keep the current index
  const originalReplace = history.replaceState;
  history.replaceState = function (...args) {
    const stateObj = args[0] && typeof args[0] === "object" ? args[0] : {};
    args[0] = { ...stateObj, _navIdx: currentIdx };
    return originalReplace.apply(history, args);
  };

  // On popstate: read the target's stamped index to know where we are
  window.addEventListener("popstate", (e: PopStateEvent) => {
    const targetIdx = typeof e.state?._navIdx === "number" ? e.state._navIdx : 0;
    currentIdx = targetIdx;
  });
}

/**
 * Returns true if there is at least one in-app page behind the current one
 * that `history.back()` would navigate to.
 */
export function canGoBack(): boolean {
  init();
  return currentIdx > 0;
}

/**
 * Returns the current in-app navigation depth (0 = first page in session).
 */
export function getNavDepth(): number {
  init();
  return currentIdx;
}
