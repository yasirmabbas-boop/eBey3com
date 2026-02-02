import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { isNative, isWeb, platform } from "@/lib/capacitor";
import { initNativePushNotifications, checkNativePushPermission } from "@/lib/nativePush";
import { secureRequest } from "@/lib/queryClient";

const DISMISSED_KEY = "push-notification-dismissed";
const SUBSCRIBED_KEY = "push-notification-subscribed";

export function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();

  useEffect(() => {
    // Check if mobile on mount and on resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSubscribe = useCallback(async () => {
    console.log("[Push] handleSubscribe called, isNative:", isNative);
    setIsSubscribing(true);
    
    try {
      if (isNative) {
        // Handle native push notifications
        console.log("[Push] Initializing native push notifications...");
        const success = await initNativePushNotifications(
          async (token) => {
            console.log("[Push] Token received from native plugin:", token);
            console.log("[Push] About to send token to backend...");
            // Send token to backend using secureRequest for auth and CSRF
            const response = await secureRequest("/api/push/register-native", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                token,
                platform: platform === "ios" ? "ios" : "android",
              }),
            });

            console.log("[Push] Backend response status:", response.status);
            console.log("[Push] Backend response ok:", response.ok);
            
            if (response.ok) {
              const responseData = await response.json();
              console.log("[Push] Backend response data:", responseData);
              localStorage.setItem(SUBSCRIBED_KEY, "true");
              setShowPrompt(false);
            } else {
              const errorText = await response.text();
              console.error("[Push] Backend registration failed:", response.status, errorText);
            }
          },
          (notification) => {
            // Handle notification received while app is open
            console.log('Notification received:', notification);
          },
          (notification) => {
            // Handle notification tap
            console.log('Notification tapped:', notification);
            // Navigate to the appropriate page based on notification data
            if (notification.notification.data?.url) {
              window.location.href = notification.notification.data.url;
            }
          }
        );

        console.log("[Push] initNativePushNotifications returned:", success);
        if (!success) {
          console.error("[Push] Failed to initialize native push notifications");
          setShowPrompt(false);
          localStorage.setItem(DISMISSED_KEY, "true");
        }
      } else {
        // Handle web push notifications
        // Check current permission (don't request if already granted)
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        
        if (permission !== "granted") {
          setShowPrompt(false);
          localStorage.setItem(DISMISSED_KEY, "true");
          return;
        }

        // Get VAPID key using secureRequest (for consistency, though GET doesn't need CSRF)
        const vapidResponse = await secureRequest("/api/push/vapid-public-key");
        if (!vapidResponse.ok) throw new Error("Failed to get VAPID key");
        const { publicKey } = await vapidResponse.json();

        const registration = await navigator.serviceWorker.ready;
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // Register subscription using secureRequest for auth and CSRF
        const subscribeResponse = await secureRequest("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });

        if (!subscribeResponse.ok) throw new Error("Failed to save subscription");

        localStorage.setItem(SUBSCRIBED_KEY, "true");
        setShowPrompt(false);
      }
    } catch (error) {
      console.error("[Push] Push subscription error:", error);
      console.error("[Push] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setIsSubscribing(false);
      console.log("[Push] handleSubscribe finished");
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    const subscribed = localStorage.getItem(SUBSCRIBED_KEY);
    
    // Debug: Log localStorage status to Xcode console
    console.log("[Push] localStorage status:", {
      dismissed: dismissed || "null",
      subscribed: subscribed || "null",
      willShowPrompt: !dismissed && !subscribed
    });
    
    if (dismissed || subscribed) return;

    const checkPermission = async () => {
      console.log("[Push] checkPermission() called, isNative:", isNative);
      
      if (isNative) {
        // Check native push permission
        console.log("[Push] Calling checkNativePushPermission...");
        try {
          const permission = await checkNativePushPermission();
          console.log("[Push] Native permission status:", permission);
          
          // If permission is already granted but user isn't subscribed, auto-register
          if (permission === 'granted') {
            console.log("[Push] Permission already granted, auto-registering NOW...");
            // Automatically trigger registration - don't await to avoid blocking
            handleSubscribe().catch((err) => {
              console.error("[Push] Auto-register failed:", err);
            });
            return;
          }
          
          if (permission === 'denied') {
            console.log("[Push] Permission denied, not showing prompt");
            localStorage.setItem(DISMISSED_KEY, "true");
            return;
          }
          
          // Permission is 'prompt' - show the prompt after delay
          console.log("[Push] Permission is prompt, will show prompt in 5 seconds");
          const timer = setTimeout(() => {
            console.log("[Push] Showing native prompt now");
            setShowPrompt(true);
          }, 5000);
          return () => clearTimeout(timer);
        } catch (err) {
          console.error("[Push] checkNativePushPermission threw error:", err);
          return;
        }
      } else {
        // Check web push permission
        console.log("[Push] Checking web push support...");
        if (!("Notification" in window)) {
          console.log("[Push] Notification API not supported");
          return;
        }
        if (!("serviceWorker" in navigator)) {
          console.log("[Push] Service Worker not supported");
          return;
        }
        
        console.log("[Push] Web Notification.permission:", Notification.permission);
        
        if (Notification.permission === "granted") {
          console.log("[Push] Web permission already granted, auto-registering...");
          // Automatically trigger registration for web
          handleSubscribe().catch((err) => {
            console.error("[Push] Web auto-register failed:", err);
          });
          return;
        }
        
        if (Notification.permission === "denied") {
          console.log("[Push] Web permission denied");
          return;
        }
        
        // Permission is 'default' - show the prompt after delay
        console.log("[Push] Web permission is default, will show prompt in 5 seconds");
        const timer = setTimeout(() => {
          console.log("[Push] Showing web prompt now");
          setShowPrompt(true);
        }, 5000);
        return () => clearTimeout(timer);
      }
    };

    console.log("[Push] About to call checkPermission()");
    checkPermission().catch((err) => {
      console.error("[Push] checkPermission() failed:", err);
    });
  }, [isAuthenticated, handleSubscribe]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div 
      className="fixed left-4 right-4 md:left-auto md:right-4 md:w-80 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-2xl p-4 z-[100002]"
      dir="rtl"
      style={{ 
        bottom: isMobile 
          ? (isNative ? '9rem' : 'calc(9rem + var(--safe-area-bottom, 0px))') 
          : '5rem'
      }}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 left-2 p-1 rounded-full hover:bg-blue-800/50"
        data-testid="button-dismiss-push"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="bg-white rounded-lg p-2 flex-shrink-0">
          <Bell className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-1">
            {language === "ar" ? "تفعيل الإشعارات" : "ئاگادارکردنەوەکان چالاک بکە"}
          </h3>
          <p className="text-xs text-blue-100 mb-3">
            {language === "ar" 
              ? "احصل على إشعارات فورية عن المزايدات والرسائل الجديدة"
              : "ئاگاداری لەسەر مزایدە و پەیامە نوێیەکان وەربگرە"
            }
          </p>
          <Button
            onClick={handleSubscribe}
            size="sm"
            className="bg-white text-blue-600 hover:bg-blue-50 w-full"
            disabled={isSubscribing}
            data-testid="button-enable-push"
          >
            {isSubscribing ? (
              language === "ar" ? "جاري التفعيل..." : "چالاککردن..."
            ) : (
              <>
                <Bell className="h-4 w-4 ml-2" />
                {language === "ar" ? "تفعيل الإشعارات" : "چالاککردن"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
