interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-8",
    md: "h-10 md:h-12",
    lg: "h-14 md:h-16"
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <img 
        src="/logo.png" 
        alt="E-بيع" 
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </div>
  );
}
