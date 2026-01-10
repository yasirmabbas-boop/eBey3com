import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";

const NAV_STATE_KEY = "nav_section_paths";

type NavSection = "home" | "favorites" | "swipe" | "search" | "account";

interface NavState {
  [key: string]: string;
}

function getSectionFromPath(path: string): NavSection | null {
  if (path === "/" || path.startsWith("/product/") || path.startsWith("/category/")) return "home";
  if (path.startsWith("/favorites")) return "favorites";
  if (path.startsWith("/swipe")) return "swipe";
  if (path.startsWith("/search")) return "search";
  if (path.startsWith("/my-account") || path.startsWith("/signin") || path.startsWith("/seller") || path.startsWith("/cart") || path.startsWith("/orders")) return "account";
  return null;
}

function loadNavState(): NavState {
  try {
    const stored = sessionStorage.getItem(NAV_STATE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveNavState(state: NavState): void {
  try {
    sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(state));
  } catch {
  }
}

export function useNavState() {
  const [location] = useLocation();
  const lastLocationRef = useRef(location);
  
  useEffect(() => {
    const section = getSectionFromPath(location);
    if (section) {
      const state = loadNavState();
      state[section] = location;
      saveNavState(state);
    }
    lastLocationRef.current = location;
  }, [location]);
  
  const getLastPath = useCallback((section: string): string | null => {
    const state = loadNavState();
    return state[section] || null;
  }, []);
  
  const saveCurrentPath = useCallback((path: string) => {
    const section = getSectionFromPath(path);
    if (section) {
      const state = loadNavState();
      state[section] = path;
      saveNavState(state);
    }
  }, []);
  
  return { getLastPath, saveCurrentPath };
}
