import { useState, useEffect, useCallback, useRef } from "react";

interface LogoProps {
  className?: string;
}

const IDLE_TIMEOUT = 45000;
const LOGO_SCALE = 0.8;
const LOGO_VERTICAL_SHIFT = 3;

export function Logo({ className = "" }: LogoProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedInitial = useRef(false);

  const triggerAnimation = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      triggerAnimation();
      resetIdleTimer();
    }, IDLE_TIMEOUT + Math.random() * 15000);
  }, [triggerAnimation]);

  useEffect(() => {
    if (!hasPlayedInitial.current) {
      const initialDelay = setTimeout(() => {
        triggerAnimation();
        hasPlayedInitial.current = true;
        resetIdleTimer();
      }, 800);
      return () => clearTimeout(initialDelay);
    }
  }, [triggerAnimation, resetIdleTimer]);

  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (hasPlayedInitial.current) {
        resetIdleTimer();
      }
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [resetIdleTimer]);

  return (
    <div
      className={`inline-flex items-center ${className}`}
      style={{
        transform: `translateY(${LOGO_VERTICAL_SHIFT}px) scale(${LOGO_SCALE})`,
        transformOrigin: "center",
      }}
    >
      <style>{`
        @keyframes dropBounce {
          0% {
            transform: translateY(-80px);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          50% {
            transform: translateY(0);
          }
          65% {
            transform: translateY(-12px);
          }
          80% {
            transform: translateY(0);
          }
          90% {
            transform: translateY(-4px);
          }
          100% {
            transform: translateY(0);
          }
        }
        .logo-drop {
          animation: dropBounce 0.8s ease-out forwards;
        }
        .logo-rest {
          transform: translateY(0);
        }
      `}</style>

      <img
        src="/logo.svg"
        alt="E-بيع"
        className={`h-8 md:h-10 transition-transform ${isAnimating ? "logo-drop" : "logo-rest"}`}
      />
    </div>
  );
}
