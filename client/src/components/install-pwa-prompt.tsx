import { useState, useEffect } from "react";
import { Download, X, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

// Only enable debug mode in development with explicit URL parameter
const isDev = import.meta.env.DEV;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-install-dismissed";
const DEBUG_MODE_KEY = "pwa-debug-mode";

declare global {
  interface Window {
    deferredPrompt: any;
    resetPWAPrompt?: () => void;
  }
}

export function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Helper to add debug log
  const addDebugLog = (message: string) => {
    console.log(`[PWA Install] ${message}`);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

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
    // Enable debug mode ONLY in development with explicit URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const debugEnabled = isDev && (urlParams.has('pwa-debug') || localStorage.getItem(DEBUG_MODE_KEY) === 'true');
    setDebugMode(debugEnabled);

    if (debugEnabled) {
      addDebugLog('Debug mode enabled');
      // Expose global function to reset prompt
      window.resetPWAPrompt = () => {
        localStorage.removeItem(DISMISSED_KEY);
        addDebugLog('PWA prompt reset - refresh page to see prompt');
        alert('PWA prompt reset! Refresh the page to see it again.');
      };
    }

    // Check installation status
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    if (isInStandaloneMode || isIOSStandalone) {
      addDebugLog('App already installed (running in standalone mode)');
      return;
    }

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // For iOS, always show the prompt (no dismiss memory) until installed
    if (isIOSDevice && !isInStandaloneMode) {
      addDebugLog('iOS device detected - showing manual install instructions (persistent)');
      setIsIOS(true);
      setShowPrompt(true);
      return;
    }

    // For non-iOS, respect the dismiss preference
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && !debugEnabled) {
      addDebugLog('Prompt previously dismissed by user');
      return;
    }

    // Check if prompt is already available globally
    if (typeof window !== 'undefined' && window.deferredPrompt) {
      addDebugLog('beforeinstallprompt event already captured');
      setDeferredPrompt(window.deferredPrompt);
      setShowPrompt(true);
    } else {
      addDebugLog('Waiting for beforeinstallprompt event...');
    }

    let eventHandled = false;

    const globalHandler = () => {
      if (eventHandled) return;
      if (window.deferredPrompt) {
        eventHandled = true;
        addDebugLog('beforeinstallprompt event received');
        setDeferredPrompt(window.deferredPrompt);
        setShowPrompt(true);
      }
    };

    // Listen only to the custom event dispatched from index.html
    window.addEventListener("pwa-prompt-available", globalHandler);
    
    // Log why prompt might not show after 3 seconds
    setTimeout(() => {
      if (!showPrompt && !isInStandaloneMode) {
        addDebugLog('Prompt not shown after 3s - possible reasons:');
        addDebugLog('1. Not HTTPS (except localhost)');
        addDebugLog('2. Service worker not registered');
        addDebugLog('3. Manifest.json invalid');
        addDebugLog('4. User dismissed recently (browser cooldown)');
        addDebugLog('5. Browser doesn\'t support PWA install');
      }
    }, 3000);
    
    return () => {
      window.removeEventListener("pwa-prompt-available", globalHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      addDebugLog('Install clicked but no deferredPrompt available');
      return;
    }
    
    try {
      addDebugLog('Showing install prompt to user');
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      addDebugLog(`User choice: ${outcome}`);
      
      if (outcome === "accepted") {
        addDebugLog('User accepted installation');
        setShowPrompt(false);
      } else {
        addDebugLog('User dismissed installation');
      }
      setDeferredPrompt(null);
    } catch (error) {
      addDebugLog(`Error during installation: ${error}`);
      console.error('PWA Install Error:', error);
    }
  };

  const handleDismiss = () => {
    addDebugLog('User dismissed prompt manually');
    // For iOS, only hide for this session (will show again on next visit)
    // For non-iOS, remember the dismissal permanently
    if (!isIOS) {
      localStorage.setItem(DISMISSED_KEY, "true");
    }
    setShowPrompt(false);
  };

  const toggleDebugPanel = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    localStorage.setItem(DEBUG_MODE_KEY, newDebugMode.toString());
  };

  if (!showPrompt && !debugMode) return null;

  return (
    <>
      {/* Debug Panel */}
      {debugMode && (
        <div 
          className="fixed left-4 right-4 md:left-4 md:right-auto md:w-96 bg-gray-900 text-white rounded-xl shadow-2xl p-4 z-[100003] max-h-96 overflow-y-auto"
          dir="ltr"
          style={{ 
            bottom: isMobile 
              ? 'calc(12rem + var(--safe-area-bottom, 0px))' 
              : '1rem'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-yellow-400" />
              <h3 className="font-bold text-sm">PWA Debug Panel</h3>
            </div>
            <button
              onClick={toggleDebugPanel}
              className="p-1 rounded-full hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2 text-xs">
            <div>
              <strong>Status:</strong>
              <ul className="list-disc list-inside mt-1 text-gray-300">
                <li>Prompt shown: {showPrompt ? '✓' : '✗'}</li>
                <li>iOS device: {isIOS ? '✓' : '✗'}</li>
                <li>Has deferredPrompt: {deferredPrompt ? '✓' : '✗'}</li>
                <li>Dismissed: {localStorage.getItem(DISMISSED_KEY) ? '✓' : '✗'}</li>
                <li>Standalone mode: {window.matchMedia("(display-mode: standalone)").matches ? '✓' : '✗'}</li>
              </ul>
            </div>
            
            <div>
              <strong>Debug Logs:</strong>
              <div className="mt-1 space-y-1 text-gray-300 font-mono text-[10px]">
                {debugInfo.length === 0 ? (
                  <div>No logs yet...</div>
                ) : (
                  debugInfo.map((log, i) => (
                    <div key={i} className="break-words">{log}</div>
                  ))
                )}
              </div>
            </div>
            
            <button
              onClick={() => window.resetPWAPrompt?.()}
              className="w-full mt-2 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded text-white font-medium"
            >
              Reset Prompt State
            </button>
            
            <div className="text-gray-400 text-[10px] mt-2">
              Console command: <code className="bg-gray-800 px-1 rounded">window.resetPWAPrompt()</code>
            </div>
          </div>
        </div>
      )}

      {/* Install Prompt */}
      {showPrompt && (
        <div 
          className="fixed left-4 right-4 md:left-auto md:right-4 md:w-80 bg-blue-600 text-white rounded-xl shadow-2xl p-4 z-[100001]"
          dir="rtl"
          style={{ 
            bottom: isMobile 
              ? 'calc(6rem + var(--safe-area-bottom, 0px))' 
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
              {isIOS ? (
                <div className="text-xs text-blue-100 space-y-1">
                  <p className="font-medium">للتثبيت على الآيفون:</p>
                  <p>١. افتح الموقع في Safari</p>
                  <p>٢. اضغط على زر المشاركة <span className="inline-block rotate-180">⬆</span></p>
                  <p>٣. اختر "إضافة إلى الشاشة الرئيسية"</p>
                </div>
              ) : (
                <p className="text-xs text-blue-100 mb-3">
                  احصل على تجربة أفضل مع التطبيق
                </p>
              )}
              {!isIOS && deferredPrompt && (
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="bg-white text-blue-600 hover:bg-blue-50 w-full mt-3"
                  data-testid="button-install-pwa"
                >
                  <Download className="h-4 w-4 ml-2" />
                  تثبيت التطبيق
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Debug Mode Toggle - Only visible in development */}
      {isDev && !debugMode && (
        <button
          onClick={toggleDebugPanel}
          className="fixed bottom-2 left-2 w-8 h-8 bg-gray-800 text-white rounded-full opacity-20 hover:opacity-100 transition-opacity z-[100002] flex items-center justify-center"
          title="Enable PWA Debug Mode"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
