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

  const sizeConfig = {
    sm: { height: 32, fontSize: "text-xl", gap: "gap-0.5" },
    md: { height: 40, fontSize: "text-2xl", gap: "gap-1" },
    lg: { height: 56, fontSize: "text-3xl", gap: "gap-1.5" },
  };

  const config = sizeConfig[size];

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
        @keyframes cartWheelSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .logo-animate {
          animation: dropBounce 1s ease-out;
        }
        .logo-impact {
          animation: logoImpact 0.3s ease-out;
        }
        .wheel-spin {
          animation: cartWheelSpin 0.8s ease-out;
        }
      `}</style>
      
      <div className={`flex items-end ${config.gap} ${config.fontSize} font-bold`} style={{ fontFamily: "'Cairo', sans-serif" }}>
        {/* Arabic text "بيع" styled as shopping cart */}
        <div className="relative flex flex-col items-center">
          <svg 
            viewBox="0 0 80 60" 
            className={`${isAnimating ? 'logo-animate' : ''}`}
            style={{ height: config.height, width: 'auto' }}
          >
            {/* Cart body - stylized Arabic بيع */}
            <text 
              x="5" 
              y="38" 
              fill="#4285F4" 
              fontSize="36" 
              fontFamily="Cairo, sans-serif" 
              fontWeight="700"
            >
              بيع
            </text>
            {/* Cart items (3 circles) */}
            <circle cx="25" cy="48" r="4" fill="#FBBC05" />
            <circle cx="38" cy="48" r="4" fill="#FBBC05" />
            <circle cx="51" cy="48" r="4" fill="#FBBC05" />
            {/* Cart wheels */}
            <circle 
              cx="22" 
              cy="58" 
              r="5" 
              fill="none" 
              stroke="#FBBC05" 
              strokeWidth="2"
              className={isAnimating ? 'wheel-spin' : ''}
              style={{ transformOrigin: '22px 58px' }}
            />
            <circle 
              cx="52" 
              cy="58" 
              r="5" 
              fill="none" 
              stroke="#34A853" 
              strokeWidth="2"
              className={isAnimating ? 'wheel-spin' : ''}
              style={{ transformOrigin: '52px 58px' }}
            />
          </svg>
        </div>

        {/* Red dash */}
        <span className="text-red-600 font-bold" style={{ lineHeight: 1 }}>-</span>

        {/* Green E (mirrored) */}
        <span 
          className={`text-green-600 font-bold inline-block transform scale-x-[-1] ${isAnimating ? 'logo-animate' : ''}`}
          style={{ lineHeight: 1 }}
        >
          E
        </span>
      </div>
    </div>
  );
}
