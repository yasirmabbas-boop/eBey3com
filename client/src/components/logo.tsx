export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="text-2xl md:text-4xl font-bold leading-tight tracking-wider">
        <span className="text-blue-600">E</span>
        <span className="text-yellow-500">-</span>
        <span className="text-red-600">ب</span>
        <span className="text-green-600">ي</span>
        <span className="text-blue-600">ع</span>
      </div>
      <div className="text-sm md:text-lg font-bold text-blue-600 tracking-wider">eby3</div>
    </div>
  );
}
