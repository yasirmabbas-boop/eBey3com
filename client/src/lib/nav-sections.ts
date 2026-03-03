/**
 * Centralized nav section detection.
 *
 * Single source of truth used by useNavState, MobileNavBar, and
 * SwipeBackNavigation to determine which bottom nav tab a route belongs to.
 *
 * When adding new routes, add them to the appropriate section below.
 * Routes not listed here belong to no section (nav may still be visible
 * but no tab will be highlighted).
 */

export type NavSection = "home" | "favorites" | "swipe" | "notifications" | "account";

/** Exact-match routes per section */
const EXACT_ROUTES: Record<NavSection, string[]> = {
  home: ["/"],
  favorites: ["/favorites"],
  swipe: ["/swipe"],
  notifications: ["/notifications"],
  account: [
    "/my-account",
    "/my-purchases",
    "/my-sales",
    "/my-bids",
    "/my-auctions",
    "/signin",
    "/register",
    "/cart",
    "/checkout",
    "/settings",
    "/security",
    "/security-settings",
    "/security-guide",
    "/seller-dashboard",
    "/buyer-dashboard",
    "/auctions",
    "/sell",
    "/onboarding",
  ],
};

/** Prefix-match routes per section (matches path.startsWith) */
const PREFIX_ROUTES: Record<NavSection, string[]> = {
  home: ["/product/", "/category/", "/browse/"],
  favorites: [],
  swipe: [],
  notifications: [],
  account: ["/seller/", "/messages/", "/orders/"],
};

/**
 * Determine which nav section a path belongs to.
 * Returns null if the path doesn't map to any section (e.g. /privacy, /terms).
 */
export function getNavSection(path: string): NavSection | null {
  // Strip query string for matching
  const cleanPath = path.split("?")[0];

  for (const section of Object.keys(EXACT_ROUTES) as NavSection[]) {
    if (EXACT_ROUTES[section].includes(cleanPath)) return section;
    if (PREFIX_ROUTES[section].some((prefix) => cleanPath.startsWith(prefix))) return section;
  }

  return null;
}

/**
 * Check if a specific path is active within a section.
 * Used by MobileNavBar to highlight the correct tab.
 */
export function isPathInSection(path: string, section: NavSection): boolean {
  return getNavSection(path) === section;
}

/** Paths where the bottom nav bar should be completely hidden (immersive screens) */
export const HIDDEN_NAV_PATHS = ["/swipe"];

/** Root-level pages where the BackButton should not render */
export const MAIN_NAV_PAGES = ["/", "/favorites", "/swipe", "/notifications", "/my-account", "/signin", "/cart"];
