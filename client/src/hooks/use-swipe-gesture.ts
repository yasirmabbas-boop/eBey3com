import { useRef, useEffect, RefObject } from "react";
import { hapticLight } from "@/lib/despia";

interface SwipeGestureConfig {
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
  deadZone?: number;
  velocityThreshold?: number;
  distanceThreshold?: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  lockedAxis: 'vertical' | 'horizontal' | null;
  isOnImageArea: boolean;
}

export function useSwipeGesture(
  elementRef: RefObject<HTMLElement>,
  config: SwipeGestureConfig
) {
  const touchState = useRef<TouchState | null>(null);
  const DEAD_ZONE = config.deadZone ?? 15; // pixels before determining direction
  const VELOCITY_THRESHOLD = config.velocityThreshold ?? 0.5;
  const DISTANCE_THRESHOLD = config.distanceThreshold ?? 100;

  useEffect(() => {
    const element = elementRef.current;
    if (!element || config.disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const target = e.target as HTMLElement;

      touchState.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        lockedAxis: null,
        isOnImageArea: target.closest('.swipe-image-area') !== null,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchState.current) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchState.current.startX);
      const deltaY = Math.abs(touch.clientY - touchState.current.startY);

      // Determine axis lock if past dead zone
      if (!touchState.current.lockedAxis) {
        if (deltaX > DEAD_ZONE || deltaY > DEAD_ZONE) {
          // Lock to dominant axis
          touchState.current.lockedAxis = deltaX > deltaY ? 'horizontal' : 'vertical';
        } else {
          return; // Still in dead zone, don't do anything
        }
      }

      // Handle locked axis
      if (touchState.current.lockedAxis === 'vertical') {
        // Vertical item navigation - prevent page scroll
        e.preventDefault();
      } else if (touchState.current.lockedAxis === 'horizontal' && touchState.current.isOnImageArea) {
        // Horizontal image navigation - let carousel handle it
        // Don't prevent default
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchState.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchState.current.startX;
      const deltaY = touch.clientY - touchState.current.startY;
      const duration = Date.now() - touchState.current.startTime;
      const velocityY = Math.abs(deltaY) / duration;
      const velocityX = Math.abs(deltaX) / duration;

      // Only handle vertical navigation (horizontal is handled by image carousel)
      if (touchState.current.lockedAxis === 'vertical') {
        if (velocityY > VELOCITY_THRESHOLD || Math.abs(deltaY) > DISTANCE_THRESHOLD) {
          // Navigate to next/previous item
          hapticLight(); // Haptic feedback on navigation
          if (deltaY > 0) {
            config.onSwipeDown();
          } else {
            config.onSwipeUp();
          }
        }
      } else if (touchState.current.lockedAxis === 'horizontal' && !touchState.current.isOnImageArea) {
        // Handle horizontal swipes outside image area (if needed)
        if (velocityX > VELOCITY_THRESHOLD || Math.abs(deltaX) > DISTANCE_THRESHOLD) {
          if (deltaX > 0 && config.onSwipeRight) {
            config.onSwipeRight();
          } else if (deltaX < 0 && config.onSwipeLeft) {
            config.onSwipeLeft();
          }
        }
      }

      touchState.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    elementRef,
    config.disabled,
    config.onSwipeUp,
    config.onSwipeDown,
    config.onSwipeLeft,
    config.onSwipeRight,
    DEAD_ZONE,
    VELOCITY_THRESHOLD,
    DISTANCE_THRESHOLD,
  ]);
}
