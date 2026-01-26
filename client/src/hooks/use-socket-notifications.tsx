import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";
import { ToastAction } from "@/components/ui/toast";

export function useSocketNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  useEffect(() => {
    // Wrap entire effect in try/catch to prevent crashes
    try {
      // Only connect if user is authenticated
      if (!user?.id) {
        // Clean up any existing connection
        if (wsRef.current) {
          try {
            wsRef.current.close();
          } catch (e) {
            // Ignore close errors
          }
          wsRef.current = null;
        }
        return;
      }

      // Determine WebSocket protocol (ws vs wss)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;

      const connect = () => {
        try {
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onopen = () => {
            console.log("[WebSocket] Connected to notification server");
            reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);

              if (data.type === "NOTIFICATION") {
                // Show toast notification
                const action = data.linkUrl ? (
                  <ToastAction
                    altText="عرض"
                    onClick={() => {
                      try {
                        setLocation(data.linkUrl);
                      } catch (e) {
                        console.error("[WebSocket] Error navigating:", e);
                      }
                    }}
                  >
                    عرض
                  </ToastAction>
                ) : undefined;

                try {
                  toast({
                    title: data.title || "إشعار جديد",
                    description: data.message,
                    action,
                  });
                } catch (e) {
                  console.error("[WebSocket] Error showing toast:", e);
                }

                // Invalidate notifications query to update the bell icon count
                try {
                  queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
                } catch (e) {
                  console.error("[WebSocket] Error invalidating queries:", e);
                }
              }
            } catch (error) {
              console.error("[WebSocket] Error parsing message:", error);
            }
          };

          ws.onerror = (error) => {
            console.error("[WebSocket] Error:", error);
          };

          ws.onclose = () => {
            console.log("[WebSocket] Connection closed");
            wsRef.current = null;

            // Attempt to reconnect if user is still authenticated
            if (user?.id && reconnectAttempts.current < maxReconnectAttempts) {
              reconnectAttempts.current++;
              console.log(
                `[WebSocket] Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`
              );
              reconnectTimeoutRef.current = setTimeout(() => {
                try {
                  connect();
                } catch (e) {
                  console.error("[WebSocket] Error during reconnect:", e);
                }
              }, reconnectDelay);
            } else if (reconnectAttempts.current >= maxReconnectAttempts) {
              console.error("[WebSocket] Max reconnect attempts reached");
            }
          };
        } catch (error) {
          console.error("[WebSocket] Failed to create connection:", error);
        }
      };

      connect();

      // Cleanup function
      return () => {
        try {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          if (wsRef.current) {
            try {
              wsRef.current.close();
            } catch (e) {
              // Ignore close errors during cleanup
            }
            wsRef.current = null;
          }
          reconnectAttempts.current = 0;
        } catch (e) {
          console.error("[WebSocket] Error during cleanup:", e);
        }
      };
    } catch (error) {
      console.error("[WebSocket] Fatal error in useSocketNotifications:", error);
      // Don't throw - just log the error to prevent app crash
    }
  }, [user?.id, queryClient, toast, setLocation]);
}
