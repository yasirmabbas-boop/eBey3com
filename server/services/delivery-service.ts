/**
 * Delivery Service
 * Manages delivery orders and processes webhook updates
 */

import { db } from "../db";
import { deliveryOrders, deliveryStatusLog, transactions, users, listings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { deliveryApi, DeliveryWebhookPayload } from "./delivery-api";
import { financialService } from "./financial-service";
import { storage } from "../storage";

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

    try {
      const deliveryResponse = await deliveryApi.createShipment({
        orderId: transactionId,
        pickupAddress: seller.addressLine1 || seller.city || "بغداد",
        pickupCity: seller.city || "بغداد",
        pickupPhone: seller.phone || "",
        pickupContactName: seller.displayName,
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
          pickupAddress: seller.addressLine1 || seller.city || "بغداد",
          pickupCity: seller.city || "بغداد",
          pickupPhone: seller.phone || "",
          pickupContactName: seller.displayName,
          deliveryAddress: transaction.deliveryAddress || "",
          deliveryCity: transaction.deliveryCity || "",
          deliveryPhone: transaction.deliveryPhone || "",
          deliveryContactName: "المشتري",
          codAmount: transaction.amount,
          shippingCost: listing.shippingCost || 0,
          itemDescription: listing.title,
          status: "pending",
          estimatedDeliveryDate: estimatedDate,
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

  private async handleSuccessfulDelivery(deliveryOrder: typeof deliveryOrders.$inferSelect): Promise<void> {
    console.log(`[DeliveryService] Handling successful delivery for order: ${deliveryOrder.id}`);

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

    // PHASE 1: Set deliveredAt timestamp on transaction
    await db
      .update(transactions)
      .set({
        deliveredAt: deliveredAt,
      })
      .where(eq(transactions.id, transaction.id));

    await financialService.createSaleSettlement(
      transaction.sellerId,
      transaction.id,
      transaction.amount,
      deliveryOrder.shippingCost
    );

    console.log(`[DeliveryService] Settlement created for seller: ${transaction.sellerId}`);

    // PHASE 1: Create payout permission on delivery
    try {
      const { payoutPermissionService } = await import("./payout-permission-service");
      await payoutPermissionService.createPermissionOnDelivery(transaction.id);
      console.log(`[DeliveryService] Payout permission created for transaction: ${transaction.id}`);
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
   * Zero commission, zero fees - seller gets nothing
   * Block payout permission permanently
   */
  private async handleBuyerRefusal(
    deliveryOrder: typeof deliveryOrders.$inferSelect,
    reason: string
  ): Promise<void> {
    console.log(`[DeliveryService] Handling buyer refusal for order: ${deliveryOrder.id}, reason: ${reason}`);

    const arabicReason = `تم رفض الاستلام: ${reason}`;

    // Update delivery order status
    await db
      .update(deliveryOrders)
      .set({
        status: "customer_refused",
        returnReason: arabicReason,
      })
      .where(eq(deliveryOrders.id, deliveryOrder.id));

    // Update transaction status
    await db
      .update(transactions)
      .set({
        status: "refused",
        deliveryStatus: "refused",
      })
      .where(eq(transactions.id, deliveryOrder.transactionId));

    // Reverse any settlement that may have been created
    try {
      await financialService.reverseSettlement(deliveryOrder.transactionId, arabicReason);
      console.log(`[DeliveryService] Settlement reversed for refused order: ${deliveryOrder.transactionId}`);
    } catch (error) {
      console.error(`[DeliveryService] Error reversing settlement: ${error}`);
      // Continue - may not have been created yet
    }

    // PHASE 6: Block payout permission with zero-on-refusal logic
    try {
      const { payoutPermissionService } = await import("./payout-permission-service");
      await payoutPermissionService.blockPermissionForBuyerRefusal(
        deliveryOrder.transactionId,
        arabicReason
      );
      console.log(`[DeliveryService] ZERO-ON-REFUSAL: Payout permission blocked for transaction: ${deliveryOrder.transactionId}`);
    } catch (error) {
      console.error(`[DeliveryService] Failed to block payout permission: ${error}`);
    }

    // Notify seller of refusal
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
          message: `تم رفض استلام الطلب من قبل المشتري. السبب: ${reason}. لن يتم خصم أي عمولة أو رسوم.`,
          linkUrl: `/seller-dashboard?tab=sales&orderId=${transaction.id}`,
          relatedId: transaction.id,
        });
      }
    } catch (notifError) {
      console.error(`[DeliveryService] Failed to send refusal notification: ${notifError}`);
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
