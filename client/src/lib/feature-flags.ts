/**
 * Feature Flag System for Seller Dashboard
 * 
 * This module provides a simple feature flag system for gradual rollout
 * of new dashboard features. Flags can be overridden via localStorage
 * for testing purposes.
 * 
 * In production, this would typically fetch flags from a server or
 * feature flag service (e.g., LaunchDarkly, Unleash, etc.)
 */

import { useState, useEffect } from 'react';

export interface FeatureFlags {
  /** Phase 1: New action cards and task-first design */
  seller_dashboard_v2: boolean;
  /** Phase 2: Consolidated 4-tab layout */
  seller_consolidated_tabs: boolean;
  /** Phase 2: Mobile bottom navigation */
  seller_mobile_nav: boolean;
  /** Phase 3: Analytics and performance insights */
  seller_analytics: boolean;
}

// Default flags - all features disabled by default for safe rollout
const DEFAULT_FLAGS: FeatureFlags = {
  seller_dashboard_v2: false,
  seller_consolidated_tabs: false,
  seller_mobile_nav: false,
  seller_analytics: false,
};

// localStorage key for flag overrides
const FEATURE_FLAGS_STORAGE_KEY = 'feature_flags';

/**
 * Gets the current feature flags, merging defaults with any localStorage overrides.
 * 
 * @returns Current feature flags configuration
 */
export function getFeatureFlags(): FeatureFlags {
  // Check localStorage for overrides (useful for testing and gradual rollout)
  if (typeof window !== 'undefined') {
    const overrides = localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY);
    if (overrides) {
      try {
        const parsed = JSON.parse(overrides);
        return { ...DEFAULT_FLAGS, ...parsed };
      } catch (e) {
        console.warn('[FeatureFlags] Failed to parse localStorage overrides:', e);
      }
    }
  }
  return DEFAULT_FLAGS;
}

/**
 * Sets feature flag overrides in localStorage.
 * Useful for testing and admin overrides.
 * 
 * @param flags - Partial flag overrides to apply
 */
export function setFeatureFlagOverrides(flags: Partial<FeatureFlags>): void {
  if (typeof window !== 'undefined') {
    const current = getFeatureFlags();
    const updated = { ...current, ...flags };
    localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(updated));
  }
}

/**
 * Clears all feature flag overrides from localStorage.
 * Reverts to default flag values.
 */
export function clearFeatureFlagOverrides(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(FEATURE_FLAGS_STORAGE_KEY);
  }
}

/**
 * React hook to get the value of a specific feature flag.
 * Re-renders component when flag value changes.
 * 
 * @param flag - The feature flag key to check
 * @returns Boolean indicating if the feature is enabled
 * 
 * @example
 * const showV2Dashboard = useFeatureFlag('seller_dashboard_v2');
 * if (showV2Dashboard) {
 *   return <NewDashboard />;
 * }
 */
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const [value, setValue] = useState(() => getFeatureFlags()[flag]);

  useEffect(() => {
    // Re-check on mount in case localStorage changed
    setValue(getFeatureFlags()[flag]);

    // Listen for storage events (changes from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FEATURE_FLAGS_STORAGE_KEY) {
        setValue(getFeatureFlags()[flag]);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [flag]);

  return value;
}

/**
 * React hook to get all feature flags.
 * Useful for debugging or admin panels.
 * 
 * @returns All current feature flags
 */
export function useAllFeatureFlags(): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlags);

  useEffect(() => {
    setFlags(getFeatureFlags());

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FEATURE_FLAGS_STORAGE_KEY) {
        setFlags(getFeatureFlags());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return flags;
}

/**
 * Rollback thresholds for each phase.
 * These can be used by monitoring systems to auto-disable flags.
 */
export const ROLLBACK_THRESHOLDS = {
  phase1: {
    errorRate: 0.05,        // 5% error rate
    loadTimeP95: 3000,      // 3 second load time
    bounceRate: 0.3,        // 30% immediate bounce
  },
  phase2: {
    deepLinkFailureRate: 0.02,  // 2% deep link failures
    navigationErrors: 0.03,      // 3% nav errors
    mobileUsageDropoff: 0.15,    // 15% mobile usage drop
  },
  phase3: {
    analyticsLoadTime: 1500,    // 1.5 second load time
    insightEngagement: 0.03,    // 3% minimum click rate
  },
} as const;

// Export type for external use
export type FeatureFlagKey = keyof FeatureFlags;
