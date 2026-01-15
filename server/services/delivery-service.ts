/**
 * Delivery Service
 * Manages delivery orders and processes webhook updates
 */

import { db } from "../db";
import { deliveryOrders, deliveryStatusLog, transactions, users, listings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { deliveryApi, DeliveryWebhookPayload } from "./delivery-api";
import { financialService } from "./financial-service";

export interface CreateDeliveryRequest {
  transactionId: string;
}

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
        pickupPhone: seller.phone,
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
          pickupPhone: seller.phone,
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

    await db
      .update(deliveryOrders)
      .set({
        actualDeliveryDate: new Date(),
        status: "delivered",
      })
      .where(eq(deliveryOrders.id, deliveryOrder.id));

    await financialService.createSaleSettlement(
      transaction.sellerId,
      transaction.id,
      transaction.amount,
      deliveryOrder.shippingCost
    );

    console.log(`[DeliveryService] Settlement created for seller: ${transaction.sellerId}`);
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
