import { useState, useEffect, useCallback, useRef } from "react";

interface LogoProps {
  className?: string;
  variant?: "default" | "light";
}

const IDLE_TIMEOUT = 45000;

export function Logo({ className = "", variant = "default" }: LogoProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [logoImpact, setLogoImpact] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedInitial = useRef(false);

  const triggerAnimation = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setLogoImpact(true);
      setTimeout(() => setLogoImpact(false), 300);
    }, 500);
    setTimeout(() => setIsAnimating(false), 1200);
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

  const colors =
    variant === "light"
      ? {
          e: "#60A5FA",
          dash: "#DC2626",
          arabic: "#93C5FD",
        }
      : {
          e: "#1E3A8A",
          dash: "#DC2626",
          arabic: "#1E3A8A",
        };

  return (
    <div
      className={`flex items-center justify-center whitespace-nowrap ${className} ${logoImpact ? 'logo-impact' : ''}`}
      style={{ fontFamily: "'Cairo', sans-serif" }}
    >
      <style>{`
        @keyframes dropBounce {
          0% {
            transform: translateY(-120px);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          50% {
            transform: translateY(0px);
          }
          65% {
            transform: translateY(-18px);
          }
          80% {
            transform: translateY(0px);
          }
          90% {
            transform: translateY(-6px);
          }
          100% {
            transform: translateY(0);
          }
        }
        @keyframes logoImpact {
          0% {
            transform: scale(1) translateY(0);
          }
          30% {
            transform: scale(1.03) translateY(2px);
          }
          60% {
            transform: scale(0.98) translateY(-1px);
          }
          100% {
            transform: scale(1) translateY(0);
          }
        }
        @keyframes letterWiggle {
          0%, 100% {
            transform: translateY(0);
          }
          25% {
            transform: translateY(-2px);
          }
          75% {
            transform: translateY(1px);
          }
        }
        .logo-e-animate {
          animation: dropBounce 1s ease-out;
        }
        .logo-impact {
          animation: logoImpact 0.3s ease-out;
        }
        .logo-impact .logo-dash,
        .logo-impact .logo-arabic {
          animation: letterWiggle 0.25s ease-out;
        }
      `}</style>
      <span className="text-2xl md:text-3xl font-bold tracking-wide flex items-center gap-0">
        <span
          style={{ color: colors.e }}
          className={`inline-block transform scale-x-[-1] ${isAnimating ? 'logo-e-animate' : ''}`}
        >
          E
        </span>
        <span style={{ color: colors.dash }} className="logo-dash inline-block">-</span>
        <span style={{ color: colors.arabic }} className="logo-arabic inline-block">بيع</span>
      </span>
    </div>
  );
}
