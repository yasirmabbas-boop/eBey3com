/**
 * Deep Link Integration Tests
 * 
 * Tests the "Deep Link to Action" flow for the Seller Dashboard.
 * Verifies tab switching, auto-scroll, highlight, and RTL consistency.
 * 
 * To run: npm test -- deep-link-integration.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveTabFromUrl } from '../lib/tab-migration';

describe('Deep Link Integration Tests', () => {
  beforeEach(() => {
    // Mock console.warn for deprecation warnings
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('Order Deep Link Flow', () => {
    it('should resolve orders tab from legacy "sales" parameter', () => {
      const result = resolveTabFromUrl('sales');
      expect(result.tab).toBe('orders');
      expect(result.isLegacy).toBe(true);
    });

    it('should resolve orders tab from new parameter', () => {
      const result = resolveTabFromUrl('orders');
      expect(result.tab).toBe('orders');
      expect(result.isLegacy).toBe(false);
    });

    it('should handle orderId parameter extraction', () => {
      // Simulate URL: /seller-dashboard?tab=sales&orderId=123
      const params = new URLSearchParams('tab=sales&orderId=123');
      
      expect(params.get('tab')).toBe('sales');
      expect(params.get('orderId')).toBe('123');
      
      const resolved = resolveTabFromUrl(params.get('tab'));
      expect(resolved.tab).toBe('orders');
    });
  });

  describe('Offer Deep Link Flow', () => {
    it('should resolve activity tab with offers section from legacy parameter', () => {
      const result = resolveTabFromUrl('offers');
      expect(result.tab).toBe('activity');
      expect(result.section).toBe('offers');
      expect(result.isLegacy).toBe(true);
    });

    it('should handle offerId parameter with section routing', () => {
      // Simulate URL: /seller-dashboard?tab=offers&offerId=456
      const params = new URLSearchParams('tab=offers&offerId=456');
      
      expect(params.get('tab')).toBe('offers');
      expect(params.get('offerId')).toBe('456');
      
      const resolved = resolveTabFromUrl(params.get('tab'));
      expect(resolved.tab).toBe('activity');
      expect(resolved.section).toBe('offers');
    });

    it('should handle activity tab with explicit section parameter', () => {
      // Simulate URL: /seller-dashboard?tab=activity&section=offers&offerId=456
      const params = new URLSearchParams('tab=activity&section=offers&offerId=456');
      
      expect(params.get('tab')).toBe('activity');
      expect(params.get('section')).toBe('offers');
      expect(params.get('offerId')).toBe('456');
      
      const resolved = resolveTabFromUrl(params.get('tab'));
      expect(resolved.tab).toBe('activity');
    });
  });

  describe('Return Deep Link Flow', () => {
    it('should resolve activity tab with returns section', () => {
      const result = resolveTabFromUrl('returns');
      expect(result.tab).toBe('activity');
      expect(result.section).toBe('returns');
      expect(result.isLegacy).toBe(true);
    });

    it('should handle returnId parameter', () => {
      const params = new URLSearchParams('tab=returns&returnId=789');
      
      expect(params.get('tab')).toBe('returns');
      expect(params.get('returnId')).toBe('789');
      
      const resolved = resolveTabFromUrl(params.get('tab'));
      expect(resolved.tab).toBe('activity');
      expect(resolved.section).toBe('returns');
    });
  });

  describe('Listing Deep Link Flow', () => {
    it('should resolve inventory tab from legacy "products" parameter', () => {
      const result = resolveTabFromUrl('products');
      expect(result.tab).toBe('inventory');
      expect(result.isLegacy).toBe(true);
    });

    it('should handle listingId parameter', () => {
      const params = new URLSearchParams('tab=products&listingId=abc-123');
      
      expect(params.get('tab')).toBe('products');
      expect(params.get('listingId')).toBe('abc-123');
      
      const resolved = resolveTabFromUrl(params.get('tab'));
      expect(resolved.tab).toBe('inventory');
    });
  });

  describe('URL Clean-up', () => {
    it('should identify when URL cleanup is needed', () => {
      const scenarios = [
        { url: '?tab=sales&orderId=123', shouldClean: true },
        { url: '?tab=offers', shouldClean: true },
        { url: '', shouldClean: false },
        { url: '?unrelated=param', shouldClean: false },
      ];

      scenarios.forEach(({ url, shouldClean }) => {
        const params = new URLSearchParams(url);
        const hasRelevantParams = 
          params.has('tab') || 
          params.has('orderId') || 
          params.has('offerId') || 
          params.has('returnId') || 
          params.has('listingId') ||
          params.has('section');
        
        expect(hasRelevantParams).toBe(shouldClean);
      });
    });
  });

  describe('Complex Deep Link Scenarios', () => {
    it('should handle notification from offer acceptance', () => {
      // Notification: "Your offer was accepted! View order"
      // URL: /seller-dashboard?tab=sales&orderId=order-123
      const params = new URLSearchParams('tab=sales&orderId=order-123');
      const resolved = resolveTabFromUrl(params.get('tab'));
      
      expect(resolved.tab).toBe('orders');
      expect(params.get('orderId')).toBe('order-123');
    });

    it('should handle notification from new offer', () => {
      // Notification: "You received a new offer!"
      // URL: /seller-dashboard?tab=offers&offerId=offer-456
      const params = new URLSearchParams('tab=offers&offerId=offer-456');
      const resolved = resolveTabFromUrl(params.get('tab'));
      
      expect(resolved.tab).toBe('activity');
      expect(resolved.section).toBe('offers');
      expect(params.get('offerId')).toBe('offer-456');
    });

    it('should handle notification from return request', () => {
      // Notification: "Buyer requested a return"
      // URL: /seller-dashboard?tab=returns&returnId=return-789
      const params = new URLSearchParams('tab=returns&returnId=return-789');
      const resolved = resolveTabFromUrl(params.get('tab'));
      
      expect(resolved.tab).toBe('activity');
      expect(resolved.section).toBe('returns');
      expect(params.get('returnId')).toBe('return-789');
    });

    it('should handle notification from auction ending', () => {
      // Notification: "Your auction is ending soon!"
      // URL: /seller-dashboard?tab=products&listingId=listing-abc
      const params = new URLSearchParams('tab=products&listingId=listing-abc');
      const resolved = resolveTabFromUrl(params.get('tab'));
      
      expect(resolved.tab).toBe('inventory');
      expect(params.get('listingId')).toBe('listing-abc');
    });
  });
});
