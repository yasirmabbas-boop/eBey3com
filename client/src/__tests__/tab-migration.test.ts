/**
 * Unit tests for the Tab Migration System
 * 
 * These tests ensure backward compatibility for deep links when
 * transitioning from the legacy 6-tab layout to the new 4-tab layout.
 * 
 * To run these tests:
 * 1. Install vitest: npm install -D vitest
 * 2. Add to package.json scripts: "test": "vitest"
 * 3. Run: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TAB_MIGRATION_MAP,
  resolveTabFromUrl,
  getActivitySectionFromDeepLink,
  isLegacyTabName,
  getNewTabName,
  LEGACY_TAB_NAMES,
  NEW_TAB_NAMES,
  ACTIVITY_SECTIONS,
} from '../lib/tab-migration';

describe('Tab Migration System', () => {
  // Suppress console warnings during tests
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TAB_MIGRATION_MAP', () => {
    it('contains all legacy tab names', () => {
      expect(TAB_MIGRATION_MAP).toHaveProperty('products');
      expect(TAB_MIGRATION_MAP).toHaveProperty('messages');
      expect(TAB_MIGRATION_MAP).toHaveProperty('offers');
      expect(TAB_MIGRATION_MAP).toHaveProperty('returns');
      expect(TAB_MIGRATION_MAP).toHaveProperty('sales');
      expect(TAB_MIGRATION_MAP).toHaveProperty('wallet');
    });

    it('contains all new tab names', () => {
      expect(TAB_MIGRATION_MAP).toHaveProperty('inventory');
      expect(TAB_MIGRATION_MAP).toHaveProperty('activity');
      expect(TAB_MIGRATION_MAP).toHaveProperty('orders');
      expect(TAB_MIGRATION_MAP).toHaveProperty('earnings');
    });

    it('maps legacy tabs to correct new tabs', () => {
      expect(TAB_MIGRATION_MAP['products'].tab).toBe('inventory');
      expect(TAB_MIGRATION_MAP['sales'].tab).toBe('orders');
      expect(TAB_MIGRATION_MAP['wallet'].tab).toBe('earnings');
    });

    it('maps activity-related tabs with sections', () => {
      expect(TAB_MIGRATION_MAP['messages']).toEqual({ tab: 'activity', section: 'messages' });
      expect(TAB_MIGRATION_MAP['offers']).toEqual({ tab: 'activity', section: 'offers' });
      expect(TAB_MIGRATION_MAP['returns']).toEqual({ tab: 'activity', section: 'returns' });
    });
  });

  describe('resolveTabFromUrl', () => {
    describe('legacy tab names', () => {
      it('maps "products" to inventory', () => {
        const result = resolveTabFromUrl('products');
        expect(result).toEqual({ tab: 'inventory', isLegacy: true });
      });

      it('maps "messages" to activity with messages section', () => {
        const result = resolveTabFromUrl('messages');
        expect(result).toEqual({ tab: 'activity', section: 'messages', isLegacy: true });
      });

      it('maps "offers" to activity with offers section', () => {
        const result = resolveTabFromUrl('offers');
        expect(result).toEqual({ tab: 'activity', section: 'offers', isLegacy: true });
      });

      it('maps "returns" to activity with returns section', () => {
        const result = resolveTabFromUrl('returns');
        expect(result).toEqual({ tab: 'activity', section: 'returns', isLegacy: true });
      });

      it('maps "sales" to orders', () => {
        const result = resolveTabFromUrl('sales');
        expect(result).toEqual({ tab: 'orders', isLegacy: true });
      });

      it('maps "wallet" to earnings', () => {
        const result = resolveTabFromUrl('wallet');
        expect(result).toEqual({ tab: 'earnings', isLegacy: true });
      });
    });

    describe('new tab names', () => {
      it('keeps "inventory" as inventory', () => {
        const result = resolveTabFromUrl('inventory');
        expect(result).toEqual({ tab: 'inventory', isLegacy: false });
      });

      it('keeps "activity" as activity', () => {
        const result = resolveTabFromUrl('activity');
        expect(result).toEqual({ tab: 'activity', isLegacy: false });
      });

      it('keeps "orders" as orders', () => {
        const result = resolveTabFromUrl('orders');
        expect(result).toEqual({ tab: 'orders', isLegacy: false });
      });

      it('keeps "earnings" as earnings', () => {
        const result = resolveTabFromUrl('earnings');
        expect(result).toEqual({ tab: 'earnings', isLegacy: false });
      });
    });

    describe('edge cases', () => {
      it('returns inventory for null input', () => {
        const result = resolveTabFromUrl(null);
        expect(result).toEqual({ tab: 'inventory', isLegacy: false });
      });

      it('returns inventory for empty string', () => {
        const result = resolveTabFromUrl('');
        expect(result).toEqual({ tab: 'inventory', isLegacy: false });
      });

      it('returns inventory for unknown tab name', () => {
        const result = resolveTabFromUrl('unknown-tab');
        expect(result).toEqual({ tab: 'inventory', isLegacy: false });
      });

      it('returns inventory for undefined-like values', () => {
        const result = resolveTabFromUrl('undefined');
        expect(result).toEqual({ tab: 'inventory', isLegacy: false });
      });
    });
  });

  describe('getActivitySectionFromDeepLink', () => {
    it('returns "offers" when offerId is provided', () => {
      const result = getActivitySectionFromDeepLink('offer-123', null);
      expect(result).toBe('offers');
    });

    it('returns "returns" when returnId is provided', () => {
      const result = getActivitySectionFromDeepLink(null, 'return-123');
      expect(result).toBe('returns');
    });

    it('returns undefined when no IDs provided', () => {
      const result = getActivitySectionFromDeepLink(null, null);
      expect(result).toBeUndefined();
    });

    it('prefers offerId over returnId when both provided', () => {
      const result = getActivitySectionFromDeepLink('offer-123', 'return-123');
      expect(result).toBe('offers');
    });
  });

  describe('isLegacyTabName', () => {
    it('returns true for legacy tab names', () => {
      expect(isLegacyTabName('products')).toBe(true);
      expect(isLegacyTabName('messages')).toBe(true);
      expect(isLegacyTabName('offers')).toBe(true);
      expect(isLegacyTabName('returns')).toBe(true);
      expect(isLegacyTabName('sales')).toBe(true);
      expect(isLegacyTabName('wallet')).toBe(true);
    });

    it('returns false for new tab names', () => {
      expect(isLegacyTabName('inventory')).toBe(false);
      expect(isLegacyTabName('activity')).toBe(false);
      expect(isLegacyTabName('orders')).toBe(false);
      expect(isLegacyTabName('earnings')).toBe(false);
    });

    it('returns false for unknown tab names', () => {
      expect(isLegacyTabName('unknown')).toBe(false);
      expect(isLegacyTabName('')).toBe(false);
    });
  });

  describe('getNewTabName', () => {
    it('converts legacy names to new names', () => {
      expect(getNewTabName('products')).toBe('inventory');
      expect(getNewTabName('sales')).toBe('orders');
      expect(getNewTabName('wallet')).toBe('earnings');
    });

    it('returns new names unchanged', () => {
      expect(getNewTabName('inventory')).toBe('inventory');
      expect(getNewTabName('activity')).toBe('activity');
      expect(getNewTabName('orders')).toBe('orders');
      expect(getNewTabName('earnings')).toBe('earnings');
    });
  });

  describe('Constants', () => {
    it('NEW_TAB_NAMES contains all new tab names', () => {
      expect(NEW_TAB_NAMES).toContain('inventory');
      expect(NEW_TAB_NAMES).toContain('activity');
      expect(NEW_TAB_NAMES).toContain('orders');
      expect(NEW_TAB_NAMES).toContain('earnings');
      expect(NEW_TAB_NAMES).toHaveLength(4);
    });

    it('ACTIVITY_SECTIONS contains all activity sections', () => {
      expect(ACTIVITY_SECTIONS).toContain('messages');
      expect(ACTIVITY_SECTIONS).toContain('offers');
      expect(ACTIVITY_SECTIONS).toContain('returns');
      expect(ACTIVITY_SECTIONS).toHaveLength(3);
    });
  });
});

describe('Deep Link URL Scenarios', () => {
  // Suppress console warnings during tests
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // These tests simulate real URL scenarios from notifications
  describe('Notification URL Patterns', () => {
    it('handles offer notification URL: tab=offers&offerId=xxx', () => {
      const resolved = resolveTabFromUrl('offers');
      expect(resolved.tab).toBe('activity');
      expect(resolved.section).toBe('offers');
      
      const section = getActivitySectionFromDeepLink('offer-uuid', null);
      expect(section).toBe('offers');
    });

    it('handles order notification URL: tab=sales&orderId=xxx', () => {
      const resolved = resolveTabFromUrl('sales');
      expect(resolved.tab).toBe('orders');
      expect(resolved.isLegacy).toBe(true);
    });

    it('handles return notification URL: tab=returns&returnId=xxx', () => {
      const resolved = resolveTabFromUrl('returns');
      expect(resolved.tab).toBe('activity');
      expect(resolved.section).toBe('returns');
      
      const section = getActivitySectionFromDeepLink(null, 'return-uuid');
      expect(section).toBe('returns');
    });

    it('handles listing notification URL: tab=products&listingId=xxx', () => {
      const resolved = resolveTabFromUrl('products');
      expect(resolved.tab).toBe('inventory');
      expect(resolved.isLegacy).toBe(true);
    });
  });

  describe('Future URL Patterns (Phase 2+)', () => {
    it('handles new activity URL with section: tab=activity&section=offers', () => {
      const resolved = resolveTabFromUrl('activity');
      expect(resolved.tab).toBe('activity');
      expect(resolved.isLegacy).toBe(false);
      // Section would be read separately from URL params
    });

    it('handles new inventory URL: tab=inventory', () => {
      const resolved = resolveTabFromUrl('inventory');
      expect(resolved.tab).toBe('inventory');
      expect(resolved.isLegacy).toBe(false);
    });

    it('handles new orders URL: tab=orders', () => {
      const resolved = resolveTabFromUrl('orders');
      expect(resolved.tab).toBe('orders');
      expect(resolved.isLegacy).toBe(false);
    });

    it('handles new earnings URL: tab=earnings', () => {
      const resolved = resolveTabFromUrl('earnings');
      expect(resolved.tab).toBe('earnings');
      expect(resolved.isLegacy).toBe(false);
    });
  });
});
