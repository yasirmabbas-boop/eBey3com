import type { Express, Request, Response, NextFunction } from "express";
import { payoutPermissionService } from "../services/payout-permission-service";
import { storage } from "../storage";
import { db } from "../db";
import { payoutPermissions, listings } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Middleware to verify API key from delivery partner
 */
async function requireDeliveryPartner(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"];
  const expectedKey = process.env.DELIVERY_PARTNER_API_KEY;

  if (!expectedKey) {
    console.error("[LogisticsAPI] DELIVERY_PARTNER_API_KEY not configured in environment");
    return res.status(500).json({ error: "API key authentication not configured" });
  }

  if (!apiKey || apiKey !== expectedKey) {
    console.warn("[LogisticsAPI] Invalid or missing API key attempt");
    return res.status(401).json({ error: "Unauthorized: Invalid API key" });
  }

  next();
}

/**
 * Logistics API Routes
 * Secure endpoints for delivery partner to query payout clearance status
 */
export function registerLogisticsRoutes(app: Express): void {
  /**
   * PHASE 4: Payout Manifest Endpoint
   * Returns all orders cleared for payout
   * 
   * Security: Requires X-API-KEY header
   * 
   * Response format:
   * {
   *   success: true,
   *   count: 10,
   *   payouts: [
   *     {
   *       transactionId: "...",
   *       sellerId: "...",
   *       sellerName: "John Doe",
   *       sellerPhone: "07XXXXXXXXX",
   *       payoutAmount: 250000,
   *       currency: "IQD",
   *       listingTitle: "Product name",
   *       clearedAt: "2026-02-03T10:00:00Z",
   *       gracePeriodExpiresAt: "2026-02-03T10:00:00Z"
   *     }
   *   ]
   * }
   */
  app.get("/api/v1/logistics/payout-manifest", requireDeliveryPartner, async (req, res) => {
    try {
      console.log("[LogisticsAPI] Fetching payout manifest...");

      // Get all cleared permissions
      const clearedPermissions = await payoutPermissionService.getClearedPayouts(
        undefined, // No seller filter
        1000 // Limit to prevent huge responses
      );

      console.log(`[LogisticsAPI] Found ${clearedPermissions.length} cleared payouts`);

      // Enrich with seller and listing details
      const enrichedPayouts = await Promise.all(
        clearedPermissions.map(async (permission) => {
          try {
            // Get seller details
            const seller = await storage.getUser(permission.sellerId);
            
            // Get listing details
            const listing = await storage.getListing(permission.listingId);

            return {
              transactionId: permission.transactionId,
              sellerId: permission.sellerId,
              sellerName: seller?.displayName || "Unknown",
              sellerPhone: seller?.phone || "N/A",
              payoutAmount: permission.payoutAmount,
              originalAmount: permission.originalAmount,
              platformCommission: permission.platformCommission,
              currency: permission.currency,
              listingTitle: (listing as any)?.title || "Unknown Product",
              clearedAt: permission.clearedAt?.toISOString() || null,
              gracePeriodExpiresAt: permission.gracePeriodExpiresAt.toISOString(),
              deliveredAt: permission.deliveredAt.toISOString(),
              returnPolicyDays: permission.returnPolicyDays,
              externalOrderId: permission.externalOrderId,
              notes: permission.notes,
            };
          } catch (enrichError) {
            console.error(`[LogisticsAPI] Error enriching permission ${permission.id}:`, enrichError);
            return {
              transactionId: permission.transactionId,
              sellerId: permission.sellerId,
              sellerName: "Error loading",
              sellerPhone: "N/A",
              payoutAmount: permission.payoutAmount,
              currency: permission.currency,
              listingTitle: "Error loading",
              clearedAt: permission.clearedAt?.toISOString() || null,
              gracePeriodExpiresAt: permission.gracePeriodExpiresAt.toISOString(),
            };
          }
        })
      );

      res.json({
        success: true,
        count: enrichedPayouts.length,
        payouts: enrichedPayouts,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[LogisticsAPI] Error fetching payout manifest:", error);
      res.status(500).json({ error: "Failed to fetch payout manifest" });
    }
  });

  /**
   * Get payout status for a specific transaction
   */
  app.get("/api/v1/logistics/payout-status/:transactionId", requireDeliveryPartner, async (req, res) => {
    try {
      const { transactionId } = req.params;

      const [permission] = await db
        .select()
        .from(payoutPermissions)
        .where(eq(payoutPermissions.transactionId, transactionId))
        .limit(1);

      if (!permission) {
        return res.status(404).json({ error: "Payout permission not found" });
      }

      res.json({
        success: true,
        transactionId: permission.transactionId,
        permissionStatus: permission.permissionStatus,
        isCleared: permission.isCleared,
        payoutAmount: permission.payoutAmount,
        currency: permission.currency,
        gracePeriodExpiresAt: permission.gracePeriodExpiresAt.toISOString(),
        clearedAt: permission.clearedAt?.toISOString() || null,
        blockedReason: permission.blockedReason,
        paidAt: permission.paidAt?.toISOString() || null,
      });
    } catch (error) {
      console.error("[LogisticsAPI] Error fetching payout status:", error);
      res.status(500).json({ error: "Failed to fetch payout status" });
    }
  });

  /**
   * Confirm payout to seller (when delivery partner pays)
   */
  app.post("/api/v1/logistics/confirm-payout", requireDeliveryPartner, async (req, res) => {
    try {
      const { transactionId, payoutReference, confirmedBy } = req.body;

      if (!transactionId || !payoutReference) {
        return res.status(400).json({ error: "Missing required fields: transactionId, payoutReference" });
      }

      // Mark as paid
      await payoutPermissionService.markAsPaid(
        transactionId,
        payoutReference,
        confirmedBy || "delivery_partner"
      );

      console.log(`[LogisticsAPI] Payout confirmed for transaction: ${transactionId}, ref: ${payoutReference}`);

      res.json({
        success: true,
        message: "Payout confirmed successfully",
        transactionId,
        payoutReference,
      });
    } catch (error) {
      console.error("[LogisticsAPI] Error confirming payout:", error);
      res.status(500).json({ error: "Failed to confirm payout" });
    }
  });

  /**
   * Get seller summary (all permissions for a specific seller)
   */
  app.get("/api/v1/logistics/seller-summary/:sellerId", requireDeliveryPartner, async (req, res) => {
    try {
      const { sellerId } = req.params;

      // Get seller details
      const seller = await storage.getUser(sellerId);
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }

      // Get all permissions for this seller
      const permissions = await db
        .select()
        .from(payoutPermissions)
        .where(eq(payoutPermissions.sellerId, sellerId))
        .orderBy(payoutPermissions.createdAt);

      // Calculate totals
      const clearedCount = permissions.filter(p => p.permissionStatus === "cleared").length;
      const withheldCount = permissions.filter(p => p.permissionStatus === "withheld").length;
      const lockedCount = permissions.filter(p => p.permissionStatus === "locked").length;
      const blockedCount = permissions.filter(p => p.permissionStatus === "blocked").length;
      const paidCount = permissions.filter(p => p.permissionStatus === "paid").length;

      const totalCleared = permissions
        .filter(p => p.permissionStatus === "cleared")
        .reduce((sum, p) => sum + p.payoutAmount, 0);

      const totalDebt = permissions
        .filter(p => p.permissionStatus === "blocked")
        .reduce((sum, p) => sum + (p.debtAmount || 0), 0);

      res.json({
        success: true,
        seller: {
          id: seller.id,
          displayName: seller.displayName,
          phone: seller.phone,
          isActive: (seller as any).isActive,
        },
        summary: {
          totalPermissions: permissions.length,
          cleared: clearedCount,
          withheld: withheldCount,
          locked: lockedCount,
          blocked: blockedCount,
          paid: paidCount,
          totalClearedAmount: totalCleared,
          totalDebt: totalDebt,
        },
        permissions: permissions.map(p => ({
          transactionId: p.transactionId,
          permissionStatus: p.permissionStatus,
          payoutAmount: p.payoutAmount,
          clearedAt: p.clearedAt?.toISOString() || null,
          blockedReason: p.blockedReason,
          debtAmount: p.debtAmount,
        })),
      });
    } catch (error) {
      console.error("[LogisticsAPI] Error fetching seller summary:", error);
      res.status(500).json({ error: "Failed to fetch seller summary" });
    }
  });

  console.log("[LogisticsAPI] Routes registered successfully");
}
