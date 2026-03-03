import { App, URLOpenListenerEvent } from '@capacitor/app';
import { isNative } from './capacitor';

export type DeepLinkHandler = (url: string) => void;

/** Root-level paths where Android back button should exit the app */
const ROOT_PATHS = ['/', '/favorites', '/swipe', '/notifications', '/my-account'];

/**
 * Initialize app lifecycle listeners (deep links, state changes, back button)
 */
export const initAppLifecycle = (options: {
  onDeepLink?: DeepLinkHandler;
  onAppStateChange?: (isActive: boolean) => void;
}) => {
  if (!isNative) return;

  const { onDeepLink, onAppStateChange } = options;

  // Handle deep links (e.g., ebey3://product/123)
  if (onDeepLink) {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      const url = event.url;
      console.log('[AppLifecycle] Deep link opened:', url);

      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        onDeepLink(path);
      } catch (error) {
        console.error('[AppLifecycle] Error parsing deep link:', error);
        // Fall back to home on unparseable URLs
        onDeepLink('/');
      }
    });
  }

  // Handle app state changes (foreground/background)
  if (onAppStateChange) {
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('[AppLifecycle] State changed:', isActive ? 'active' : 'background');
      onAppStateChange(isActive);
    });
  }

  // Handle back button on Android
  // Only exit app when on a root tab — otherwise go back in history or navigate home
  App.addListener('backButton', ({ canGoBack }) => {
    try {
      if (canGoBack) {
        window.history.back();
      } else {
        const currentPath = window.location.pathname;
        if (ROOT_PATHS.includes(currentPath)) {
          App.exitApp();
        } else {
          // Not on a root screen and no history — go home instead of exiting
          window.location.href = '/';
        }
      }
    } catch (error) {
      console.error('[AppLifecycle] Back button handler error:', error);
      // Last resort: navigate home
      window.location.href = '/';
    }
  });
};

/**
 * Get app information
 */
export const getAppInfo = async () => {
  if (!isNative) return null;

  try {
    const info = await App.getInfo();
    return info;
  } catch {
    return null;
  }
};

/**
 * Get app state (active/background)
 */
export const getAppState = async () => {
  if (!isNative) return { isActive: true };

  try {
    const state = await App.getState();
    return state;
  } catch {
    return { isActive: true };
  }
};
