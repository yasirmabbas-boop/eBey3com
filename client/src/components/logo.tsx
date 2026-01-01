interface LogoProps {
  className?: string;
  variant?: "default" | "light";
}

export function Logo({ className = "", variant = "default" }: LogoProps) {
  const colors =
    variant === "light"
      ? {
          e: "text-orange-300",
          dash: "text-orange-400",
          arabic: "text-orange-200",
        }
      : {
          e: "text-orange-600",
          dash: "text-orange-500",
          arabic: "text-orange-700",
        };

  return (
    <div
      className={`flex items-center justify-center whitespace-nowrap ${className}`}
    >
      <span className="text-2xl md:text-3xl font-bold tracking-wide flex items-center gap-0">
        <span className={`${colors.e} inline-block transform scale-x-[-1]`}>
          E
        </span>
        <span className={colors.dash}>-</span>
        <span className={colors.arabic}>بيع</span>
      </span>
    </div>
  );
}
