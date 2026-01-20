import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities for Capacitor
 */

// Check if running as a native app (iOS or Android)
export const isNative = Capacitor.isNativePlatform();

// Check specific platforms
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isWeb = Capacitor.getPlatform() === 'web';

// Get current platform name
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

/**
 * Check if a specific Capacitor plugin is available
 */
export const isPluginAvailable = (pluginName: string): boolean => {
  return Capacitor.isPluginAvailable(pluginName);
};

/**
 * Convert a Capacitor file URI to a web-friendly blob URL
 */
export const convertFileSrc = (filePath: string): string => {
  return Capacitor.convertFileSrc(filePath);
};
