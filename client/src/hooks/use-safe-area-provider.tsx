import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useSafeArea, SafeAreaInsets } from '@/hooks/use-safe-area';

// Context with default values
const SafeAreaContext = createContext<SafeAreaInsets>({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});

interface SafeAreaProviderProps {
  children: ReactNode;
}

/**
 * Provider that detects safe area insets and updates CSS variables dynamically
 * 
 * This ensures that:
 * - iOS uses env() values (populated by system)
 * - Android gets calculated values from viewport detection
 * - All components using var(--safe-area-*) get updated values
 */
export function SafeAreaProvider({ children }: SafeAreaProviderProps) {
  const insets = useSafeArea();

  // Update CSS variables whenever insets change
  useEffect(() => {
    const root = document.documentElement;
    
    // Only override if we have non-zero values
    // This prevents overwriting CSS env() fallbacks with 0 unnecessarily
    if (insets.top > 0 || insets.bottom > 0 || insets.left > 0 || insets.right > 0) {
      root.style.setProperty('--safe-area-top', `${insets.top}px`);
      root.style.setProperty('--safe-area-bottom', `${insets.bottom}px`);
      root.style.setProperty('--safe-area-left', `${insets.left}px`);
      root.style.setProperty('--safe-area-right', `${insets.right}px`);
    }

    // Cleanup: Remove inline styles when component unmounts
    return () => {
      root.style.removeProperty('--safe-area-top');
      root.style.removeProperty('--safe-area-bottom');
      root.style.removeProperty('--safe-area-left');
      root.style.removeProperty('--safe-area-right');
    };
  }, [insets]);

  return (
    <SafeAreaContext.Provider value={insets}>
      {children}
    </SafeAreaContext.Provider>
  );
}

/**
 * Hook to access safe area insets from the provider
 * 
 * Components can use this to get dynamic inset values for inline styles,
 * or they can use the CSS variables var(--safe-area-*) which are updated
 * by the provider.
 */
export function useSafeAreaInsets(): SafeAreaInsets {
  return useContext(SafeAreaContext);
}
