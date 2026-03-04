import { useState, useEffect, useRef, useCallback } from "react";

import { FullscreenImageViewer } from "@/components/fullscreen-image-viewer";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureRequest } from "@/lib/queryClient";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, ShieldCheck, Heart, Share2, Star, Banknote, Truck, RotateCcw, Tag, Printer, Loader2, Send, Trophy, AlertCircle, Eye, Flag, Globe, Zap, MapPin } from "lucide-react";
import { ProductDetailSkeleton } from "@/components/optimized-image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useLanguage } from "@/lib/i18n";
import { BiddingWindow } from "@/components/bidding-window";
import { SellerTrustBadge } from "@/components/seller-trust-badge";
import { AuctionCountdown } from "@/components/auction-countdown";
import { InstagramShareCard } from "@/components/instagram-share-card";
import { VerifiedBadge } from "@/components/verified-badge";
import { MandatoryPhoneVerificationModal } from "@/components/mandatory-phone-verification-modal";
import { shareToFacebook, shareToWhatsApp, shareToTelegram, shareToTwitter } from "@/lib/share-utils";
import { SPECIFICATION_LABELS, SPECIFICATION_OPTIONS } from "@/lib/search-data";
import { hapticSuccess, hapticError, hapticLight, saveToPhotos, isDespia } from "@/lib/despia";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { Listing } from "@shared/schema";

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const authToken = localStorage.getItem("authToken");
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

export default function ProductPage() {
  const [match, params] = useRoute("/product/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const { addToCart, isAdding } = useCart();
  const queryClient = useQueryClient();
  const { language, t } = useLanguage();

  // Offer dialog state
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [pendingOfferAfterVerify, setPendingOfferAfterVerify] = useState(false);

  // Phone verification modal state
  const [phoneVerificationOpen, setPhoneVerificationOpen] = useState(false);

  // Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportImages, setReportImages] = useState<string[]>([]);
  const [reportUploading, setReportUploading] = useState(false);

  // Buy Now confirmation dialog state
  const [buyNowDialogOpen, setBuyNowDialogOpen] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  // Quantity selector for fixed-price add to cart / buy now
  const [addToCartQuantity, setAddToCartQuantity] = useState(1);

  // Sticky bottom bar — shows when main action buttons scroll off-screen
  const actionButtonsRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Image gallery state with carousel API for swipe support
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  // Scroll to top is handled globally by ScrollToTop (App.tsx) via the
  // pushState override — no need to duplicate it here.

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
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const viewTracked = useRef(false);

  // Create offer mutation
  const createOfferMutation = useMutation({
    mutationFn: async (data: { listingId: string; offerAmount: number; message?: string }) => {
      const res = await secureRequest("/api/offers", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || (language === "ar" ? "فشل في إرسال العرض" : language === "ku" ? "نەتوانرا پێشنیارەکە بنێردرێت" : "فشل في إرسال العرض"));
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("offerSent"),
        description: language === "ar" ? "سيتم إعلامك عندما يرد البائع على عرضك" : language === "ku" ? "کاتێک فرۆشیار وەڵام بداتەوە ئاگادارت دەکرێیتەوە" : "سيتم إعلامك عندما يرد البائع على عرضك",
      });
      setOfferDialogOpen(false);
      setOfferAmount("");
      setOfferMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReportImageUpload = async (file: File) => {
    if (!file || reportImages.length >= 5) return;
    setReportUploading(true);
    try {
      const urlRes = await secureRequest("/api/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({ contentType: file.type, fileName: file.name }),
      });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      // Use the proxy route path instead of direct GCS URL
      setReportImages(prev => [...prev, objectPath]);
    } catch { /* silent */ } finally { setReportUploading(false); }
  };

  // Report listing mutation
  const reportMutation = useMutation({
    mutationFn: async (data: { reportType: string; targetId: string; targetType: string; reason: string; details?: string; images?: string[] }) => {
      const res = await secureRequest("/api/reports", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || (language === "ar" ? "فشل في إرسال البلاغ" : language === "ku" ? "ڕاپۆرتەکە نەنێردرا" : "فشل في إرسال البلاغ"));
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: language === "ar" ? "تم إرسال البلاغ" : language === "ku" ? "ڕاپۆرتەکە نێردرا" : "تم إرسال البلاغ",
        description: language === "ar" ? "شكراً لمساعدتنا في الحفاظ على أمان المنصة" : language === "ku" ? "سوپاس بۆ یارمەتیدانمان بۆ پاراستنی ئاسایشی پلاتفۆڕمەکە" : "شكراً لمساعدتنا في الحفاظ على أمان المنصة",
      });
      setReportDialogOpen(false);
      setReportReason("");
      setReportDetails("");
      setReportImages([]);
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: listing, isLoading, error } = useQuery<Listing>({
    queryKey: ["/api/listings", params?.id],
    queryFn: async () => {
      const url = `/api/listings/${params?.id}`;
      const res = await secureRequest(url, { method: "GET" });
      if (!res.ok) {
        throw new Error("Listing not found");
      }
      const data = await res.json();
      return data;
    },
    enabled: !!params?.id,
  });
  
  // Fetch seller public data to get real rating info and avatar
  const { data: sellerData } = useQuery({
    queryKey: ["/api/users", listing?.sellerId, "public"],
    queryFn: async () => {
      if (!listing?.sellerId) return null;
      const res = await fetch(`/api/users/${listing.sellerId}/public`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!listing?.sellerId,
  });

  // Check if user has been outbid on page load (for auction listings)
  const { data: userBidsOnListing } = useQuery<{ hasBid: boolean; isHighest: boolean }>({
    queryKey: ["/api/listings", params?.id, "user-bid-status", user?.id],
    queryFn: async () => {
      const res = await secureRequest(`/api/listings/${params?.id}/user-bid-status`, {
        method: "GET",
      });
      if (!res.ok) return { hasBid: false, isHighest: false };
      return res.json();
    },
    enabled: !!params?.id && !!user?.id && listing?.saleType === "auction",
  });

  // Check if user has purchased this listing
  const { data: purchaseStatus = { hasPurchased: false } } = useQuery<{ hasPurchased: boolean }>({
    queryKey: ["/api/listings", params?.id, "purchase-status", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/listings/${params?.id}/purchase-status`, {
        credentials: "include",
      });
      if (!res.ok) return { hasPurchased: false };
      const result = await res.json();
      return result;
    },
    enabled: !!params?.id && !!user?.id,
  });

  // Similar items query
  const { data: similarData } = useQuery<{ similar: Array<{ id: string; title: string; price: number; currentBid?: number; image: string; saleType: string }> }>({
    queryKey: ["/api/listings", params?.id, "similar"],
    queryFn: async () => {
      const res = await fetch(`/api/listings/${params?.id}/similar?limit=8`);
      if (!res.ok) return { similar: [] };
      return res.json();
    },
    enabled: !!params?.id,
    staleTime: 60000,
  });

  // More from seller query
  const { data: sellerListingsData } = useQuery<{ listings: Array<{ id: string; title: string; price: number; currentBid?: number | null; images: string[]; saleType: string }> }>({
    queryKey: ["/api/listings", "seller", listing?.sellerId],
    queryFn: async () => {
      const res = await fetch(`/api/listings?sellerId=${listing?.sellerId}&limit=8`);
      if (!res.ok) return { listings: [] };
      return res.json();
    },
    enabled: !!listing?.sellerId,
    staleTime: 60000,
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
    originalImages: (listing as any).originalImages || [],
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
    shippingType: listing.shippingType || "seller_pays",
    shippingCost: listing.shippingCost || 0,
    internationalShipping: listing.internationalShipping || false,
    internationalCountries: listing.internationalCountries || [],
    area: listing.area || null,
    buyNowPrice: (listing as any).buyNowPrice || null,
    locationLat: (listing as any).locationLat || null,
    locationLng: (listing as any).locationLng || null,
    mapUrl: (listing as any).mapUrl || null,
  } : null;

  // Clamp quantity when product/remaining changes
  const remainingQty = (product?.quantityAvailable ?? 1) - (product?.quantitySold ?? 0);
  useEffect(() => {
    if (remainingQty > 0 && addToCartQuantity > remainingQty) {
      setAddToCartQuantity(remainingQty);
    }
  }, [remainingQty, addToCartQuantity]);

  // Track view when product loads - reset ref on listing change
  useEffect(() => {
    viewTracked.current = false;
  }, [params?.id]);

  useEffect(() => {
    if (listing?.id && !viewTracked.current) {
      viewTracked.current = true;
      // Only track view if viewer is not the seller
      if (!user?.id || user.id !== listing.sellerId) {
        secureRequest(`/api/listings/${listing.id}/view`, {
          method: "POST",
          body: JSON.stringify({ viewerId: user?.id || null })
        }).catch(() => {});
      }
      
      // Track in localStorage for recently viewed section
      try {
        const stored = localStorage.getItem("recentlyViewed");
        let recentIds: string[] = stored ? JSON.parse(stored) : [];
        // Remove if already exists and add to front
        recentIds = recentIds.filter(id => id !== listing.id);
        recentIds.unshift(listing.id);
        // Keep only last 20 items
        recentIds = recentIds.slice(0, 20);
        localStorage.setItem("recentlyViewed", JSON.stringify(recentIds));
        
        // Track preferred categories for personalization
        if (listing.category) {
          const catStored = localStorage.getItem("userPreferredCategories");
          let categories: string[] = catStored ? JSON.parse(catStored) : [];
          // Move category to front if exists, or add it
          categories = categories.filter(c => c !== listing.category);
          categories.unshift(listing.category);
          // Keep top 5 categories
          categories = categories.slice(0, 5);
          localStorage.setItem("userPreferredCategories", JSON.stringify(categories));
        }
        
        // Track price range for personalization
        const price = listing.currentBid || listing.price;
        if (price) {
          const priceStored = localStorage.getItem("userPriceRange");
          let priceRange = priceStored ? JSON.parse(priceStored) : { min: price, max: price, count: 0 };
          // Running average for price range
          const newCount = priceRange.count + 1;
          priceRange = {
            min: Math.min(priceRange.min, price),
            max: Math.max(priceRange.max, price),
            count: newCount
          };
          localStorage.setItem("userPriceRange", JSON.stringify(priceRange));
        }
      } catch (e) {
        console.log("Error saving recently viewed:", e);
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
          setLastUpdateTime(new Date());
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
              title: language === "ar" ? "تم تجاوز مزايدتك! 📢" : language === "ku" ? "مزایدەکەت تێپەڕێندرا! 📢" : "تم تجاوز مزايدتك! 📢",
              description: language === "ar" 
                ? `تم تقديم مزايدة أعلى (${data.currentBid.toLocaleString()} د.ع)` 
                : `مزایدەیەکی بەرزتر دانرا (${data.currentBid.toLocaleString()} د.ع)`,
              variant: "destructive",
            });
          }

          // Notify about time extension
          if (data.timeExtended) {
            toast({
              title: language === "ar" ? "تم تمديد المزاد! ⏰" : language === "ku" ? "مزایدە درێژکرایەوە! ⏰" : "تم تمديد المزاد! ⏰",
              description: language === "ar" ? "تم إضافة دقيقتين للمزاد بسبب مزايدة في اللحظات الأخيرة" : language === "ku" ? "٢ خولەک زیادکرا بەهۆی مزایدە لە کۆتا ساتەکاندا" : "تم إضافة دقيقتين للمزاد بسبب مزايدة في اللحظات الأخيرة",
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
                title: language === "ar" ? "مبروك! 🎉" : language === "ku" ? "پیرۆز بێت! 🎉" : "مبروك! 🎉",
                description: language === "ar" 
                  ? `فزت بالمزاد بمبلغ ${data.winningBid?.toLocaleString()} د.ع`
                  : `براوەی مزایدەکە بویت بە ${data.winningBid?.toLocaleString()} د.ع`,
              });
            } else if (user?.id) {
              toast({
                title: t("auctionEnded"),
                description: language === "ar" 
                  ? `فاز ${data.winnerName} بالمزاد بمبلغ ${data.winningBid?.toLocaleString()} د.ع`
                  : `${data.winnerName} براوەی مزایدەکە بوو بە ${data.winningBid?.toLocaleString()} د.ع`,
              });
            }
          } else {
            toast({
              title: t("auctionEnded"),
              description: language === "ar" ? "انتهى المزاد بدون مزايدات" : language === "ku" ? "مزایدە بەبێ مزایدەکار کۆتایی هات" : "انتهى المزاد بدون مزايدات",
            });
          }
          
          // Refresh listing data
          queryClient.invalidateQueries({ queryKey: ["/api/listings", listing.id] });
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "unsubscribe", listingId: listing.id }));
      }
      ws.close();
      setWsConnected(false);
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

  // Debug logging for bidding window visibility
  useEffect(() => {
    if (listing) {
      console.log("[DEBUG Product] Bidding window conditions:", {
        saleType: listing.saleType,
        isActive: listing.isActive,
        auctionEnded,
        isOwnProduct,
        userId: user?.id,
        userIdType: typeof user?.id,
        sellerId: listing.sellerId,
        sellerIdType: typeof listing.sellerId,
        strictEqual: user?.id === listing.sellerId,
        looseEqual: user?.id == listing.sellerId,
        isAuthLoading,
        isAuthenticated,
      });
    }
  }, [listing, auctionEnded, isOwnProduct, user?.id, isAuthLoading, isAuthenticated]);

  // IntersectionObserver for sticky bottom bar
  useEffect(() => {
    const el = actionButtonsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const requireAuth = (action: string) => {
    // If auth is still loading, don't show error - just return false to prevent action
    if (isAuthLoading) {
      return false;
    }
    
    if (!isAuthenticated) {
      const redirectUrl = `/signin?redirect=${encodeURIComponent(`/product/${params?.id}`)}`;
      toast({
        title: t("loginRequired"),
        description: language === "ar" ? "يجب عليك تسجيل الدخول أو إنشاء حساب للمتابعة" : language === "ku" ? "دەبێت بچیتە ژوورەوە یان هەژمار دروست بکەیت بۆ بەردەوامبوون" : "يجب عليك تسجيل الدخول أو إنشاء حساب للمتابعة",
        variant: "destructive",
        duration: 8000,
        action: (
          <ToastAction 
            altText={language === "ar" ? "تسجيل الدخول" : language === "ku" ? "چوونە ژوورەوە" : "Sign In"}
            onClick={() => navigate(redirectUrl)}
          >
            {language === "ar" ? "تسجيل الدخول" : language === "ku" ? "چوونە ژوورەوە" : "Sign In"}
          </ToastAction>
        ),
      });
      return false;
    }
    return true;
  };

  const handleAddCart = async () => {
    if (!requireAuth("cart")) return;
    if (!listing) return;
    
    if (listing.saleType === "auction") {
      toast({
        title: language === "ar" ? "غير متاح" : language === "ku" ? "بەردەست نییە" : "غير متاح",
        description: language === "ar" ? "لا يمكن إضافة منتجات المزاد إلى السلة" : language === "ku" ? "ناتوانیت بەرهەمی مزایدە زیاد بکەیت بۆ سەبەتە" : "لا يمكن إضافة منتجات المزاد إلى السلة",
        variant: "destructive",
      });
      return;
    }
    
    const qty = addToCartQuantity || 1;
    try {
      await addToCart({ listingId: listing.id, quantity: qty });
      toast({
        title: language === "ar" ? "تم الإضافة للسلة" : language === "ku" ? "زیادکرا بۆ سەبەتە" : "تم الإضافة للسلة",
        description: language === "ar" ? "يمكنك الاستمرار في التصفح أو الذهاب للسلة." : language === "ku" ? "دەتوانیت بەردەوام بیت لە گەڕان یان بڕۆیت بۆ سەبەتە." : "يمكنك الاستمرار في التصفح أو الذهاب للسلة.",
      });
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message || (language === "ar" ? "فشل في إضافة المنتج للسلة" : language === "ku" ? "زیادکردنی بەرهەم بۆ سەبەتە شکستی هێنا" : "فشل في إضافة المنتج للسلة"),
        variant: "destructive",
      });
    }
  };

  const handleAddWishlist = () => {
    if (!requireAuth("wishlist")) return;
    toast({
      title: t("addedToFavorites"),
      description: language === "ar" ? "يمكنك عرض المفضلة من إعداداتك." : language === "ku" ? "دەتوانیت دڵخوازەکان ببینیت لە ڕێکخستنەکانت." : "يمكنك عرض المفضلة من إعداداتك.",
    });
  };

  const handleBuyNowDirect = async () => {
    hapticLight();
    
    // Require authentication and phone verification
    if (!requireAuth("buy")) return;
    
    if (!listing) return;
    
    const qty = addToCartQuantity || 1;
    try {
      await addToCart({ listingId: listing.id, quantity: qty });
      hapticSuccess();
      toast({
        title: language === "ar" ? "تم إضافة المنتج للسلة" : language === "ku" ? "بەرهەم زیادکرا بۆ سەبەتە" : "تم إضافة المنتج للسلة",
        description: language === "ar" ? "سيتم توجيهك لإتمام الشراء..." : language === "ku" ? "دەگوازرێیتەوە بۆ تەواوکردنی کڕین..." : "سيتم توجيهك لإتمام الشراء...",
      });
      navigate("/checkout");
    } catch (error: any) {
      hapticError();
      toast({
        title: t("error"),
        description: error.message || (language === "ar" ? "فشل في إضافة المنتج للسلة" : language === "ku" ? "زیادکردنی بەرهەم بۆ سەبەتە شکستی هێنا" : "فشل في إضافة المنتج للسلة"),
        variant: "destructive",
      });
    }
  };

  const confirmBuyNow = async () => {
    setBuyNowDialogOpen(false);
    await handleBuyNowDirect();
  };

  const handleSaveToPhotos = async () => {
    if (product?.images?.[0]) {
      hapticLight();
      const saved = await saveToPhotos(product.images[0]);
      if (saved) {
        toast({
          title: language === "ar" ? "تم حفظ الصورة" : language === "ku" ? "وێنە پاشەکەوت کرا" : "تم حفظ الصورة",
          description: language === "ar" ? "تم حفظ الصورة في ألبوم الكاميرا" : language === "ku" ? "وێنە پاشەکەوت کرا لە ئەلبومی کامێرا" : "تم حفظ الصورة في ألبوم الكاميرا",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <ProductDetailSkeleton />
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{language === "ar" ? "المنتج غير موجود" : language === "ku" ? "بەرهەم نەدۆزرایەوە" : "المنتج غير موجود"}</h2>
          <p className="text-gray-600 mb-4">{language === "ar" ? "عذراً، لم نتمكن من العثور على هذا المنتج." : language === "ku" ? "ببورە، نەتوانرا ئەم بەرهەمە بدۆزرێتەوە." : "عذراً، لم نتمكن من العثور على هذا المنتج."}</p>
          <Button onClick={() => navigate("/")}>{language === "ar" ? "العودة للرئيسية" : language === "ku" ? "گەڕانەوە بۆ سەرەکی" : "العودة للرئيسية"}</Button>
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
            : [product.image || ''];

          return (
            <div className="mb-6">
              {/* Main Image Carousel with Swipe Support */}
              <Carousel
                setApi={setCarouselApi}
                opts={{
                  align: "start",
                  loop: images.length > 1,
                  direction: "rtl",
                  duration: 0,
                }}
                className="w-full mb-3"
              >
                <CarouselContent className="-mr-0">
                  {images.map((img, index) => (
                    <CarouselItem key={index} className="pr-0">
                      <div 
                        className="relative aspect-[4/3] md:aspect-[16/9] bg-muted/40 rounded-xl overflow-hidden group soft-border elev-1"
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
                          : 'bg-muted-foreground/30'
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
                      className={`w-16 h-16 flex-shrink-0 bg-muted/40 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        selectedImageIndex === i 
                          ? 'border-primary ring-2 ring-primary/30' 
                          : 'border-border/70 hover:border-primary/40'
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

              {/* Save to Photos button - shows only in Despia native app */}
              {isDespia() && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={handleSaveToPhotos}
                  data-testid="button-save-to-photos"
                >
                  {language === "ar" ? "حفظ الصورة في الهاتف" : language === "ku" ? "وێنە پاشەکەوت بکە" : "حفظ الصورة في الهاتف"}
                </Button>
              )}
            </div>
          );
        })()}

        {/* Product Title */}
        <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight mb-2" data-testid="text-product-title">
          {product.title}
        </h1>

        {/* Key Specs Chips — quick evaluation data near the top */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {product.condition && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {product.condition}
            </span>
          )}
          {listing?.specifications && (() => {
            const specs = listing.specifications as Record<string, string>;
            const chipKeys = ["brand", "size", "shoeSize", "color", "material"] as const;
            return chipKeys.map((key) => {
              const val = specs[key];
              if (!val) return null;
              const label = SPECIFICATION_LABELS[key as keyof typeof SPECIFICATION_LABELS]?.[language === "ar" ? "ar" : "ku"] ?? key;
              const opts = SPECIFICATION_OPTIONS[key as keyof typeof SPECIFICATION_OPTIONS] as Array<{ value: string; labelAr: string; labelKu: string }> | undefined;
              const displayVal = opts ? (opts.find((o) => o.value === val)?.[language === "ar" ? "labelAr" : "labelKu"] ?? val) : val;
              return (
                <span key={key} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${key === "brand" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                  {key === "brand" ? displayVal : `${label}: ${displayVal}`}
                </span>
              );
            });
          })()}
          {product.saleType === "auction" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
              {language === "ar" ? "مزاد" : language === "ku" ? "مزایدە" : "مزاد"}
            </span>
          )}
        </div>

        
{/* Unified Price Block — price + shipping + (auction: bids + countdown) */}
        <div className="py-4 border-b">
          {product.saleType === "auction" ? (
            <>
              <p className="text-3xl font-bold">{(liveBidData?.currentBid || product.currentBid || product.price).toLocaleString()} د.ع</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                <span>
                  {(liveBidData?.totalBids || product.totalBids) && (liveBidData?.totalBids || product.totalBids) > 0
                    ? `${liveBidData?.totalBids || product.totalBids} ${language === "ar" ? "مزايدة" : language === "ku" ? "مزایدە" : "مزايدة"}`
                    : language === "ar" ? "سعر المزايدة الابتدائي" : language === "ku" ? "نرخی دەستپێکردنی مزایدە" : "سعر المزايدة الابتدائي"}
                </span>
                {(liveBidData?.auctionEndTime || product.auctionEndTime) && (
                  <>
                    <span className="text-gray-300">·</span>
                    <AuctionCountdown endTime={liveBidData?.auctionEndTime || product.auctionEndTime} />
                  </>
                )}
              </div>
              {/* Shipping line */}
              <p className="text-xs text-gray-500 mt-2">
                {product?.shippingType === "buyer_pays"
                  ? `+ ${(product?.shippingCost || 0).toLocaleString()} ${language === "ar" ? "د.ع شحن" : language === "ku" ? "د.ع گواستنەوە" : "د.ع شحن"}`
                  : product?.shippingType === "pickup"
                    ? (language === "ar" ? "استلام شخصي" : language === "ku" ? "وەرگرتنی کەسی" : "استلام شخصي")
                    : (language === "ar" ? "🚚 شحن مجاني" : language === "ku" ? "🚚 گواستنەوەی بەخۆڕایی" : "🚚 شحن مجاني")}
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold">{product.price.toLocaleString()} د.ع</p>
              {/* Shipping line — directly under price, before "or best offer" */}
              <p className="text-xs text-gray-500 mt-1">
                {product?.shippingType === "buyer_pays"
                  ? `+ ${(product?.shippingCost || 0).toLocaleString()} ${language === "ar" ? "د.ع شحن" : language === "ku" ? "د.ع گواستنەوە" : "د.ع شحن"}`
                  : product?.shippingType === "pickup"
                    ? (language === "ar" ? "استلام شخصي" : language === "ku" ? "وەرگرتنی کەسی" : "استلام شخصي")
                    : (language === "ar" ? "🚚 شحن مجاني" : language === "ku" ? "🚚 گواستنەوەی بەخۆڕایی" : "🚚 شحن مجاني")}
              </p>
              {product.isNegotiable && (
                <p className="text-sm text-gray-500 mt-1">{language === "ar" ? "أو أفضل عرض" : language === "ku" ? "یان باشترین پێشنیار" : "أو أفضل عرض"}</p>
              )}
              {/* Quantity selector — inside price block for full cost picture */}
              {remainingQty > 1 && (
                <div className="flex items-center justify-between mt-3 py-2 px-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{language === "ar" ? "الكمية" : language === "ku" ? "بڕ" : "الكمية"}</span>
                    <span className="text-xs text-gray-400">({remainingQty} {language === "ar" ? "متوفر" : language === "ku" ? "بەردەستە" : "متوفر"})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setAddToCartQuantity(Math.max(1, addToCartQuantity - 1))} disabled={addToCartQuantity <= 1}>−</Button>
                    <span className="w-8 text-center font-medium text-sm" data-testid="product-quantity">{addToCartQuantity}</span>
                    <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setAddToCartQuantity(Math.min(remainingQty, addToCartQuantity + 1))} disabled={addToCartQuantity >= remainingQty}>+</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        
{/* Seller Info Row - Clickable to seller store */}
        <Link 
          href={`/search?sellerId=${listing?.sellerId}`}
          className="flex items-center gap-3 py-3 border-b hover:bg-gray-50 transition-colors cursor-pointer group"
          data-testid="link-seller-store"
        >
          {sellerData?.avatar ? (
            <img 
              src={sellerData.avatar} 
              alt={product.seller?.name || "البائع"}
              className="w-10 h-10 rounded-full object-cover group-hover:ring-2 group-hover:ring-primary transition-all"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm group-hover:bg-primary group-hover:text-white transition-colors">
              {product.seller?.name?.charAt(0) || "ب"}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm group-hover:text-primary transition-colors">{product.seller?.name || product.sellerName || "بائع"}</span>
              {sellerData?.isAuthenticated && (
                <VerifiedBadge size="sm" />
              )}
              {(product.seller?.salesCount || 0) > 0 && (
                <span className="text-xs text-gray-500">({product.seller?.salesCount})</span>
              )}
              <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">{language === "ar" ? "عرض المتجر ←" : language === "ku" ? "دوکان ببینە ←" : "عرض المتجر ←"}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {(product.seller?.ratingCount || 0) > 0 ? (
                <>
                  <span className="text-green-600 font-medium">
                    {Math.round((product.seller?.rating || 0) * 20)}% {language === "ar" ? "تقييم إيجابي" : language === "ku" ? "هەڵسەنگاندنی ئەرێنی" : "تقييم إيجابي"}
                  </span>
                </>
              ) : (
                <span>{language === "ar" ? "بائع جديد" : language === "ku" ? "فرۆشیاری نوێ" : "بائع جديد"}</span>
              )}
            </div>
          </div>
          {!isOwnProduct && (
            <Button variant="ghost" size="icon" className="text-gray-400" onClick={(e) => e.stopPropagation()}>
              <Send className="h-5 w-5" />
            </Button>
          )}
        </Link>

        
        {/* Trust Strip - Compact reassurance before action buttons */}
        <div className="flex items-center justify-around py-3 border-b text-center">
          <div className="flex flex-col items-center gap-1">
            <Banknote className="h-4 w-4 text-green-600" />
            <span className="text-[10px] sm:text-xs text-green-700 font-medium">{language === "ar" ? "دفع عند الاستلام" : language === "ku" ? "پارەدان لەکاتی وەرگرتن" : "دفع عند الاستلام"}</span>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span className="text-[10px] sm:text-xs text-blue-700 font-medium">{language === "ar" ? "حماية المشتري" : language === "ku" ? "پاراستنی کڕیار" : "حماية المشتري"}</span>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex flex-col items-center gap-1">
            <RotateCcw className="h-4 w-4 text-amber-600" />
            <span className="text-[10px] sm:text-xs text-amber-700 font-medium">{product.returnPolicy === "لا يوجد إرجاع" ? (language === "ar" ? "لا إرجاع" : language === "ku" ? "گەڕاندنەوە نییە" : "لا إرجاع") : (language === "ar" ? "إرجاع متاح" : language === "ku" ? "گەڕاندنەوە هەیە" : "إرجاع متاح")}</span>
          </div>
        </div>

{/* Show notice if this is the user's own product */}
        {isOwnProduct && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center my-4">
            <p className="text-blue-700 font-semibold">{language === "ar" ? "هذا منتجك الخاص" : language === "ku" ? "ئەمە بەرهەمی تۆیە" : "هذا منتجك الخاص"}</p>
            <p className="text-blue-600 text-sm">{language === "ar" ? "لا يمكنك شراء أو المزايدة على منتجاتك" : language === "ku" ? "ناتوانیت بەرهەمەکانی خۆت بکڕیت یان مزایدە بکەیت" : "لا يمكنك شراء أو المزايدة على منتجاتك"}</p>
          </div>
        )}

        
{/* Action Buttons */}
        <div ref={actionButtonsRef} className="py-4 space-y-3">
          {(() => {
            const remainingQuantity = product.quantityAvailable - product.quantitySold;
            const isSoldOut = remainingQuantity <= 0;
            const hasPurchased = purchaseStatus?.hasPurchased === true;
            
            // Show "out of stock" immediately if sold out
            if (isSoldOut) {
              return (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                  <p className="text-red-700 font-semibold">{t("outOfStock")}</p>
                  <p className="text-red-600 text-sm">{language === "ar" ? "تم بيع جميع الكميات" : language === "ku" ? "هەموو بڕەکە فرۆشرا" : "تم بيع جميع الكميات"}</p>
                </div>
              );
            }

            // Show action tabs but disabled if user has purchased
            if (hasPurchased) {
              return (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
                    <p className="text-blue-700 font-semibold">
                      {language === "ar" ? "لقد قمت بشراء هذا المنتج" : language === "ku" ? "تۆ ئەم بەرهەمەت کڕیوە" : "لقد قمت بشراء هذا المنتج"}
                    </p>
                    <p className="text-blue-600 text-sm">
                      {language === "ar" ? "لا يمكنك الشراء مرة أخرى" : language === "ku" ? "ناتوانیت دووبارە بیکڕیت" : "لا يمكنك الشراء مرة أخرى"}
                    </p>
                  </div>
                  {/* Show disabled action buttons */}
                  <Button 
                    disabled 
                    size="lg" 
                    className="w-full h-14 text-lg font-bold bg-primary/50"
                    data-testid="button-buy-now-disabled"
                  >
                    {language === "ar" ? "اشتر الآن" : language === "ku" ? "ئێستا بیکڕە" : "اشتر الآن"}
                  </Button>
                  {product.isNegotiable && (
                    <Button 
                      disabled 
                      variant="outline" 
                      size="lg" 
                      className="w-full h-14 text-lg"
                      data-testid="button-make-offer-disabled"
                    >
                      {t("makeOffer")}
                    </Button>
                  )}
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
                          <p className="text-green-700 font-bold">{language === "ar" ? "أنت صاحب أعلى مزايدة! 🎉" : language === "ku" ? "تۆ بەرزترین مزایدەکاریت! 🎉" : "أنت صاحب أعلى مزايدة! 🎉"}</p>
                          <p className="text-green-600 text-sm">{language === "ar" ? "مزايدتك الحالية:" : language === "ku" ? "مزایدەی ئێستات:" : "مزايدتك الحالية:"} {(liveBidData?.currentBid || product.currentBid || product.price).toLocaleString()} {t("iqd")}</p>
                        </div>
                      </div>
                    )}

                    {/* Outbid notification - RED alert */}
                    {wasOutbid && !isWinning && (
                      <div className="bg-red-50 border-2 border-red-500 p-4 rounded-xl flex items-center gap-3 shadow-lg animate-pulse" data-testid="outbid-banner">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                        <div>
                          <p className="text-red-700 font-bold text-lg">{language === "ar" ? "⚠️ تم تجاوز مزايدتك!" : language === "ku" ? "⚠️ مزایدەکەت تێپەڕێندرا!" : "⚠️ تم تجاوز مزايدتك!"}</p>
                          <p className="text-red-600 text-sm">{language === "ar" ? "قم بزيادة مزايدتك الآن للفوز بالمزاد" : language === "ku" ? "ئێستا مزایدەکەت زیاد بکە بۆ بردنەوەی مزایدە" : "قم بزيادة مزايدتك الآن للفوز بالمزاد"}</p>
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
                      <h3 className="text-xl font-bold text-gray-700">{t("auctionEnded")}</h3>
                      
                      {auctionEnded?.status === "sold" || (listing && !listing.isActive && product.totalBids > 0) ? (
                        <div className="space-y-2">
                          <p className="text-gray-600">
                            {auctionEnded?.winnerId === user?.id ? (
                              <span className="text-green-600 font-bold">{language === "ar" ? "🎉 مبروك! لقد فزت بهذا المزاد" : language === "ku" ? "🎉 پیرۆز بێت! تۆ براوەی ئەم مزایدەیە بویت" : "🎉 مبروك! لقد فزت بهذا المزاد"}</span>
                            ) : (
                              <span>{language === "ar" ? "الفائز:" : language === "ku" ? "براوە:" : "الفائز:"} {auctionEnded?.winnerName || (language === "ar" ? "مشتري" : language === "ku" ? "کڕیار" : "مشتري")}</span>
                            )}
                          </p>
                          <p className="text-2xl font-bold text-primary">
                            {(auctionEnded?.winningBid || product.currentBid || product.price).toLocaleString()} {t("iqd")}
                          </p>
                          {auctionEnded?.winnerId === user?.id && (
                            <Button 
                              className="mt-4"
                              onClick={() => navigate("/checkout")}
                              data-testid="button-proceed-payment"
                            >
                              {language === "ar" ? "إتمام عملية الدفع" : language === "ku" ? "تەواوکردنی پارەدان" : "إتمام عملية الدفع"}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-600">
                          {language === "ar" ? "انتهى هذا المزاد بدون مزايدات" : language === "ku" ? "ئەم مزایدەیە بەبێ مزایدەکار تەواو بوو" : "انتهى هذا المزاد بدون مزايدات"}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Auction Bidding - Show for active auction items */}
                {product.saleType === "auction" && listing?.isActive && !auctionEnded && (
                  isAuthenticated && !user?.phoneVerified ? (
                    <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="w-5 h-5 text-amber-600" />
                        <span className="font-bold text-amber-800 dark:text-amber-400">
                          {language === "ar" ? "التحقق من الهاتف مطلوب" : language === "ku" ? "پشتڕاستکردنەوەی مۆبایل پێویستە" : "التحقق من الهاتف مطلوب"}
                        </span>
                      </div>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                        {language === "ar" ? "يجب التحقق من رقم هاتفك عبر واتساب للمزايدة على هذا المنتج" : language === "ku" ? "دەبێت ژمارەی مۆبایلەکەت بە واتسئاپ پشتڕاست بکەیتەوە بۆ مزایدەکردن لەم بەرهەمە" : "يجب التحقق من رقم هاتفك عبر واتساب للمزايدة على هذا المنتج"}
                      </p>
                      <Button 
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-12"
                        onClick={() => setPhoneVerificationOpen(true)}
                        data-testid="button-verify-phone-to-bid"
                      >
                        <ShieldCheck className="w-5 h-5 ml-2" />
                        {language === "ar" ? "التحقق من الهاتف للمزايدة" : language === "ku" ? "پشتڕاستکردنەوەی مۆبایل بۆ مزایدە" : "التحقق من الهاتف للمزايدة"}
                      </Button>
                    </div>
                  ) : (
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
                      onRequirePhoneVerification={() => setPhoneVerificationOpen(true)}
                      onBidSuccess={() => setWasOutbid(false)}
                      isWinning={!!isWinning}
                      isAuthLoading={isAuthLoading}
                      phoneVerified={user?.phoneVerified || false}
                      allowedBidderType={listing?.allowedBidderType}
                    />
                  )
                )}

                {/* Buy Now Option for Auctions with buyNowPrice */}
                {product.saleType === "auction" && listing?.isActive && !auctionEnded && product.buyNowPrice && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-green-600" />
                        <span className="font-bold text-green-800 dark:text-green-400">{language === "ar" ? "اشتر الآن" : language === "ku" ? "ئێستا بیکڕە" : "اشتر الآن"}</span>
                      </div>
                      <span className="text-2xl font-bold text-green-700 dark:text-green-300">{product.buyNowPrice.toLocaleString()} {t("iqd")}</span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400 mb-3">
                      {language === "ar" ? "تخطى المزاد واشتر المنتج فوراً بهذا السعر" : language === "ku" ? "لە مزایدە تێپەڕە و بەرهەمەکە ئێستا بکڕە بەم نرخە" : "تخطى المزاد واشتر المنتج فوراً بهذا السعر"}
                    </p>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12"
                      onClick={handleBuyNowDirect}
                      disabled={!!isPurchaseDisabled || isBuyingNow}
                      data-testid="button-auction-buy-now"
                    >
                      {isBuyingNow ? (
                        <>
                          <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                          {language === "ar" ? "جاري المعالجة..." : language === "ku" ? "چاوەڕێ بکە..." : "جاري المعالجة..."}
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5 ml-2" />
                          {language === "ar" ? `إتمام الطلب بـ ${product.buyNowPrice.toLocaleString()} د.ع` : `تەواوکردنی داواکاری بە ${product.buyNowPrice.toLocaleString()} د.ع`}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Fixed Price Buttons */}
                {product.saleType !== "auction" && (
                  listing?.isActive ? (
                    <>
                      {isAuthenticated && !user?.phoneVerified ? (
                        <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                          <div className="flex items-center gap-2 mb-3">
                            <ShieldCheck className="w-5 h-5 text-amber-600" />
                            <span className="font-bold text-amber-800 dark:text-amber-400">
                              {language === "ar" ? "التحقق من الهاتف مطلوب" : language === "ku" ? "پشتڕاستکردنەوەی مۆبایل پێویستە" : "التحقق من الهاتف مطلوب"}
                            </span>
                          </div>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                            {language === "ar" ? "يجب التحقق من رقم هاتفك عبر واتساب للشراء" : language === "ku" ? "دەبێت ژمارەی مۆبایلەکەت بە واتسئاپ پشتڕاست بکەیتەوە بۆ کڕین" : "يجب التحقق من رقم هاتفك عبر واتساب للشراء"}
                          </p>
                          <Button 
                            size="lg"
                            className="w-full h-14 text-lg font-bold bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => setPhoneVerificationOpen(true)}
                            data-testid="button-verify-phone-to-buy"
                          >
                            <ShieldCheck className="w-5 h-5 ml-2" />
                            {language === "ar" ? "التحقق من الهاتف للشراء" : language === "ku" ? "پشتڕاستکردنەوەی مۆبایل بۆ کڕین" : "التحقق من الهاتف للشراء"}
                          </Button>
                        </div>
                      ) : (
                        <>
                        <Button 
                          size="lg" 
                          className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90"
                          onClick={handleBuyNowDirect}
                          disabled={!!isPurchaseDisabled || isBuyingNow}
                          data-testid="button-buy-now"
                        >
                          {isPurchaseDisabled || isBuyingNow ? (
                            <>
                              <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                              {language === "ar" ? "جاري المعالجة..." : language === "ku" ? "چاوەڕێ بکە..." : "جاري المعالجة..."}
                            </>
                          ) : (
                            language === "ar" ? "إتمام الطلب" : language === "ku" ? "تەواوکردنی داواکاری" : "إتمام الطلب"
                          )}
                        </Button>
                        </>
                      )}

                      <Button 
                        variant="outline"
                        size="lg" 
                        className="w-full h-14 text-lg font-medium"
                        onClick={handleAddCart}
                        disabled={isAdding || !!isPurchaseDisabled}
                        data-testid="button-add-cart"
                      >
                        {isAdding ? t("loading") : t("addToCart")}
                      </Button>

                      {product.isNegotiable && (
                        <Button 
                          variant="outline"
                          size="lg" 
                          className="w-full h-14 text-lg font-medium"
                          onClick={() => {
                            if (!requireAuth("offer")) return;
                            const needsPhoneVerification = !!user && !user.phoneVerified;
                            if (needsPhoneVerification) {
                              setPendingOfferAfterVerify(true);
                              setPhoneVerificationOpen(true);
                              return;
                            }
                            setOfferAmount(Math.floor(product.price * 0.9).toString());
                            setOfferDialogOpen(true);
                          }}
                          data-testid="button-make-offer"
                        >
                          {!!user && !user.phoneVerified
                            ? (language === "ar" ? "وثّق الهاتف لتقديم عرض" : language === "ku" ? "پشتڕاستکردنەوەی مۆبایل بۆ پێشنیار" : "وثّق الهاتف لتقديم عرض")
                            : t("makeOffer")}
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-6 text-center" data-testid="sold-banner">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                          <ShieldCheck className="h-8 w-8 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-700">{t("sold")}</h3>
                        <p className="text-gray-600">{language === "ar" ? "تم بيع هذا المنتج" : language === "ku" ? "ئەم بەرهەمە فرۆشرا" : "تم بيع هذا المنتج"}</p>
                        <p className="text-lg font-bold text-gray-700">{(product.currentBid || product.price).toLocaleString()} {t("iqd")}</p>
                      </div>
                    </div>
                  )
                )}


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
                    {language === "ar" ? "الإبلاغ عن هذا المنتج" : language === "ku" ? "ڕاپۆرتکردنی ئەم بەرهەمە" : "الإبلاغ عن هذا المنتج"}
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
                <span className="text-amber-700 font-medium">{language === "ar" ? `متبقي ${remainingQuantity} قطعة فقط!` : `تەنها ${remainingQuantity} دانە ماوە!`}</span>
              </div>
            );
          }
          return null;
        })()}


{/* Description + Delivery & Location */}
        <div className="py-4 border-t">
          <h2 className="font-bold text-lg mb-3">{t("description")}</h2>
          <p className="text-gray-600 leading-relaxed text-sm mb-4">
            {product.description || (language === "ar" ? "لا يوجد وصف متوفر لهذا المنتج." : language === "ku" ? "هیچ وەسفێک بۆ ئەم بەرهەمە بەردەست نییە." : "لا يوجد وصف متوفر لهذا المنتج.")}
          </p>
          {/* Delivery & Location details */}
          <div className="space-y-2 text-sm border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">{t("delivery")}</span>
              <span className="font-medium">{product.deliveryWindow || (language === "ar" ? "3-5 أيام" : language === "ku" ? "٣-٥ ڕۆژ" : "3-5 أيام")}</span>
            </div>
            {product?.internationalShipping && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {language === "ar" ? "شحن دولي" : language === "ku" ? "گواستنەوەی نێودەوڵەتی" : "شحن دولي"}
                </span>
                <span className="font-medium text-green-600">
                  {language === "ar" ? "متاح" : language === "ku" ? "بەردەستە" : "available"}
                </span>
              </div>
            )}
            {product.city && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t("location")}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{product.city}</span>
                  {product.locationLat && product.locationLng && (
                    <a
                      href={product.mapUrl || `https://www.google.com/maps?q=${product.locationLat},${product.locationLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                      data-testid="link-google-maps"
                    >
                      <MapPin className="h-3 w-3" />
                      {language === "ar" ? "الموقع" : language === "ku" ? "شوێن" : "الموقع"}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Share - Compact row */}
        <div className="py-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium">{language === "ar" ? "مشاركة:" : language === "ku" ? "هاوبەشکردن:" : "مشاركة:"}</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => shareToWhatsApp(window.location.href, `${product.title} - ${product.price.toLocaleString()} د.ع`)}
                className="h-8 w-8 rounded-full bg-green-50 hover:bg-green-100 border border-green-200 flex items-center justify-center transition-colors"
                data-testid="button-share-whatsapp-main"
              >
                <svg className="h-3.5 w-3.5 text-green-700" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </button>
              <button
                onClick={() => shareToFacebook(window.location.href)}
                className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center justify-center transition-colors"
                data-testid="button-share-facebook-main"
              >
                <svg className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </button>
              <button
                onClick={() => shareToTwitter(window.location.href, `${product.title} - ${product.price.toLocaleString()} د.ع`)}
                className="h-8 w-8 rounded-full bg-sky-50 hover:bg-sky-100 border border-sky-200 flex items-center justify-center transition-colors"
                data-testid="button-share-twitter-main"
              >
                <svg className="h-3.5 w-3.5 text-sky-500" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </button>
              <button
                onClick={() => shareToTelegram(window.location.href, `${product.title} - ${product.price.toLocaleString()} د.ع`)}
                className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-300 flex items-center justify-center transition-colors"
                data-testid="button-share-telegram-main"
              >
                <svg className="h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: language === "ar" ? "تم النسخ" : language === "ku" ? "کۆپی کرا" : "تم النسخ", description: language === "ar" ? "تم نسخ رابط المنتج" : language === "ku" ? "لینکی بەرهەم کۆپی کرا" : "تم نسخ رابط المنتج" }); }}
                className="h-8 w-8 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center transition-colors"
                data-testid="button-copy-link-main"
              >
                <Share2 className="h-3.5 w-3.5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

{/* Tags Section */}
        {product.tags && product.tags.length > 0 && (
          <div className="py-4 border-t">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              {language === "ar" ? "الكلمات المفتاحية" : language === "ku" ? "ووشە سەرەکییەکان" : "الكلمات المفتاحية"}
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
        <div className="py-3 border-t">
          <h2 className="font-bold text-lg mb-2">{language === "ar" ? "المواصفات" : language === "ku" ? "تایبەتمەندییەکان" : "المواصفات"}</h2>
          <div className="divide-y divide-gray-100 text-sm">
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">{t("category")}</span>
              <span className="font-medium">{product.category}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">{t("productCode")}</span>
              <span className="font-medium text-xs">{product.productCode}</span>
            </div>
            {listing?.specifications && Object.entries(listing.specifications).map(([key, value]) => {
              if (value == null || value === "") return null;
              const label = SPECIFICATION_LABELS[key as keyof typeof SPECIFICATION_LABELS]?.[language === "ar" ? "ar" : "ku"] ?? key;
              return (
                <div key={key} className="flex justify-between py-1.5">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium">{(() => {
                    const opts = SPECIFICATION_OPTIONS[key as keyof typeof SPECIFICATION_OPTIONS] as Array<{ value: string; labelAr: string; labelKu: string }> | undefined;
                    if (opts) {
                      const match = opts.find((o) => o.value === String(value));
                      if (match) return language === "ar" ? match.labelAr : match.labelKu;
                    }
                    return String(value);
                  })()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* More from this Seller — horizontal scroll */}
        {(() => {
          const sellerItems = (sellerListingsData?.listings || []).filter((l) => l.id !== params?.id);
          if (sellerItems.length === 0) return null;
          return (
            <div className="py-6 border-t">
              <h2 className="font-bold text-lg mb-3">{language === "ar" ? "المزيد من هذا البائع" : language === "ku" ? "زیاتر لە ئەم فرۆشیارە" : "المزيد من هذا البائع"}</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {sellerItems.slice(0, 8).map((item) => (
                  <Link key={item.id} href={`/product/${item.id}`} className="flex-shrink-0 w-36 group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
                      <img src={item.images?.[0] || ""} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    </div>
                    <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">{item.title}</p>
                    <p className="text-xs font-bold mt-0.5">{(item.currentBid || item.price).toLocaleString()} د.ع</p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Similar Items — grid */}
        {(() => {
          const items = similarData?.similar || [];
          if (items.length === 0) return null;
          return (
            <div className="py-6 border-t">
              <h2 className="font-bold text-lg mb-3">{language === "ar" ? "منتجات مشابهة" : language === "ku" ? "بەرهەمی هاوشێوە" : "منتجات مشابهة"}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {items.slice(0, 8).map((item) => (
                  <Link key={item.id} href={`/product/${item.id}`} className="group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
                      <img src={item.image || ""} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    </div>
                    <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">{item.title}</p>
                    <p className="text-xs font-bold mt-0.5">{(item.currentBid || item.price).toLocaleString()} د.ع</p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

      </div>

      {/* Sticky Bottom CTA Bar — appears when main action buttons scroll off-screen */}
      {showStickyBar && !isOwnProduct && listing?.isActive && (() => {
        const remainingQuantity = product.quantityAvailable - product.quantitySold;
        if (remainingQuantity <= 0) return null;
        return (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg px-4 py-3 flex items-center gap-3 safe-area-bottom">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold truncate">
                {product.saleType === "auction"
                  ? `${(liveBidData?.currentBid || product.currentBid || product.price).toLocaleString()} د.ع`
                  : `${product.price.toLocaleString()} د.ع`}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {product?.shippingType === "buyer_pays"
                  ? `+ ${(product?.shippingCost || 0).toLocaleString()} ${language === "ar" ? "شحن" : "گواستنەوە"}`
                  : product?.shippingType === "pickup"
                    ? (language === "ar" ? "استلام" : "وەرگرتن")
                    : (language === "ar" ? "شحن مجاني" : "گواستنەوەی بەخۆڕایی")}
              </p>
            </div>
            <Button
              size="lg"
              className="h-12 px-6 text-base font-bold bg-primary hover:bg-primary/90 whitespace-nowrap"
              onClick={product.saleType === "auction" ? () => actionButtonsRef.current?.scrollIntoView({ behavior: "smooth" }) : handleBuyNowDirect}
              disabled={!!isPurchaseDisabled || isBuyingNow}
            >
              {product.saleType === "auction"
                ? (language === "ar" ? "المزايدة" : language === "ku" ? "مزایدە" : "المزايدة")
                : (language === "ar" ? "اشتر الآن" : language === "ku" ? "ئێستا بیکڕە" : "اشتر الآن")}
            </Button>
          </div>
        );
      })()}

      {/* Make an Offer Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">{language === "ar" ? "تقديم عرض سعر" : language === "ku" ? "پێشکەشکردنی نرخ" : "تقديم عرض سعر"}</DialogTitle>
            <DialogDescription className="text-right">
              {language === "ar" 
                ? `قدّم عرضك للبائع. السعر المطلوب: ${product?.price.toLocaleString()} د.ع`
                : `پێشنیارەکەت پێشکەش بکە بۆ فرۆشیار. نرخی داواکراو: ${product?.price.toLocaleString()} د.ع`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="offer-amount">{language === "ar" ? "عرضك (د.ع)" : language === "ku" ? "پێشنیارەکەت (د.ع)" : "عرضك (د.ع)"}</Label>
              <Input
                id="offer-amount"
                type="number"
                placeholder={language === "ar" ? "أدخل السعر المقترح" : language === "ku" ? "نرخی پێشنیارکراو بنووسە" : "أدخل السعر المقترح"}
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
                      {language === "ar" 
                        ? `أقل من السعر المطلوب بـ ${((1 - parseInt(offerAmount) / product.price) * 100).toFixed(0)}%`
                        : `${((1 - parseInt(offerAmount) / product.price) * 100).toFixed(0)}% کەمتر لە نرخی داواکراو`}
                    </span>
                  ) : (
                    <span className="text-green-600">
                      {language === "ar" ? "يساوي أو أعلى من السعر المطلوب" : language === "ku" ? "یەکسانە یان بەرزترە لە نرخی داواکراو" : "يساوي أو أعلى من السعر المطلوب"}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-message">{language === "ar" ? "رسالة للبائع (اختياري)" : language === "ku" ? "نامە بۆ فرۆشیار (هەڵبژاردەیی)" : "رسالة للبائع (اختياري)"}</Label>
              <Textarea
                id="offer-message"
                placeholder={language === "ar" ? "أضف رسالة توضيحية..." : language === "ku" ? "نامەیەکی ڕوونکەرەوە زیاد بکە..." : "أضف رسالة توضيحية..."}
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
              {t("cancel")}
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
                  {t("loading")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 ml-2" />
                  {t("sendOffer")}
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
            <DialogTitle className="text-right">{language === "ar" ? "الإبلاغ عن المنتج" : language === "ku" ? "ڕاپۆرتکردنی بەرهەم" : "الإبلاغ عن المنتج"}</DialogTitle>
            <DialogDescription className="text-right">
              {language === "ar" ? "ساعدنا في الحفاظ على أمان المنصة بالإبلاغ عن المحتوى المخالف" : language === "ku" ? "یارمەتیمان بدە لە پاراستنی ئاسایشی پلاتفۆڕمەکە بە ڕاپۆرتکردنی ناوەڕۆکی خلافکار" : "ساعدنا في الحفاظ على أمان المنصة بالإبلاغ عن المحتوى المخالف"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">{language === "ar" ? "سبب البلاغ" : language === "ku" ? "هۆکاری ڕاپۆرت" : "سبب البلاغ"}</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger data-testid="select-report-reason">
                  <SelectValue placeholder={language === "ar" ? "اختر سبب البلاغ" : language === "ku" ? "هۆکاری ڕاپۆرت هەڵبژێرە" : "اختر سبب البلاغ"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fake">{language === "ar" ? "منتج مزيف أو مقلد" : language === "ku" ? "بەرهەمی ساختە یان لەبەرگیراو" : "منتج مزيف أو مقلد"}</SelectItem>
                  <SelectItem value="scam">{language === "ar" ? "احتيال أو نصب" : language === "ku" ? "فێڵ یان ساختەکاری" : "احتيال أو نصب"}</SelectItem>
                  <SelectItem value="inappropriate">{language === "ar" ? "محتوى غير لائق" : language === "ku" ? "ناوەڕۆکی نەشیاو" : "محتوى غير لائق"}</SelectItem>
                  <SelectItem value="stolen">{language === "ar" ? "منتج مسروق" : language === "ku" ? "بەرهەمی دزراو" : "منتج مسروق"}</SelectItem>
                  <SelectItem value="misleading">{language === "ar" ? "وصف مضلل" : language === "ku" ? "وەسفی چەواشەکار" : "وصف مضلل"}</SelectItem>
                  <SelectItem value="prohibited">{language === "ar" ? "منتج محظور" : language === "ku" ? "بەرهەمی قەدەغەکراو" : "منتج محظور"}</SelectItem>
                  <SelectItem value="other">{language === "ar" ? "سبب آخر" : language === "ku" ? "هۆکارێکی تر" : "سبب آخر"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-details">{language === "ar" ? "تفاصيل إضافية (اختياري)" : language === "ku" ? "وردەکاری زیادە (هەڵبژاردەیی)" : "تفاصيل إضافية (اختياري)"}</Label>
              <Textarea
                id="report-details"
                placeholder={language === "ar" ? "أضف تفاصيل تساعدنا في فهم المشكلة..." : language === "ku" ? "وردەکاری زیادە زیاد بکە کە یارمەتیمان بدات لە تێگەیشتنی کێشەکە..." : "أضف تفاصيل تساعدنا في فهم المشكلة..."}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
                data-testid="input-report-details"
              />
            </div>
            {/* Evidence photos */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "صور توضيحية (اختياري، حتى 5 صور)" : language === "ku" ? "وێنەی بەڵگە (هەڵبژاردەیی، تا 5 وێنە)" : "صور توضيحية (اختياري، حتى 5 صور)"}</Label>
              <div className="flex flex-wrap gap-2">
                {reportImages.map((img, i) => (
                  <div key={i} className="relative w-16 h-16">
                    <img src={img} alt="" className="w-16 h-16 object-cover rounded border" />
                    <button onClick={() => setReportImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">×</button>
                  </div>
                ))}
                {reportImages.length < 5 && (
                  <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-primary text-gray-400 text-2xl">
                    {reportUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : "+"}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) handleReportImageUpload(e.target.files[0]); e.target.value = ""; }} />
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setReportDialogOpen(false)}
              data-testid="button-cancel-report"
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!listing?.id || !reportReason) return;
                reportMutation.mutate({
                  reportType: "listing",
                  targetId: listing.id,
                  targetType: "listing",
                  reason: reportReason,
                  details: reportDetails || undefined,
                  images: reportImages.length > 0 ? reportImages : undefined,
                });
              }}
              disabled={!reportReason || reportMutation.isPending || reportUploading}
              data-testid="button-submit-report"
            >
              {reportMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  {t("loading")}
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4 ml-2" />
                  {language === "ar" ? "إرسال البلاغ" : language === "ku" ? "ناردنی ڕاپۆرت" : "إرسال البلاغ"}
                </>
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

      {/* Buy Now Confirmation Dialog */}
      <AlertDialog open={buyNowDialogOpen} onOpenChange={setBuyNowDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{language === "ar" ? "تأكيد الطلب" : language === "ku" ? "دڵنیاکردنەوەی داواکاری" : "تأكيد الطلب"}</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {language === "ar" ? "سيتم إنشاء الطلب. الدفع عند الاستلام. سيتم مراجعة الطلب من قبل البائع. سيتم إشعارك عند قبول الطلب." : language === "ku" ? "داواکاری دروست دەکرێت. پارەدان لە کاتی وەرگرتندا. داواکاری لەلایەن فرۆشیارەوە پشکنین دەکرێت. کاتێک داواکاری قبوڵ کرا ئاگاداری دەکرێیتەوە." : "سيتم إنشاء الطلب. الدفع عند الاستلام. سيتم مراجعة الطلب من قبل البائع. سيتم إشعارك عند قبول الطلب."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900">
              {language === "ar" ? "الدفع: نقداً عند الاستلام" : language === "ku" ? "پارەدان: بە پارەی نەقد لە کاتی وەرگرتندا" : "الدفع: نقداً عند الاستلام"}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {language === "ar" ? "المراجعة: 1-2 يوم | الشحن: 3-5 أيام" : language === "ku" ? "پشکنین: 1-2 ڕۆژ | ناردن: 3-5 ڕۆژ" : "المراجعة: 1-2 يوم | الشحن: 3-5 أيام"}
            </p>
          </div>
          <AlertDialogFooter className="flex gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isBuyingNow}>
              {language === "ar" ? "إلغاء" : language === "ku" ? "هەڵوەشاندنەوە" : "إلغاء"}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBuyNow}
              disabled={isBuyingNow}
              className="bg-primary hover:bg-primary/90"
            >
              {isBuyingNow ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  {language === "ar" ? "جاري المعالجة..." : language === "ku" ? "چاوەڕێ بکە..." : "جاري المعالجة..."}
                </>
              ) : (
                language === "ar" ? "تأكيد الطلب" : language === "ku" ? "دڵنیاکردنەوە" : "تأكيد الطلب"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mandatory Phone Verification Modal */}
      <MandatoryPhoneVerificationModal
        open={phoneVerificationOpen}
        onOpenChange={setPhoneVerificationOpen}
        onVerified={() => {
          // Seamless flow: reopen offer dialog if user clicked "offer" while unverified
          if (pendingOfferAfterVerify && product) {
            setPendingOfferAfterVerify(false);
            setOfferAmount(Math.floor(product.price * 0.9).toString());
            setOfferDialogOpen(true);
          }
        }}
      />

      </Layout>
  );
}
