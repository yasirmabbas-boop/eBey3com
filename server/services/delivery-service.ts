/**
 * Delivery Service
 * Manages delivery orders and processes webhook updates
 */

import { db } from "../db";
import { deliveryOrders, deliveryStatusLog, transactions, users, listings } from "@shared/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { deliveryApi, DeliveryWebhookPayload } from "./delivery-api";
import { financialService } from "./financial-service";
import { storage } from "../storage";
import { sendPushNotification } from "../push-notifications";
import { sendToUser } from "../websocket";

// No-answer grace window: 24 hours for buyer to reschedule
const NO_ANSWER_GRACE_HOURS = 24;
// Temporary order ban duration after no-answer expiry: 7 days
const NO_ANSWER_BAN_DAYS = 7;

export interface CreateDeliveryRequest {
  transactionId: string;
}

export type DriverCancellationReason = 
  | "no_show"           // العميل غير موجود
  | "no_answer"         // لا يرد على الهاتف
  | "customer_refused"  // العميل رفض الاستلام
  | "customer_return"   // العميل طلب الإرجاع
  | "wrong_address"     // العنوان خاطئ
  | "inaccessible"      // لا يمكن الوصول
  | "damaged_package"   // الطرد تالف
  | "other";            // سبب آخر

export const CANCELLATION_REASON_LABELS: Record<DriverCancellationReason, { ar: string; en: string }> = {
  no_show: { ar: "العميل غير موجود", en: "Customer Not Present" },
  no_answer: { ar: "لا يرد على الهاتف", en: "No Answer" },
  customer_refused: { ar: "العميل رفض الاستلام", en: "Customer Refused" },
  customer_return: { ar: "العميل طلب الإرجاع", en: "Customer Requested Return" },
  wrong_address: { ar: "العنوان خاطئ", en: "Wrong Address" },
  inaccessible: { ar: "لا يمكن الوصول للموقع", en: "Location Inaccessible" },
  damaged_package: { ar: "الطرد تالف", en: "Package Damaged" },
  other: { ar: "سبب آخر", en: "Other" },
};

class DeliveryService {

  async createDeliveryOrder(transactionId: string): Promise<typeof deliveryOrders.$inferSelect | null> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!transaction) {
      console.error(`[DeliveryService] Transaction not found: ${transactionId}`);
      return null;
    }

    const [seller] = await db
      .select()
      .from(users)
      .where(eq(users.id, transaction.sellerId))
      .limit(1);

    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, transaction.listingId))
      .limit(1);

    if (!seller || !listing) {
      console.error(`[DeliveryService] Seller or listing not found for transaction: ${transactionId}`);
      return null;
    }

    // Get seller's saved address for precise pickup location
    let sellerAddress = null;
    if (listing.sellerAddressId) {
      sellerAddress = await storage.getSellerAddressById(listing.sellerAddressId);
    }

    // Determine pickup information using seller address if available, else fall back to listing/seller
    const pickupAddress = sellerAddress?.addressLine1 || listing.area || seller.addressLine1 || seller.city || "بغداد";
    const pickupCity = sellerAddress?.city || listing.city || seller.city || "بغداد";
    const pickupDistrict = sellerAddress?.district || "";
    const pickupPhone = sellerAddress?.phone || seller.phone || "";
    const pickupContactName = sellerAddress?.contactName || listing.sellerName || seller.displayName;
    const pickupLatitude = sellerAddress?.latitude || listing.locationLat;
    const pickupLongitude = sellerAddress?.longitude || listing.locationLng;

    try {
      const deliveryResponse = await deliveryApi.createShipment({
        orderId: transactionId,
        pickupAddress,
        pickupCity,
        pickupPhone,
        pickupContactName,
        deliveryAddress: transaction.deliveryAddress || "",
        deliveryCity: transaction.deliveryCity || "",
        deliveryPhone: transaction.deliveryPhone || "",
        deliveryContactName: "المشتري",
        codAmount: transaction.amount,
        shippingCost: listing.shippingCost || 0,
        itemDescription: listing.title,
        itemWeight: undefined,
      });

      const estimatedDate = new Date(deliveryResponse.estimatedDeliveryDate);

      const [deliveryOrder] = await db
        .insert(deliveryOrders)
        .values({
          transactionId,
          externalDeliveryId: deliveryResponse.externalDeliveryId,
          externalTrackingNumber: deliveryResponse.trackingNumber,
          pickupAddress,
          pickupCity,
          pickupPhone,
          pickupContactName,
          deliveryAddress: transaction.deliveryAddress || "",
          deliveryCity: transaction.deliveryCity || "",
          deliveryPhone: transaction.deliveryPhone || "",
          deliveryContactName: "المشتري",
          codAmount: transaction.amount,
          shippingCost: listing.shippingCost || 0,
          itemDescription: listing.title,
          status: "pending",
          estimatedDeliveryDate: estimatedDate,
          sellerAddressId: listing.sellerAddressId,
        })
        .returning();

      await db
        .update(transactions)
        .set({
          trackingNumber: deliveryResponse.trackingNumber,
          deliveryStatus: "pending_pickup",
        })
        .where(eq(transactions.id, transactionId));

      await this.logStatus(deliveryOrder.id, "pending", "تم إنشاء طلب التوصيل", true);

      console.log(`[DeliveryService] Created delivery order: ${deliveryOrder.id} for transaction: ${transactionId}`);
      return deliveryOrder;
    } catch (error: any) {
      console.error(`[DeliveryService] Failed to create delivery order:`, error);
      return null;
    }
  }

  async processWebhook(payload: DeliveryWebhookPayload): Promise<boolean> {
    console.log(`[DeliveryService] Received webhook for delivery: ${payload.deliveryId}`);

    const [deliveryOrder] = await db
      .select()
      .from(deliveryOrders)
      .where(eq(deliveryOrders.externalDeliveryId, payload.deliveryId))
      .limit(1);

    if (!deliveryOrder) {
      console.error(`[DeliveryService] Delivery order not found for external ID: ${payload.deliveryId}`);
      return false;
    }

    await this.logStatus(
      deliveryOrder.id,
      payload.status,
      payload.statusMessage,
      true,
      payload.latitude,
      payload.longitude,
      payload.driverNotes,
      payload.photoUrl,
      JSON.stringify(payload)
    );

    const updateData: Partial<typeof deliveryOrders.$inferInsert> = {
      status: payload.status,
      updatedAt: new Date(),
    };

    if (payload.driverName) updateData.driverName = payload.driverName;
    if (payload.driverPhone) updateData.driverPhone = payload.driverPhone;
    if (payload.latitude) updateData.currentLat = payload.latitude;
    if (payload.longitude) updateData.currentLng = payload.longitude;
    if (payload.latitude || payload.longitude) updateData.lastLocationUpdate = new Date();
    if (payload.photoUrl) updateData.deliveryProofUrl = payload.photoUrl;
    if (payload.returnReason) updateData.returnReason = payload.returnReason;

    if (payload.cashCollected) {
      updateData.cashCollected = true;
      updateData.cashCollectedAt = new Date();
    }

    await db
      .update(deliveryOrders)
      .set(updateData)
      .where(eq(deliveryOrders.id, deliveryOrder.id));

    await this.mapDeliveryStatusToTransaction(deliveryOrder.transactionId, payload.status);

    if (payload.status === "delivered" && payload.cashCollected) {
      await this.handleSuccessfulDelivery(deliveryOrder);
    } else if (payload.status === "returned") {
      await this.handleReturn(deliveryOrder, payload.returnReason || "مرتجع من العميل");
    } else if (payload.status === "customer_refused") {
      // PHASE 6: Handle buyer refusal
      await this.handleBuyerRefusal(deliveryOrder, payload.returnReason || "رفض المشتري الاستلام");
    }

    return true;
  }

  private async mapDeliveryStatusToTransaction(transactionId: string, deliveryStatus: string): Promise<void> {
    let txStatus: string;
    let deliveryStatusMapped: string;

    switch (deliveryStatus) {
      case "pending":
        deliveryStatusMapped = "pending_pickup";
        txStatus = "pending";
        break;
      case "assigned":
        deliveryStatusMapped = "assigned";
        txStatus = "pending";
        break;
      case "picked_up":
        deliveryStatusMapped = "picked_up";
        txStatus = "processing";
        break;
      case "in_transit":
        deliveryStatusMapped = "in_transit";
        txStatus = "processing";
        break;
      case "out_for_delivery":
        deliveryStatusMapped = "out_for_delivery";
        txStatus = "processing";
        break;
      case "delivered":
        deliveryStatusMapped = "delivered";
        txStatus = "pending_acceptance";
        break;
      case "returned":
        deliveryStatusMapped = "returned";
        txStatus = "returned";
        break;
      case "customer_refused":
        deliveryStatusMapped = "refused";
        txStatus = "refused";
        break;
      case "cancelled":
        deliveryStatusMapped = "cancelled";
        txStatus = "cancelled";
        break;
      default:
        deliveryStatusMapped = deliveryStatus;
        txStatus = "processing";
    }

    await db
      .update(transactions)
      .set({
        deliveryStatus: deliveryStatusMapped,
        status: txStatus,
      })
      .where(eq(transactions.id, transactionId));
  }

  /**
   * Handle successful delivery and collection
   * 
   * COLLECTION-TRIGGERED "YELLOW MONEY" LOGIC:
   * This method is ONLY called when:
   * - payload.status === "delivered"
   * - AND payload.cashCollected === true
   * 
   * This ensures "Yellow Money" (pending wallet balance) is ONLY added when:
   * 1. Item is physically delivered to buyer
   * 2. Cash is collected by delivery partner
   * 
   * If item is "Shipped" but not "Delivered" → NO wallet update
   * If item is "Delivered" but buyer refused → NO wallet update (handled separately)
   */
  private async handleSuccessfulDelivery(deliveryOrder: typeof deliveryOrders.$inferSelect): Promise<void> {
    console.log(`[DeliveryService] ✅ Successful delivery & collection for order: ${deliveryOrder.id}`);

    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, deliveryOrder.transactionId))
      .limit(1);

    if (!transaction) {
      console.error(`[DeliveryService] Transaction not found: ${deliveryOrder.transactionId}`);
      return;
    }

    const deliveredAt = new Date();

    await db
      .update(deliveryOrders)
      .set({
        actualDeliveryDate: deliveredAt,
        status: "delivered",
      })
      .where(eq(deliveryOrders.id, deliveryOrder.id));

    // PHASE 1: Set deliveredAt timestamp to start the Maturity Clock
    await db
      .update(transactions)
      .set({
        deliveredAt: deliveredAt,
      })
      .where(eq(transactions.id, transaction.id));

    // PHASE 6: COLLECTION-TRIGGERED "YELLOW MONEY"
    // This is THE ONLY place where pending balance is added to seller's wallet
    // Runs ONLY on successful delivery + cash collection
    await financialService.createSaleSettlement(
      transaction.sellerId,
      transaction.id,
      transaction.amount,
      deliveryOrder.shippingCost
    );

    console.log(`[DeliveryService] 💰 "Yellow Money" added to seller wallet: ${transaction.sellerId} - Amount: ${transaction.amount} IQD (pending)`);

    // PHASE 1: Create payout permission to start the grace period
    try {
      const { payoutPermissionService } = await import("./payout-permission-service");
      await payoutPermissionService.createPermissionOnDelivery(transaction.id);
      console.log(`[DeliveryService] ⏳ Payout permission created (withheld): Transaction ${transaction.id}`);
    } catch (error) {
      console.error(`[DeliveryService] Failed to create payout permission: ${error}`);
      // Continue - don't block delivery flow
    }
  }

  private async handleReturn(
    deliveryOrder: typeof deliveryOrders.$inferSelect,
    reason: string
  ): Promise<void> {
    console.log(`[DeliveryService] Handling return for order: ${deliveryOrder.id}, reason: ${reason}`);

    await db
      .update(deliveryOrders)
      .set({
        status: "returned",
        returnReason: reason,
      })
      .where(eq(deliveryOrders.id, deliveryOrder.id));

    await db
      .update(transactions)
      .set({
        status: "returned",
        deliveryStatus: "returned",
      })
      .where(eq(transactions.id, deliveryOrder.transactionId));

    await financialService.reverseSettlement(deliveryOrder.transactionId, reason);
  }

  /**
   * PHASE 6: Handle buyer refusal
   * 
   * ZERO-ON-REFUSAL FINANCIAL GUARD:
   * 1. Reverse any settlement (remove "Yellow Money" from wallet)
   * 2. Block payout permission with ZERO amounts
   * 3. Ensure ZERO commission charged
   * 4. Ensure ZERO fees deducted
   * 5. Seller receives absolutely nothing
   * 
   * Arabic notification: "تم رفض الاستلام - لن يتم خصم أي عمولة أو رسوم"
   */
  private async handleBuyerRefusal(
    deliveryOrder: typeof deliveryOrders.$inferSelect,
    reason: string
  ): Promise<void> {
    console.log(`[DeliveryService] 🚫 BUYER REFUSAL for order: ${deliveryOrder.id}, reason: ${reason}`);

    const arabicReason = `تم رفض الاستلام: ${reason}`;

    // 1. Update delivery order status
    await db
      .update(deliveryOrders)
      .set({
        status: "customer_refused",
        returnReason: arabicReason,
      })
      .where(eq(deliveryOrders.id, deliveryOrder.id));

    // 2. Update transaction status
    await db
      .update(transactions)
      .set({
        status: "refused",
        deliveryStatus: "refused",
      })
      .where(eq(transactions.id, deliveryOrder.transactionId));

    // 3. CRITICAL: Reverse any settlement (remove "Yellow Money")
    // This ensures NO pending balance is added to seller's wallet
    try {
      await financialService.reverseSettlement(deliveryOrder.transactionId, arabicReason);
      console.log(`[DeliveryService] ✅ Settlement reversed: No "Yellow Money" for refused order ${deliveryOrder.transactionId}`);
    } catch (error) {
      console.error(`[DeliveryService] Error reversing settlement: ${error}`);
      // Continue - settlement may not exist if refusal happened before collection
    }

    // 4. PHASE 6: Block payout permission with ZERO-ON-REFUSAL logic
    // Hard-codes: payoutAmount=0, commission=0, fees=0, debt=0
    try {
      const { payoutPermissionService } = await import("./payout-permission-service");
      await payoutPermissionService.blockPermissionForBuyerRefusal(
        deliveryOrder.transactionId,
        arabicReason
      );
      console.log(`[DeliveryService] ✅ ZERO-ON-REFUSAL applied: Transaction ${deliveryOrder.transactionId} blocked with 0 IQD payout`);
    } catch (error) {
      console.error(`[DeliveryService] ❌ Failed to block payout permission: ${error}`);
    }

    // 5. Notify seller (Arabic message confirming zero charges)
    try {
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, deliveryOrder.transactionId))
        .limit(1);

      if (transaction) {
        await storage.createNotification({
          userId: transaction.sellerId,
          type: "delivery_refused",
          title: "رفض المشتري الاستلام",
          message: `تم رفض استلام الطلب من قبل المشتري. السبب: ${reason}. لن يتم خصم أي عمولة أو رسوم. لن تحصل على أي مبلغ من هذا الطلب.`,
          linkUrl: `/seller-dashboard?tab=sales&orderId=${transaction.id}`,
          relatedId: transaction.id,
        });
        console.log(`[DeliveryService] ✅ Refusal notification sent to seller ${transaction.sellerId}`);
      }
    } catch (notifError) {
      console.error(`[DeliveryService] ❌ Failed to send refusal notification: ${notifError}`);
    }
  }

  async confirmDeliveryAcceptance(transactionId: string): Promise<boolean> {
    const [deliveryOrder] = await db
      .select()
      .from(deliveryOrders)
      .where(eq(deliveryOrders.transactionId, transactionId))
      .limit(1);

    if (!deliveryOrder || deliveryOrder.status !== "delivered") {
      return false;
    }

    await db
      .update(transactions)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId));

    console.log(`[DeliveryService] Buyer accepted delivery for transaction: ${transactionId}`);
    return true;
  }

  async getDeliveryOrder(transactionId: string): Promise<typeof deliveryOrders.$inferSelect | null> {
    const [order] = await db
      .select()
      .from(deliveryOrders)
      .where(eq(deliveryOrders.transactionId, transactionId))
      .limit(1);

    return order || null;
  }

  async getDeliveryTracking(transactionId: string): Promise<{
    order: typeof deliveryOrders.$inferSelect;
    statusLog: typeof deliveryStatusLog.$inferSelect[];
  } | null> {
    const order = await this.getDeliveryOrder(transactionId);
    if (!order) return null;

    const log = await db
      .select()
      .from(deliveryStatusLog)
      .where(eq(deliveryStatusLog.deliveryOrderId, order.id))
      .orderBy(deliveryStatusLog.createdAt);

    return { order, statusLog: log };
  }

  async processDriverCancellation(
    externalDeliveryId: string,
    reason: DriverCancellationReason,
    driverNotes?: string,
    latitude?: number,
    longitude?: number
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[DeliveryService] Processing driver cancellation for: ${externalDeliveryId}, reason: ${reason}`);

    const [deliveryOrder] = await db
      .select()
      .from(deliveryOrders)
      .where(eq(deliveryOrders.externalDeliveryId, externalDeliveryId))
      .limit(1);

    if (!deliveryOrder) {
      console.error(`[DeliveryService] Delivery order not found for external ID: ${externalDeliveryId}`);
      return { success: false, error: "Delivery order not found" };
    }

    if (deliveryOrder.status === "delivered" || deliveryOrder.status === "completed") {
      return { success: false, error: "Cannot cancel a delivered order" };
    }

    const reasonLabel = CANCELLATION_REASON_LABELS[reason]?.ar || reason;
    const statusMessage = `إلغاء من السائق: ${reasonLabel}${driverNotes ? ` - ${driverNotes}` : ""}`;

    // NO-ANSWER / NO-SHOW: Enter 24h grace window instead of immediate cancellation
    if (reason === "no_answer" || reason === "no_show") {
      return this.handleNoAnswerGraceWindow(deliveryOrder, reason, reasonLabel, statusMessage, driverNotes, latitude, longitude);
    }

    // All other reasons: immediate cancellation (existing behavior)
    await this.logStatus(
      deliveryOrder.id,
      "cancelled",
      statusMessage,
      true,
      latitude,
      longitude,
      driverNotes,
      undefined,
      JSON.stringify({ reason, driverNotes, latitude, longitude })
    );

    await db
      .update(deliveryOrders)
      .set({
        status: "cancelled",
        returnReason: reasonLabel,
        updatedAt: new Date(),
        currentLat: latitude,
        currentLng: longitude,
        lastLocationUpdate: latitude || longitude ? new Date() : undefined,
      })
      .where(eq(deliveryOrders.id, deliveryOrder.id));

    await db
      .update(transactions)
      .set({
        status: "cancelled",
        deliveryStatus: "cancelled",
        issueType: `driver_cancellation:${reason}`,
      })
      .where(eq(transactions.id, deliveryOrder.transactionId));

    await financialService.reverseSettlement(deliveryOrder.transactionId, `إلغاء من السائق: ${reasonLabel}`);

    console.log(`[DeliveryService] Driver cancellation processed for order: ${deliveryOrder.id}`);
    return { success: true };
  }

  /**
   * Handle no-answer / no-show: give buyer a 24h grace window to reschedule
   * instead of immediately cancelling the order.
   */
  private async handleNoAnswerGraceWindow(
    deliveryOrder: typeof deliveryOrders.$inferSelect,
    reason: DriverCancellationReason,
    reasonLabel: string,
    statusMessage: string,
    driverNotes?: string,
    latitude?: number,
    longitude?: number
  ): Promise<{ success: boolean; error?: string }> {
    const deadline = new Date(Date.now() + NO_ANSWER_GRACE_HOURS * 60 * 60 * 1000);

    await this.logStatus(
      deliveryOrder.id,
      "no_answer",
      statusMessage,
      true,
      latitude,
      longitude,
      driverNotes,
      undefined,
      JSON.stringify({ reason, driverNotes, latitude, longitude, noAnswerDeadline: deadline.toISOString() })
    );

    // Mark delivery order as on hold (not cancelled yet)
    await db
      .update(deliveryOrders)
      .set({
        status: "cancelled", // delivery attempt is done, but transaction is in grace window
        returnReason: reasonLabel,
        updatedAt: new Date(),
        currentLat: latitude,
        currentLng: longitude,
        lastLocationUpdate: latitude || longitude ? new Date() : undefined,
      })
      .where(eq(deliveryOrders.id, deliveryOrder.id));

    // Set transaction to no_answer_pending with deadline stored in issueNote
    await db
      .update(transactions)
      .set({
        status: "no_answer_pending",
        deliveryStatus: "no_answer",
        issueType: `driver_cancellation:${reason}`,
        issueNote: JSON.stringify({ noAnswerDeadline: deadline.toISOString(), reason }),
      })
      .where(eq(transactions.id, deliveryOrder.transactionId));

    // Get transaction to find the buyer
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, deliveryOrder.transactionId))
      .limit(1);

    if (transaction) {
      const buyerId = transaction.buyerId;
      const warningTitle = "السائق لم يتمكن من الوصول إليك! ⚠️";
      const warningMessage = reason === "no_answer"
        ? `لم يتمكن السائق من التواصل معك لتسليم طلبك. لديك 24 ساعة لإعادة جدولة التوصيل، وإلا سيتم إلغاء الطلب وتعليق حسابك من الطلب لمدة 7 أيام.`
        : `لم يجدك السائق في عنوان التوصيل. لديك 24 ساعة لإعادة جدولة التوصيل، وإلا سيتم إلغاء الطلب وتعليق حسابك من الطلب لمدة 7 أيام.`;

      // In-app notification
      try {
        const notification = await storage.createNotification({
          userId: buyerId,
          type: "no_answer_warning",
          title: warningTitle,
          message: warningMessage,
          linkUrl: `/buyer-dashboard?tab=purchases&orderId=${transaction.id}`,
          relatedId: transaction.id,
        });
        sendToUser(buyerId, "NOTIFICATION", {
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            linkUrl: notification.linkUrl,
          },
        });
      } catch (err) {
        console.error(`[DeliveryService] Failed to create no-answer notification:`, err);
      }

      // Push notification
      try {
        await sendPushNotification(buyerId, {
          title: warningTitle,
          body: warningMessage,
          url: `/buyer-dashboard?tab=purchases&orderId=${transaction.id}`,
          tag: `no-answer-${transaction.id}`,
        });
      } catch (err) {
        console.error(`[DeliveryService] Failed to send no-answer push:`, err);
      }

      // Also notify the seller
      try {
        await storage.createNotification({
          userId: transaction.sellerId,
          type: "no_answer_warning",
          title: "المشتري لم يرد على السائق",
          message: `لم يتمكن السائق من تسليم الطلب (${reasonLabel}). تم إعطاء المشتري 24 ساعة لإعادة الجدولة.`,
          linkUrl: `/seller-dashboard?tab=sales&orderId=${transaction.id}`,
          relatedId: transaction.id,
        });
      } catch (err) {
        console.error(`[DeliveryService] Failed to notify seller about no-answer:`, err);
      }
    }

    console.log(`[DeliveryService] No-answer grace window started for order: ${deliveryOrder.id}, deadline: ${deadline.toISOString()}`);
    return { success: true };
  }

  /**
   * Process expired no-answer orders (called by cron job hourly).
   * Orders past the 24h grace window get cancelled and buyer gets a 7-day order ban.
   */
  async processExpiredNoAnswerOrders(): Promise<number> {
    const now = new Date();
    let processedCount = 0;

    // Find all transactions in no_answer_pending status
    const pendingOrders = await db
      .select()
      .from(transactions)
      .where(eq(transactions.status, "no_answer_pending"));

    for (const tx of pendingOrders) {
      try {
        // Parse the deadline from issueNote
        let deadline: Date | null = null;
        try {
          const noteData = JSON.parse(tx.issueNote || "{}");
          deadline = noteData.noAnswerDeadline ? new Date(noteData.noAnswerDeadline) : null;
        } catch {
          // If issueNote is not valid JSON, treat as expired
          deadline = new Date(0);
        }

        if (!deadline || deadline > now) {
          continue; // Not expired yet
        }

        console.log(`[DeliveryService] No-answer grace expired for transaction: ${tx.id}`);

        // Cancel the order
        await db
          .update(transactions)
          .set({
            status: "cancelled",
            deliveryStatus: "cancelled",
            cancelledAt: now,
            issueNote: JSON.stringify({
              ...JSON.parse(tx.issueNote || "{}"),
              expiredAt: now.toISOString(),
              action: "no_answer_auto_cancelled",
            }),
          })
          .where(eq(transactions.id, tx.id));

        // Reverse any settlement
        try {
          await financialService.reverseSettlement(tx.id, "إلغاء تلقائي: عدم الرد خلال 24 ساعة");
        } catch (err) {
          console.error(`[DeliveryService] Settlement reversal error for ${tx.id}:`, err);
        }

        // Apply 7-day order ban to the buyer
        const banUntil = new Date(now.getTime() + NO_ANSWER_BAN_DAYS * 24 * 60 * 60 * 1000);
        await db
          .update(users)
          .set({
            orderBanUntil: banUntil,
            orderBanReason: "تم تعليق حسابك من الطلب بسبب عدم الرد على التوصيل",
            noAnswerCount: sql`${users.noAnswerCount} + 1`,
          })
          .where(eq(users.id, tx.buyerId));

        // Notify buyer about cancellation and ban
        const banTitle = "تم إلغاء طلبك وتعليق حسابك ⛔";
        const banMessage = `تم إلغاء طلبك بسبب عدم الرد على السائق خلال 24 ساعة. تم تعليق حسابك من الطلب لمدة ${NO_ANSWER_BAN_DAYS} أيام.`;
        try {
          const notification = await storage.createNotification({
            userId: tx.buyerId,
            type: "no_answer_cancelled",
            title: banTitle,
            message: banMessage,
            linkUrl: `/buyer-dashboard?tab=purchases`,
            relatedId: tx.id,
          });
          sendToUser(tx.buyerId, "NOTIFICATION", {
            notification: {
              id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              linkUrl: notification.linkUrl,
            },
          });
          await sendPushNotification(tx.buyerId, {
            title: banTitle,
            body: banMessage,
            url: `/buyer-dashboard?tab=purchases`,
            tag: `no-answer-ban-${tx.id}`,
          });
        } catch (err) {
          console.error(`[DeliveryService] Failed to send ban notification:`, err);
        }

        // Notify seller about final cancellation
        try {
          await storage.createNotification({
            userId: tx.sellerId,
            type: "no_answer_cancelled",
            title: "تم إلغاء الطلب نهائياً",
            message: `تم إلغاء الطلب نهائياً بسبب عدم رد المشتري خلال 24 ساعة. تم تعليق حساب المشتري.`,
            linkUrl: `/seller-dashboard?tab=sales&orderId=${tx.id}`,
            relatedId: tx.id,
          });
        } catch (err) {
          console.error(`[DeliveryService] Failed to notify seller:`, err);
        }

        processedCount++;
      } catch (err) {
        console.error(`[DeliveryService] Error processing expired no-answer for ${tx.id}:`, err);
      }
    }

    if (processedCount > 0) {
      console.log(`[DeliveryService] Processed ${processedCount} expired no-answer orders`);
    }
    return processedCount;
  }

  /**
   * Reschedule delivery for a no-answer order (buyer action within 24h grace window).
   * Resets the transaction to pending and creates a new delivery order.
   */
  async rescheduleDelivery(transactionId: string, buyerId: string): Promise<{ success: boolean; error?: string }> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!transaction) {
      return { success: false, error: "الطلب غير موجود" };
    }

    if (transaction.buyerId !== buyerId) {
      return { success: false, error: "غير مصرح لك بهذا الإجراء" };
    }

    if (transaction.status !== "no_answer_pending") {
      return { success: false, error: "هذا الطلب ليس في حالة انتظار إعادة الجدولة" };
    }

    // Check if grace window has expired
    try {
      const noteData = JSON.parse(transaction.issueNote || "{}");
      const deadline = noteData.noAnswerDeadline ? new Date(noteData.noAnswerDeadline) : null;
      if (deadline && deadline < new Date()) {
        return { success: false, error: "انتهت مهلة إعادة الجدولة (24 ساعة)" };
      }
    } catch {
      return { success: false, error: "خطأ في بيانات الطلب" };
    }

    // Reset transaction to pending for a new delivery attempt
    await db
      .update(transactions)
      .set({
        status: "pending",
        deliveryStatus: "pending_pickup",
        issueType: null,
        issueNote: JSON.stringify({
          rescheduledAt: new Date().toISOString(),
          previousStatus: "no_answer_pending",
        }),
      })
      .where(eq(transactions.id, transactionId));

    // Create a new delivery order
    const newDelivery = await this.createDeliveryOrder(transactionId);

    // Notify seller about the rescheduled delivery
    try {
      await storage.createNotification({
        userId: transaction.sellerId,
        type: "delivery_rescheduled",
        title: "تمت إعادة جدولة التوصيل 🔄",
        message: `قام المشتري بإعادة جدولة التوصيل للطلب. سيتم إرسال سائق جديد قريباً.`,
        linkUrl: `/seller-dashboard?tab=sales&orderId=${transactionId}`,
        relatedId: transactionId,
      });
    } catch (err) {
      console.error(`[DeliveryService] Failed to notify seller about reschedule:`, err);
    }

    // Notify buyer confirmation
    try {
      const notification = await storage.createNotification({
        userId: buyerId,
        type: "delivery_rescheduled",
        title: "تمت إعادة جدولة التوصيل بنجاح ✅",
        message: `تمت إعادة جدولة توصيل طلبك. سيتم إرسال سائق جديد قريباً. يرجى التأكد من تواجدك وتوفر هاتفك.`,
        linkUrl: `/buyer-dashboard?tab=purchases&orderId=${transactionId}`,
        relatedId: transactionId,
      });
      sendToUser(buyerId, "NOTIFICATION", {
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          linkUrl: notification.linkUrl,
        },
      });
      await sendPushNotification(buyerId, {
        title: "تمت إعادة جدولة التوصيل بنجاح ✅",
        body: "سيتم إرسال سائق جديد قريباً. يرجى التأكد من تواجدك.",
        url: `/buyer-dashboard?tab=purchases&orderId=${transactionId}`,
        tag: `reschedule-${transactionId}`,
      });
    } catch (err) {
      console.error(`[DeliveryService] Failed to send reschedule confirmation:`, err);
    }

    console.log(`[DeliveryService] Delivery rescheduled for transaction: ${transactionId}, new delivery: ${newDelivery?.id || "pending"}`);
    return { success: true };
  }

  async processCancellationWebhook(payload: {
    deliveryId: string;
    reason: DriverCancellationReason;
    driverNotes?: string;
    latitude?: number;
    longitude?: number;
    timestamp: string;
  }): Promise<boolean> {
    const result = await this.processDriverCancellation(
      payload.deliveryId,
      payload.reason,
      payload.driverNotes,
      payload.latitude,
      payload.longitude
    );
    return result.success;
  }

  getCancellationReasons(): { value: DriverCancellationReason; label: { ar: string; en: string } }[] {
    return Object.entries(CANCELLATION_REASON_LABELS).map(([value, label]) => ({
      value: value as DriverCancellationReason,
      label,
    }));
  }

  /**
   * Create a return shipment for an approved return request
   * This swaps the pickup (buyer) and delivery (seller) addresses
   */
  async createReturnDeliveryOrder(transactionId: string): Promise<typeof deliveryOrders.$inferSelect | null> {
    // Get the original transaction
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!transaction) {
      console.error(`[DeliveryService] Transaction not found for return: ${transactionId}`);
      return null;
    }

    // Get seller details
    const [seller] = await db
      .select()
      .from(users)
      .where(eq(users.id, transaction.sellerId))
      .limit(1);

    // Get listing details
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, transaction.listingId))
      .limit(1);

    if (!seller || !listing) {
      console.error(`[DeliveryService] Seller or listing not found for return: ${transactionId}`);
      return null;
    }

    // Get seller's saved address for return delivery destination
    let sellerAddress = null;
    if (listing.sellerAddressId) {
      sellerAddress = await storage.getSellerAddressById(listing.sellerAddressId);
    }

    // For return: buyer is pickup, seller is delivery (swapped from original order)
    // Pickup = buyer's address (from original transaction delivery info)
    const pickupAddress = transaction.deliveryAddress || "";
    const pickupCity = transaction.deliveryCity || "";
    const pickupPhone = transaction.deliveryPhone || "";
    const pickupContactName = "المشتري"; // Same as original delivery contact

    // Delivery = seller's address (swap from original pickup)
    const deliveryAddress = sellerAddress?.addressLine1 || listing.area || seller.addressLine1 || seller.city || "بغداد";
    const deliveryCity = sellerAddress?.city || listing.city || seller.city || "بغداد";
    const deliveryPhone = sellerAddress?.phone || seller.phone || "";
    const deliveryContactName = sellerAddress?.contactName || listing.sellerName || seller.displayName;

    try {
      // Call delivery API for return shipment
      const deliveryResponse = await deliveryApi.createShipment({
        orderId: `${transactionId}-return`,
        pickupAddress,
        pickupCity,
        pickupPhone,
        pickupContactName,
        deliveryAddress,
        deliveryCity,
        deliveryPhone,
        deliveryContactName,
        codAmount: 0, // No COD for returns
        shippingCost: 0, // Return shipping handled differently
        itemDescription: `إرجاع: ${listing.title}`,
        itemWeight: undefined,
      });

      const estimatedDate = new Date(deliveryResponse.estimatedDeliveryDate);

      // Create delivery order record for return
      const [returnDeliveryOrder] = await db
        .insert(deliveryOrders)
        .values({
          transactionId: `${transactionId}-return`,
          externalDeliveryId: deliveryResponse.externalDeliveryId,
          externalTrackingNumber: deliveryResponse.trackingNumber,
          pickupAddress,
          pickupCity,
          pickupPhone,
          pickupContactName,
          deliveryAddress,
          deliveryCity,
          deliveryPhone,
          deliveryContactName,
          codAmount: 0,
          shippingCost: 0,
          itemDescription: `إرجاع: ${listing.title}`,
          status: "pending",
          estimatedDeliveryDate: estimatedDate,
          sellerAddressId: listing.sellerAddressId,
        })
        .returning();

      await this.logStatus(returnDeliveryOrder.id, "pending", "تم إنشاء طلب إرجاع", true);

      console.log(`[DeliveryService] Created return delivery order: ${returnDeliveryOrder.id} for transaction: ${transactionId}`);
      return returnDeliveryOrder;
    } catch (error: any) {
      console.error(`[DeliveryService] Failed to create return delivery order:`, error);
      return null;
    }
  }

  private async logStatus(
    deliveryOrderId: string,
    status: string,
    statusMessage?: string,
    receivedFromApi = true,
    latitude?: number,
    longitude?: number,
    driverNotes?: string,
    photoUrl?: string,
    rawPayload?: string
  ): Promise<void> {
    await db.insert(deliveryStatusLog).values({
      deliveryOrderId,
      status,
      statusMessage,
      latitude,
      longitude,
      driverNotes,
      photoUrl,
      receivedFromApi,
      rawPayload,
    });
  }
}

export const deliveryService = new DeliveryService();
