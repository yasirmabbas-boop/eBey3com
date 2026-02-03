import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as Iraqi Dinar currency
 * Uses Arabic-Iraqi locale formatting
 * 
 * @param amount - The amount to format
 * @param options - Optional formatting options
 * @returns Formatted currency string with "د.ع" suffix
 * 
 * @example
 * formatCurrency(1000) // "1,000 د.ع"
 * formatCurrency(1234567) // "1,234,567 د.ع"
 * formatCurrency(1234567.89) // "1,234,567.89 د.ع"
 */
export function formatCurrency(
  amount: number,
  options: {
    /** Include decimals (default: false) */
    decimals?: boolean;
    /** Locale to use (default: "ar-IQ") */
    locale?: string;
  } = {}
): string {
  const { decimals = false, locale = "ar-IQ" } = options;
  
  const formatted = decimals
    ? amount.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : amount.toLocaleString(locale);
  
  return `${formatted} د.ع`;
}

/**
 * Formats a number as IQD without the currency symbol
 * Useful for display in charts or when currency is implied
 * 
 * @param amount - The amount to format
 * @param locale - Locale to use (default: "ar-IQ")
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1000) // "1,000"
 */
export function formatNumber(
  amount: number,
  locale: string = "ar-IQ"
): string {
  return amount.toLocaleString(locale);
}
