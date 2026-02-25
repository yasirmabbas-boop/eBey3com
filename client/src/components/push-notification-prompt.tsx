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
const VAPID_KEY_HASH = "push-vapid-key-hash";

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
              // SUBSCRIBED_KEY is set after initNativePushNotifications returns
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
        if (success) {
          localStorage.setItem(SUBSCRIBED_KEY, "true");
          setShowPrompt(false);
        } else {
          console.error("[Push] Failed to initialize native push notifications");
          // Don't set DISMISSED — allow retry on next app open
          setShowPrompt(false);
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

        // FIX #2: Ensure Service Worker is registered before calling ready
        console.log("[Push] Checking service worker registration...");
        let registration: ServiceWorkerRegistration;
        
        if (navigator.serviceWorker.controller) {
          // SW is already controlling the page
          console.log("[Push] Service worker already controlling page");
          registration = await navigator.serviceWorker.ready;
        } else {
          // SW not registered yet, register it first
          console.log("[Push] Service worker not registered, registering now...");
          try {
            registration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/'
            });
            console.log("[Push] Service worker registered, waiting for ready...");
            // Wait for the service worker to be ready (with timeout)
            registration = await Promise.race([
              navigator.serviceWorker.ready,
              new Promise<ServiceWorkerRegistration>((_, reject) => 
                setTimeout(() => reject(new Error("Service worker ready timeout")), 10000)
              )
            ]);
            console.log("[Push] Service worker is ready");
          } catch (swError) {
            console.error("[Push] Service worker registration/ready failed:", swError);
            throw new Error(`Service worker not ready: ${swError instanceof Error ? swError.message : String(swError)}`);
          }
        }

        // Get VAPID key using secureRequest (for consistency, though GET doesn't need CSRF)
        const vapidResponse = await secureRequest("/api/push/vapid-public-key");
        if (!vapidResponse.ok) throw new Error("Failed to get VAPID key");
        const { publicKey } = await vapidResponse.json();

        console.log("[Push] Creating push subscription...");
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        console.log("[Push] Push subscription created:", subscription.endpoint.substring(0, 50) + '...');

        // Register subscription using secureRequest for auth and CSRF
        const subscribeResponse = await secureRequest("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });

        // FIX #1: Verify backend response includes success confirmation before setting localStorage
        if (!subscribeResponse.ok) {
          const errorText = await subscribeResponse.text();
          console.error("[Push] Backend subscription failed:", subscribeResponse.status, errorText);
          throw new Error(`Failed to save subscription: ${subscribeResponse.status} ${errorText}`);
        }

        // Parse response to confirm success
        const responseData = await subscribeResponse.json();
        console.log("[Push] Backend subscription response:", responseData);
        
        if (responseData.success !== true && responseData.success !== undefined) {
          console.error("[Push] Backend returned non-success response:", responseData);
          throw new Error("Backend subscription save returned non-success");
        }

        // Only set localStorage AFTER confirming DB save succeeded
        console.log("[Push] Subscription saved successfully, updating localStorage");
        localStorage.setItem(SUBSCRIBED_KEY, "true");
        localStorage.setItem(VAPID_KEY_HASH, publicKey);
        setShowPrompt(false);
      }
    } catch (error) {
      console.error("[Push] Push subscription error:", error);
      console.error("[Push] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // FIX #1: Clear localStorage on error to prevent stuck state
      // If subscription failed, remove the subscribed flag so user can retry
      if (localStorage.getItem(SUBSCRIBED_KEY) === "true") {
        console.log("[Push] Clearing localStorage due to error");
        localStorage.removeItem(SUBSCRIBED_KEY);
      }
    } finally {
      setIsSubscribing(false);
      console.log("[Push] handleSubscribe finished");
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    const subscribed = localStorage.getItem(SUBSCRIBED_KEY);
    
    // Debug: Log localStorage status
    console.log("[Push] localStorage status:", {
      dismissed: dismissed || "null",
      subscribed: subscribed || "null",
      willShowPrompt: !dismissed && !subscribed
    });
    
    // Verify localStorage subscription matches DB state (works for both web and native)
    const verifySubscription = async () => {
      try {
        // Check if VAPID key changed (forces re-registration for web subscriptions)
        if (!isNative) {
          const vapidResponse = await secureRequest("/api/push/vapid-public-key");
          if (vapidResponse.ok) {
            const { publicKey } = await vapidResponse.json();
            const storedHash = localStorage.getItem(VAPID_KEY_HASH);
            if (storedHash && storedHash !== publicKey) {
              console.warn("[Push] VAPID key changed — clearing old subscription to force re-register");
              localStorage.removeItem(SUBSCRIBED_KEY);
              localStorage.removeItem(DISMISSED_KEY);
              localStorage.setItem(VAPID_KEY_HASH, publicKey);
              return false;
            }
          }
        }

        if (subscribed !== "true") return false;

        const subscriptionsResponse = await secureRequest("/api/push/subscriptions");
        if (subscriptionsResponse.ok) {
          const subscriptions = await subscriptionsResponse.json();
          const expectedPlatform = isNative ? platform : 'web';
          const hasSubscription = subscriptions.some((sub: any) =>
            isNative ? (sub.platform === 'ios' || sub.platform === 'android') : sub.platform === 'web'
          );

          if (!hasSubscription) {
            console.warn(`[Push] localStorage says subscribed but DB has no ${expectedPlatform} subscription - clearing localStorage`);
            localStorage.removeItem(SUBSCRIBED_KEY);
            localStorage.removeItem(DISMISSED_KEY);
            return false;
          } else {
            console.log("[Push] Verified: subscription exists in DB");
            return true;
          }
        }
      } catch (err) {
        console.error("[Push] Failed to verify subscription:", err);
        // On error, don't clear localStorage - might be network issue
      }
      return false;
    };

    const checkPermission = async () => {
      // FIX #1: Verify subscription state first
      const isVerified = await verifySubscription();
      
      const dismissedAfterVerify = localStorage.getItem(DISMISSED_KEY);
      const subscribedAfterVerify = localStorage.getItem(SUBSCRIBED_KEY);
      
      if (dismissedAfterVerify || (subscribedAfterVerify && isVerified)) {
        console.log("[Push] User dismissed or subscribed (verified), skipping prompt");
        return;
      }
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
