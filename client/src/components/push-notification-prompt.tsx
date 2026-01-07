import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";

const DISMISSED_KEY = "push-notification-dismissed";
const SUBSCRIBED_KEY = "push-notification-subscribed";

export function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    const subscribed = localStorage.getItem(SUBSCRIBED_KEY);
    
    if (dismissed || subscribed) return;
    if (Notification.permission === "granted") return;
    if (Notification.permission === "denied") return;
    
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  const handleSubscribe = useCallback(async () => {
    setIsSubscribing(true);
    
    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== "granted") {
        setShowPrompt(false);
        localStorage.setItem(DISMISSED_KEY, "true");
        return;
      }

      const vapidResponse = await fetch("/api/push/vapid-public-key");
      if (!vapidResponse.ok) throw new Error("Failed to get VAPID key");
      const { publicKey } = await vapidResponse.json();

      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subscribeResponse = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!subscribeResponse.ok) throw new Error("Failed to save subscription");

      localStorage.setItem(SUBSCRIBED_KEY, "true");
      setShowPrompt(false);
    } catch (error) {
      console.error("Push subscription error:", error);
    } finally {
      setIsSubscribing(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div 
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-80 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-2xl p-4 z-[9999]"
      dir="rtl"
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
