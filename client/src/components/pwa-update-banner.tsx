import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function PWAUpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const handleUpdateAvailable = () => {
      console.log('[PWA Update Banner] Update available, showing banner');
      setShowBanner(true);
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    
    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleRefresh = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-white py-2 px-4 shadow-lg animate-in slide-in-from-top duration-300">
      <div className="container mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>
            {language === "ar" ? "تتوفر نسخة جديدة من التطبيق" : language === "ku" ? "وەشانێکی نوێ بەردەستە" : "تتوفر نسخة جديدة من التطبيق"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRefresh}
            className="text-xs px-3 py-1 h-7"
            data-testid="btn-refresh-app"
          >
            {language === "ar" ? "تحديث الآن" : language === "ku" ? "نوێکردنەوە" : "تحديث الآن"}
          </Button>
          <button 
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            data-testid="btn-dismiss-update"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
