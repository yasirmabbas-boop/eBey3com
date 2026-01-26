import type { Request } from "express";
import { z } from "zod";
import { insertListingSchema, type User } from "@shared/schema";
import { storage } from "../storage";

// Helper to get user ID from session or auth token (Safari/ITP fallback)
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  // Try session first
  const sessionUserId = (req.session as any)?.userId;
  if (sessionUserId) {
    return sessionUserId;
  }
  
  // Check for Passport.js authenticated user (Facebook OAuth)
  const passportUser = (req as any).user;
  if (passportUser && passportUser.id) {
    return passportUser.id;
  }
  
  // Fallback to Authorization header token for Safari
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const user = await storage.getUserByAuthToken(token);
    if (user) {
      return user.id;
    }
  }
  
  return null;
}

// Caching middleware for public GET endpoints to reduce data transfer costs
export function setCacheHeaders(seconds: number): string {
  return `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`;
}

// Helper to check if a user is eligible for blue check badge (trusted seller)
// Requirements: 50+ sales AND 90%+ positive rating (4.5/5.0)
export function isEligibleForBlueCheck(user: User): boolean {
  const MIN_SALES = 50;
  const MIN_RATING = 4.5; // 90% positive
  
  return (
    user.sellerApproved === true &&
    (user.totalSales || 0) >= MIN_SALES &&
    (user.rating || 0) >= MIN_RATING &&
    (user.ratingCount || 0) > 0
  );
}

// Format price for OG image display
export function formatPriceForOg(price: number): string {
  return new Intl.NumberFormat("ar-IQ").format(price) + " د.ع";
}

// Escape SVG text to prevent XSS
export function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Truncate text to max length
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

// Build base URL from request
export function buildBaseUrl(req: Request): string {
  const host = req.get("host");
  if (!host) {
    return "";
  }
  return `${req.protocol}://${host}`;
}

// Resolve absolute URL from relative URL and base URL
export function resolveAbsoluteUrl(rawUrl: string, baseUrl: string): string {
  if (!rawUrl || !baseUrl) return rawUrl;
  try {
    return new URL(rawUrl, baseUrl).toString();
  } catch (error) {
    console.error("Failed to normalize OG image URL:", error);
    return rawUrl;
  }
}

// Fetch image buffer from URL
export async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Failed to fetch OG image source:", error);
    return null;
  }
}

// Helper function to parse CSV line (handles quoted values)
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Zod schema for updating listings
export const updateListingSchema = insertListingSchema.extend({
  auctionEndTime: z.union([z.string(), z.date(), z.null()]).optional(),
  auctionStartTime: z.union([z.string(), z.date(), z.null()]).optional(),
  isActive: z.boolean().optional(),
}).partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);
