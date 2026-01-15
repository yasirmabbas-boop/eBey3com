/**
 * Delivery Company API Client
 * Handles integration with external delivery partner
 */

export interface DeliveryOrderRequest {
  orderId: string;
  pickupAddress: string;
  pickupCity: string;
  pickupPhone: string;
  pickupContactName: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPhone: string;
  deliveryContactName: string;
  codAmount: number;
  shippingCost: number;
  itemDescription: string;
  itemWeight?: number;
}

export interface DeliveryOrderResponse {
  success: boolean;
  externalDeliveryId: string;
  trackingNumber: string;
  estimatedDeliveryDate: string;
  message?: string;
}

export interface TrackingInfo {
  status: string;
  statusMessage: string;
  driverName?: string;
  driverPhone?: string;
  currentLat?: number;
  currentLng?: number;
  lastUpdate: string;
  estimatedDeliveryDate?: string;
}

export interface DeliveryWebhookPayload {
  deliveryId: string;
  trackingNumber: string;
  status: string;
  statusMessage?: string;
  latitude?: number;
  longitude?: number;
  driverName?: string;
  driverPhone?: string;
  driverNotes?: string;
  photoUrl?: string;
  cashCollected?: boolean;
  returnReason?: string;
  timestamp: string;
}

const DELIVERY_API_BASE_URL = process.env.DELIVERY_API_URL || "https://api.delivery-partner.example.com";
const DELIVERY_API_KEY = process.env.DELIVERY_API_KEY || "";

class DeliveryApiClient {
  private baseUrl: string;
  private apiKey: string;
  private useMock: boolean;

  constructor() {
    this.baseUrl = DELIVERY_API_BASE_URL;
    this.apiKey = DELIVERY_API_KEY;
    this.useMock = !DELIVERY_API_KEY || DELIVERY_API_KEY === "";
    
    if (this.useMock) {
      console.log("[DeliveryAPI] Running in mock mode - no API key configured");
    }
  }

  async createShipment(order: DeliveryOrderRequest): Promise<DeliveryOrderResponse> {
    if (this.useMock) {
      return this.mockCreateShipment(order);
    }

    try {
      const response = await fetch(`${this.baseUrl}/shipments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          reference_id: order.orderId,
          pickup: {
            address: order.pickupAddress,
            city: order.pickupCity,
            phone: order.pickupPhone,
            contact_name: order.pickupContactName,
          },
          delivery: {
            address: order.deliveryAddress,
            city: order.deliveryCity,
            phone: order.deliveryPhone,
            contact_name: order.deliveryContactName,
          },
          cod_amount: order.codAmount,
          shipping_cost: order.shippingCost,
          item_description: order.itemDescription,
          item_weight: order.itemWeight,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create shipment");
      }

      const data = await response.json();
      return {
        success: true,
        externalDeliveryId: data.id,
        trackingNumber: data.tracking_number,
        estimatedDeliveryDate: data.estimated_delivery_date,
      };
    } catch (error: any) {
      console.error("[DeliveryAPI] Create shipment error:", error);
      throw error;
    }
  }

  async getTracking(externalDeliveryId: string): Promise<TrackingInfo> {
    if (this.useMock) {
      return this.mockGetTracking(externalDeliveryId);
    }

    try {
      const response = await fetch(`${this.baseUrl}/shipments/${externalDeliveryId}/tracking`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to get tracking info");
      }

      const data = await response.json();
      return {
        status: data.status,
        statusMessage: data.status_message,
        driverName: data.driver?.name,
        driverPhone: data.driver?.phone,
        currentLat: data.location?.latitude,
        currentLng: data.location?.longitude,
        lastUpdate: data.last_update,
        estimatedDeliveryDate: data.estimated_delivery_date,
      };
    } catch (error: any) {
      console.error("[DeliveryAPI] Get tracking error:", error);
      throw error;
    }
  }

  async cancelShipment(externalDeliveryId: string, reason: string): Promise<boolean> {
    if (this.useMock) {
      return true;
    }

    try {
      const response = await fetch(`${this.baseUrl}/shipments/${externalDeliveryId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ reason }),
      });

      return response.ok;
    } catch (error: any) {
      console.error("[DeliveryAPI] Cancel shipment error:", error);
      return false;
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    if (this.useMock) {
      return true;
    }
    return true;
  }

  private mockCreateShipment(order: DeliveryOrderRequest): DeliveryOrderResponse {
    const mockId = `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const trackingNumber = `TRK${Date.now()}`;
    
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + 3);

    console.log(`[DeliveryAPI Mock] Created shipment: ${mockId} for order ${order.orderId}`);

    return {
      success: true,
      externalDeliveryId: mockId,
      trackingNumber: trackingNumber,
      estimatedDeliveryDate: estimatedDate.toISOString(),
      message: "Mock shipment created successfully",
    };
  }

  private mockGetTracking(externalDeliveryId: string): TrackingInfo {
    const statuses = ["pending", "picked_up", "in_transit", "out_for_delivery"];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      status: randomStatus,
      statusMessage: `Shipment is ${randomStatus.replace("_", " ")}`,
      driverName: "أحمد محمد",
      driverPhone: "07701234567",
      currentLat: 33.3152 + (Math.random() - 0.5) * 0.1,
      currentLng: 44.3661 + (Math.random() - 0.5) * 0.1,
      lastUpdate: new Date().toISOString(),
      estimatedDeliveryDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    };
  }
}

export const deliveryApi = new DeliveryApiClient();
