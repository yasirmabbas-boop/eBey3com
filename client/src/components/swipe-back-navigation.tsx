import { useEffect, useRef, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { MAIN_NAV_PAGES } from "@/lib/nav-sections";

interface SwipeBackNavigationProps {
  children: ReactNode;
}

/** Activation zone width (px) from the leading edge */
const EDGE_ZONE = 25;
/** Vertical movement (px) that cancels the swipe */
const VERTICAL_CANCEL = 50;
/** Progress threshold (0-1) to commit the navigation */
const COMMIT_THRESHOLD = 0.35;
/** Animation duration (ms) for release spring-back */
const RELEASE_MS = 300;

export function SwipeBackNavigation({ children }: SwipeBackNavigationProps) {
  const [location] = useLocation();
  const { language, t } = useLanguage();
  const isRTL = language === "ar" || language === "ku";

  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isValidSwipe = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDisabled = MAIN_NAV_PAGES.some(
    (p) => location === p || location.startsWith(p + "/")
  );

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (isDisabled) return;

      // Ignore touches inside swipe-ignore containers (carousels, galleries, etc.)
      const target = e.target as HTMLElement;
      if (target.closest("[data-swipe-ignore]")) return;

      const startX = e.touches[0].clientX;
      const startY = e.touches[0].clientY;
      const screenW = window.innerWidth;

      // RTL: activate from right edge. LTR: activate from left edge.
      const isInEdge = isRTL
        ? startX > screenW - EDGE_ZONE
        : startX < EDGE_ZONE;

      if (isInEdge) {
        touchStartX.current = startX;
        touchStartY.current = startY;
        isValidSwipe.current = true;
        setIsSwiping(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isValidSwipe.current || touchStartX.current === null || touchStartY.current === null) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - touchStartX.current;
      const deltaY = Math.abs(currentY - touchStartY.current);

      // Cancel if scrolling vertically
      if (deltaY > VERTICAL_CANCEL) {
        isValidSwipe.current = false;
        setSwipeProgress(0);
        setIsSwiping(false);
        return;
      }

      // In LTR, positive deltaX = swiping right = going back.
      // In RTL, negative deltaX = swiping left = going back.
      const effectiveDelta = isRTL ? -deltaX : deltaX;
      const screenW = window.innerWidth;
      const progress = Math.max(0, Math.min(1, effectiveDelta / (screenW * 0.5)));
      setSwipeProgress(progress);
    };

    const handleTouchEnd = () => {
      if (!isValidSwipe.current) {
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      if (swipeProgress > COMMIT_THRESHOLD) {
        setSwipeProgress(1);
        setTimeout(() => {
          window.history.back();
          setSwipeProgress(0);
          setIsSwiping(false);
        }, 200);
      } else {
        setSwipeProgress(0);
        setIsSwiping(false);
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
  }, [location, swipeProgress, isRTL, isDisabled]);

  // Reset on location change
  useEffect(() => {
    setSwipeProgress(0);
    setIsSwiping(false);
  }, [location]);

  // Slide direction depends on RTL: LTR slides right, RTL slides left
  const translateX = isRTL ? -(swipeProgress * 100) : swipeProgress * 100;
  const shadowOpacity = 0.3 * (1 - swipeProgress);
  const prevPageOffset = isRTL
    ? 30 - swipeProgress * 30   // slides in from right
    : -30 + swipeProgress * 30; // slides in from left

  // Chevron icon: points toward the back direction
  const chevronRotation = isRTL ? "" : "rotate-180";

  return (
    <div className="relative overflow-hidden" ref={containerRef}>
      {/* Previous page hint (shadow/overlay) */}
      {isSwiping && (
        <div
          className="fixed inset-0 bg-gray-100 z-40"
          style={{
            transform: `translateX(${prevPageOffset}%)`,
            transition: isSwiping && swipeProgress === 0 ? `transform ${RELEASE_MS}ms ease-out` : "none",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className={`w-8 h-8 mx-auto mb-2 ${chevronRotation}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-sm">{t("previousPage")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Current page */}
      <div
        className="relative z-50 min-h-screen bg-white"
        style={{
          transform: `translateX(${translateX}%)`,
          transition: !isSwiping || swipeProgress === 0 || swipeProgress === 1
            ? `transform ${RELEASE_MS}ms ease-out`
            : "none",
          boxShadow: isSwiping
            ? `${isRTL ? "10px" : "-10px"} 0 30px rgba(0,0,0,${shadowOpacity})`
            : "none",
        }}
      >
        {children}
      </div>

      {/* Edge swipe indicator — on the leading edge for the current direction */}
      {!isDisabled && (
        <div
          className={`fixed top-1/2 -translate-y-1/2 w-1 h-16 bg-gray-300 rounded-full z-[60]`}
          style={{
            [isRTL ? "right" : "left"]: 0,
            borderRadius: isRTL ? "9999px 0 0 9999px" : "0 9999px 9999px 0",
            opacity: isSwiping ? 0 : 0.3,
          }}
        />
      )}
    </div>
  );
}
