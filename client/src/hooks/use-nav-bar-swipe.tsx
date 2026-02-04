import { useEffect, useRef, useState, useCallback } from "react";

interface UseNavBarSwipeOptions {
  tabCount: number;
  currentTabIndex: number;
  onTabChange: (newIndex: number) => void;
  isRTL?: boolean;
  enabled?: boolean;
}

interface SwipeState {
  isSwiping: boolean;
  progress: number;
  direction: "left" | "right" | null;
  targetIndex: number | null;
}

const SWIPE_CONFIG = {
  MIN_SWIPE_DISTANCE: 50,        // Minimum pixels to trigger
  MAX_VERTICAL_TOLERANCE: 30,    // Max vertical movement allowed
  VELOCITY_THRESHOLD: 0.3,       // px/ms for fast swipe
  PROGRESS_THRESHOLD: 0.35,      // 35% progress to complete
  ANIMATION_DURATION: 300,        // ms for tab transition
};

export function useNavBarSwipe({
  tabCount,
  currentTabIndex,
  onTabChange,
  isRTL = false,
  enabled = true,
}: UseNavBarSwipeOptions) {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    isSwiping: false,
    progress: 0,
    direction: null,
    targetIndex: null,
  });

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);
  const lastTouchX = useRef<number | null>(null);
  const navBarRef = useRef<HTMLElement | null>(null);
  const isActiveSwipe = useRef(false);

  const calculateTargetIndex = useCallback((deltaX: number): number | null => {
    if (deltaX === 0) return null;

    // In RTL mode, reverse the logic
    const isSwipeRight = deltaX > 0;
    const isSwipeLeft = deltaX < 0;

    let targetIndex: number | null = null;

    if (isRTL) {
      // RTL: swipe right = next tab, swipe left = previous tab
      if (isSwipeRight && currentTabIndex < tabCount - 1) {
        targetIndex = currentTabIndex + 1;
      } else if (isSwipeLeft && currentTabIndex > 0) {
        targetIndex = currentTabIndex - 1;
      }
    } else {
      // LTR: swipe left = next tab, swipe right = previous tab
      if (isSwipeLeft && currentTabIndex < tabCount - 1) {
        targetIndex = currentTabIndex + 1;
      } else if (isSwipeRight && currentTabIndex > 0) {
        targetIndex = currentTabIndex - 1;
      }
    }

    return targetIndex;
  }, [currentTabIndex, tabCount, isRTL]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    
    // Only handle touches on or within the nav bar
    if (!navBarRef.current?.contains(target)) return;

    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    lastTouchX.current = touch.clientX;
    isActiveSwipe.current = true;
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !isActiveSwipe.current || touchStartX.current === null || touchStartY.current === null) {
      return;
    }

    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = Math.abs(currentY - touchStartY.current);

    // Cancel if scrolling vertically
    if (deltaY > SWIPE_CONFIG.MAX_VERTICAL_TOLERANCE) {
      isActiveSwipe.current = false;
      setSwipeState({
        isSwiping: false,
        progress: 0,
        direction: null,
        targetIndex: null,
      });
      return;
    }

    // Only proceed if horizontal movement is significant
    if (Math.abs(deltaX) < 10) return;

    const targetIndex = calculateTargetIndex(deltaX);
    
    // Calculate progress (0 to 1) based on nav bar width
    const navBarWidth = navBarRef.current?.offsetWidth || window.innerWidth;
    const progress = Math.max(0, Math.min(1, Math.abs(deltaX) / (navBarWidth * 0.5)));

    setSwipeState({
      isSwiping: true,
      progress,
      direction: deltaX > 0 ? "right" : "left",
      targetIndex,
    });

    lastTouchX.current = currentX;
  }, [enabled, calculateTargetIndex]);

  const swipeStateRef = useRef(swipeState);
  useEffect(() => {
    swipeStateRef.current = swipeState;
  }, [swipeState]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !isActiveSwipe.current) {
      touchStartX.current = null;
      touchStartY.current = null;
      touchStartTime.current = null;
      lastTouchX.current = null;
      return;
    }

    const endTime = Date.now();
    const startTime = touchStartTime.current || endTime;
    const duration = endTime - startTime;

    if (touchStartX.current === null || lastTouchX.current === null) {
      touchStartX.current = null;
      touchStartY.current = null;
      touchStartTime.current = null;
      lastTouchX.current = null;
      isActiveSwipe.current = false;
      setSwipeState({
        isSwiping: false,
        progress: 0,
        direction: null,
        targetIndex: null,
      });
      return;
    }

    const currentState = swipeStateRef.current;
    const deltaX = lastTouchX.current - touchStartX.current;
    const velocity = Math.abs(deltaX) / Math.max(duration, 1);

    const shouldComplete = 
      currentState.progress > SWIPE_CONFIG.PROGRESS_THRESHOLD ||
      velocity > SWIPE_CONFIG.VELOCITY_THRESHOLD;

    if (shouldComplete && currentState.targetIndex !== null) {
      // Complete navigation
      onTabChange(currentState.targetIndex);
      setSwipeState({
        isSwiping: false,
        progress: 0,
        direction: null,
        targetIndex: null,
      });
    } else {
      // Cancel swipe - animate back
      setSwipeState({
        isSwiping: false,
        progress: 0,
        direction: null,
        targetIndex: null,
      });
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchStartTime.current = null;
    lastTouchX.current = null;
    isActiveSwipe.current = false;
  }, [enabled, onTabChange]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Reset swipe state when tab changes externally
  useEffect(() => {
    setSwipeState({
      isSwiping: false,
      progress: 0,
      direction: null,
      targetIndex: null,
    });
  }, [currentTabIndex]);

  return {
    swipeState,
    navBarRef,
  };
}
