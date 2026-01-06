import { useState, useEffect, useRef, useCallback } from "react";
import { useSearch, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { AuctionCountdown } from "@/components/auction-countdown";
import { FavoriteButton } from "@/components/favorite-button";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Gavel, 
  ShoppingBag,
  Send,
  User,
  ArrowLeft,
  Loader2,
  Watch,
  Smartphone,
  Shirt,
  Armchair,
  Car,
  Home,
  Package,
  Grid3X3
} from "lucide-react";
import type { Listing } from "@shared/schema";

interface ProductComment {
  id: string;
  listingId: string;
  userId: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  userName: string;
  userAvatar: string | null;
}

const CATEGORIES = [
  { id: null, name: "الكل", icon: Grid3X3 },
  { id: "ساعات", name: "ساعات", icon: Watch },
  { id: "إلكترونيات", name: "إلكترونيات", icon: Smartphone },
  { id: "ملابس", name: "ملابس", icon: Shirt },
  { id: "تحف وأثاث", name: "أثاث", icon: Armchair },
  { id: "سيارات", name: "سيارات", icon: Car },
  { id: "عقارات", name: "عقارات", icon: Home },
  { id: "أخرى", name: "أخرى", icon: Package },
];

export default function SwipePage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialCategory = params.get("category");
  const startId = params.get("id");
  
  const { user, isAuthenticated } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const { data: listingsData, isLoading } = useQuery({
    queryKey: ["/api/listings", selectedCategory],
    queryFn: async () => {
      let url = "/api/listings?limit=50";
      if (selectedCategory) url += `&category=${selectedCategory}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
  });

  const listings: Listing[] = Array.isArray(listingsData) 
    ? listingsData 
    : (listingsData?.listings || []);

  useEffect(() => {
    if (startId && listings.length > 0) {
      const index = listings.findIndex(l => l.id === startId);
      if (index >= 0) setCurrentIndex(index);
    }
  }, [startId, listings]);

  useEffect(() => {
    setCurrentIndex(0);
    setCurrentImageIndex(0);
  }, [selectedCategory]);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [currentIndex]);

  const currentListing = listings[currentIndex];

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["/api/comments", currentListing?.id],
    queryFn: async () => {
      if (!currentListing?.id) return [];
      const res = await fetch(`/api/comments/${currentListing.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentListing?.id,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          listingId: currentListing.id,
          userId: user?.id,
          content,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add comment");
      }
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      refetchComments();
    },
  });

  const goToNext = useCallback(() => {
    if (currentIndex < listings.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentIndex, listings.length, isTransitioning]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev - 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentIndex, isTransitioning]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") goToNext();
      if (e.key === "ArrowUp" || e.key === "k") goToPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      startTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      const diffY = startY - endY;
      const timeDiff = Date.now() - startTime;
      
      if (Math.abs(diffY) > 50 && timeDiff < 300) {
        if (diffY > 0) goToNext();
        else goToPrev();
      }
    };

    container.addEventListener("touchstart", handleTouchStart);
    container.addEventListener("touchend", handleTouchEnd);
    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [goToNext, goToPrev]);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !isAuthenticated) return;
    addCommentMutation.mutate(commentText.trim());
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `منذ ${diffDays} يوم`;
    if (diffHours > 0) return `منذ ${diffHours} ساعة`;
    if (diffMins > 0) return `منذ ${diffMins} دقيقة`;
    return "الآن";
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: currentListing?.title,
        url: window.location.origin + `/product/${currentListing?.id}`
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Category filter */}
        <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 p-3 min-w-max" dir="rtl">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.id || "all"}
                  variant={selectedCategory === cat.id ? "default" : "ghost"}
                  size="sm"
                  className={`shrink-0 gap-1.5 rounded-full whitespace-nowrap ${
                    selectedCategory === cat.id 
                      ? "bg-white text-black" 
                      : "text-white hover:bg-white/20"
                  }`}
                  onClick={() => setSelectedCategory(cat.id)}
                  data-testid={`filter-${cat.id || "all"}`}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <p className="text-white/70 mb-4">لا توجد منتجات في هذه الفئة</p>
          <Button 
            variant="outline" 
            className="border-white/30 text-white hover:bg-white/20"
            onClick={() => setSelectedCategory(null)}
          >
            عرض كل المنتجات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-black text-white flex flex-col"
      data-testid="swipe-container"
    >
      {/* Category filter bar */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 p-3 min-w-max" dir="rtl">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.id || "all"}
                variant={selectedCategory === cat.id ? "default" : "ghost"}
                size="sm"
                className={`shrink-0 gap-1.5 rounded-full whitespace-nowrap ${
                  selectedCategory === cat.id 
                    ? "bg-white text-black" 
                    : "text-white hover:bg-white/20"
                }`}
                onClick={() => setSelectedCategory(cat.id)}
                data-testid={`filter-${cat.id || "all"}`}
              >
                <cat.icon className="h-4 w-4" />
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Product images carousel */}
        <div 
          className={`absolute inset-0 transition-opacity duration-300 ${
            isTransitioning ? "opacity-50" : "opacity-100"
          }`}
        >
          {currentListing?.images && currentListing.images.length > 0 ? (
            <div className="relative w-full h-full">
              {/* Current image */}
              <img 
                src={currentListing.images[currentImageIndex] || currentListing.images[0]} 
                alt={currentListing.title}
                className="w-full h-full object-cover"
                data-testid="img-product-swipe"
              />
              
              {/* Image navigation - tap left/right areas */}
              {currentListing.images.length > 1 && (
                <>
                  {/* Tap left for previous */}
                  <button
                    className="absolute left-0 top-0 w-1/3 h-2/3 z-20"
                    onClick={() => setCurrentImageIndex(prev => 
                      prev > 0 ? prev - 1 : currentListing.images!.length - 1
                    )}
                    data-testid="button-prev-image"
                  />
                  {/* Tap right for next */}
                  <button
                    className="absolute right-0 top-0 w-1/3 h-2/3 z-20"
                    onClick={() => setCurrentImageIndex(prev => 
                      prev < currentListing.images!.length - 1 ? prev + 1 : 0
                    )}
                    data-testid="button-next-image"
                  />
                  
                  {/* Image dots indicator */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
                    {currentListing.images.map((_, idx) => (
                      <button
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === currentImageIndex 
                            ? "bg-white w-4" 
                            : "bg-white/50"
                        }`}
                        onClick={() => setCurrentImageIndex(idx)}
                        data-testid={`image-dot-${idx}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <Package className="w-20 h-20 text-gray-600" />
            </div>
          )}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

        {/* Right side action buttons */}
        <div className="absolute left-3 bottom-44 flex flex-col items-center gap-5 z-40">
          {/* Favorite button */}
          <div className="flex flex-col items-center">
            <FavoriteButton 
              listingId={currentListing?.id || ""} 
            />
          </div>
          
          {/* Comments button */}
          <Sheet open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
            <SheetTrigger asChild>
              <button 
                className="flex flex-col items-center gap-1"
                data-testid="button-open-comments"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-white font-medium">{comments.length}</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
              <SheetHeader>
                <SheetTitle className="text-right">التعليقات ({comments.length})</SheetTitle>
              </SheetHeader>
              
              <ScrollArea className="h-[calc(100%-120px)] mt-4">
                {comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد تعليقات بعد</p>
                ) : (
                  <div className="space-y-4">
                    {(comments as ProductComment[]).map((comment) => (
                      <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.userAvatar || undefined} />
                          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{comment.userName}</span>
                            <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.createdAt)}</span>
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {isAuthenticated ? (
                <form onSubmit={handleSubmitComment} className="absolute bottom-4 left-4 right-4 flex gap-2">
                  <Input 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="اكتب تعليقاً..."
                    className="flex-1"
                    data-testid="input-comment"
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    data-testid="button-submit-comment"
                  >
                    {addCommentMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              ) : (
                <div className="absolute bottom-4 left-4 right-4 text-center">
                  <Link href="/signin">
                    <Button variant="outline" className="w-full">سجل دخولك للتعليق</Button>
                  </Link>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Share button */}
          <button 
            className="flex flex-col items-center gap-1"
            onClick={handleShare}
            data-testid="button-share"
          >
            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-white font-medium">مشاركة</span>
          </button>
        </div>

        {/* Bottom product info */}
        <div className="absolute bottom-0 right-0 left-16 p-4 pb-20 z-30" dir="rtl">
          {/* Seller info */}
          <Link href={`/search?sellerId=${currentListing?.sellerId}`}>
            <div className="flex items-center gap-2 mb-3">
              <Avatar className="w-9 h-9 border-2 border-white">
                <AvatarFallback className="bg-gray-700"><User className="w-4 h-4" /></AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm">{currentListing?.sellerName}</span>
            </div>
          </Link>

          {/* Title */}
          <h2 className="text-base font-bold mb-2 line-clamp-2" data-testid="text-product-title">
            {currentListing?.title}
          </h2>
          
          {/* Price and badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl font-bold text-white">
              {(currentListing?.currentBid || currentListing?.price || 0).toLocaleString()} د.ع
            </span>
            {currentListing?.saleType === "auction" && (
              <Badge className="bg-red-500 text-white text-xs">
                <Gavel className="w-3 h-3 ml-1" />
                مزاد
              </Badge>
            )}
          </div>

          {/* Auction countdown */}
          {currentListing?.saleType === "auction" && currentListing?.auctionEndTime && (
            <div className="mb-3">
              <AuctionCountdown endTime={currentListing.auctionEndTime} />
            </div>
          )}

          {/* Action button */}
          <Link href={`/product/${currentListing?.id}`}>
            <Button 
              className="w-full bg-white text-black hover:bg-gray-200"
              data-testid="button-view-details"
            >
              {currentListing?.saleType === "auction" ? (
                <>
                  <Gavel className="w-4 h-4 ml-2" />
                  مزايدة الآن
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 ml-2" />
                  شراء الآن
                </>
              )}
            </Button>
          </Link>
        </div>

        {/* Progress indicator */}
        <div className="absolute top-3 left-3 z-50 bg-black/40 backdrop-blur px-2 py-1 rounded-full">
          <span className="text-white/80 text-xs">{currentIndex + 1} / {listings.length}</span>
        </div>

        {/* Back button */}
        <Link href="/">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-3 right-3 z-50 text-white hover:bg-white/20"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
