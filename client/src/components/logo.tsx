export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="text-2xl md:text-4xl font-bold text-primary leading-tight">اي بيع</div>
      <div className="text-sm md:text-lg font-bold text-blue-600 tracking-wider">ebay3</div>
    </div>
  );
}
