import { useCallback, useEffect } from "react";
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
  if (path.startsWith("/my-account") || path.startsWith("/signin") || path.startsWith("/signup") || path.startsWith("/register") || path.startsWith("/seller") || path.startsWith("/cart") || path.startsWith("/orders") || path.startsWith("/checkout") || path.startsWith("/my-") || path.startsWith("/security") || path.startsWith("/settings")) return "account";
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
  
  useEffect(() => {
    const section = getSectionFromPath(location);
    if (section) {
      const state = loadNavState();
      state[section] = location;
      saveNavState(state);
    }
  }, [location]);
  
  const getLastPath = useCallback((section: string): string | null => {
    const currentSection = getSectionFromPath(location);
    if (currentSection === section) {
      return null;
    }
    const state = loadNavState();
    const savedPath = state[section];
    if (savedPath && savedPath !== location) {
      return savedPath;
    }
    return null;
  }, [location]);
  
  const saveCurrentPath = useCallback((_path: string) => {
  }, []);
  
  return { getLastPath, saveCurrentPath };
}
