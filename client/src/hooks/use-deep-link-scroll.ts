/**
 * Hook for Deep Link Auto-Scroll and Highlight
 * 
 * Automatically scrolls to and highlights an element when navigating via deep link.
 * Provides smooth scrolling and temporary highlight animation.
 * 
 * @example
 * const { scrollToElement } = useDeepLinkScroll();
 * 
 * useEffect(() => {
 *   if (deepLinkId) {
 *     scrollToElement(`order-card-${deepLinkId}`, { highlight: true });
 *   }
 * }, [deepLinkId]);
 */

import { useCallback } from 'react';

export interface ScrollOptions {
  /** Apply highlight animation to the element */
  highlight?: boolean;
  /** Scroll behavior (default: 'smooth') */
  behavior?: ScrollBehavior;
  /** Block position (default: 'center') */
  block?: ScrollLogicalPosition;
  /** Inline position (default: 'nearest') */
  inline?: ScrollLogicalPosition;
  /** Delay before scrolling in ms (default: 300) */
  delay?: number;
  /** Highlight duration in ms (default: 3000) */
  highlightDuration?: number;
}

export function useDeepLinkScroll() {
  /**
   * Scrolls to an element and optionally highlights it
   * 
   * @param elementId - The data-testid or id of the element to scroll to
   * @param options - Scroll and highlight options
   * @returns Promise that resolves when scroll is complete
   */
  const scrollToElement = useCallback(
    (elementId: string, options: ScrollOptions = {}): Promise<void> => {
      const {
        highlight = true,
        behavior = 'smooth',
        block = 'center',
        inline = 'nearest',
        delay = 300,
        highlightDuration = 3000,
      } = options;

      return new Promise((resolve) => {
        // Wait for DOM to be ready and data to be rendered
        setTimeout(() => {
          // Try to find element by data-testid first, then by id
          let element = document.querySelector(`[data-testid="${elementId}"]`);
          
          if (!element) {
            element = document.getElementById(elementId);
          }

          if (!element) {
            console.warn(`[DeepLinkScroll] Element not found: ${elementId}`);
            resolve();
            return;
          }

          // Scroll to element
          element.scrollIntoView({
            behavior,
            block,
            inline,
          });

          // Apply highlight effect
          if (highlight) {
            // Add highlight class
            element.classList.add('deep-link-highlight');
            
            // Add animation class for smooth fade-in
            element.classList.add('deep-link-animate');

            // Remove classes after duration
            setTimeout(() => {
              element!.classList.remove('deep-link-highlight');
              element!.classList.add('deep-link-fade-out');
              
              // Clean up fade-out class
              setTimeout(() => {
                element!.classList.remove('deep-link-animate', 'deep-link-fade-out');
              }, 500); // Fade-out transition duration
            }, highlightDuration);
          }

          resolve();
        }, delay);
      });
    },
    []
  );

  /**
   * Removes highlight from an element (useful for manual cleanup)
   */
  const removeHighlight = useCallback((elementId: string) => {
    const element = 
      document.querySelector(`[data-testid="${elementId}"]`) ||
      document.getElementById(elementId);
    
    if (element) {
      element.classList.remove('deep-link-highlight', 'deep-link-animate', 'deep-link-fade-out');
    }
  }, []);

  return {
    scrollToElement,
    removeHighlight,
  };
}
