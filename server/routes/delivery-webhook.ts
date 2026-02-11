import type { Express, Request, Response, NextFunction } from "express";
import { deliveryService } from "../services/delivery-service";
import { z } from "zod";

/**
 * Middleware to verify webhook signature/API key from delivery company
 */
async function verifyWebhookAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] || req.headers["x-webhook-key"];
  const expectedKey = process.env.DELIVERY_WEBHOOK_SECRET || process.env.DELIVERY_PARTNER_API_KEY;

  if (!expectedKey) {
    console.error("[DeliveryWebhook] No webhook secret configured in environment");
    return res.status(500).json({ error: "Webhook authentication not configured" });
  }

  if (!apiKey || apiKey !== expectedKey) {
    console.warn("[DeliveryWebhook] Invalid or missing webhook authentication");
    return res.status(401).json({ error: "Unauthorized: Invalid authentication" });
  }

  next();
}

// Zod schema for webhook payload validation
const webhookPayloadSchema = z.object({
  deliveryId: z.string().min(1, "deliveryId is required"),
  trackingNumber: z.string().optional(),
  status: z.string().min(1, "status is required"),
  statusMessage: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  driverNotes: z.string().optional(),
  photoUrl: z.string().optional(),
  signatureUrl: z.string().optional(),
  timestamp: z.string().optional(),
});

/**
 * Delivery Webhook Routes
 * Receives status updates from the delivery company
 */
export function registerDeliveryWebhookRoutes(app: Express): void {
  /**
   * POST /api/delivery/webhook
   * 
   * Receives status updates from the delivery company
   * 
   * Security: Requires X-API-KEY or X-WEBHOOK-KEY header
   * 
   * Request body:
   * {
   *   deliveryId: string,        // External delivery ID from the delivery company
   *   trackingNumber?: string,   // Tracking number
   *   status: string,            // Status code (e.g., "picked_up", "in_transit", "delivered", "returned")
   *   statusMessage?: string,    // Human-readable status message
   *   latitude?: number,         // Current location latitude
   *   longitude?: number,        // Current location longitude
   *   driverName?: string,       // Driver's name
   *   driverPhone?: string,      // Driver's phone number
   *   driverNotes?: string,      // Notes from the driver
   *   photoUrl?: string,         // Proof of delivery photo
   *   signatureUrl?: string,     // Signature image URL
   *   timestamp?: string         // ISO 8601 timestamp of the update
   * }
   * 
   * Response:
   * {
   *   success: true,
   *   message: "Webhook processed successfully"
   * }
   */
  app.post("/api/delivery/webhook", verifyWebhookAuth, async (req, res) => {
    try {
      console.log("[DeliveryWebhook] Received webhook:", JSON.stringify(req.body, null, 2));

      // Validate payload
      const validationResult = webhookPayloadSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error("[DeliveryWebhook] Invalid payload:", validationResult.error.errors);
        return res.status(400).json({
          success: false,
          error: "Invalid payload",
          details: validationResult.error.errors,
        });
      }

      const payload = validationResult.data;

      // Process the webhook using the delivery service
      const success = await deliveryService.processWebhook({
        deliveryId: payload.deliveryId,
        trackingNumber: payload.trackingNumber || "",
        status: payload.status,
        statusMessage: payload.statusMessage,
        latitude: payload.latitude,
        longitude: payload.longitude,
        driverName: payload.driverName,
        driverPhone: payload.driverPhone,
        driverNotes: payload.driverNotes,
        photoUrl: payload.photoUrl,
        signatureUrl: payload.signatureUrl,
      });

      if (!success) {
        console.error("[DeliveryWebhook] Failed to process webhook");
        return res.status(404).json({
          success: false,
          error: "Delivery order not found or processing failed",
        });
      }

      console.log(`[DeliveryWebhook] Successfully processed status update for delivery: ${payload.deliveryId}`);

      return res.json({
        success: true,
        message: "Webhook processed successfully",
      });
    } catch (error: any) {
      console.error("[DeliveryWebhook] Error processing webhook:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error.message,
      });
    }
  });

  /**
   * GET /api/delivery/webhook/health
   * 
   * Health check endpoint for the delivery company to verify connectivity
   */
  app.get("/api/delivery/webhook/health", (req, res) => {
    return res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  console.log("[DeliveryWebhook] Delivery webhook routes registered");
}
