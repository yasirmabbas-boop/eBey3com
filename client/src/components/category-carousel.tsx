import { useRef, useState, useEffect, ReactNode, useCallback } from "react";
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
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const checkScrollPosition = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

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
        className={`flex gap-2 sm:gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
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
