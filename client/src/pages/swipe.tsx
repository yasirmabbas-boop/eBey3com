import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
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
  ChevronUp, 
  ChevronDown, 
  Heart, 
  MessageCircle, 
  Share2, 
  Gavel, 
  ShoppingBag,
  Send,
  X,
  User,
  ArrowRight,
  Loader2
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

export default function SwipePage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const categoryParam = params.get("category");
  const startId = params.get("id");
  
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  
  const { data: listingsData, isLoading } = useQuery({
    queryKey: ["/api/listings", categoryParam],
    queryFn: async () => {
      let url = "/api/listings?limit=50";
      if (categoryParam) url += `&category=${categoryParam}`;
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
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`
        },
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
    if (currentIndex < listings.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, listings.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
          <p className="text-muted-foreground">لا توجد منتجات</p>
          <Link href="/search">
            <Button variant="outline" className="mt-4">العودة للتصفح</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-black text-white relative overflow-hidden"
      data-testid="swipe-container"
    >
      {/* Exit button */}
      <Link href={`/product/${currentListing?.id}`}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 left-4 z-50 text-white hover:bg-white/20"
          data-testid="button-exit-swipe"
        >
          <X className="w-6 h-6" />
        </Button>
      </Link>

      {/* Navigation arrows */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="text-white hover:bg-white/20 disabled:opacity-30"
          data-testid="button-prev-product"
        >
          <ChevronUp className="w-8 h-8" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={goToNext}
          disabled={currentIndex >= listings.length - 1}
          className="text-white hover:bg-white/20 disabled:opacity-30"
          data-testid="button-next-product"
        >
          <ChevronDown className="w-8 h-8" />
        </Button>
      </div>

      {/* Product image */}
      <div className="absolute inset-0 flex items-center justify-center">
        {currentListing?.images?.[0] && (
          <img 
            src={currentListing.images[0]} 
            alt={currentListing.title}
            className="max-w-full max-h-full object-contain"
            data-testid="img-product-swipe"
          />
        )}
      </div>

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

      {/* Right side actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-40">
        <FavoriteButton 
          listingId={currentListing?.id || ""} 
        />
        
        <Sheet open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 flex flex-col items-center gap-1"
              data-testid="button-open-comments"
            >
              <MessageCircle className="w-7 h-7" />
              <span className="text-xs">{comments.length}</span>
            </Button>
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
                <Link href="/auth">
                  <Button variant="outline" className="w-full">سجل دخولك للتعليق</Button>
                </Link>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20"
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: currentListing?.title,
                url: window.location.origin + `/product/${currentListing?.id}`
              });
            }
          }}
          data-testid="button-share"
        >
          <Share2 className="w-7 h-7" />
        </Button>
      </div>

      {/* Product info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-30">
        <div className="max-w-lg">
          {/* Seller info */}
          <Link href={`/search?sellerId=${currentListing?.sellerId}`}>
            <div className="flex items-center gap-2 mb-3">
              <Avatar className="w-10 h-10 border-2 border-white">
                <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
              </Avatar>
              <span className="font-medium">{currentListing?.sellerName}</span>
            </div>
          </Link>

          {/* Title and price */}
          <h2 className="text-xl font-bold mb-2 line-clamp-2" data-testid="text-product-title">
            {currentListing?.title}
          </h2>
          
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl font-bold text-primary">
              {(currentListing?.currentBid || currentListing?.price || 0).toLocaleString()} د.ع
            </span>
            {currentListing?.saleType === "auction" && (
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                <Gavel className="w-3 h-3 ml-1" />
                مزاد
              </Badge>
            )}
          </div>

          {/* Auction countdown */}
          {currentListing?.saleType === "auction" && currentListing?.auctionEndTime && (
            <div className="mb-4">
              <AuctionCountdown 
                endTime={currentListing.auctionEndTime} 
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Link href={`/product/${currentListing?.id}`} className="flex-1">
              <Button className="w-full" data-testid="button-view-details">
                <ArrowRight className="w-4 h-4 ml-2" />
                عرض التفاصيل
              </Button>
            </Link>
            {currentListing?.saleType === "auction" ? (
              <Link href={`/product/${currentListing?.id}#bid`}>
                <Button variant="secondary" data-testid="button-bid">
                  <Gavel className="w-4 h-4 ml-2" />
                  مزايدة
                </Button>
              </Link>
            ) : (
              <Link href={`/product/${currentListing?.id}#buy`}>
                <Button variant="secondary" data-testid="button-buy">
                  <ShoppingBag className="w-4 h-4 ml-2" />
                  شراء
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="absolute top-4 right-4 z-50 text-white/70 text-sm">
        {currentIndex + 1} / {listings.length}
      </div>
    </div>
  );
}
