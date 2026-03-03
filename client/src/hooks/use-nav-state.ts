import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { getNavSection, NavSection } from "@/lib/nav-sections";

const NAV_STATE_KEY = "nav_section_state";

interface NavState {
  [key: string]: string; // section → last visited path (scroll is handled by ScrollToTop)
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
    // quota exceeded or private browsing — degrade silently
  }
}

/**
 * Manages tab section path persistence.
 *
 * Scroll position is NOT managed here — ScrollToTop (App.tsx) is the single
 * owner of scroll save/restore via history.state._scrollKey. This hook only
 * tracks which path was last visited in each nav section so that switching
 * tabs can restore the user's previous route.
 */
export function useNavState() {
  const [location, setLocation] = useLocation();
  const currentSectionRef = useRef<NavSection | null>(null);

  // Track which path belongs to which section as the user navigates
  useEffect(() => {
    const section = getNavSection(location);

    // Save the current path for this section
    if (section && currentSectionRef.current === section) {
      const state = loadNavState();
      state[section] = location;
      saveNavState(state);
    }

    currentSectionRef.current = section;
  }, [location]);

  /**
   * Navigate to a tab section, restoring the last visited path if available.
   */
  const navigateToSection = useCallback(
    (section: string, defaultPath: string) => {
      // Save current section's path before leaving
      const currentSection = getNavSection(location);
      if (currentSection) {
        const state = loadNavState();
        state[currentSection] = location;
        saveNavState(state);
      }

      // Restore the target section's last path, or use default
      const state = loadNavState();
      const savedPath = state[section];

      if (savedPath && savedPath !== location) {
        setLocation(savedPath);
      } else {
        setLocation(defaultPath);
      }
    },
    [location, setLocation]
  );

  const getLastPath = useCallback((section: string): string | null => {
    const state = loadNavState();
    return state[section] || null;
  }, []);

  return { getLastPath, navigateToSection };
}
