/**
 * Utility Functions Unit Tests
 * 
 * Tests for centralized utility functions including currency formatting.
 */

import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, cn } from '../lib/utils';

describe('Currency Formatting Utilities', () => {
  describe('formatCurrency', () => {
    it('formats whole numbers with Arabic locale', () => {
      expect(formatCurrency(1000)).toBe('١٬٠٠٠ د.ع');
    });

    it('formats large numbers with thousands separators', () => {
      expect(formatCurrency(1234567)).toBe('١٬٢٣٤٬٥٦٧ د.ع');
    });

    it('handles zero correctly', () => {
      expect(formatCurrency(0)).toBe('٠ د.ع');
    });

    it('formats decimals when requested', () => {
      const result = formatCurrency(1234.56, { decimals: true });
      expect(result).toContain('١٬٢٣٤');
      expect(result).toContain('د.ع');
    });

    it('uses custom locale when provided', () => {
      const result = formatCurrency(1000, { locale: 'en-US' });
      expect(result).toBe('1,000 د.ع');
    });

    it('handles negative numbers', () => {
      const result = formatCurrency(-500);
      expect(result).toContain('-');
      expect(result).toContain('د.ع');
    });

    it('handles very large numbers', () => {
      const result = formatCurrency(999999999);
      expect(result).toContain('د.ع');
      expect(result.length).toBeGreaterThan(10); // Should have separators
    });
  });

  describe('formatNumber', () => {
    it('formats numbers with Arabic locale by default', () => {
      expect(formatNumber(1000)).toBe('١٬٠٠٠');
    });

    it('does not include currency symbol', () => {
      const result = formatNumber(1000);
      expect(result).not.toContain('د.ع');
    });

    it('uses custom locale when provided', () => {
      expect(formatNumber(1000, 'en-US')).toBe('1,000');
    });

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('٠');
    });

    it('formats decimals naturally', () => {
      const result = formatNumber(1234.56);
      expect(result).toContain('١٬٢٣٤');
    });
  });

  describe('cn utility (classnames)', () => {
    it('merges classnames correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('merges Tailwind classes with twMerge', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });
  });
});

describe('Currency Formatting - Real-World Scenarios', () => {
  it('formats typical product prices', () => {
    const scenarios = [
      { price: 50000, expected: '٥٠٬٠٠٠ د.ع' },    // ~$35 USD
      { price: 250000, expected: '٢٥٠٬٠٠٠ د.ع' },  // ~$175 USD
      { price: 1000000, expected: '١٬٠٠٠٬٠٠٠ د.ع' }, // ~$700 USD
    ];

    scenarios.forEach(({ price, expected }) => {
      expect(formatCurrency(price)).toBe(expected);
    });
  });

  it('formats seller revenue totals', () => {
    const revenue = 5432100; // Typical monthly revenue
    const result = formatCurrency(revenue);
    expect(result).toBe('٥٬٤٣٢٬١٠٠ د.ع');
  });

  it('formats pending shipment values', () => {
    const value = 150000;
    const result = formatCurrency(value);
    expect(result).toContain('١٥٠٬٠٠٠');
    expect(result).toContain('د.ع');
  });
});
