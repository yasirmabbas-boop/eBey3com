import { useState, useEffect, useCallback, useRef } from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const IDLE_TIMEOUT = 45000;

export function Logo({ className = "", size = "md" }: LogoProps) {
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

  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl md:text-3xl",
    lg: "text-3xl md:text-4xl",
  };

  return (
    <div className={`flex items-center ${className}`}>
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
      `}</style>
      
      <span 
        className={`font-bold tracking-tight flex items-center ${sizeClasses[size]}`}
        style={{ fontFamily: "'Cairo', sans-serif" }}
      >
        <span style={{ color: "#4285F4" }}>بيع</span>
        <span style={{ color: "#EA4335" }}>-</span>
        <span 
          className={`inline-block ${isAnimating ? 'logo-drop' : ''}`}
          style={{ color: "#34A853", transform: "scaleX(-1)" }}
        >
          E
        </span>
      </span>
    </div>
  );
}
