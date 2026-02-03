import { db } from "../db";
import { eq, and, lt, gte, sql } from "drizzle-orm";
import {
  payoutPermissions,
  transactions,
  listings,
  type InsertPayoutPermission,
} from "@shared/schema";

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
}

export const payoutPermissionService = new PayoutPermissionService();
