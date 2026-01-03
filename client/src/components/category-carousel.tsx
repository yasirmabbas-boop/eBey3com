import { useRef, useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategoryCarouselProps {
  children: ReactNode;
  className?: string;
}

export function CategoryCarousel({ children, className = "" }: CategoryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollPosition = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    
    checkScrollPosition();
    scrollEl.addEventListener("scroll", checkScrollPosition);
    window.addEventListener("resize", checkScrollPosition);
    
    return () => {
      scrollEl.removeEventListener("scroll", checkScrollPosition);
      window.removeEventListener("resize", checkScrollPosition);
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === "right" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className={`relative group ${className}`}>
      {canScrollRight && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 shadow-lg border-gray-200 hover:bg-white h-8 w-8 sm:h-10 sm:w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
          onClick={() => scroll("right")}
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      )}
      
      {canScrollLeft && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 shadow-lg border-gray-200 hover:bg-white h-8 w-8 sm:h-10 sm:w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
          onClick={() => scroll("left")}
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <style>{`
          .category-carousel::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {children}
      </div>

      {/* Scroll indicators for mobile */}
      <div className="flex justify-center gap-1 mt-2 sm:hidden">
        <div className={`h-1 w-6 rounded-full transition-colors ${canScrollRight ? 'bg-primary' : 'bg-gray-300'}`} />
        <div className={`h-1 w-6 rounded-full transition-colors ${canScrollLeft ? 'bg-primary' : 'bg-gray-300'}`} />
      </div>
    </div>
  );
}
