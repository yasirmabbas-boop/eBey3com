import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

export function useSwipeNavigation() {
  const [location, setLocation] = useLocation();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = Math.abs(touchEndY - touchStartY.current);

      // Swipe must be mostly horizontal (not vertical scrolling)
      // Swipe must start from left edge (within 30px) for back navigation
      // Swipe distance must be at least 80px
      const isFromLeftEdge = touchStartX.current < 30;
      const isHorizontalSwipe = deltaX > 80 && deltaY < 100;
      
      if (isFromLeftEdge && isHorizontalSwipe && location !== "/") {
        window.history.back();
      }

      touchStartX.current = null;
      touchStartY.current = null;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [location]);
}
