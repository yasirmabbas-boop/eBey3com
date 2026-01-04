import { useState, useEffect, useCallback, useRef } from "react";

interface LogoProps {
  className?: string;
}

const IDLE_TIMEOUT = 45000;

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
    <div className={`inline-flex items-center ${className}`}>
      <style>{`
        @keyframes dropBounce {
          0% {
            transform: scaleX(-1) translateY(-80px);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          50% {
            transform: scaleX(-1) translateY(0);
          }
          65% {
            transform: scaleX(-1) translateY(-12px);
          }
          80% {
            transform: scaleX(-1) translateY(0);
          }
          90% {
            transform: scaleX(-1) translateY(-4px);
          }
          100% {
            transform: scaleX(-1) translateY(0);
          }
        }
        .e-drop {
          animation: dropBounce 0.8s ease-out forwards;
        }
        .e-normal {
          transform: scaleX(-1);
        }
      `}</style>
      
      <span className="text-2xl md:text-3xl font-bold flex items-center" style={{ fontFamily: "Cairo, sans-serif" }}>
        <span className="text-blue-500">بيع</span>
        <span className="text-red-500 mx-0.5">-</span>
        <span 
          className={`text-green-600 ${isAnimating ? 'e-drop' : 'e-normal'}`}
        >
          E
        </span>
      </span>
    </div>
  );
}
