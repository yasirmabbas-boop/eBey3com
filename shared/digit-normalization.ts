/**
 * Digit Normalization Utility
 * Converts Arabic-Indic (٠-٩) and Persian/Eastern Arabic (۰-۹) digits to Western (0-9)
 * 
 * This ensures all numeric strings are stored and validated in a consistent format,
 * while allowing users to input digits in their preferred script.
 */

/**
 * Normalizes digits in a string from Arabic-Indic and Persian to Western digits
 * @param input - String that may contain Arabic-Indic or Persian digits
 * @returns String with all digits converted to Western (0-9)
 * 
 * @example
 * normalizeDigits("٠٧٥١٠٣٢٥٦١٠") // Returns "07510325610"
 * normalizeDigits("۰۷۵۱۰۳۲۵۶۱۰") // Returns "07510325610"
 * normalizeDigits("07510325610") // Returns "07510325610" (unchanged)
 */
export function normalizeDigits(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return input || '';
  }

  // Arabic-Indic digits (٠-٩) map to 0-9
  // Persian/Eastern Arabic digits (۰-۹) map to 0-9
  return input
    .replace(/[٠-٩]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - '٠'.charCodeAt(0) + '0'.charCodeAt(0));
    })
    .replace(/[۰-۹]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - '۰'.charCodeAt(0) + '0'.charCodeAt(0));
    });
}

/**
 * Normalizes phone number specifically (removes spaces, normalizes digits)
 * @param phone - Phone number string that may contain Arabic digits or spaces
 * @returns Normalized phone number with Western digits only
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') {
    return phone || '';
  }
  
  // Remove spaces and normalize digits
  return normalizeDigits(phone.replace(/\s/g, ''));
}

/**
 * Normalizes OTP code (6-digit code that may contain Arabic digits)
 * @param code - OTP code string
 * @returns Normalized OTP code with Western digits only
 */
export function normalizeOTPCode(code: string | null | undefined): string {
  if (!code || typeof code !== 'string') {
    return code || '';
  }
  
  return normalizeDigits(code.trim());
}
