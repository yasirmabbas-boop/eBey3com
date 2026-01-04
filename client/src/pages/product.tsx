import { useState, useEffect, useRef, useCallback } from "react";
import type { CarouselApi } from "@/components/ui/carousel";
import { FullscreenImageViewer } from "@/components/fullscreen-image-viewer";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Clock, ShieldCheck, Heart, Share2, Star, Banknote, Truck, RotateCcw, Tag, Printer, Loader2, Send, Trophy, AlertCircle, Eye, Flag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { BiddingWindow } from "@/components/bidding-window";
import { SellerTrustBadge } from "@/components/seller-trust-badge";
import { ContactSeller } from "@/components/contact-seller";
import { AuctionCountdown } from "@/components/auction-countdown";
import type { Listing } from "@shared/schema";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const SIMILAR_PRODUCTS = Array.from({ length: 20 }).map((_, i) => ({
  id: `sim-${i}`,
  title: `منتج مشابه مميز ${i + 1}`,
  price: 50000 + (i * 25000),
  rating: (3 + Math.random() * 2).toFixed(1),
  bids: Math.floor(Math.random() * 50) + 5,
  timeLeft: `${Math.floor(Math.random() * 24) + 1} ساعة`,
  image: `https://images.unsplash.com/photo-${1500000000000 + (i * 1000)}?w=400&h=400&fit=crop`
}));

export default function ProductPage() {
  const [match, params] = useRoute("/product/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const { addToCart, isAdding } = useCart();
  const queryClient = useQueryClient();

  // Offer dialog state
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");

  // Guest checkout dialog state
  const [guestCheckoutOpen, setGuestCheckoutOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestAddress, setGuestAddress] = useState("");
  const [guestCity, setGuestCity] = useState("");

  // Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  // Image gallery state with carousel API for swipe support
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  // Sync carousel with selected image index
  useEffect(() => {
    if (!carouselApi) return;
    
    carouselApi.on("select", () => {
      setSelectedImageIndex(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // Update carousel when thumbnail is clicked
  const scrollToImage = useCallback((index: number) => {
    if (carouselApi) {
      carouselApi.scrollTo(index);
    }
    setSelectedImageIndex(index);
  }, [carouselApi]);

  // Live bidding state
  const [liveBidData, setLiveBidData] = useState<{
    currentBid: number;
    totalBids: number;
    bidderId: string;
    bidderName: string;
    auctionEndTime?: string;
  } | null>(null);
  const [wasOutbid, setWasOutbid] = useState(false);
  const [auctionEnded, setAuctionEnded] = useState<{
    status: "sold" | "no_bids";
    winnerId: string | null;
    winnerName: string | null;
    winningBid: number | null;
  } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const viewTracked = useRef(false);

  // Create offer mutation
  const createOfferMutation = useMutation({
    mutationFn: async (data: { listingId: string; offerAmount: number; message?: string }) => {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "فشل في إرسال العرض");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إرسال العرض",
        description: "سيتم إعلامك عندما يرد البائع على عرضك",
      });
      setOfferDialogOpen(false);
      setOfferAmount("");
      setOfferMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Guest checkout mutation
  const guestCheckoutMutation = useMutation({
    mutationFn: async (data: { 
      listingId: string; 
      guestName: string; 
      guestPhone: string; 
      guestAddress: string;
      guestCity: string;
      amount: number;
    }) => {
      const res = await fetch("/api/transactions/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "فشل في إتمام الطلب");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم الطلب بنجاح! 🎉",
        description: "سيتواصل معك البائع قريباً لتأكيد التوصيل",
      });
      setGuestCheckoutOpen(false);
      setGuestName("");
      setGuestPhone("");
      setGuestAddress("");
      setGuestCity("");
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Report listing mutation
  const reportMutation = useMutation({
    mutationFn: async (data: { targetId: string; targetType: string; reason: string; details?: string }) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "فشل في إرسال البلاغ");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إرسال البلاغ",
        description: "شكراً لمساعدتنا في الحفاظ على أمان المنصة",
      });
      setReportDialogOpen(false);
      setReportReason("");
      setReportDetails("");
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: listing, isLoading, error } = useQuery<Listing>({
    queryKey: ["/api/listings", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/listings/${params?.id}`);
      if (!res.ok) throw new Error("Listing not found");
      return res.json();
    },
    enabled: !!params?.id,
  });
  
  // Fetch seller data to get real rating info
  const { data: sellerData } = useQuery({
    queryKey: ["/api/users", listing?.sellerId],
    queryFn: async () => {
      if (!listing?.sellerId) return null;
      const res = await fetch(`/api/users/${listing.sellerId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!listing?.sellerId,
  });

  // Check if user has been outbid on page load (for auction listings)
  const { data: userBidsOnListing } = useQuery<{ hasBid: boolean; isHighest: boolean }>({
    queryKey: ["/api/listings", params?.id, "user-bid-status", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/listings/${params?.id}/user-bid-status`, {
        credentials: "include",
      });
      if (!res.ok) return { hasBid: false, isHighest: false };
      return res.json();
    },
    enabled: !!params?.id && !!user?.id && listing?.saleType === "auction",
  });

  // Set outbid status on page load if user has bid but is not highest
  useEffect(() => {
    if (userBidsOnListing?.hasBid && !userBidsOnListing?.isHighest) {
      setWasOutbid(true);
    }
  }, [userBidsOnListing]);

  const product = listing ? {
    id: listing.id,
    productCode: (listing as any).productCode || `P-${listing.id?.slice(0, 6) || "000000"}`,
    title: listing.title,
    price: listing.price,
    currentBid: listing.currentBid || undefined,
    totalBids: (listing as any).totalBids || 0,
    image: listing.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
    images: listing.images || [],
    saleType: listing.saleType as "auction" | "fixed",
    timeLeft: listing.timeLeft || undefined,
    auctionEndTime: listing.auctionEndTime,
    seller: { 
      name: listing.sellerName, 
      salesCount: sellerData?.totalSales || 0, 
      rating: sellerData?.rating || 0, 
      ratingCount: sellerData?.ratingCount || 0 
    },
    sellerName: listing.sellerName,
    sellerId: listing.sellerId,
    sellerTotalSales: sellerData?.totalSales || 0,
    sellerRating: sellerData?.rating || 0,
    sellerRatingCount: sellerData?.ratingCount || 0,
    category: listing.category,
    condition: listing.condition as "New" | "Used - Like New" | "Used - Good" | "Vintage",
    brand: (listing as any).brand || null,
    deliveryWindow: listing.deliveryWindow,
    returnPolicy: listing.returnPolicy,
    city: listing.city,
    description: listing.description,
    isNegotiable: (listing as any).isNegotiable || false,
    quantityAvailable: (listing as any).quantityAvailable || 1,
    quantitySold: (listing as any).quantitySold || 0,
    tags: listing.tags || [],
  } : null;

  // Track view when product loads - reset ref on listing change
  useEffect(() => {
    viewTracked.current = false;
  }, [params?.id]);

  useEffect(() => {
    if (listing?.id && !viewTracked.current) {
      viewTracked.current = true;
      // Only track view if viewer is not the seller
      if (!user?.id || user.id !== listing.sellerId) {
        fetch(`/api/listings/${listing.id}/view`, { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ viewerId: user?.id || null })
        }).catch(() => {});
      }
    }
  }, [listing?.id, listing?.sellerId, user?.id]);

  // WebSocket connection for live bidding
  useEffect(() => {
    if (!listing?.id || listing.saleType !== "auction") return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", listingId: listing.id }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "bid_update" && data.listingId === listing.id) {
          setLiveBidData({
            currentBid: data.currentBid,
            totalBids: data.totalBids,
            bidderId: data.bidderId,
            bidderName: data.bidderName,
            auctionEndTime: data.auctionEndTime,
          });

          // Check if current user was outbid
          if (data.previousHighBidderId === user?.id && data.bidderId !== user?.id) {
            setWasOutbid(true);
            toast({
              title: "تم تجاوز مزايدتك! 📢",
              description: `تم تقديم مزايدة أعلى (${data.currentBid.toLocaleString()} د.ع)`,
              variant: "destructive",
            });
          }

          // Notify about time extension
          if (data.timeExtended) {
            toast({
              title: "تم تمديد المزاد! ⏰",
              description: "تم إضافة دقيقتين للمزاد بسبب مزايدة في اللحظات الأخيرة",
            });
          }

          // Invalidate listing query to refresh data
          queryClient.invalidateQueries({ queryKey: ["/api/listings", listing.id] });
        }
        
        // Handle auction end event
        if (data.type === "auction_end" && data.listingId === listing.id) {
          setAuctionEnded({
            status: data.status,
            winnerId: data.winnerId,
            winnerName: data.winnerName,
            winningBid: data.winningBid,
          });
          
          // Show appropriate toast
          if (data.status === "sold") {
            if (data.winnerId === user?.id) {
              toast({
                title: "مبروك! 🎉",
                description: `فزت بالمزاد بمبلغ ${data.winningBid?.toLocaleString()} د.ع`,
              });
            } else if (user?.id) {
              toast({
                title: "انتهى المزاد",
                description: `فاز ${data.winnerName} بالمزاد بمبلغ ${data.winningBid?.toLocaleString()} د.ع`,
              });
            }
          } else {
            toast({
              title: "انتهى المزاد",
              description: "انتهى المزاد بدون مزايدات",
            });
          }
          
          // Refresh listing data
          queryClient.invalidateQueries({ queryKey: ["/api/listings", listing.id] });
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "unsubscribe", listingId: listing.id }));
      }
      ws.close();
    };
  }, [listing?.id, listing?.saleType, user?.id, toast, queryClient]);

  // Determine if current user is winning - check both live data and listing data
  const currentHighBidderId = liveBidData?.bidderId || (listing as any)?.highestBidderId || null;
  const isWinning = user?.id && currentHighBidderId === user.id;

  // Check if current user is the seller of this product
  // Wait for auth to load before determining ownership to avoid race conditions
  const isOwnProduct = !isAuthLoading && isAuthenticated && user?.id && listing?.sellerId === user.id;
  // While auth is loading, disable purchase actions for logged-in users to prevent race conditions
  const isPurchaseDisabled = isAuthLoading && listing?.sellerId;

  const requireAuth = (action: string) => {
    // If auth is still loading, don't show error - just return false to prevent action
    if (isAuthLoading) {
      return false;
    }
    
    if (!isAuthenticated) {
      toast({
        title: "يرجى تسجيل الدخول",
        description: "يجب عليك تسجيل الدخول للمتابعة",
        variant: "destructive",
      });
      navigate(`/register?redirect=${encodeURIComponent(`/product/${params?.id}`)}&action=${action}`);
      return false;
    }
    return true;
  };

  const handleAddCart = async () => {
    if (!requireAuth("cart")) return;
    if (!listing) return;
    
    if (listing.saleType === "auction") {
      toast({
        title: "غير متاح",
        description: "لا يمكن إضافة منتجات المزاد إلى السلة",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await addToCart({ listingId: listing.id, quantity: 1 });
      toast({
        title: "تم الإضافة للسلة",
        description: "يمكنك الاستمرار في التصفح أو الذهاب للسلة.",
      });
    } catch (error: any) {
      toast({
        title: "حدث خطأ",
        description: error.message || "فشل في إضافة المنتج للسلة",
        variant: "destructive",
      });
    }
  };

  const handleAddWishlist = () => {
    if (!requireAuth("wishlist")) return;
    toast({
      title: "تم الإضافة للقائمة المفضلة",
      description: "يمكنك عرض المفضلة من إعداداتك.",
    });
  };

  const handleBuyNowDirect = async () => {
    if (isAuthenticated) {
      // Logged in user - add to cart and redirect to checkout
      if (!listing) return;
      
      try {
        await addToCart({ listingId: listing.id, quantity: 1 });
        toast({
          title: "تم إضافة المنتج للسلة",
          description: "سيتم توجيهك لإتمام الشراء...",
        });
        navigate("/checkout");
      } catch (error: any) {
        toast({
          title: "خطأ",
          description: error.message || "فشل في إضافة المنتج للسلة",
          variant: "destructive",
        });
      }
    } else {
      // Guest user - open checkout dialog
      setGuestCheckoutOpen(true);
    }
  };

  const handleGuestCheckout = () => {
    if (!guestName.trim() || !guestPhone.trim() || !guestAddress.trim()) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    if (!listing) return;
    
    guestCheckoutMutation.mutate({
      listingId: listing.id,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      guestAddress: guestAddress.trim(),
      guestCity: guestCity.trim(),
      amount: listing.price,
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mr-2 text-lg">جاري التحميل...</span>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">المنتج غير موجود</h2>
          <p className="text-gray-600 mb-4">عذراً، لم نتمكن من العثور على هذا المنتج.</p>
          <Button onClick={() => navigate("/")}>العودة للرئيسية</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        
        {/* Image Gallery - Swipeable Carousel */}
        {(() => {
          const images = product.images && product.images.length > 0 
            ? product.images 
            : [product.image];

          return (
            <div className="mb-6">
              {/* Main Image Carousel with Swipe Support */}
              <Carousel
                setApi={setCarouselApi}
                opts={{
                  align: "start",
                  loop: images.length > 1,
                  direction: "rtl",
                }}
                className="w-full mb-3"
              >
                <CarouselContent className="-mr-0">
                  {images.map((img, index) => (
                    <CarouselItem key={index} className="pr-0">
                      <div 
                        className="relative aspect-[4/3] md:aspect-[16/9] bg-gray-100 rounded-xl overflow-hidden group"
                        onClick={() => setFullscreenOpen(true)}
                      >
                        <img 
                          src={img} 
                          alt={`${product.title} - صورة ${index + 1}`} 
                          className="w-full h-full object-contain bg-white cursor-zoom-in"
                          data-testid={`img-product-${index}`}
                        />
                        
                        {/* Zoom hint */}
                        <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          🔍 اضغط للتكبير
                        </div>

                        {/* Swipe hint for mobile */}
                        {images.length > 1 && (
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full flex items-center gap-2 md:hidden">
                            <span>←</span>
                            <span>{selectedImageIndex + 1} / {images.length}</span>
                            <span>→</span>
                          </div>
                        )}

                        {/* Desktop counter */}
                        {images.length > 1 && (
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full hidden md:block">
                            {selectedImageIndex + 1} / {images.length}
                          </div>
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                
                {/* Navigation Arrows - Desktop only */}
                {images.length > 1 && (
                  <>
                    <CarouselPrevious className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2" />
                    <CarouselNext className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2" />
                  </>
                )}
              </Carousel>

              {/* Dot Indicators for Mobile */}
              {images.length > 1 && (
                <div className="flex justify-center gap-2 md:hidden mb-3">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => scrollToImage(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        selectedImageIndex === i 
                          ? 'bg-primary w-4' 
                          : 'bg-gray-300'
                      }`}
                      data-testid={`dot-${i}`}
                    />
                  ))}
                </div>
              )}

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, i) => (
                    <div 
                      key={i} 
                      onClick={() => scrollToImage(i)}
                      className={`w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        selectedImageIndex === i 
                          ? 'border-primary ring-2 ring-primary/30' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      data-testid={`thumbnail-${i}`}
                    >
                      <img 
                        src={img} 
                        alt={`صورة ${i + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Product Title */}
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight mb-4" data-testid="text-product-title">
          {product.title}
        </h1>

        {/* Seller Info Row - Clickable to seller store */}
        <Link 
          href={`/search?sellerId=${listing?.sellerId}`}
          className="flex items-center gap-3 py-3 border-b hover:bg-gray-50 transition-colors cursor-pointer group"
          data-testid="link-seller-store"
        >
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm group-hover:bg-primary group-hover:text-white transition-colors">
            {product.seller?.name?.charAt(0) || "ب"}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm group-hover:text-primary transition-colors">{product.seller?.name || product.sellerName || "بائع"}</span>
              {(product.seller?.salesCount || 0) > 0 && (
                <span className="text-xs text-gray-500">({product.seller?.salesCount})</span>
              )}
              <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">عرض المتجر ←</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {(product.seller?.ratingCount || 0) > 0 ? (
                <>
                  <span className="text-green-600 font-medium">
                    {Math.round((product.seller?.rating || 0) * 20)}% تقييم إيجابي
                  </span>
                </>
              ) : (
                <span>بائع جديد</span>
              )}
            </div>
          </div>
          {!isOwnProduct && (
            <Button variant="ghost" size="icon" className="text-gray-400" onClick={(e) => e.stopPropagation()}>
              <Send className="h-5 w-5" />
            </Button>
          )}
        </Link>

        {/* Price Section */}
        <div className="py-4 border-b">
          {product.saleType === "auction" ? (
            <>
              <p className="text-3xl font-bold">{(product.currentBid || product.price).toLocaleString()} د.ع</p>
              <p className="text-sm text-gray-500 mt-1">
                {product.totalBids && product.totalBids > 0 
                  ? `${product.totalBids} مزايدة` 
                  : "سعر المزايدة الابتدائي"}
              </p>
              {/* Auction Countdown Timer */}
              {(liveBidData?.auctionEndTime || product.auctionEndTime) && (
                <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-xs text-orange-700 mb-1 font-medium">ينتهي المزاد خلال:</p>
                  <AuctionCountdown 
                    endTime={liveBidData?.auctionEndTime || product.auctionEndTime} 
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-3xl font-bold">{product.price.toLocaleString()} د.ع</p>
              {product.isNegotiable && (
                <p className="text-sm text-gray-500 mt-1">أو أفضل عرض</p>
              )}
            </>
          )}
        </div>

        {/* Shipping & Condition Info */}
        <div className="py-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">التوصيل</span>
            <span className="text-sm font-medium">{product.deliveryWindow || "3-5 أيام"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">الشحن</span>
            <span className="text-sm font-medium">
              {(listing as any)?.shippingType === "buyer_pays" 
                ? `${((listing as any)?.shippingCost || 0).toLocaleString()} د.ع` 
                : (listing as any)?.shippingType === "pickup" 
                  ? "استلام شخصي" 
                  : "مجاني (على حساب البائع)"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">الحالة</span>
            <span className="text-sm font-medium">{product.condition}</span>
          </div>
          {product.city && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">الموقع</span>
              <span className="text-sm font-medium">{product.city}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">المشاهدات</span>
            <span className="text-sm font-medium flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {(listing as any)?.views || 0}
            </span>
          </div>
        </div>

        {/* Show notice if this is the user's own product */}
        {isOwnProduct && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center my-4">
            <p className="text-blue-700 font-semibold">هذا منتجك الخاص</p>
            <p className="text-blue-600 text-sm">لا يمكنك شراء أو المزايدة على منتجاتك</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="py-4 space-y-3">
          {(() => {
            const remainingQuantity = product.quantityAvailable - product.quantitySold;
            const isSoldOut = remainingQuantity <= 0;
            
            if (isSoldOut) {
              return (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                  <p className="text-red-700 font-semibold">غير متوفر</p>
                  <p className="text-red-600 text-sm">تم بيع جميع الكميات</p>
                </div>
              );
            }

            if (isOwnProduct) return null;

            return (
              <>
                {/* Bidder status notifications - Sticky to stay visible (only for active auctions) */}
                {product.saleType === "auction" && listing?.isActive && !auctionEnded && (isWinning || (wasOutbid && !isWinning)) && (
                  <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-white/95 backdrop-blur-sm">
                    {/* Winning bidder status */}
                    {isWinning && (
                      <div className="bg-green-50 border-2 border-green-400 p-4 rounded-xl flex items-center gap-3 shadow-md" data-testid="winning-banner">
                        <Trophy className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="text-green-700 font-bold">أنت صاحب أعلى مزايدة! 🎉</p>
                          <p className="text-green-600 text-sm">مزايدتك الحالية: {(liveBidData?.currentBid || product.currentBid || product.price).toLocaleString()} د.ع</p>
                        </div>
                      </div>
                    )}

                    {/* Outbid notification - RED alert */}
                    {wasOutbid && !isWinning && (
                      <div className="bg-red-50 border-2 border-red-500 p-4 rounded-xl flex items-center gap-3 shadow-lg animate-pulse" data-testid="outbid-banner">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                        <div>
                          <p className="text-red-700 font-bold text-lg">⚠️ تم تجاوز مزايدتك!</p>
                          <p className="text-red-600 text-sm">قم بزيادة مزايدتك الآن للفوز بالمزاد</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Auction Ended Banner */}
                {product.saleType === "auction" && (auctionEnded || !listing?.isActive) && (
                  <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-6 text-center" data-testid="auction-ended-banner">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <Clock className="h-8 w-8 text-gray-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-700">انتهى المزاد</h3>
                      
                      {auctionEnded?.status === "sold" || (listing && !listing.isActive && product.totalBids > 0) ? (
                        <div className="space-y-2">
                          <p className="text-gray-600">
                            {auctionEnded?.winnerId === user?.id ? (
                              <span className="text-green-600 font-bold">🎉 مبروك! لقد فزت بهذا المزاد</span>
                            ) : (
                              <span>الفائز: {auctionEnded?.winnerName || "مشتري"}</span>
                            )}
                          </p>
                          <p className="text-2xl font-bold text-primary">
                            {(auctionEnded?.winningBid || product.currentBid || product.price).toLocaleString()} د.ع
                          </p>
                          {auctionEnded?.winnerId === user?.id && (
                            <Button 
                              className="mt-4"
                              onClick={() => navigate("/checkout")}
                              data-testid="button-proceed-payment"
                            >
                              إتمام عملية الدفع
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-600">
                          انتهى هذا المزاد بدون مزايدات
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Auction Bidding - Show for active auction items */}
                {product.saleType === "auction" && listing?.isActive && !auctionEnded && (
                  <BiddingWindow
                    listingId={params?.id || ""}
                    userId={user?.id}
                    currentBid={liveBidData?.currentBid || product.currentBid || product.price}
                    totalBids={liveBidData?.totalBids || product.totalBids || 0}
                    minimumBid={(liveBidData?.currentBid || product.currentBid || product.price) + 1000}
                    timeLeft={product.timeLeft}
                    auctionEndTime={(() => {
                      const endTime = liveBidData?.auctionEndTime || product.auctionEndTime;
                      if (!endTime) return null;
                      return typeof endTime === 'string' ? endTime : endTime.toISOString();
                    })()}
                    onRequireAuth={() => requireAuth("bid")}
                    isWinning={!!isWinning}
                    isAuthLoading={isAuthLoading}
                  />
                )}

                {/* Fixed Price Buttons */}
                {product.saleType !== "auction" && (
                  listing?.isActive ? (
                    <>
                      <Button 
                        size="lg" 
                        className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90"
                        onClick={handleBuyNowDirect}
                        disabled={!!isPurchaseDisabled}
                        data-testid="button-buy-now"
                      >
                        {isPurchaseDisabled ? "جاري التحميل..." : "اشتر الآن"}
                      </Button>

                      <Button 
                        variant="outline"
                        size="lg" 
                        className="w-full h-14 text-lg font-medium"
                        onClick={handleAddCart}
                        disabled={isAdding || !!isPurchaseDisabled}
                        data-testid="button-add-cart"
                      >
                        {isAdding ? "جاري الإضافة..." : "أضف للسلة"}
                      </Button>

                      {product.isNegotiable && (
                        <Button 
                          variant="outline"
                          size="lg" 
                          className="w-full h-14 text-lg font-medium"
                          onClick={() => {
                            if (!requireAuth("offer")) return;
                            setOfferAmount(Math.floor(product.price * 0.9).toString());
                            setOfferDialogOpen(true);
                          }}
                          data-testid="button-make-offer"
                        >
                          قدّم عرضك
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-6 text-center" data-testid="sold-banner">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                          <ShieldCheck className="h-8 w-8 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-700">تم البيع</h3>
                        <p className="text-gray-600">تم بيع هذا المنتج</p>
                        <p className="text-lg font-bold text-gray-700">{product.price.toLocaleString()} د.ع</p>
                      </div>
                    </div>
                  )
                )}

                {/* Watchlist Button */}
                <Button 
                  variant="outline"
                  size="lg" 
                  className="w-full h-14 text-lg font-medium"
                  onClick={handleAddWishlist}
                  data-testid="button-watchlist"
                >
                  <Heart className="h-5 w-5 ml-2" />
                  أضف للمفضلة
                </Button>

                {/* Share Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 h-12 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                    onClick={() => {
                      const url = encodeURIComponent(window.location.href);
                      const text = encodeURIComponent(`${product.title} - ${product.price.toLocaleString()} د.ع`);
                      window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
                    }}
                    data-testid="button-share-whatsapp"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 h-12 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600"
                    onClick={() => {
                      const url = encodeURIComponent(window.location.href);
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "width=600,height=400");
                    }}
                    data-testid="button-share-facebook"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 h-12 bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-500"
                    onClick={() => {
                      const url = encodeURIComponent(window.location.href);
                      const text = encodeURIComponent(`${product.title} - ${product.price.toLocaleString()} د.ع`);
                      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "width=600,height=400");
                    }}
                    data-testid="button-share-twitter"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 h-12 bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-500"
                    onClick={() => {
                      const url = encodeURIComponent(window.location.href);
                      const text = encodeURIComponent(`${product.title} - ${product.price.toLocaleString()} د.ع`);
                      window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
                    }}
                    data-testid="button-share-telegram"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 h-12"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast({
                        title: "تم النسخ",
                        description: "تم نسخ رابط المنتج",
                      });
                    }}
                    data-testid="button-copy-link"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>

                {/* Contact Seller */}
                <ContactSeller 
                  sellerName={product.seller.name}
                  sellerId={listing?.sellerId || ""}
                  listingId={listing?.id || ""}
                  productTitle={product.title}
                  productCode={product.productCode}
                />

                {/* Report Button */}
                {isAuthenticated && user?.id !== listing?.sellerId && (
                  <Button 
                    variant="ghost"
                    size="sm" 
                    className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setReportDialogOpen(true)}
                    data-testid="button-report-listing"
                  >
                    <Flag className="h-4 w-4 ml-2" />
                    الإبلاغ عن هذا المنتج
                  </Button>
                )}
              </>
            );
          })()}
        </div>

        {/* Stock Info */}
        {(() => {
          const remainingQuantity = product.quantityAvailable - product.quantitySold;
          if (remainingQuantity > 0 && remainingQuantity <= 10) {
            return (
              <div className="flex items-center gap-2 py-3 text-sm">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-amber-700 font-medium">متبقي {remainingQuantity} قطعة فقط!</span>
              </div>
            );
          }
          return null;
        })()}

        {/* Cash Payment Note */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 my-4 flex items-start gap-3">
          <Banknote className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-green-800 text-sm">الدفع عند الاستلام</p>
            <p className="text-green-700 text-xs">ادفع نقداً عند استلام طلبك</p>
          </div>
        </div>

        {/* Buyer Protection */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-blue-800 text-sm">حماية المشتري</p>
            <p className="text-blue-700 text-xs">أموالك محفوظة حتى تستلم المنتج</p>
          </div>
        </div>

        {/* Description Section */}
        <div className="py-4 border-t">
          <h2 className="font-bold text-lg mb-3">الوصف</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            {product.description || "لا يوجد وصف متوفر لهذا المنتج."}
          </p>
        </div>

        {/* Tags Section */}
        {product.tags && product.tags.length > 0 && (
          <div className="py-4 border-t">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              الكلمات المفتاحية
            </h2>
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag: string, index: number) => (
                <a
                  key={index}
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-sm transition-colors"
                  data-testid={`tag-link-${index}`}
                >
                  #{tag}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Specs Section */}
        <div className="py-4 border-t">
          <h2 className="font-bold text-lg mb-3">المواصفات</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">الحالة</span>
              <span className="font-medium">{product.condition}</span>
            </div>
            {product.brand && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">الماركة</span>
                <span className="font-medium">{product.brand}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">الفئة</span>
              <span className="font-medium">{product.category}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">رمز المنتج</span>
              <span className="font-medium text-xs">{product.productCode}</span>
            </div>
            {product.city && (
              <div className="flex justify-between py-2">
                <span className="text-gray-500">الموقع</span>
                <span className="font-medium">{product.city}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Make an Offer Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تقديم عرض سعر</DialogTitle>
            <DialogDescription className="text-right">
              قدّم عرضك للبائع. السعر المطلوب: {product?.price.toLocaleString()} د.ع
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="offer-amount">عرضك (د.ع)</Label>
              <Input
                id="offer-amount"
                type="number"
                placeholder="أدخل السعر المقترح"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                className="text-left"
                dir="ltr"
                data-testid="input-offer-amount"
              />
              {offerAmount && product && (
                <p className="text-xs text-muted-foreground">
                  {parseInt(offerAmount) < product.price ? (
                    <span className="text-amber-600">
                      أقل من السعر المطلوب بـ {((1 - parseInt(offerAmount) / product.price) * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-green-600">
                      يساوي أو أعلى من السعر المطلوب
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-message">رسالة للبائع (اختياري)</Label>
              <Textarea
                id="offer-message"
                placeholder="أضف رسالة توضيحية..."
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                rows={3}
                data-testid="input-offer-message"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setOfferDialogOpen(false)}
              data-testid="button-cancel-offer"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!listing?.id || !offerAmount) return;
                createOfferMutation.mutate({
                  listingId: listing.id,
                  offerAmount: parseInt(offerAmount, 10),
                  message: offerMessage || undefined,
                });
              }}
              disabled={!offerAmount || parseInt(offerAmount) <= 0 || createOfferMutation.isPending}
              data-testid="button-submit-offer"
            >
              {createOfferMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 ml-2" />
                  إرسال العرض
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">الإبلاغ عن المنتج</DialogTitle>
            <DialogDescription className="text-right">
              ساعدنا في الحفاظ على أمان المنصة بالإبلاغ عن المحتوى المخالف
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">سبب البلاغ</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger data-testid="select-report-reason">
                  <SelectValue placeholder="اختر سبب البلاغ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fake">منتج مزيف أو مقلد</SelectItem>
                  <SelectItem value="scam">احتيال أو نصب</SelectItem>
                  <SelectItem value="inappropriate">محتوى غير لائق</SelectItem>
                  <SelectItem value="stolen">منتج مسروق</SelectItem>
                  <SelectItem value="misleading">وصف مضلل</SelectItem>
                  <SelectItem value="prohibited">منتج محظور</SelectItem>
                  <SelectItem value="other">سبب آخر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-details">تفاصيل إضافية (اختياري)</Label>
              <Textarea
                id="report-details"
                placeholder="أضف تفاصيل تساعدنا في فهم المشكلة..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
                data-testid="input-report-details"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setReportDialogOpen(false)}
              data-testid="button-cancel-report"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!listing?.id || !reportReason) return;
                reportMutation.mutate({
                  targetId: listing.id,
                  targetType: "listing",
                  reason: reportReason,
                  details: reportDetails || undefined,
                });
              }}
              disabled={!reportReason || reportMutation.isPending}
              data-testid="button-submit-report"
            >
              {reportMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4 ml-2" />
                  إرسال البلاغ
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Checkout Dialog */}
      <Dialog open={guestCheckoutOpen} onOpenChange={setGuestCheckoutOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">إتمام الشراء كضيف</DialogTitle>
            <DialogDescription className="text-right">
              أدخل بياناتك لإتمام عملية الشراء. سيتواصل معك البائع لتأكيد الطلب.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guest-name">الاسم الكامل *</Label>
              <Input
                id="guest-name"
                placeholder="أدخل اسمك الكامل"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                data-testid="input-guest-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-phone">رقم الهاتف *</Label>
              <Input
                id="guest-phone"
                type="tel"
                placeholder="07xxxxxxxxx"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="text-left"
                dir="ltr"
                data-testid="input-guest-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-city">المدينة / المحافظة</Label>
              <Input
                id="guest-city"
                placeholder="مثال: بغداد"
                value={guestCity}
                onChange={(e) => setGuestCity(e.target.value)}
                data-testid="input-guest-city"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-address">العنوان الكامل *</Label>
              <Textarea
                id="guest-address"
                placeholder="أدخل عنوانك بالتفصيل للتوصيل"
                value={guestAddress}
                onChange={(e) => setGuestAddress(e.target.value)}
                rows={3}
                data-testid="input-guest-address"
              />
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-semibold">ملخص الطلب:</p>
              <p className="text-sm text-muted-foreground">{product?.title}</p>
              <p className="text-lg font-bold text-primary">{product?.price.toLocaleString()} د.ع</p>
              <p className="text-xs text-muted-foreground mt-1">الدفع عند الاستلام</p>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setGuestCheckoutOpen(false)}
              data-testid="button-cancel-guest-checkout"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleGuestCheckout}
              disabled={!guestName || !guestPhone || !guestAddress || guestCheckoutMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-guest-checkout"
            >
              {guestCheckoutMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري التأكيد...
                </>
              ) : (
                "تأكيد الطلب"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Viewer with Pinch-to-Zoom */}
      <FullscreenImageViewer
        isOpen={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        images={product.images && product.images.length > 0 ? product.images : [product.image || '']}
        initialIndex={selectedImageIndex}
        onIndexChange={setSelectedImageIndex}
        title={product.title}
      />

      </Layout>
  );
}
