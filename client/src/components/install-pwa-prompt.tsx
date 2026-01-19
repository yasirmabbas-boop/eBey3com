import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-install-dismissed";

declare global {
  interface Window {
    deferredPrompt: any;
  }
}

export function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    // Check if mobile on mount and on resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
    
    if (isIOSDevice && !isInStandaloneMode) {
      setIsIOS(true);
      setShowPrompt(true);
      return;
    }

    // Check if prompt is already available globally
    if (typeof window !== 'undefined' && window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
      setShowPrompt(true);
    }

    let eventHandled = false;

    const globalHandler = () => {
      if (eventHandled) return;
      if (window.deferredPrompt) {
        eventHandled = true;
        setDeferredPrompt(window.deferredPrompt);
        setShowPrompt(true);
      }
    };

    // Listen only to the custom event dispatched from index.html
    window.addEventListener("pwa-prompt-available", globalHandler);
    
    return () => {
      window.removeEventListener("pwa-prompt-available", globalHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div 
      className="fixed left-4 right-4 md:left-auto md:right-4 md:w-80 bg-blue-600 text-white rounded-xl shadow-2xl p-4 z-[100001]"
      dir="rtl"
      style={{ 
        bottom: isMobile 
          ? 'calc(6rem + env(safe-area-inset-bottom, 0px))' 
          : '1rem'
      }}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 left-2 p-1 rounded-full hover:bg-blue-700"
        data-testid="button-dismiss-pwa"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="bg-white rounded-lg p-2 flex-shrink-0">
          <Download className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-1">ثبّت E-بيع على هاتفك</h3>
          <p className="text-xs text-blue-100 mb-3">
            {isIOS 
              ? "اضغط على زر المشاركة ↑ ثم \"إضافة إلى الشاشة الرئيسية\""
              : "احصل على تجربة أفضل مع التطبيق"
            }
          </p>
          {!isIOS && deferredPrompt && (
            <Button
              onClick={handleInstall}
              size="sm"
              className="bg-white text-blue-600 hover:bg-blue-50 w-full"
              data-testid="button-install-pwa"
            >
              <Download className="h-4 w-4 ml-2" />
              تثبيت التطبيق
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
