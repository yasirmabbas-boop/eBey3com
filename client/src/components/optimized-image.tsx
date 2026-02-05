import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: "square" | "video" | "auto";
  priority?: boolean;
  darkMode?: boolean;
  objectFit?: "cover" | "contain";
  onLoad?: () => void;
}

export function OptimizedImage({ 
  src, 
  alt, 
  className,
  aspectRatio = "square",
  priority = false,
  darkMode = false,
  objectFit = "cover",
  onLoad
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    auto: ""
  };

  return (
    <div 
      ref={imgRef}
      className={cn(
        "relative overflow-hidden",
        aspectClasses[aspectRatio],
        className
      )}
    >
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-transparent">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {!hasError && (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => {
            setIsLoaded(true);
            onLoad?.();
          }}
          onError={() => setHasError(true)}
          className={cn(
            "absolute inset-0 h-full w-full",
            objectFit === "contain" ? "object-contain" : "object-cover"
          )}
          style={darkMode ? { backgroundColor: 'transparent' } : undefined}
        />
      )}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm border">
      <div className="aspect-square bg-gray-100 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
        <div className="h-5 bg-gray-200 rounded animate-pulse w-1/3" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex gap-4 p-4 bg-white rounded-lg border">
      <div className="w-20 h-20 bg-gray-100 rounded-lg animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
        <div className="h-5 bg-gray-200 rounded animate-pulse w-1/4" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton({ title = true }: { title?: boolean }) {
  return (
    <div className="space-y-6">
      {title && <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3" />}
      <ProductGridSkeleton count={8} />
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
      <div className="space-y-3">
        <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
      </div>
      <div className="h-12 bg-gray-200 rounded animate-pulse w-full" />
    </div>
  );
}

export function SwipeSkeleton() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 bg-gray-800 animate-pulse" />
        <div className="p-4 space-y-3">
          <div className="h-5 bg-gray-700 rounded animate-pulse w-2/3" />
          <div className="h-4 bg-gray-700 rounded animate-pulse w-1/3" />
        </div>
      </div>
    </div>
  );
}
