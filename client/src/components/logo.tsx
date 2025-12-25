export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="text-2xl md:text-4xl font-bold leading-tight tracking-wider flex items-center gap-1">
        <div className="flex items-center" dir="ltr">
          <span className="text-blue-300">-</span>
          <span className="text-blue-600 inline-block transform -scale-x-100 relative top-[2px]">E</span>
        </div>
        <div className="flex" dir="rtl">
          <span 
            className="bg-gradient-to-l from-blue-800 via-blue-500 to-blue-300 bg-clip-text text-transparent"
            style={{ 
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent" 
            }}
          >
            بيع
          </span>
        </div>
      </div>
    </div>
  );
}
