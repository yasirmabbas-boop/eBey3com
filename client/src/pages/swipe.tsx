import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearch, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useNavVisibility } from "@/hooks/use-nav-visibility";
import { useLanguage } from "@/lib/i18n";
import { AuctionCountdown } from "@/components/auction-countdown";
import { FavoriteButton } from "@/components/favorite-button";
import { 
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
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  Check,
  Tag
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

const getCategoriesForLang = (lang: "ar" | "ku") => [
  { id: null, name: lang === "ar" ? "الكل" : "هەموو", icon: Grid3X3 },
  { id: "ساعات", name: lang === "ar" ? "ساعات" : "کاتژمێر", icon: Watch },
  { id: "إلكترونيات", name: lang === "ar" ? "إلكترونيات" : "ئەلیکترۆنی", icon: Smartphone },
  { id: "ملابس", name: lang === "ar" ? "ملابس" : "جلوبەرگ", icon: Shirt },
  { id: "تحف وأثاث", name: lang === "ar" ? "أثاث" : "کەلوپەل", icon: Armchair },
  { id: "سيارات", name: lang === "ar" ? "سيارات" : "ئۆتۆمبێل", icon: Car },
  { id: "عقارات", name: lang === "ar" ? "عقارات" : "خانوبەرە", icon: Home },
  { id: "أخرى", name: lang === "ar" ? "أخرى" : "تر", icon: Package },
];

const getSaleFiltersForLang = (lang: "ar" | "ku") => [
  { id: null, name: lang === "ar" ? "الكل" : "هەموو" },
  { id: "auction", name: lang === "ar" ? "مزادات" : "مزایدە" },
  { id: "fixed", name: lang === "ar" ? "شراء فوري" : "کڕینی یەکجار" },
  { id: "new", name: lang === "ar" ? "جديد" : "نوێ" },
];

export default function SwipePage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialCategory = params.get("category");
  const startId = params.get("id");
  
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { showNav, hideNav } = useNavVisibility();
  const { language, t } = useLanguage();
  
  const CATEGORIES = getCategoriesForLang(language);
  const SALE_FILTERS = getSaleFiltersForLang(language);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'up' | 'down' | null>(null);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [isBidOpen, setIsBidOpen] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [selectedSaleFilter, setSelectedSaleFilter] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const { data: listingsData, isLoading } = useQuery({
    queryKey: ["/api/listings", selectedCategory, selectedSaleFilter],
    queryFn: async () => {
      let url = "/api/listings?limit=50";
      if (selectedCategory) url += `&category=${selectedCategory}`;
      if (selectedSaleFilter === "auction") url += `&saleType=auction`;
      if (selectedSaleFilter === "fixed") url += `&saleType=fixed`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
  });

  // Filter for "new" items (last 7 days)
  const filteredListings = React.useMemo(() => {
    let items: Listing[] = Array.isArray(listingsData) 
      ? listingsData 
      : (listingsData?.listings || []);
    
    if (selectedSaleFilter === "new") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      items = items.filter(item => new Date(item.createdAt) >= sevenDaysAgo);
    }
    
    return items;
  }, [listingsData, selectedSaleFilter]);

  const listings = filteredListings;

  useEffect(() => {
    if (startId && listings.length > 0) {
      const index = listings.findIndex(l => l.id === startId);
      if (index >= 0) setCurrentIndex(index);
    }
  }, [startId, listings]);

  useEffect(() => {
    setCurrentIndex(0);
    setCurrentImageIndex(0);
  }, [selectedCategory, selectedSaleFilter]);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      showNav();
    };
  }, [showNav]);

  const currentListing = listings[currentIndex];
  const nextListing = listings[currentIndex + 1];
  const prevListing = listings[currentIndex - 1];

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
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
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

  const placeBidMutation = useMutation({
    mutationFn: async (amount: number) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        credentials: "include",
        body: JSON.stringify({
          listingId: currentListing.id,
          amount,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "فشل في تقديم المزايدة");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsBidOpen(false);
      setBidAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({
        title: "تم تقديم المزايدة بنجاح!",
        description: `مزايدتك بقيمة ${Number(bidAmount).toLocaleString()} د.ع تم تسجيلها`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendOfferMutation = useMutation({
    mutationFn: async (amount: number) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        credentials: "include",
        body: JSON.stringify({
          listingId: currentListing.id,
          offerAmount: amount,
          message: `عرض سعر من صفحة التصفح`,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "فشل في إرسال العرض");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsOfferOpen(false);
      setOfferAmount("");
      toast({
        title: "تم إرسال العرض بنجاح!",
        description: `عرضك بقيمة ${Number(offerAmount).toLocaleString()} د.ع تم إرساله للبائع`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePlaceBid = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(bidAmount);
    if (!amount || amount <= 0) return;
    placeBidMutation.mutate(amount);
  };

  const handleSendOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(offerAmount);
    if (!amount || amount <= 0) return;
    sendOfferMutation.mutate(amount);
  };

  const goToNext = useCallback(() => {
    if (isTransitioning || currentIndex >= listings.length - 1) return;
    setIsTransitioning(true);
    setSlideDirection('up');
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setSlideDirection(null);
      setIsTransitioning(false);
    }, 300);
  }, [currentIndex, listings.length, isTransitioning]);

  const goToPrev = useCallback(() => {
    if (isTransitioning || currentIndex <= 0) return;
    setIsTransitioning(true);
    setSlideDirection('down');
    setTimeout(() => {
      setCurrentIndex(prev => prev - 1);
      setSlideDirection(null);
      setIsTransitioning(false);
    }, 300);
    if (currentIndex <= 1) {
      showNav();
    }
  }, [currentIndex, showNav, isTransitioning]);

  const nextImage = useCallback(() => {
    if (currentListing?.images && currentListing.images.length > 1) {
      setCurrentImageIndex(prev => 
        prev < currentListing.images!.length - 1 ? prev + 1 : 0
      );
    }
  }, [currentListing]);

  const prevImage = useCallback(() => {
    if (currentListing?.images && currentListing.images.length > 1) {
      setCurrentImageIndex(prev => 
        prev > 0 ? prev - 1 : currentListing.images!.length - 1
      );
    }
  }, [currentListing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") goToNext();
      if (e.key === "ArrowUp" || e.key === "k") goToPrev();
      if (e.key === "ArrowLeft") nextImage();
      if (e.key === "ArrowRight") prevImage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, nextImage, prevImage]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = touchStart.x - endX;
    const diffY = touchStart.y - endY;
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > 80) {
        if (diffX > 0) nextImage();
        else prevImage();
      }
    } else {
      if (Math.abs(diffY) > 100) {
        if (diffY > 0) {
          goToNext();
          hideNav();
        } else {
          goToPrev();
          showNav();
        }
      }
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !isAuthenticated || !user?.id) return;
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

  if (listings.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
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
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-hide border-t border-white/5">
            <div className="flex gap-2 px-3 py-2 min-w-max" dir="rtl">
              {SALE_FILTERS.map((filter) => (
                <button
                  key={filter.id || "all-sales"}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedSaleFilter === filter.id 
                      ? "bg-blue-500 text-white" 
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                  onClick={() => setSelectedSaleFilter(selectedSaleFilter === filter.id ? null : filter.id)}
                >
                  {filter.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="h-24 shrink-0"></div>
        
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <p className="text-white/70 mb-4">لا توجد منتجات مطابقة للفلاتر المحددة</p>
          <Button 
            className="bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => { setSelectedCategory(null); setSelectedSaleFilter(null); }}
          >
            إعادة تعيين الفلاتر
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <div 
        ref={containerRef}
        className="w-full max-w-md min-h-screen bg-black text-white flex flex-col overflow-hidden relative"
        data-testid="swipe-container"
      >
      {/* Category filter bar - fixed at top */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
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
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                data-testid={`filter-${cat.id || "all"}`}
              >
                <cat.icon className="h-4 w-4" />
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
        {/* Sale type filters */}
        <div className="overflow-x-auto scrollbar-hide border-t border-white/5">
          <div className="flex gap-2 px-3 py-2 min-w-max" dir="rtl">
            {SALE_FILTERS.map((filter) => (
              <button
                key={filter.id || "all-sales"}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedSaleFilter === filter.id 
                    ? "bg-blue-500 text-white" 
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
                onClick={() => setSelectedSaleFilter(selectedSaleFilter === filter.id ? null : filter.id)}
                data-testid={`sale-filter-${filter.id || "all"}`}
              >
                {filter.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-24 shrink-0"></div>

      {/* Main content area with slide animation */}
      <div 
        ref={imageContainerRef}
        className="flex-1 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Previous product peek (top) */}
        {prevListing && (
          <div 
            className={`absolute inset-x-0 -top-full h-full transition-transform duration-300 ease-out ${
              slideDirection === 'down' ? 'translate-y-full' : ''
            }`}
          >
            {prevListing.images?.[0] && (
              <img 
                src={prevListing.images[0]} 
                alt={prevListing.title}
                className="w-full h-full object-cover opacity-50"
              />
            )}
          </div>
        )}

        {/* Current product */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-out ${
            slideDirection === 'up' ? '-translate-y-full' : 
            slideDirection === 'down' ? 'translate-y-full' : ''
          }`}
        >
          {/* Image carousel */}
          {currentListing?.images && currentListing.images.length > 0 ? (
            <div className="relative w-full h-full">
              <img 
                src={currentListing.images[currentImageIndex] || currentListing.images[0]} 
                alt={currentListing.title}
                className="w-full h-full object-cover transition-opacity duration-200"
                data-testid="img-product-swipe"
              />
              
              {/* Image navigation arrows */}
              {currentListing.images.length > 1 && (
                <>
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center z-20"
                    onClick={prevImage}
                    data-testid="button-prev-image"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center z-20"
                    onClick={nextImage}
                    data-testid="button-next-image"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                  
                  {/* Image dots */}
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
                    {currentListing.images.map((_, idx) => (
                      <button
                        key={idx}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === currentImageIndex 
                            ? "bg-white w-6" 
                            : "bg-white/50 w-1.5"
                        }`}
                        onClick={() => setCurrentImageIndex(idx)}
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

        {/* Next product peek (bottom) */}
        {nextListing && (
          <div 
            className={`absolute inset-x-0 top-full h-full transition-transform duration-400 ease-out ${
              slideDirection === 'up' ? '-translate-y-full' : ''
            }`}
          >
            {nextListing.images?.[0] && (
              <img 
                src={nextListing.images[0]} 
                alt={nextListing.title}
                className="w-full h-full object-cover opacity-50"
              />
            )}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-10" />

        {/* Right side action buttons */}
        <div className="absolute left-3 bottom-44 flex flex-col items-center gap-5 z-40">
          <FavoriteButton listingId={currentListing?.id || ""} />
          
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
              
              <ScrollArea className="h-[calc(100%-140px)] mt-4">
                {comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد تعليقات بعد. كن أول من يعلق!</p>
                ) : (
                  <div className="space-y-4 pr-2">
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

              <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 bg-background border-t" style={{ zIndex: 100000 }}>
                {isAuthenticated && user ? (
                  <form onSubmit={handleSubmitComment} className="flex gap-2">
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
                  <Link href="/signin">
                    <Button variant="outline" className="w-full">سجل دخولك للتعليق</Button>
                  </Link>
                )}
              </div>
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
          <Link href={`/search?sellerId=${currentListing?.sellerId}`}>
            <div className="flex items-center gap-2 mb-3">
              <Avatar className="w-9 h-9 border-2 border-white">
                <AvatarFallback className="bg-gray-700"><User className="w-4 h-4" /></AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm">{currentListing?.sellerName}</span>
            </div>
          </Link>

          <h2 className="text-base font-bold mb-2 line-clamp-2" data-testid="text-product-title">
            {currentListing?.title}
          </h2>
          
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

          {currentListing?.saleType === "auction" && currentListing?.auctionEndTime && (
            <div className="mb-3">
              <AuctionCountdown endTime={currentListing.auctionEndTime} />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {currentListing?.saleType === "auction" ? (
              <Button 
                className="flex-1 bg-white text-black hover:bg-gray-200"
                onClick={() => isAuthenticated ? setIsBidOpen(true) : null}
                data-testid="button-quick-bid"
              >
                <Gavel className="w-4 h-4 ml-2" />
                مزايدة
              </Button>
            ) : (
              <Button 
                className="flex-1 bg-white text-black hover:bg-gray-200"
                onClick={() => isAuthenticated ? setIsOfferOpen(true) : null}
                data-testid="button-quick-offer"
              >
                <Tag className="w-4 h-4 ml-2" />
                قدم عرض
              </Button>
            )}
            <Link href={`/product/${currentListing?.id}`}>
              <Button 
                variant="outline"
                className="border-white/50 text-white hover:bg-white/20"
                data-testid="button-view-details"
              >
                التفاصيل
              </Button>
            </Link>
          </div>

          {/* Not logged in message */}
          {!isAuthenticated && (
            <Link href="/signin">
              <p className="text-center text-white/70 text-xs mt-2 underline">سجل دخولك للمزايدة أو تقديم عرض</p>
            </Link>
          )}
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

      {/* Bid Dialog */}
      <Dialog open={isBidOpen} onOpenChange={setIsBidOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl" style={{ zIndex: 100001 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5" />
              مزايدة سريعة
            </DialogTitle>
            <DialogDescription>
              السعر الحالي: {(currentListing?.currentBid || currentListing?.price || 0).toLocaleString()} د.ع
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePlaceBid} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">مبلغ المزايدة (د.ع)</label>
              <Input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`أدخل مبلغ أعلى من ${((currentListing?.currentBid || currentListing?.price || 0) + 1000).toLocaleString()}`}
                className="text-lg"
                min={(currentListing?.currentBid || currentListing?.price || 0) + 1000}
                data-testid="input-bid-amount"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={!bidAmount || placeBidMutation.isPending}
                data-testid="button-confirm-bid"
              >
                {placeBidMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Check className="w-4 h-4 ml-2" />
                )}
                تأكيد المزايدة
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsBidOpen(false)}>
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Offer Dialog */}
      <Dialog open={isOfferOpen} onOpenChange={setIsOfferOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl" style={{ zIndex: 100001 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              تقديم عرض سعر
            </DialogTitle>
            <DialogDescription>
              السعر المطلوب: {(currentListing?.price || 0).toLocaleString()} د.ع
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendOffer} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">عرضك (د.ع)</label>
              <Input
                type="number"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="أدخل المبلغ الذي تريد دفعه"
                className="text-lg"
                data-testid="input-offer-amount"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              سيتم إرسال عرضك للبائع كرسالة. سيتواصل معك البائع إذا وافق على العرض.
            </p>
            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={!offerAmount || sendOfferMutation.isPending}
                data-testid="button-confirm-offer"
              >
                {sendOfferMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Send className="w-4 h-4 ml-2" />
                )}
                إرسال العرض
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsOfferOpen(false)}>
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
