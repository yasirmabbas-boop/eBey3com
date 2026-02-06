import { useState, useEffect, useCallback } from 'react';

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Hook to detect safe area insets using CSS env() values
 * 
 * Android: The native styles.xml handles edge-to-edge opt-out, so the WebView
 * doesn't extend behind system bars. CSS env() values work as expected.
 * 
 * iOS: CSS env() values are populated by the system.
 * 
 * Web: CSS env() values return 0 (no safe areas on desktop browsers).
 * 
 * See docs/SAFE_AREA_ANDROID_IMPLEMENTATION.md for details.
 */
export function useSafeArea(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  // Parse CSS env() value from a test element
  const getCSSEnvValue = useCallback((property: string): number => {
    try {
      const testEl = document.createElement('div');
      testEl.style.setProperty('padding-top', `env(${property}, 0px)`);
      document.body.appendChild(testEl);
      const computedValue = parseFloat(getComputedStyle(testEl).paddingTop) || 0;
      document.body.removeChild(testEl);
      return computedValue;
    } catch {
      return 0;
    }
  }, []);

  // Detect safe area using CSS env() values
  const detectSafeArea = useCallback(() => {
    const newInsets: SafeAreaInsets = {
      top: getCSSEnvValue('safe-area-inset-top'),
      bottom: getCSSEnvValue('safe-area-inset-bottom'),
      left: getCSSEnvValue('safe-area-inset-left'),
      right: getCSSEnvValue('safe-area-inset-right'),
    };

    // Only update if values changed to avoid unnecessary re-renders
    setInsets(prev => {
      if (
        prev.top !== newInsets.top ||
        prev.bottom !== newInsets.bottom ||
        prev.left !== newInsets.left ||
        prev.right !== newInsets.right
      ) {
        return newInsets;
      }
      return prev;
    });
  }, [getCSSEnvValue]);

  useEffect(() => {
    // Initial detection
    detectSafeArea();

    // Re-detect on resize (orientation change, etc.)
    const handleResize = () => {
      setTimeout(detectSafeArea, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [detectSafeArea]);

  return insets;
}
