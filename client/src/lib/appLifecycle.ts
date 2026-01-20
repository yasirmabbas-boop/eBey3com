import { App, URLOpenListenerEvent } from '@capacitor/app';
import { isNative } from './capacitor';

export type DeepLinkHandler = (url: string) => void;

/**
 * Initialize app lifecycle listeners (deep links, state changes)
 */
export const initAppLifecycle = (options: {
  onDeepLink?: DeepLinkHandler;
  onAppStateChange?: (isActive: boolean) => void;
}) => {
  if (!isNative) return;

  const { onDeepLink, onAppStateChange } = options;

  // Handle deep links (e.g., ebay3://product/123)
  if (onDeepLink) {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      const url = event.url;
      console.log('Deep link opened:', url);
      
      try {
        // Parse the URL and extract the path
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        onDeepLink(path);
      } catch (error) {
        console.error('Error parsing deep link:', error);
      }
    });
  }

  // Handle app state changes (foreground/background)
  if (onAppStateChange) {
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed:', isActive ? 'active' : 'background');
      onAppStateChange(isActive);
    });
  }

  // Handle back button on Android
  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) {
      App.exitApp();
    } else {
      window.history.back();
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
