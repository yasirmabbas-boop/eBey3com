export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="text-2xl md:text-4xl font-bold leading-tight tracking-wider flex items-center gap-1">
        <div className="flex items-center" dir="ltr">
          <span className="text-yellow-500">-</span>
          <span className="text-blue-600 inline-block transform -scale-x-100 relative top-[2px]">E</span>
        </div>
        <div className="flex">
          <span className="text-red-600">ب</span>
          <span className="text-green-600">ي</span>
          <span className="text-blue-600">ع</span>
        </div>
      </div>
    </div>
  );
}
