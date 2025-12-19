import { useEffect, useRef, useCallback, useState } from "react";

interface BidUpdate {
  type: "bid_update";
  listingId: string;
  currentBid: number;
  totalBids: number;
  bidderName: string;
  bidderId: string;
  timestamp: string;
}

interface UseBidWebSocketOptions {
  listingId: string;
  onBidUpdate?: (update: BidUpdate) => void;
}

export function useBidWebSocket({ listingId, onBidUpdate }: UseBidWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onBidUpdateRef = useRef(onBidUpdate);

  onBidUpdateRef.current = onBidUpdate;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({ type: "subscribe", listingId }));
      };

      ws.onmessage = (event) => {
        try {
          const data: BidUpdate = JSON.parse(event.data);
          if (data.type === "bid_update" && data.listingId === listingId) {
            onBidUpdateRef.current?.(data);
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (e) {
      console.error("Failed to connect WebSocket:", e);
    }
  }, [listingId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "unsubscribe", listingId }));
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, listingId]);

  return { isConnected };
}
