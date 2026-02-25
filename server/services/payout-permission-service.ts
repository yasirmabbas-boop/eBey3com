import { db } from "../db";
import { eq, and, lt, gte, sql, inArray, desc } from "drizzle-orm";
import {
  payoutPermissions,
  transactions,
  listings,
  walletTransactions,
  type InsertPayoutPermission,
} from "@shared/schema";

// ─── Types for admin reconciliation view ──────────────────────────────────────

export interface AdminPermissionDetail {
  id: string;
  transactionId: string;
  listingId: string;
  listingTitle: string;
  payoutAmount: number;
  deliveredAt: Date;
  clearedAt: Date | null;
  permissionStatus: string;
  notes: string | null;
}

export interface AdminPayoutGroup {
  sellerId: string;
  sellerName: string;
  sellerPhone: string | null;
  clearedCount: number;
  totalAmount: number;
  oldestClearedAt: Date | null;
  permissions: AdminPermissionDetail[];
}

export interface SellerPayoutHistory {
  id: string;
  transactionId: string;
  listingTitle: string;
  payoutAmount: number;
  deliveredAt: Date;
  clearedAt: Date | null;
  paidAt: Date | null;
  permissionStatus: string;
  payoutReference: string | null;
  paymentMethod: string | null;
  blockedReason: string | null;
}

/**
 * PayoutPermissionService
 * Manages the clearance ledger for seller payouts in the logistics-bank system
 * 
 * State Machine: withheld -> locked/cleared -> paid/blocked
 */
class PayoutPermissionService {
  /**
   * Create payout permission when order is delivered
   * Clearance time = MAX(returnPolicyDays, 2) - NOT additive!
   */
  async createPermissionOnDelivery(transactionId: string): Promise<void> {
    console.log(`[PayoutPermission] Creating permission for transaction: ${transactionId}`);

    // Get transaction and listing details
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, transaction.listingId))
      .limit(1);

    if (!listing) {
      throw new Error(`Listing not found: ${transaction.listingId}`);
    }

    const returnPolicyDays = listing.returnPolicyDays || 0;
    const minimumGracePeriod = 2; // Platform minimum: 2 days
    const deliveredAt = transaction.deliveredAt || new Date();

    // CRITICAL: Clearance time is MAX of return policy OR minimum grace period
    // NOT additive! Examples:
    //   - returnPolicyDays=7, grace=2 → clearanceDays=7 (seller paid in 7 days)
    //   - returnPolicyDays=3, grace=2 → clearanceDays=3 (seller paid in 3 days)
    //   - returnPolicyDays=0, grace=2 → clearanceDays=2 (seller paid in 2 days)
    const clearanceDays = Math.max(returnPolicyDays, minimumGracePeriod);

    // Calculate grace period expiry
    const gracePeriodExpiresAt = new Date(deliveredAt);
    gracePeriodExpiresAt.setDate(gracePeriodExpiresAt.getDate() + clearanceDays);

    // Create permission record
    await db.insert(payoutPermissions).values({
      transactionId: transaction.id,
      listingId: transaction.listingId,
      sellerId: transaction.sellerId,
      buyerId: transaction.buyerId,
      payoutAmount: transaction.amount, // For now, full amount (will add commission later)
      originalAmount: transaction.amount,
      platformCommission: 0,
      returnPolicyDays,
      deliveredAt,
      gracePeriodExpiresAt,
      permissionStatus: "withheld", // Initial state
      notes: `Permission created on delivery. Clearance time: ${clearanceDays} days (max of ${returnPolicyDays} return policy or ${minimumGracePeriod} grace period)`,
    });

    console.log(`[PayoutPermission] CREATED for transaction ${transactionId}: status=withheld, clearance=${clearanceDays}d, expires=${gracePeriodExpiresAt.toISOString()}`);
  }

  /**
   * Lock permission when return request is filed
   * Prevents payout until seller approves/rejects
   */
  async lockPermissionForReturn(
    transactionId: string,
    returnRequestId: string
  ): Promise<void> {
    console.log(`[PayoutPermission] Locking permission for transaction: ${transactionId}, return request: ${returnRequestId}`);

    await db
      .update(payoutPermissions)
      .set({
        permissionStatus: "locked",
        lockedAt: new Date(),
        lockedReason: `Return request filed by buyer`,
        lockedByReturnRequestId: returnRequestId,
        updatedAt: new Date(),
      })
      .where(eq(payoutPermissions.transactionId, transactionId));

    console.log(`[PayoutPermission] LOCKED transaction ${transactionId}: return request ${returnRequestId}`);
  }

  /**
   * Unlock permission when seller rejects return
   * Permission returns to 'withheld' or 'cleared' depending on grace period
   */
  async unlockPermission(
    transactionId: string,
    reason: string
  ): Promise<void> {
    console.log(`[PayoutPermission] Unlocking permission for transaction: ${transactionId}, reason: ${reason}`);

    const [permission] = await db
      .select()
      .from(payoutPermissions)
      .where(eq(payoutPermissions.transactionId, transactionId))
      .limit(1);

    if (!permission) {
      console.error(`[PayoutPermission] Permission not found for transaction: ${transactionId}`);
      return;
    }

    // Check if grace period has expired
    const now = new Date();
    const isExpired = now >= permission.gracePeriodExpiresAt;

    const newStatus = isExpired ? "cleared" : "withheld";

    await db
      .update(payoutPermissions)
      .set({
        permissionStatus: newStatus,
        lockedAt: null,
        lockedReason: null,
        lockedByReturnRequestId: null,
        isCleared: isExpired,
        clearedAt: isExpired ? now : null,
        clearedBy: isExpired ? "system" : null,
        notes: sql`CONCAT(COALESCE(${payoutPermissions.notes}, ''), '\n', ${`Unlocked: ${reason} at ${now.toISOString()}`})`,
        updatedAt: now,
      })
      .where(eq(payoutPermissions.transactionId, transactionId));

    console.log(`[PayoutPermission] UNLOCKED transaction ${transactionId}: status=${newStatus}, grace_expired=${isExpired}`);
  }

  /**
   * Block permission permanently when admin processes refund
   * Creates debt owed by seller
   */
  async blockPermissionForRefund(
    transactionId: string,
    adminId: string,
    reason: string,
    refundAmount: number
  ): Promise<void> {
    console.log(`[PayoutPermission] Blocking permission for transaction: ${transactionId}, refund: ${refundAmount}`);

    const now = new Date();
    const debtDueDate = new Date(now);
    debtDueDate.setDate(debtDueDate.getDate() + 30); // 30 days to pay debt

    await db
      .update(payoutPermissions)
      .set({
        permissionStatus: "blocked",
        isCleared: false,
        blockedAt: now,
        blockedReason: reason,
        blockedBy: adminId,
        debtAmount: refundAmount,
        debtDueDate,
        debtStatus: "pending",
        notes: sql`CONCAT(COALESCE(${payoutPermissions.notes}, ''), '\n', ${`Blocked by admin ${adminId}: ${reason} at ${now.toISOString()}`})`,
        updatedAt: now,
      })
      .where(eq(payoutPermissions.transactionId, transactionId));

    console.log(`[PayoutPermission] BLOCKED transaction ${transactionId}: debt=${refundAmount} IQD, due=${debtDueDate.toISOString()}`);
  }

  /**
   * PHASE 6: Block permission when buyer refuses delivery
   * 
   * FINANCIAL GUARD - ZERO-ON-REFUSAL:
   * - payoutAmount: 0 (hard-coded, seller gets nothing)
   * - commission: 0 (not calculated, not charged)
   * - fees: 0 (no delivery fees deducted)
   * - debtAmount: 0 (no debt created)
   * - payoutStatus: "blocked" (permanently blocked)
   * - No "Yellow Money" added to wallet (settlement reversed if exists)
   * 
   * Arabic label: "تم رفض الاستلام من قبل المشتري"
   */
  async blockPermissionForBuyerRefusal(
    transactionId: string,
    reason: string
  ): Promise<void> {
    console.log(`[PayoutPermission] ZERO-ON-REFUSAL blocking for transaction: ${transactionId}`);

    const now = new Date();

    // CRITICAL: Hard-code financial outputs to ZERO
    await db
      .update(payoutPermissions)
      .set({
        permissionStatus: "blocked", // Permanently blocked
        isCleared: false,
        payoutAmount: 0, // ZERO payout
        blockedAt: now,
        blockedReason: `تم رفض الاستلام من قبل المشتري: ${reason}`,
        blockedBy: "system",
        debtAmount: 0, // ZERO debt - buyer refused, seller gets zero
        debtStatus: "resolved", // Not a debt situation
        notes: sql`CONCAT(COALESCE(${payoutPermissions.notes}, ''), '\n', ${`ZERO-ON-REFUSAL BLOCK at ${now.toISOString()}: ${reason}. Seller receives 0 IQD. Zero commission. Zero fees. Zero debt.`})`,
        updatedAt: now,
      })
      .where(eq(payoutPermissions.transactionId, transactionId));

    console.log(`[PayoutPermission] ✅ ZERO-ON-REFUSAL: Blocked transaction ${transactionId} - Payout: 0 IQD, Debt: 0 IQD`);
  }

  /**
   * Process expired grace periods - called by cron job
   * Changes 'withheld' permissions to 'cleared' when grace period expires
   */
  async processExpiredGracePeriods(): Promise<number> {
    console.log(`[PayoutPermission] Processing expired grace periods...`);

    const now = new Date();

    const result = await db
      .update(payoutPermissions)
      .set({
        permissionStatus: "cleared",
        isCleared: true,
        clearedAt: now,
        clearedBy: "system",
        updatedAt: now,
      })
      .where(
        and(
          eq(payoutPermissions.permissionStatus, "withheld"),
          lt(payoutPermissions.gracePeriodExpiresAt, now)
        )
      );

    const count = result.rowCount || 0;
    console.log(`[PayoutPermission] Cleared ${count} expired permissions`);

    return count;
  }

  /**
   * Get cleared payouts for delivery partner API
   */
  async getClearedPayouts(
    sellerId?: string,
    limit: number = 100
  ): Promise<typeof payoutPermissions.$inferSelect[]> {
    let query = db
      .select()
      .from(payoutPermissions)
      .where(
        and(
          eq(payoutPermissions.permissionStatus, "cleared"),
          eq(payoutPermissions.isCleared, true)
        )
      )
      .orderBy(payoutPermissions.clearedAt)
      .limit(limit);

    if (sellerId) {
      query = db
        .select()
        .from(payoutPermissions)
        .where(
          and(
            eq(payoutPermissions.permissionStatus, "cleared"),
            eq(payoutPermissions.isCleared, true),
            eq(payoutPermissions.sellerId, sellerId)
          )
        )
        .orderBy(payoutPermissions.clearedAt)
        .limit(limit);
    }

    return await query;
  }

  /**
   * Mark permission as paid by delivery partner
   */
  async markAsPaid(
    transactionId: string,
    payoutReference: string,
    paidBy: string
  ): Promise<void> {
    console.log(`[PayoutPermission] Marking as paid: ${transactionId}, ref: ${payoutReference}`);

    const now = new Date();

    await db
      .update(payoutPermissions)
      .set({
        permissionStatus: "paid",
        paidAt: now,
        payoutReference,
        paidBy,
        updatedAt: now,
      })
      .where(
        and(
          eq(payoutPermissions.transactionId, transactionId),
          eq(payoutPermissions.permissionStatus, "cleared")
        )
      );

    console.log(`[PayoutPermission] PAID transaction ${transactionId}: ref=${payoutReference}`);
  }

  // ─── Admin Reconciliation Methods ─────────────────────────────────────────

  /**
   * Get all cleared permissions grouped by seller — the admin reconciliation view.
   * Returns only permissions in 'cleared' status that are ready to be paid.
   * Enriches each record with listing title.
   */
  async getAdminPayoutGroups(
    sellerId?: string
  ): Promise<AdminPayoutGroup[]> {
    const whereClause = sellerId
      ? and(
          eq(payoutPermissions.permissionStatus, "cleared"),
          eq(payoutPermissions.isCleared, true),
          eq(payoutPermissions.sellerId, sellerId)
        )
      : and(
          eq(payoutPermissions.permissionStatus, "cleared"),
          eq(payoutPermissions.isCleared, true)
        );

    const cleared = await db
      .select()
      .from(payoutPermissions)
      .where(whereClause)
      .orderBy(payoutPermissions.clearedAt);

    // Enrich with listing titles
    const enriched: AdminPermissionDetail[] = await Promise.all(
      cleared.map(async (p) => {
        const [listing] = await db
          .select({ title: listings.title })
          .from(listings)
          .where(eq(listings.id, p.listingId))
          .limit(1);
        return {
          id: p.id,
          transactionId: p.transactionId,
          listingId: p.listingId,
          listingTitle: listing?.title || `طلب #${p.transactionId.slice(0, 8)}`,
          payoutAmount: p.payoutAmount,
          deliveredAt: p.deliveredAt,
          clearedAt: p.clearedAt,
          permissionStatus: p.permissionStatus,
          notes: p.notes,
        };
      })
    );

    // Group by seller
    const grouped = new Map<string, AdminPayoutGroup>();
    for (const item of enriched) {
      const perm = cleared.find((p) => p.id === item.id)!;
      if (!grouped.has(perm.sellerId)) {
        grouped.set(perm.sellerId, {
          sellerId: perm.sellerId,
          sellerName: "",
          sellerPhone: null,
          clearedCount: 0,
          totalAmount: 0,
          oldestClearedAt: item.clearedAt,
          permissions: [],
        });
      }
      const group = grouped.get(perm.sellerId)!;
      group.clearedCount++;
      group.totalAmount += item.payoutAmount;
      group.permissions.push(item);
      if (
        item.clearedAt &&
        (!group.oldestClearedAt || item.clearedAt < group.oldestClearedAt)
      ) {
        group.oldestClearedAt = item.clearedAt;
      }
    }

    return Array.from(grouped.values());
  }

  /**
   * Admin marks one or more permissions as paid.
   * Also updates the corresponding wallet_transactions to 'paid' status
   * so the seller's wallet balance reflects the payment.
   */
  async adminMarkAsPaid(
    permissionIds: string[],
    adminId: string,
    paymentMethod: string,
    paymentReference?: string
  ): Promise<number> {
    if (permissionIds.length === 0) return 0;
    const now = new Date();

    // Fetch the permissions to get transaction IDs
    const perms = await db
      .select()
      .from(payoutPermissions)
      .where(
        and(
          inArray(payoutPermissions.id, permissionIds),
          eq(payoutPermissions.permissionStatus, "cleared")
        )
      );

    if (perms.length === 0) return 0;

    const transactionIds = perms.map((p) => p.transactionId);

    // Mark permissions as paid
    await db
      .update(payoutPermissions)
      .set({
        permissionStatus: "paid",
        paidAt: now,
        paidBy: adminId,
        payoutReference: paymentReference || null,
        notes: sql`CONCAT(COALESCE(${payoutPermissions.notes}, ''), '\n', ${`Admin paid via ${paymentMethod} at ${now.toISOString()}`})`,
        updatedAt: now,
      })
      .where(inArray(payoutPermissions.id, permissionIds));

    // Sync wallet_transactions — move available → paid for these transactions
    await db
      .update(walletTransactions)
      .set({
        status: "paid",
        weeklyPayoutId: null, // no longer tied to weekly batch
      })
      .where(
        and(
          inArray(walletTransactions.transactionId, transactionIds),
          eq(walletTransactions.status, "available")
        )
      );

    console.log(
      `[PayoutPermission] Admin ${adminId} paid ${perms.length} permissions via ${paymentMethod}` +
        (paymentReference ? `, ref: ${paymentReference}` : "")
    );

    return perms.length;
  }

  /**
   * Admin reverses/blocks a cleared permission.
   * Creates a return_reversal wallet entry to reduce the seller's available balance.
   */
  async adminReversePermission(
    permissionId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    const now = new Date();

    const [perm] = await db
      .select()
      .from(payoutPermissions)
      .where(eq(payoutPermissions.id, permissionId))
      .limit(1);

    if (!perm) throw new Error("Permission not found");
    if (!["cleared", "withheld"].includes(perm.permissionStatus)) {
      throw new Error(`Cannot reverse permission with status: ${perm.permissionStatus}`);
    }

    // Block the permission
    await db
      .update(payoutPermissions)
      .set({
        permissionStatus: "blocked",
        blockedAt: now,
        blockedReason: reason,
        blockedBy: adminId,
        debtAmount: perm.payoutAmount,
        debtDueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days
        debtStatus: "pending",
        notes: sql`CONCAT(COALESCE(${payoutPermissions.notes}, ''), '\n', ${`REVERSED by admin ${adminId}: ${reason} at ${now.toISOString()}`})`,
        updatedAt: now,
      })
      .where(eq(payoutPermissions.id, permissionId));

    // Reverse the wallet_transactions entries for this transaction
    const txns = await db
      .select()
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.transactionId, perm.transactionId),
          eq(walletTransactions.status, "available")
        )
      );

    for (const txn of txns) {
      // Mark original as reversed
      await db
        .update(walletTransactions)
        .set({ status: "reversed" })
        .where(eq(walletTransactions.id, txn.id));

      // Create offsetting reversal entry
      if (txn.amount !== 0) {
        await db.insert(walletTransactions).values({
          sellerId: txn.sellerId,
          transactionId: perm.transactionId,
          type: "return_reversal",
          amount: -txn.amount,
          description: `إلغاء من قبل الإدارة: ${reason}`,
          status: "available",
        });
      }
    }

    console.log(
      `[PayoutPermission] Admin ${adminId} REVERSED permission ${permissionId} for transaction ${perm.transactionId}: ${reason}`
    );
  }

  /**
   * Get payout history for admin or seller view.
   * Returns paid + blocked permissions with enriched listing titles.
   */
  async getPayoutHistory(
    sellerId?: string,
    limit = 50
  ): Promise<SellerPayoutHistory[]> {
    const whereClause = sellerId
      ? and(
          inArray(payoutPermissions.permissionStatus, ["paid", "blocked"]),
          eq(payoutPermissions.sellerId, sellerId)
        )
      : inArray(payoutPermissions.permissionStatus, ["paid", "blocked"]);

    const records = await db
      .select()
      .from(payoutPermissions)
      .where(whereClause)
      .orderBy(desc(payoutPermissions.paidAt))
      .limit(limit);

    return Promise.all(
      records.map(async (p) => {
        const [listing] = await db
          .select({ title: listings.title })
          .from(listings)
          .where(eq(listings.id, p.listingId))
          .limit(1);
        return {
          id: p.id,
          transactionId: p.transactionId,
          listingTitle: listing?.title || `طلب #${p.transactionId.slice(0, 8)}`,
          payoutAmount: p.payoutAmount,
          deliveredAt: p.deliveredAt,
          clearedAt: p.clearedAt,
          paidAt: p.paidAt,
          permissionStatus: p.permissionStatus,
          payoutReference: p.payoutReference,
          paymentMethod: p.paidBy
            ? p.notes?.match(/paid via (\S+)/)?.[1] || null
            : null,
          blockedReason: p.blockedReason,
        };
      })
    );
  }

  /**
   * Get a seller's full payout history for the seller dashboard.
   * Includes all statuses (withheld, locked, cleared, paid, blocked).
   */
  async getSellerPayoutHistory(sellerId: string, limit = 30): Promise<SellerPayoutHistory[]> {
    const records = await db
      .select()
      .from(payoutPermissions)
      .where(eq(payoutPermissions.sellerId, sellerId))
      .orderBy(desc(payoutPermissions.deliveredAt))
      .limit(limit);

    return Promise.all(
      records.map(async (p) => {
        const [listing] = await db
          .select({ title: listings.title })
          .from(listings)
          .where(eq(listings.id, p.listingId))
          .limit(1);
        return {
          id: p.id,
          transactionId: p.transactionId,
          listingTitle: listing?.title || `طلب #${p.transactionId.slice(0, 8)}`,
          payoutAmount: p.payoutAmount,
          deliveredAt: p.deliveredAt,
          clearedAt: p.clearedAt,
          paidAt: p.paidAt,
          permissionStatus: p.permissionStatus,
          payoutReference: p.payoutReference,
          paymentMethod: p.paidBy
            ? p.notes?.match(/paid via (\S+)/)?.[1] || null
            : null,
          blockedReason: p.blockedReason,
        };
      })
    );
  }
}

export const payoutPermissionService = new PayoutPermissionService();
