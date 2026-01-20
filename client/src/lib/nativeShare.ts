import { Share, ShareOptions as CapShareOptions } from '@capacitor/share';
import { isNative } from './capacitor';

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

/**
 * Universal share function that works on both web and native platforms
 * Uses Capacitor Share on native, Web Share API on web
 */
export const share = async (options: ShareOptions): Promise<boolean> => {
  const { title, text, url, dialogTitle } = options;

  if (isNative) {
    try {
      // Use Capacitor Share on native platforms
      await Share.share({
        title,
        text,
        url,
        dialogTitle: dialogTitle || title || 'مشاركة',
      });
      return true;
    } catch (error) {
      // User cancelled or error occurred
      console.error('Native share error:', error);
      return false;
    }
  } else {
    // Use Web Share API on web
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        return true;
      } catch (error) {
        // User cancelled or error occurred
        console.error('Web share error:', error);
        return false;
      }
    } else {
      // Fallback: copy to clipboard
      if (url) {
        try {
          await navigator.clipboard.writeText(url);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }
};

/**
 * Check if sharing is available on this platform
 */
export const canShare = async (): Promise<boolean> => {
  if (isNative) {
    try {
      const result = await Share.canShare();
      return result.value;
    } catch {
      return false;
    }
  } else {
    return 'share' in navigator;
  }
};
