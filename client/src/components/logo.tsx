interface LogoProps {
  className?: string;
  variant?: "default" | "light";
}

export function Logo({ className = "", variant = "default" }: LogoProps) {
  const colors =
    variant === "light"
      ? {
          e: "Blue",
          dash: "blue",
          arabic: "blue",
        }
      : {
          e: "Blue",
          dash: "#yellow",
          arabic: "Blue",
        };

  return (
    <div
      className={`flex items-center justify-center whitespace-nowrap ${className}`}
      style={{ fontFamily: "'Cairo', sans-serif" }}
    >
      <span className="text-2xl md:text-3xl font-bold tracking-wide flex items-center gap-0">
        <span
          style={{ color: colors.e }}
          className="inline-block transform scale-x-[-1]"
        >
          E
        </span>
        <span style={{ color: colors.dash }}>-</span>
        <span style={{ color: colors.arabic }}>بيع</span>
      </span>
    </div>
  );
}
