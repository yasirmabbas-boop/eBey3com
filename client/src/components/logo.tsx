import { useState, useEffect, useCallback } from "react";

interface LogoProps {
  className?: string;
  variant?: "default" | "light";
}

export function Logo({ className = "", variant = "default" }: LogoProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [logoImpact, setLogoImpact] = useState(false);

  const getRandomInterval = useCallback(() => {
    return Math.floor(Math.random() * 7000) + 5000;
  }, []);

  const triggerAnimation = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setLogoImpact(true);
      setTimeout(() => setLogoImpact(false), 300);
    }, 650);
    setTimeout(() => setIsAnimating(false), 1000);
  }, []);

  useEffect(() => {
    const initialDelay = setTimeout(() => {
      triggerAnimation();
    }, 500);

    let timeoutId: NodeJS.Timeout;
    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        triggerAnimation();
        scheduleNext();
      }, getRandomInterval());
    };
    
    const startScheduling = setTimeout(scheduleNext, 1500);
    
    return () => {
      clearTimeout(initialDelay);
      clearTimeout(startScheduling);
      clearTimeout(timeoutId);
    };
  }, [triggerAnimation, getRandomInterval]);

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
        @keyframes jumpFlip {
          0% {
            transform: scaleX(-1) translateY(0) rotateY(0);
          }
          15% {
            transform: scaleX(-1) translateY(-14px) rotateY(0);
          }
          40% {
            transform: scaleX(-1) translateY(-22px) rotateY(180deg);
          }
          70% {
            transform: scaleX(-1) translateY(-6px) rotateY(360deg);
          }
          85% {
            transform: scaleX(-1) translateY(4px) rotateY(360deg);
          }
          100% {
            transform: scaleX(-1) translateY(0) rotateY(360deg);
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
          animation: jumpFlip 0.8s ease-in-out;
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
