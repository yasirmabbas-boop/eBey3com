import { useEffect, useRef, useState, ReactNode } from "react";
import { useLocation } from "wouter";

interface SwipeBackNavigationProps {
  children: ReactNode;
}

export function SwipeBackNavigation({ children }: SwipeBackNavigationProps) {
  const [location] = useLocation();
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwipping, setIsSwipping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isValidSwipe = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const startX = e.touches[0].clientX;
      const startY = e.touches[0].clientY;
      
      // Only start swipe from left edge (within 25px)
      if (startX < 25 && location !== "/") {
        touchStartX.current = startX;
        touchStartY.current = startY;
        isValidSwipe.current = true;
        setIsSwipping(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isValidSwipe.current || touchStartX.current === null || touchStartY.current === null) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - touchStartX.current;
      const deltaY = Math.abs(currentY - touchStartY.current);

      // Cancel if scrolling vertically
      if (deltaY > 50) {
        isValidSwipe.current = false;
        setSwipeProgress(0);
        setIsSwipping(false);
        return;
      }

      // Calculate progress (0 to 1) based on screen width
      const screenWidth = window.innerWidth;
      const progress = Math.max(0, Math.min(1, deltaX / (screenWidth * 0.5)));
      setSwipeProgress(progress);
    };

    const handleTouchEnd = () => {
      if (!isValidSwipe.current) {
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      // If swiped more than 35% of screen, navigate back
      if (swipeProgress > 0.35) {
        setSwipeProgress(1);
        setTimeout(() => {
          window.history.back();
          setSwipeProgress(0);
          setIsSwipping(false);
        }, 200);
      } else {
        // Animate back to original position
        setSwipeProgress(0);
        setIsSwipping(false);
      }

      touchStartX.current = null;
      touchStartY.current = null;
      isValidSwipe.current = false;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [location, swipeProgress]);

  // Reset on location change
  useEffect(() => {
    setSwipeProgress(0);
    setIsSwipping(false);
  }, [location]);

  const translateX = swipeProgress * 100;
  const shadowOpacity = 0.3 * (1 - swipeProgress);
  const prevPageOffset = -30 + (swipeProgress * 30);

  return (
    <div className="relative overflow-hidden" ref={containerRef}>
      {/* Previous page hint (shadow/overlay) */}
      {isSwipping && (
        <div 
          className="fixed inset-0 bg-gray-100 z-40"
          style={{
            transform: `translateX(${prevPageOffset}%)`,
            transition: isSwipping && swipeProgress === 0 ? 'transform 0.3s ease-out' : 'none',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto mb-2 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-sm">الصفحة السابقة</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Current page */}
      <div 
        className="relative z-50 min-h-screen bg-white"
        style={{
          transform: `translateX(${translateX}%)`,
          transition: !isSwipping || swipeProgress === 0 || swipeProgress === 1 
            ? 'transform 0.3s ease-out' 
            : 'none',
          boxShadow: isSwipping ? `-10px 0 30px rgba(0,0,0,${shadowOpacity})` : 'none',
        }}
      >
        {children}
      </div>

      {/* Left edge swipe indicator */}
      {location !== "/" && (
        <div 
          className="fixed left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-gray-300 rounded-r-full z-[60] opacity-30"
          style={{
            opacity: isSwipping ? 0 : 0.3,
          }}
        />
      )}
    </div>
  );
}
