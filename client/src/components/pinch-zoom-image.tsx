import { useRef, useCallback, useState, type CSSProperties } from "react";

interface PinchZoomImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
  decoding?: "sync" | "async" | "auto";
  /** Called when zoom level changes (> 1 = zoomed in) */
  onZoomChange?: (zoomed: boolean) => void;
}

/**
 * Image with pinch-to-zoom and double-tap-to-zoom support.
 * Designed for fullscreen swipe-reel cards.
 */
export function PinchZoomImage({
  src,
  alt,
  className,
  style,
  loading,
  decoding,
  onZoomChange,
}: PinchZoomImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Transform state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  // Gesture tracking refs (avoid re-renders during gesture)
  const gestureRef = useRef({
    startDist: 0,
    startScale: 1,
    startMidX: 0,
    startMidY: 0,
    startTransX: 0,
    startTransY: 0,
    isPinching: false,
    isPanning: false,
    lastTap: 0,
    panStartX: 0,
    panStartY: 0,
  });

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    onZoomChange?.(false);
  }, [onZoomChange]);

  const clampTranslate = useCallback(
    (tx: number, ty: number, s: number) => {
      if (s <= 1) return { x: 0, y: 0 };
      const el = containerRef.current;
      if (!el) return { x: tx, y: ty };

      // Allow panning within the zoomed image bounds
      const maxX = ((s - 1) * el.clientWidth) / 2;
      const maxY = ((s - 1) * el.clientHeight) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, tx)),
        y: Math.max(-maxY, Math.min(maxY, ty)),
      };
    },
    []
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const g = gestureRef.current;

      if (e.touches.length === 2) {
        // Pinch start
        e.preventDefault();
        e.stopPropagation();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        g.startDist = Math.hypot(dx, dy);
        g.startScale = scale;
        g.startMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        g.startMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        g.startTransX = translate.x;
        g.startTransY = translate.y;
        g.isPinching = true;
        g.isPanning = false;
      } else if (e.touches.length === 1 && scale > 1) {
        // Pan start (only when zoomed)
        e.stopPropagation();
        g.panStartX = e.touches[0].clientX - translate.x;
        g.panStartY = e.touches[0].clientY - translate.y;
        g.isPanning = true;
        g.isPinching = false;
      }

      // Double-tap detection
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - g.lastTap < 300) {
          e.preventDefault();
          e.stopPropagation();
          if (scale > 1) {
            resetZoom();
          } else {
            const newScale = 2.5;
            // Zoom into tap point
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              const tapX = e.touches[0].clientX - rect.left - rect.width / 2;
              const tapY = e.touches[0].clientY - rect.top - rect.height / 2;
              const newTrans = clampTranslate(-tapX * 0.6, -tapY * 0.6, newScale);
              setTranslate(newTrans);
            }
            setScale(newScale);
            onZoomChange?.(true);
          }
          g.lastTap = 0;
          return;
        }
        g.lastTap = now;
      }
    },
    [scale, translate, resetZoom, clampTranslate, onZoomChange]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const g = gestureRef.current;

      if (g.isPinching && e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const newScale = Math.max(1, Math.min(5, g.startScale * (dist / g.startDist)));

        // Translate so zoom centers between the two fingers
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const offsetX = midX - g.startMidX;
        const offsetY = midY - g.startMidY;
        const newTrans = clampTranslate(
          g.startTransX + offsetX,
          g.startTransY + offsetY,
          newScale
        );

        setScale(newScale);
        setTranslate(newTrans);
        onZoomChange?.(newScale > 1);
      } else if (g.isPanning && e.touches.length === 1 && scale > 1) {
        e.preventDefault();
        e.stopPropagation();
        const tx = e.touches[0].clientX - g.panStartX;
        const ty = e.touches[0].clientY - g.panStartY;
        setTranslate(clampTranslate(tx, ty, scale));
      }
    },
    [scale, clampTranslate, onZoomChange]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const g = gestureRef.current;

      if (g.isPinching && e.touches.length < 2) {
        g.isPinching = false;
        // Snap back if scale is near 1
        if (scale < 1.15) {
          resetZoom();
        }
      }

      if (g.isPanning && e.touches.length === 0) {
        g.isPanning = false;
      }
    },
    [scale, resetZoom]
  );

  const isZoomed = scale > 1;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ touchAction: isZoomed ? "none" : "auto", zIndex: 2 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={className}
        style={{
          ...style,
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: isZoomed ? "none" : "transform 0.2s ease-out",
          willChange: "transform",
        }}
        loading={loading}
        decoding={decoding}
        draggable={false}
      />
    </div>
  );
}
