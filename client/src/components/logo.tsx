import { useState, useEffect, useCallback, useRef } from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const IDLE_TIMEOUT = 45000;

export function Logo({ className = "", size = "md" }: LogoProps) {
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

  const sizeClasses = {
    sm: "h-8",
    md: "h-10",
    lg: "h-14",
  };

  return (
    <div
      className={`flex items-center justify-center ${className} ${logoImpact ? 'logo-impact' : ''}`}
    >
      <style>{`
        @keyframes dropBounce {
          0% {
            transform: translateY(-120px);
            opacity: 0;
          }
          15% {
            transform: translateY(-60px);
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
        .logo-animate {
          animation: dropBounce 1s ease-out;
        }
        .logo-impact {
          animation: logoImpact 0.3s ease-out;
        }
      `}</style>
      <img 
        src="/logo.png" 
        alt="E-بيع" 
        className={`${sizeClasses[size]} object-contain ${isAnimating ? 'logo-animate' : ''}`}
      />
    </div>
  );
}
