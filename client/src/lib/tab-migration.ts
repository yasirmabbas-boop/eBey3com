/**
 * Tab Migration System for Seller Dashboard
 * 
 * This module provides backward compatibility for deep links when
 * transitioning from the legacy 6-tab layout to the new 4-tab layout.
 * 
 * Legacy tabs: products, messages, offers, returns, sales, wallet
 * New tabs: inventory, activity (with sub-tabs), orders, earnings
 */

// Tab name mapping for backward compatibility
export const TAB_MIGRATION_MAP: Record<string, { tab: string; section?: string }> = {
  // Legacy tab names -> New structure
  'products': { tab: 'inventory' },
  'messages': { tab: 'activity', section: 'messages' },
  'offers': { tab: 'activity', section: 'offers' },
  'returns': { tab: 'activity', section: 'returns' },
  'sales': { tab: 'orders' },
  'wallet': { tab: 'earnings' },
  
  // New names map to themselves (for forward compatibility)
  'inventory': { tab: 'inventory' },
  'activity': { tab: 'activity' },
  'orders': { tab: 'orders' },
  'earnings': { tab: 'earnings' },
};

// List of legacy tab names for deprecation detection
export const LEGACY_TAB_NAMES = ['products', 'messages', 'offers', 'returns', 'sales', 'wallet'];

// New tab names
export const NEW_TAB_NAMES = ['inventory', 'activity', 'orders', 'earnings'] as const;
export type NewTabName = typeof NEW_TAB_NAMES[number];

// Activity section sub-tabs
export const ACTIVITY_SECTIONS = ['messages', 'offers', 'returns'] as const;
export type ActivitySection = typeof ACTIVITY_SECTIONS[number];

export interface ResolvedTab {
  tab: string;
  section?: string;
  isLegacy: boolean;
}

/**
 * Resolves a URL tab parameter to the new tab structure.
 * Handles backward compatibility by mapping legacy tab names to new ones.
 * 
 * @param urlTab - The tab parameter from the URL (e.g., "offers", "products")
 * @returns Resolved tab information including the new tab name and optional section
 * 
 * @example
 * resolveTabFromUrl('products') // { tab: 'inventory', isLegacy: true }
 * resolveTabFromUrl('offers')   // { tab: 'activity', section: 'offers', isLegacy: true }
 * resolveTabFromUrl('inventory') // { tab: 'inventory', isLegacy: false }
 */
export function resolveTabFromUrl(urlTab: string | null): ResolvedTab {
  // Default to inventory if no tab specified
  if (!urlTab) {
    return { tab: 'inventory', isLegacy: false };
  }
  
  const mapped = TAB_MIGRATION_MAP[urlTab];
  if (mapped) {
    const isLegacy = LEGACY_TAB_NAMES.includes(urlTab);
    if (isLegacy && process.env.NODE_ENV === 'development') {
      console.warn(
        `[Deprecation] Tab name "${urlTab}" is deprecated. ` +
        `Use "${mapped.tab}"${mapped.section ? ` with section="${mapped.section}"` : ''} instead.`
      );
    }
    return { ...mapped, isLegacy };
  }
  
  // Unknown tab - default to inventory with warning
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Warning] Unknown tab "${urlTab}", defaulting to inventory`);
  }
  return { tab: 'inventory', isLegacy: false };
}

/**
 * Determines the activity section based on deep link IDs present in URL.
 * This ensures users land on the correct sub-tab when clicking notifications.
 * 
 * @param offerId - Offer ID from URL params
 * @param returnId - Return ID from URL params
 * @returns The appropriate activity section, or undefined if no IDs present
 */
export function getActivitySectionFromDeepLink(
  offerId: string | null,
  returnId: string | null
): ActivitySection | undefined {
  if (offerId) return 'offers';
  if (returnId) return 'returns';
  return undefined;
}

/**
 * Checks if a tab name is a legacy name that should be migrated.
 */
export function isLegacyTabName(tabName: string): boolean {
  return LEGACY_TAB_NAMES.includes(tabName);
}

/**
 * Gets the new tab name for a legacy tab name.
 * Returns the input if it's already a new tab name.
 */
export function getNewTabName(tabName: string): NewTabName {
  const resolved = resolveTabFromUrl(tabName);
  return resolved.tab as NewTabName;
}
