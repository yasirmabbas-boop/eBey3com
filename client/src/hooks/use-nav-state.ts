import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";

const NAV_STATE_KEY = "nav_section_state";

type NavSection = "home" | "favorites" | "swipe" | "search" | "account" | "notifications";

interface SectionState {
  path: string;
  scrollY: number;
}

interface NavState {
  [key: string]: SectionState;
}

function getSectionFromPath(path: string): NavSection | null {
  if (path === "/" || path.startsWith("/product/") || path.startsWith("/category/")) return "home";
  if (path.startsWith("/favorites")) return "favorites";
  if (path.startsWith("/swipe")) return "swipe";
  if (path.startsWith("/search")) return "search";
  if (path.startsWith("/notifications")) return "notifications";
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
  const [location, setLocation] = useLocation();
  const currentSectionRef = useRef<NavSection | null>(null);
  const isRestoringRef = useRef(false);

  useEffect(() => {
    const section = getSectionFromPath(location);
    
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      const state = loadNavState();
      const sectionState = state[section || ""];
      if (sectionState?.scrollY) {
        setTimeout(() => {
          window.scrollTo(0, sectionState.scrollY);
        }, 100);
      }
      currentSectionRef.current = section;
      return;
    }

    if (section && currentSectionRef.current === section) {
      const state = loadNavState();
      state[section] = {
        path: location,
        scrollY: window.scrollY
      };
      saveNavState(state);
    }
    
    currentSectionRef.current = section;
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      const section = getSectionFromPath(location);
      if (section) {
        const state = loadNavState();
        state[section] = {
          path: location,
          scrollY: window.scrollY
        };
        saveNavState(state);
      }
    };

    let timeout: NodeJS.Timeout;
    const debouncedScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(handleScroll, 200);
    };

    window.addEventListener("scroll", debouncedScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", debouncedScroll);
      clearTimeout(timeout);
    };
  }, [location]);

  const navigateToSection = useCallback((section: string, defaultPath: string) => {
    const currentSection = getSectionFromPath(location);
    
    if (currentSection) {
      const state = loadNavState();
      state[currentSection] = {
        path: location,
        scrollY: window.scrollY
      };
      saveNavState(state);
    }

    const state = loadNavState();
    const sectionState = state[section];
    
    if (sectionState?.path && sectionState.path !== location) {
      isRestoringRef.current = true;
      setLocation(sectionState.path);
    } else {
      setLocation(defaultPath);
    }
  }, [location, setLocation]);

  const getLastPath = useCallback((section: string): string | null => {
    const state = loadNavState();
    return state[section]?.path || null;
  }, []);

  const saveCurrentPath = useCallback(() => {
  }, []);

  return { getLastPath, saveCurrentPath, navigateToSection };
}
