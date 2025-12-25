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

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    log("WebSocket client connected", "ws");
    const subscribedListings = new Set<string>();

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
      Array.from(subscribedListings).forEach((listingId) => {
        listingSubscriptions.get(listingId)?.delete(ws);
        if (listingSubscriptions.get(listingId)?.size === 0) {
          listingSubscriptions.delete(listingId);
        }
      });
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
