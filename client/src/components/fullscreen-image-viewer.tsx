import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

interface FullscreenImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex: number;
  onIndexChange: (index: number) => void;
  title: string;
}

interface Position {
  x: number;
  y: number;
}

interface TouchState {
  startDistance: number;
  lastScale: number;
  startPosition: Position;
  lastPosition: Position;
  isSingleTouch: boolean;
  touchStartTime: number;
  swipeStart: Position;
  swipeLast: Position;
}

function getDistance(touches: React.TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getMidpoint(touches: React.TouchList): Position {
  if (touches.length < 2) {
    return { x: touches[0].clientX, y: touches[0].clientY };
  }
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

export function FullscreenImageViewer({
  isOpen,
  onClose,
  images,
  initialIndex,
  onIndexChange,
  title,
}: FullscreenImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStateRef = useRef<TouchState>({
    startDistance: 0,
    lastScale: 1,
    startPosition: { x: 0, y: 0 },
    lastPosition: { x: 0, y: 0 },
    isSingleTouch: false,
    touchStartTime: 0,
    swipeStart: { x: 0, y: 0 },
    swipeLast: { x: 0, y: 0 },
  });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const resetZoom = useCallback(() => {
    setIsTransitioning(true);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    touchStateRef.current.lastScale = 1;
    touchStateRef.current.lastPosition = { x: 0, y: 0 };
    setTimeout(() => setIsTransitioning(false), 200);
  }, []);

  useEffect(() => {
    resetZoom();
  }, [initialIndex, resetZoom]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isOpen]);

  const goToPrev = useCallback(() => {
    if (scale > 1) {
      resetZoom();
    }
    onIndexChange(initialIndex === 0 ? images.length - 1 : initialIndex - 1);
  }, [initialIndex, images.length, onIndexChange, scale, resetZoom]);

  const goToNext = useCallback(() => {
    if (scale > 1) {
      resetZoom();
    }
    onIndexChange(initialIndex === images.length - 1 ? 0 : initialIndex + 1);
  }, [initialIndex, images.length, onIndexChange, scale, resetZoom]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;
    touchStateRef.current.touchStartTime = Date.now();
    
    if (touches.length === 2) {
      touchStateRef.current.startDistance = getDistance(touches);
      touchStateRef.current.lastScale = scale;
      touchStateRef.current.isSingleTouch = false;
    } else if (touches.length === 1) {
      touchStateRef.current.startPosition = {
        x: touches[0].clientX - position.x,
        y: touches[0].clientY - position.y,
      };
      touchStateRef.current.lastPosition = position;
      touchStateRef.current.swipeStart = { x: touches[0].clientX, y: touches[0].clientY };
      touchStateRef.current.swipeLast = { x: touches[0].clientX, y: touches[0].clientY };
      touchStateRef.current.isSingleTouch = true;
    }
  }, [images.length, goToNext, goToPrev, position, scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;
    
    if (touches.length === 2) {
      const currentDistance = getDistance(touches);
      const scaleRatio = currentDistance / touchStateRef.current.startDistance;
      let newScale = touchStateRef.current.lastScale * scaleRatio;
      
      newScale = Math.max(0.5, Math.min(5, newScale));
      setScale(newScale);
      touchStateRef.current.isSingleTouch = false;
    } else if (touches.length === 1 && scale > 1) {
      const newX = touches[0].clientX - touchStateRef.current.startPosition.x;
      const newY = touches[0].clientY - touchStateRef.current.startPosition.y;
      
      const maxOffset = (scale - 1) * 150;
      const clampedX = Math.max(-maxOffset, Math.min(maxOffset, newX));
      const clampedY = Math.max(-maxOffset, Math.min(maxOffset, newY));
      
      setPosition({ x: clampedX, y: clampedY });
    } else if (touches.length === 1 && scale === 1) {
      // Track finger movement for swipe navigation when not zoomed.
      touchStateRef.current.swipeLast = { x: touches[0].clientX, y: touches[0].clientY };
    }
  }, [scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchDuration = Date.now() - touchStateRef.current.touchStartTime;
    
    if (scale < 1) {
      setIsTransitioning(true);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      touchStateRef.current.lastScale = 1;
      touchStateRef.current.lastPosition = { x: 0, y: 0 };
      setTimeout(() => setIsTransitioning(false), 200);
    } else {
      touchStateRef.current.lastScale = scale;
      touchStateRef.current.lastPosition = position;
    }
    
    if (touchStateRef.current.isSingleTouch && touchDuration < 200 && scale === 1) {
      const remainingTouches = e.touches.length;
      if (remainingTouches === 0) {
        // Could be a tap - but we don't want to close on image tap
      }
    }

    // Swipe navigation (only when not zoomed, single touch ended)
    if (
      images.length > 1 &&
      scale === 1 &&
      touchStateRef.current.isSingleTouch &&
      e.touches.length === 0
    ) {
      const start = touchStateRef.current.swipeStart;
      const last = touchStateRef.current.swipeLast;
      const dx = last.x - start.x;
      const dy = last.y - start.y;

      const SWIPE_X_THRESHOLD = 60;
      const SWIPE_Y_TOLERANCE = 60;
      const MAX_SWIPE_DURATION_MS = 900;

      if (
        Math.abs(dx) >= SWIPE_X_THRESHOLD &&
        Math.abs(dy) <= SWIPE_Y_TOLERANCE &&
        touchDuration <= MAX_SWIPE_DURATION_MS
      ) {
        // Natural gesture: swipe left -> next, swipe right -> previous.
        if (dx < 0) {
          goToNext();
        } else {
          goToPrev();
        }
      }
    }
  }, [scale, position]);

  const handleDoubleTap = useCallback(() => {
    if (scale > 1) {
      resetZoom();
    } else {
      setIsTransitioning(true);
      setScale(2.5);
      touchStateRef.current.lastScale = 2.5;
      setTimeout(() => setIsTransitioning(false), 200);
    }
  }, [scale, resetZoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    let newScale = scale * delta;
    newScale = Math.max(1, Math.min(5, newScale));
    
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
    
    setScale(newScale);
    touchStateRef.current.lastScale = newScale;
  }, [scale]);

  const handleClose = useCallback(() => {
    resetZoom();
    onClose();
  }, [onClose, resetZoom]);

  if (!isOpen) return null;

  const currentImage = images[initialIndex] || images[0];

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        backgroundColor: '#000',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        touchAction: 'none',
      }}
      onClick={handleClose}
    >
      {/* Close button */}
      <button 
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#fff',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
        }}
        onClick={handleClose}
        data-testid="button-close-fullscreen"
      >
        ✕
      </button>
      
      {/* Image counter */}
      {images.length > 1 && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '14px',
          zIndex: 100000,
        }}>
          {initialIndex + 1} / {images.length}
        </div>
      )}

      {/* Zoom indicator */}
      {scale > 1 && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          zIndex: 100000,
        }}>
          {Math.round(scale * 100)}%
        </div>
      )}
      
      {/* Image container with pinch-to-zoom */}
      <div
        ref={imageContainerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          touchAction: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleTap}
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={currentImage}
          alt={title}
          draggable={false}
          style={{
            maxWidth: 'calc(100vw - 80px)',
            maxHeight: 'calc(100dvh - 140px)',
            objectFit: 'contain',
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isTransitioning ? 'transform 0.2s ease-out' : 'none',
            transformOrigin: 'center center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'none',
          }}
          data-testid="img-fullscreen"
        />
      </div>
      
      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button 
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: '#fff',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100000,
              opacity: scale > 1 ? 0.3 : 1,
            }}
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            data-testid="button-fullscreen-prev"
          >
            ‹
          </button>
          <button 
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: '#fff',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100000,
              opacity: scale > 1 ? 0.3 : 1,
            }}
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            data-testid="button-fullscreen-next"
          >
            ›
          </button>
        </>
      )}
      
      {/* Thumbnail strip at bottom */}
      {images.length > 1 && (
        <div 
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '8px',
            borderRadius: '12px',
            maxWidth: '90vw',
            overflowX: 'auto',
            zIndex: 100000,
            opacity: scale > 1 ? 0.3 : 1,
            transition: 'opacity 0.2s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <div 
              key={i}
              onClick={() => {
                if (scale > 1) resetZoom();
                onIndexChange(i);
              }}
              style={{
                width: '56px',
                height: '56px',
                flexShrink: 0,
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: initialIndex === i ? '2px solid #fff' : '2px solid transparent',
                opacity: initialIndex === i ? 1 : 0.6,
              }}
              data-testid={`fullscreen-thumbnail-${i}`}
            >
              <img src={img} alt={`صورة ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}

      {/* Double-tap hint (shows briefly) */}
      {scale === 1 && (
        <div style={{
          position: 'absolute',
          bottom: images.length > 1 ? '100px' : '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.5)',
          color: 'rgba(255,255,255,0.7)',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '11px',
          zIndex: 100000,
        }}>
          انقر مرتين للتكبير • اسحب للتنقل
        </div>
      )}
    </div>,
    document.body
  );
}
