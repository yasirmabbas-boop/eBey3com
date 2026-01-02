import { useState, useEffect } from "react";

interface LogoProps {
  className?: string;
  variant?: "default" | "light";
}

export function Logo({ className = "", variant = "default" }: LogoProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 1000);
    
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }, 8000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

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
      className={`flex items-center justify-center whitespace-nowrap ${className}`}
      style={{ fontFamily: "'Cairo', sans-serif" }}
    >
      <style>{`
        @keyframes jumpFlip {
          0% {
            transform: scaleX(-1) translateY(0) rotateY(0);
          }
          20% {
            transform: scaleX(-1) translateY(-12px) rotateY(0);
          }
          50% {
            transform: scaleX(-1) translateY(-20px) rotateY(180deg);
          }
          80% {
            transform: scaleX(-1) translateY(-8px) rotateY(360deg);
          }
          90% {
            transform: scaleX(-1) translateY(3px) rotateY(360deg);
          }
          100% {
            transform: scaleX(-1) translateY(0) rotateY(360deg);
          }
        }
        .logo-e-animate {
          animation: jumpFlip 0.8s ease-in-out;
        }
      `}</style>
      <span className="text-2xl md:text-3xl font-bold tracking-wide flex items-center gap-0">
        <span
          style={{ color: colors.e }}
          className={`inline-block transform scale-x-[-1] ${isAnimating ? 'logo-e-animate' : ''}`}
        >
          E
        </span>
        <span style={{ color: colors.dash }}>-</span>
        <span style={{ color: colors.arabic }}>بيع</span>
      </span>
    </div>
  );
}
