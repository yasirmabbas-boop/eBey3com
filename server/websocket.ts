import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { log } from "./index";

interface BidUpdate {
  type: "bid_update";
  listingId: string;
  currentBid: number;
  totalBids: number;
  bidderName: string;
  bidderId: string;
  timestamp: string;
  auctionEndTime?: string;
  timeExtended?: boolean;
  previousHighBidderId?: string;
}

interface SubscribeMessage {
  type: "subscribe";
  listingId: string;
}

interface UnsubscribeMessage {
  type: "unsubscribe";
  listingId: string;
}

type ClientMessage = SubscribeMessage | UnsubscribeMessage;

const listingSubscriptions = new Map<string, Set<WebSocket>>();
const userConnections = new Map<string, Set<WebSocket>>();

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req) => {
    log("WebSocket client connected", "ws");
    const subscribedListings = new Set<string>();
    
    // Extract userId from query parameters (e.g., ws://...?userId=123)
    let userId: string | null = null;
    if (req.url) {
      const urlParams = new URLSearchParams(req.url.split("?")[1] || "");
      userId = urlParams.get("userId");
    }
    
    if (userId) {
      // Store connection for this user
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId)!.add(ws);
      log(`User ${userId} connected via WebSocket`, "ws");
    }

    ws.on("message", (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());

        if (message.type === "subscribe" && message.listingId) {
          subscribedListings.add(message.listingId);
          if (!listingSubscriptions.has(message.listingId)) {
            listingSubscriptions.set(message.listingId, new Set());
          }
          listingSubscriptions.get(message.listingId)!.add(ws);
          log(`Client subscribed to listing ${message.listingId}`, "ws");
        }

        if (message.type === "unsubscribe" && message.listingId) {
          subscribedListings.delete(message.listingId);
          listingSubscriptions.get(message.listingId)?.delete(ws);
          log(`Client unsubscribed from listing ${message.listingId}`, "ws");
        }
      } catch (e) {
        console.error("Invalid WebSocket message:", e);
      }
    });

    ws.on("close", () => {
      log("WebSocket client disconnected", "ws");
      
      // Cleanup listing subscriptions
      Array.from(subscribedListings).forEach((listingId) => {
        listingSubscriptions.get(listingId)?.delete(ws);
        if (listingSubscriptions.get(listingId)?.size === 0) {
          listingSubscriptions.delete(listingId);
        }
      });
      
      // Cleanup user connection
      if (userId) {
        const userWsSet = userConnections.get(userId);
        if (userWsSet) {
          userWsSet.delete(ws);
          if (userWsSet.size === 0) {
            userConnections.delete(userId);
          }
        }
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on("close", () => {
      clearInterval(pingInterval);
    });
  });

  log("WebSocket server initialized", "ws");
  return wss;
}

export function broadcastBidUpdate(update: BidUpdate) {
  const subscribers = listingSubscriptions.get(update.listingId);
  if (!subscribers || subscribers.size === 0) {
    return;
  }

  const message = JSON.stringify(update);
  let sentCount = 0;

  Array.from(subscribers).forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sentCount++;
    }
  });

  log(`Broadcast bid update for listing ${update.listingId} to ${sentCount} clients`, "ws");
}

export function getActiveConnections(): number {
  return wss?.clients.size || 0;
}

interface AuctionEndUpdate {
  type: "auction_end";
  listingId: string;
  status: "sold" | "no_bids";
  winnerId: string | null;
  winnerName: string | null;
  winningBid: number | null;
}

export function broadcastAuctionEnd(update: Omit<AuctionEndUpdate, "type">) {
  const subscribers = listingSubscriptions.get(update.listingId);
  if (!subscribers || subscribers.size === 0) {
    return;
  }

  const message = JSON.stringify({ ...update, type: "auction_end" });
  let sentCount = 0;

  Array.from(subscribers).forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sentCount++;
    }
  });

  log(`Broadcast auction end for listing ${update.listingId} to ${sentCount} clients`, "ws");
}

/**
 * Send a real-time notification to a specific user
 * @param userId - The user ID to send the notification to
 * @param type - The message type (e.g., 'NOTIFICATION')
 * @param payload - The notification payload (title, message, etc.)
 */
export function sendToUser(userId: string, type: string, payload: any): void {
  const userWsSet = userConnections.get(userId);
  if (!userWsSet || userWsSet.size === 0) {
    // User not connected, notification will be delivered when they reconnect
    return;
  }

  const message = JSON.stringify({
    type,
    ...payload,
    timestamp: new Date().toISOString(),
  });

  let sentCount = 0;
  Array.from(userWsSet).forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
        sentCount++;
      } catch (error) {
        console.error(`Error sending message to user ${userId}:`, error);
      }
    }
  });

  if (sentCount > 0) {
    log(`Sent ${type} notification to user ${userId} (${sentCount} connection(s))`, "ws");
  }
}
