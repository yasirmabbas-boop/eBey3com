import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { secureRequest } from "@/lib/queryClient";
import { Loader2, Lock } from "lucide-react";
import type { Listing, Offer, Message } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ShippingLabel } from "@/components/shipping-label";
import { Logo } from "@/components/logo";
import {
  Package,
  Plus,
  DollarSign,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Printer,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  Gavel,
  BarChart3,
  Users,
  Star,
  MapPin,
  HandCoins,
  MessageSquare,
  Truck,
  ExternalLink,
  ArrowRight,
  Menu,
  LogOut,
  Bell,
  RotateCcw,
  XCircle,
  Upload,
  Download,
  FileSpreadsheet,
  Wallet,
  Calendar,
  TrendingDown,
  BanknoteIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  Share2,
  Copy,
  Instagram,
} from "lucide-react";
import { shareToFacebook, shareToWhatsApp, shareToTelegram } from "@/lib/share-utils";
import { resolveTabFromUrl, getActivitySectionFromDeepLink } from "@/lib/tab-migration";
import { useFeatureFlag } from "@/lib/feature-flags";
import { NeedsAttentionSection } from "@/components/seller/needs-attention-section";
import { ConsolidatedTabs, ConsolidatedTabName } from "@/components/seller/consolidated-tabs";
import { SellerBottomNav } from "@/components/seller/seller-bottom-nav";
import { PerformanceCard } from "@/components/seller/performance-card";
import { useDeepLinkScroll } from "@/hooks/use-deep-link-scroll";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ErrorBoundary } from "@/components/error-boundary";
import { SellerOnboarding } from "@/components/seller/seller-onboarding";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface SellerProduct {
  id: string;
  title: string;
  price: number;
  image: string;
  status: string;
  type: string;
  views: number;
  bids?: number;
  currentBid?: number;
  endDate?: string;
  soldDate?: string;
  finalPrice?: number;
  category: string;
  productCode: string;
  quantityAvailable: number;
  quantitySold: number;
  saleType?: string;
  auctionEndTime?: string;
  buyer?: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    city?: string;
    district?: string;
  };
}

interface SellerOrder {
  id: string;
  listingId: string;
  amount: number;
  status: string;
  deliveryStatus: string;
  createdAt: string;
  completedAt?: string;
  buyerRating?: number;
  issueType?: string;
  listing?: {
    id: string;
    title: string;
    price: number;
    images: string[];
    productCode?: string;
  };
  buyer?: {
    id: string;
    name: string;
    phone?: string;
    city?: string;
    district?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
}

interface SellerMessage extends Message {
  senderName: string;
  listingTitle: string | null;
  listingImage: string | null;
}

interface SellerReturnRequest {
  id: string;
  transactionId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  reason: string;
  details?: string;
  status: string;
  sellerResponse?: string;
  createdAt: string;
  respondedAt?: string;
  listing?: {
    id: string;
    title: string;
    images: string[];
  };
  buyer?: {
    id: string;
    displayName: string;
    phone?: string;
  };
}

const getStatusBadge = (status: string, language: "ar" | "ku" | "en") => {
  const labels = {
    active: { ar: "نشط", ku: "چالاک", en: "Active" },
    sold: { ar: "مباع", ku: "فرۆشرا", en: "Sold" },
    pending_shipment: { ar: "بانتظار الشحن", ku: "چاوەڕێی ناردن", en: "Pending Shipment" },
    shipped: { ar: "تم الشحن", ku: "نێردرا", en: "Shipped" },
    draft: { ar: "مسودة", ku: "ڕەشنووس", en: "Draft" },
  };
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-50 text-emerald-700 border-0">{labels.active[language]}</Badge>;
    case "sold":
      return <Badge className="bg-blue-50 text-blue-700 border-0">{labels.sold[language]}</Badge>;
    case "pending_shipment":
      return <Badge className="bg-amber-50 text-amber-700 border-0">{labels.pending_shipment[language]}</Badge>;
    case "shipped":
      return <Badge className="bg-violet-50 text-violet-700 border-0">{labels.shipped[language]}</Badge>;
    case "draft":
      return <Badge className="bg-muted text-muted-foreground border-0">{labels.draft[language]}</Badge>;
    default:
      return null;
  }
};

const getDeliveryBadge = (status: string, language: "ar" | "ku" | "en") => {
  const labels = {
    pending_payment: { ar: "بانتظار الدفع", ku: "چاوەڕێی پارەدان", en: "Pending Payment" },
    pending_shipment: { ar: "بانتظار الشحن", ku: "چاوەڕێی ناردن", en: "Pending Shipment" },
    shipped: { ar: "تم الشحن", ku: "نێردرا", en: "Shipped" },
    delivered: { ar: "تم التسليم", ku: "گەیەندرا", en: "Delivered" },
  };
  switch (status) {
    case "pending_payment":
      return <Badge className="bg-amber-50 text-amber-700 border-0">{labels.pending_payment[language]}</Badge>;
    case "pending":
    case "processing":
      return <Badge className="bg-amber-50 text-amber-700 border-0">{labels.pending_shipment[language]}</Badge>;
    case "shipped":
      return <Badge className="bg-blue-50 text-blue-700 border-0">{labels.shipped[language]}</Badge>;
    case "delivered":
    case "completed":
      return <Badge className="bg-emerald-50 text-emerald-700 border-0">{labels.delivered[language]}</Badge>;
    default:
      return <Badge className="bg-muted text-muted-foreground border-0">{status}</Badge>;
  }
};

const getTypeBadge = (type: string, language: "ar" | "ku" | "en") => {
  const labels = {
    auction: { ar: "مزاد", ku: "مزایدە", en: "Auction" },
    fixed: { ar: "سعر ثابت", ku: "نرخی جێگیر", en: "Fixed Price" },
  };
  return type === "auction" ? (
    <Badge variant="outline" className="border-primary text-primary">
      <Gavel className="h-3 w-3 ml-1" />
      {labels.auction[language]}
    </Badge>
  ) : (
    <Badge variant="outline" className="border-emerald-600 text-emerald-600">
      <ShoppingBag className="h-3 w-3 ml-1" />
      {labels.fixed[language]}
    </Badge>
  );
};

function OfferCountdown({ expiresAt }: { expiresAt: string | Date }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("منتهي");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`${hours} ساعة و ${minutes} دقيقة متبقية`);
      } else {
        setTimeLeft(`${minutes} دقيقة متبقية`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <p className={`text-xs mt-1 flex items-center gap-1 ${isExpired ? "text-red-500" : "text-orange-500"}`}>
      <Clock className="h-3 w-3" />
      {timeLeft}
    </p>
  );
}

export default function SellerDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const [location, navigate] = useLocation();
  
  // Feature flags for gradual rollout
  const showV2Dashboard = useFeatureFlag('seller_dashboard_v2');
  const showConsolidatedTabs = useFeatureFlag('seller_consolidated_tabs');
  const showMobileNav = useFeatureFlag('seller_mobile_nav');
  const showAnalytics = useFeatureFlag('seller_analytics');
  
  // Deep link scroll and highlight
  const { scrollToElement } = useDeepLinkScroll();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("products");
  const [activitySubTab, setActivitySubTab] = useState<"messages" | "offers" | "returns">("messages");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [salesFilter, setSalesFilter] = useState("all");
  const [timePeriod, setTimePeriod] = useState<"7" | "30" | "all">("30");
  const [quickFilter, setQuickFilter] = useState<"pending_shipment" | "needs_reply" | "ending_soon" | "none">("none");
  const [showShippingLabel, setShowShippingLabel] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProductId, setStockProductId] = useState<string | null>(null);
  const [newStockQuantity, setNewStockQuantity] = useState("");
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [deepLinkOrderId, setDeepLinkOrderId] = useState<string | null>(null);
  const [deepLinkOfferId, setDeepLinkOfferId] = useState<string | null>(null);
  const [deepLinkReturnId, setDeepLinkReturnId] = useState<string | null>(null);
  const [deepLinkListingId, setDeepLinkListingId] = useState<string | null>(null);

  // Handle deep linking from notifications with backward compatibility
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get("tab");
    const section = params.get("section"); // New: sub-tab support for activity
    const orderId = params.get("orderId");
    const offerId = params.get("offerId");
    const returnId = params.get("returnId");
    const listingId = params.get("listingId");
    
    // Use tab migration system for backward compatibility with legacy URLs
    const resolved = resolveTabFromUrl(urlTab);
    
    if (urlTab) {
      // Map resolved tab to current UI tab names
      // Phase 2 will use consolidated tabs directly; for now we use legacy names
      const currentTabMap: Record<string, string> = {
        'inventory': 'products',  // Phase 2: will use 'inventory' directly
        'activity': 'messages',   // Phase 2: will use 'activity' with sub-tabs
        'orders': 'sales',        // Phase 2: will use 'orders'
        'earnings': 'wallet',     // Phase 2: will use 'earnings'
      };
      
      // Map the resolved tab to current UI, or keep original if not in map
      const tabToSet = currentTabMap[resolved.tab] || urlTab;
      setActiveTab(tabToSet);
      
      // Handle activity sub-section
      if (resolved.section || section) {
        setActivitySubTab((resolved.section || section) as "messages" | "offers" | "returns");
      }
    }
    
    // Handle deep link IDs
    if (orderId) setDeepLinkOrderId(orderId);
    if (offerId) {
      setDeepLinkOfferId(offerId);
      // Auto-navigate to offers tab/section when coming from offer notification
      const activitySection = getActivitySectionFromDeepLink(offerId, null);
      if (activitySection) setActivitySubTab(activitySection);
    }
    if (returnId) {
      setDeepLinkReturnId(returnId);
      // Auto-navigate to returns section when coming from return notification
      const activitySection = getActivitySectionFromDeepLink(null, returnId);
      if (activitySection) setActivitySubTab(activitySection);
    }
    if (listingId) setDeepLinkListingId(listingId);
    
    // Clear query params from URL without reloading
    if (urlTab || section || orderId || offerId || returnId || listingId) {
      window.history.replaceState({}, "", "/seller-dashboard");
    }
  }, [location]);

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["/api/listings", user?.id],
    queryFn: async () => {
      if (!user?.id) return { listings: [], pagination: null };
      const res = await fetch(`/api/listings?sellerId=${encodeURIComponent(user.id)}&limit=100`);
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 0,
  });
  
  const listings: Listing[] = Array.isArray(listingsData) 
    ? listingsData 
    : (listingsData?.listings || []);

  const { data: receivedOffers = [], isLoading: offersLoading } = useQuery<(Offer & { listing?: Listing; buyerName?: string })[]>({
    queryKey: ["/api/received-offers"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/received-offers", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch offers");
      return res.json();
    },
    enabled: !!user?.id && (user as any)?.sellerApproved,
  });

  const { data: sellerSummary } = useQuery<{
    totalListings: number;
    activeListings: number;
    totalSales: number;
    totalRevenue: number;
    pendingShipments: number;
    averageRating: number;
    ratingCount: number;
  }>({
    queryKey: ["/api/account/seller-summary"],
    enabled: !!user?.id && (user as any)?.sellerApproved,
    staleTime: 0,
  });

  const { data: sellerOrders = [], isLoading: ordersLoading } = useQuery<SellerOrder[]>({
    queryKey: ["/api/account/seller-orders"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/account/seller-orders", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: !!user?.id && (user as any)?.sellerApproved,
    staleTime: 0,
  });

  const { data: sellerMessages = [], isLoading: messagesLoading } = useQuery<SellerMessage[]>({
    queryKey: ["/api/seller-messages"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/seller-messages", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!user?.id && (user as any)?.sellerApproved,
  });

  const { data: returnRequests = [], isLoading: returnsLoading } = useQuery<SellerReturnRequest[]>({
    queryKey: ["/api/return-requests/seller"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/return-requests/seller", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch return requests");
      return res.json();
    },
    enabled: !!user?.id && (user as any)?.sellerApproved,
  });

  interface WalletBalance {
    pending: number;
    available: number;
    paid: number;
    total: number;
    freeSalesRemaining: number;
    nextPayoutDate: string;
    holdDays?: number;
  }

  interface WalletTransaction {
    id: string;
    transactionId: string;
    type: string;
    amount: number;
    description: string;
    status: string;
    createdAt: string;
  }

  interface WeeklyPayout {
    id: string;
    weekStartDate: string;
    weekEndDate: string;
    netPayout: number;
    status: string;
    paymentMethod?: string;
    paymentReference?: string;
    paidAt?: string;
  }

  const { data: walletBalance, isLoading: walletLoading } = useQuery<WalletBalance>({
    queryKey: ["/api/wallet/balance"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/wallet/balance", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch wallet balance");
      return res.json();
    },
    enabled: !!user?.id && (user as any)?.sellerApproved,
  });

  const { data: walletTransactions = [], isLoading: transactionsLoading } = useQuery<WalletTransaction[]>({
    queryKey: ["/api/wallet/transactions"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/wallet/transactions", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
    enabled: !!user?.id && (user as any)?.sellerApproved,
  });

  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<WeeklyPayout[]>({
    queryKey: ["/api/wallet/payouts"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/wallet/payouts", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch payouts");
      const data = await res.json();
      return data.payouts || [];
    },
    enabled: !!user?.id && (user as any)?.sellerApproved,
  });

  const [returnResponseOpen, setReturnResponseOpen] = useState(false);
  const [selectedReturnRequest, setSelectedReturnRequest] = useState<SellerReturnRequest | null>(null);
  const [returnResponseText, setReturnResponseText] = useState("");
  const [counterOfferDialogOpen, setCounterOfferDialogOpen] = useState(false);
  const [selectedOfferForCounter, setSelectedOfferForCounter] = useState<(Offer & { listing?: Listing }) | null>(null);
  const [counterOfferAmount, setCounterOfferAmount] = useState("");

  const returnResponseMutation = useMutation({
    mutationFn: async ({ id, status, sellerResponse }: { id: string; status: "approved" | "rejected"; sellerResponse?: string }) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/return-requests/${id}/respond`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ status, sellerResponse }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to respond to return request");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: language === "ar" ? "تم الرد على طلب الإرجاع" : "وەڵام درایەوە بۆ داواکاری گەڕاندنەوە",
        description: language === "ar" ? "تم إرسال ردك بنجاح" : "وەڵامەکەت بە سەرکەوتوویی نێردرا",
      });
      setReturnResponseOpen(false);
      setSelectedReturnRequest(null);
      setReturnResponseText("");
      queryClient.invalidateQueries({ queryKey: ["/api/return-requests/seller"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message || (language === "ar" ? "فشل في الرد على طلب الإرجاع" : "شکستی هێنا لە وەڵامدانەوە بۆ داواکاری گەڕاندنەوە"),
        variant: "destructive",
      });
    },
  });

  // Auto-open order detail when deep linked from notification
  useEffect(() => {
    if (deepLinkOrderId && sellerOrders.length > 0) {
      const order = sellerOrders.find(o => o.id === deepLinkOrderId);
      if (order) {
        // Open the order detail dialog
        setSelectedOrderForAction(order);
        
        // Scroll to and highlight the order card in the list
        scrollToElement(`order-card-${deepLinkOrderId}`, {
          highlight: true,
          delay: 500, // Wait for dialog animation
        });
        
        setDeepLinkOrderId(null);
      }
    }
  }, [deepLinkOrderId, sellerOrders, scrollToElement]);

  // Auto-open return request when deep linked
  useEffect(() => {
    if (deepLinkReturnId && returnRequests.length > 0) {
      const returnRequest = returnRequests.find(r => r.id === deepLinkReturnId);
      if (returnRequest) {
        setSelectedReturnRequest(returnRequest);
        setReturnResponseOpen(true);
        setDeepLinkReturnId(null);
      }
    }
  }, [deepLinkReturnId, returnRequests]);

  // Auto-select offer when deep linked
  useEffect(() => {
    if (deepLinkOfferId && receivedOffers.length > 0) {
      const offer = receivedOffers.find(o => o.id === deepLinkOfferId);
      if (offer) {
        // Open the offer counter dialog
        setSelectedOfferForCounter(offer);
        
        // Scroll to and highlight the offer card in the list
        scrollToElement(`offer-card-${deepLinkOfferId}`, {
          highlight: true,
          delay: 500,
        });
        
        setDeepLinkOfferId(null);
      }
    }
  }, [deepLinkOfferId, receivedOffers, scrollToElement]);

  // Auto-scroll to listing when deep linked
  useEffect(() => {
    if (deepLinkListingId && listings.length > 0) {
      const listing = listings.find(l => l.id === deepLinkListingId);
      if (listing) {
        // Scroll to and highlight the product card
        scrollToElement(`product-card-${deepLinkListingId}`, {
          highlight: true,
          delay: 300,
        });
        
        setDeepLinkListingId(null);
      }
    }
  }, [deepLinkListingId, listings, scrollToElement]);

  const getReturnReasonLabel = (reason: string) => {
    const labels: Record<string, { ar: string; ku: string }> = {
      defective: { ar: "المنتج معيب أو تالف", ku: "بەرهەم خراپ یان تێکچوو" },
      not_as_described: { ar: "المنتج مختلف عن الوصف", ku: "بەرهەم جیاوازە لە وەسف" },
      wrong_item: { ar: "استلمت منتجاً خاطئاً", ku: "بەرهەمێکی هەڵەم وەرگرت" },
      changed_mind: { ar: "غيرت رأيي", ku: "بڕیارم گۆڕی" },
      other: { ar: "سبب آخر", ku: "هۆکاری تر" },
    };
    return labels[reason]?.[language] || reason;
  };

  const sellerProducts: SellerProduct[] = listings.map(l => {
    const quantityAvailable = l.quantityAvailable || 1;
    const quantitySold = l.quantitySold || 0;
    const remainingStock = quantityAvailable - quantitySold;
    
    const productOrders = sellerOrders.filter(o => o.listingId === l.id);
    const hasPendingShipment = productOrders.some(o => 
      o.status === "pending" || o.status === "processing"
    );
    const hasShippedInTransit = productOrders.some(o => o.status === "shipped");
    const hasDeliveredOrCompleted = productOrders.some(o => 
      o.status === "delivered" || o.status === "completed"
    );
    
    let status = "draft";
    if (hasPendingShipment) {
      status = "pending_shipment";
    } else if (hasShippedInTransit) {
      status = "shipped";
    } else if (quantitySold > 0 && remainingStock <= 0) {
      status = "sold";
    } else if (quantitySold > 0 && hasDeliveredOrCompleted) {
      // Sold some items, delivered/completed, may have remaining stock
      status = remainingStock > 0 ? "active" : "sold";
    } else if (!l.isActive && quantitySold > 0) {
      // Inactive but has sales - it's sold, not draft
      status = "sold";
    } else if (!l.isActive) {
      // Inactive with no sales - actual draft
      status = "draft";
    } else if (remainingStock > 0) {
      status = "active";
    } else {
      status = "sold";
    }
    
    return {
      id: l.id,
      title: l.title,
      price: l.price,
      image: l.images?.[0] || "",
      status,
      type: l.saleType || "fixed",
      views: l.views || 0,
      bids: l.totalBids || 0,
      currentBid: l.currentBid || undefined,
      endDate: l.auctionEndTime ? new Date(l.auctionEndTime).toLocaleDateString("ar-IQ") : undefined,
      category: l.category,
      productCode: l.productCode || `P-${l.id.slice(0, 6)}`,
      quantityAvailable,
      quantitySold,
      saleType: l.saleType || "fixed",
      auctionEndTime: l.auctionEndTime ? new Date(l.auctionEndTime).toISOString() : undefined,
    };
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await secureRequest(`/api/listings/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete listing");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: language === "ar" ? "تم حذف المنتج" : "بەرهەم سڕایەوە", description: language === "ar" ? "تم حذف المنتج بنجاح من قائمتك" : "بەرهەم بە سەرکەوتوویی لە لیستەکەت سڕایەوە" });
      queryClient.invalidateQueries({ queryKey: ["/api/listings", user?.id] });
    },
    onError: () => {
      toast({ title: t("error"), description: language === "ar" ? "فشل في حذف المنتج" : "شکستی هێنا لە سڕینەوەی بەرهەم", variant: "destructive" });
    },
  });

  const offerResponseMutation = useMutation({
    mutationFn: async ({ offerId, action, counterAmount, counterMessage }: { offerId: string; action: "accept" | "reject" | "counter"; counterAmount?: number; counterMessage?: string }) => {
      const authToken = localStorage.getItem("authToken");
      const res = await secureRequest(`/api/offers/${offerId}/respond`, {
        method: "PUT",
        headers: {
          ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ action, counterAmount, counterMessage }),
      });
      if (!res.ok) throw new Error("Failed to respond to offer");
      return res.json();
    },
    onSuccess: (_, variables) => {
      const messages: Record<string, { ar: string; ku: string; en: string }> = {
        accept: { ar: "تم قبول العرض بنجاح - تم إنشاء طلب جديد", ku: "پێشنیار قبوڵکرا - داواکارییەکی نوێ دروستکرا", en: "Offer accepted successfully - New order created" },
        reject: { ar: "تم رفض العرض", ku: "پێشنیار ڕەتکرایەوە", en: "Offer rejected" },
        counter: { ar: "تم إرسال عرض مقابل", ku: "پێشنیارێکی بەرامبەر نێردرا", en: "Counter offer sent" },
      };
      toast({ title: t("success"), description: messages[variables.action]?.[language] || (language === "ar" ? "تم تحديث العرض" : "پێشنیار نوێکرایەوە") });
      queryClient.invalidateQueries({ queryKey: ["/api/received-offers"] });
      if (variables.action === "accept") {
        queryClient.invalidateQueries({ queryKey: ["/api/account/seller-orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/account/seller-summary"] });
      }
      setCounterOfferDialogOpen(false);
      setSelectedOfferForCounter(null);
      setCounterOfferAmount("");
    },
    onError: () => {
      toast({ title: t("error"), description: language === "ar" ? "فشل في الرد على العرض" : "شکستی هێنا لە وەڵامدانەوە بۆ پێشنیار", variant: "destructive" });
    },
  });

  const stockUpdateMutation = useMutation({
    mutationFn: async ({ productId, quantityAvailable }: { productId: string; quantityAvailable: number }) => {
      const res = await secureRequest(`/api/listings/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantityAvailable }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update stock");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: language === "ar" ? "تم تحديث المخزون" : "کۆگا نوێکرایەوە", description: language === "ar" ? "تم تحديث الكمية المتوفرة بنجاح" : "بڕی بەردەست بە سەرکەوتوویی نوێکرایەوە" });
      queryClient.invalidateQueries({ queryKey: ["/api/listings", user?.id] });
      setStockDialogOpen(false);
      setStockProductId(null);
      setNewStockQuantity("");
    },
    onError: (error: Error) => {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const authToken = localStorage.getItem("authToken");
      const res = await secureRequest(`/api/transactions/${orderId}/confirm-payment`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("فشل في تأكيد استلام الدفع");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تأكيد الدفع! 💰", description: "يمكنك الآن شحن الطلب" });
      queryClient.invalidateQueries({ queryKey: ["/api/account/seller-orders"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تأكيد استلام الدفع", variant: "destructive" });
    },
  });

  const markAsShippedMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const authToken = localStorage.getItem("authToken");
      const res = await secureRequest(`/api/transactions/${orderId}/ship`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("فشل في تحديث حالة الشحن");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تأكيد الشحن! 📦", description: "تم إرسال إشعار للمشتري" });
      // Invalidate all related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/account/seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/seller-summary"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تحديث حالة الشحن", variant: "destructive" });
    },
  });

  const markAsDeliveredMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const authToken = localStorage.getItem("authToken");
      const res = await secureRequest(`/api/transactions/${orderId}/deliver`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("فشل في تحديث حالة التسليم");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم التسليم! ✅", description: "تم إكمال الطلب بنجاح" });
      // Invalidate all related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/account/seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/seller-summary"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تحديث حالة التسليم", variant: "destructive" });
    },
  });

  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<SellerOrder | null>(null);
  const [selectedIssueType, setSelectedIssueType] = useState<string>("");
  const [issueNote, setIssueNote] = useState("");
  const [buyerRating, setBuyerRating] = useState(5);
  const [buyerFeedback, setBuyerFeedback] = useState("");

  const reportIssueMutation = useMutation({
    mutationFn: async ({ orderId, issueType, issueNote, status }: { orderId: string; issueType: string; issueNote?: string; status: string }) => {
      const authToken = localStorage.getItem("authToken");
      const res = await fetch(`/api/transactions/${orderId}/issue`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ issueType, issueNote, status }),
      });
      if (!res.ok) throw new Error("فشل في تسجيل المشكلة");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم التسجيل", description: "تم تسجيل المشكلة بنجاح" });
      setIssueDialogOpen(false);
      setSelectedOrderForAction(null);
      setSelectedIssueType("");
      setIssueNote("");
      queryClient.invalidateQueries({ queryKey: ["/api/account/seller-orders"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تسجيل المشكلة", variant: "destructive" });
    },
  });

  const rateBuyerMutation = useMutation({
    mutationFn: async ({ orderId, rating, feedback }: { orderId: string; rating: number; feedback?: string }) => {
      const authToken = localStorage.getItem("authToken");
      const res = await secureRequest(`/api/transactions/${orderId}/rate-buyer`, {
        method: "PATCH",
        body: JSON.stringify({ rating, feedback }),
      });
      if (!res.ok) throw new Error("فشل في تقييم المشتري");
      return res.json();
    },
    onSuccess: () => {
      // Track buyer rating in GTM
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'event': 'submit_rating',
        'rating_value': buyerRating,
        'rated_entity_id': selectedOrderForAction?.buyer?.id
      });
      
      toast({ title: "تم التقييم", description: "تم تقييم المشتري بنجاح" });
      setRatingDialogOpen(false);
      setSelectedOrderForAction(null);
      setBuyerRating(5);
      setBuyerFeedback("");
      queryClient.invalidateQueries({ queryKey: ["/api/account/seller-orders"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تقييم المشتري", variant: "destructive" });
    },
  });

  const handleUpdateStock = (product: SellerProduct) => {
    setStockProductId(product.id);
    setNewStockQuantity(product.quantityAvailable.toString());
    setStockDialogOpen(true);
  };

  const submitStockUpdate = () => {
    if (!stockProductId || !newStockQuantity) return;
    stockUpdateMutation.mutate({ 
      productId: stockProductId, 
      quantityAvailable: parseInt(newStockQuantity, 10) 
    });
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول للوصول إلى لوحة تحكم البائع",
        variant: "destructive",
      });
      navigate("/signin?redirect=/seller-dashboard");
    }
    // Note: Non-approved sellers will see a "become a seller" message in the render below
    // instead of being redirected to /sell which was confusing for users
  }, [authLoading, isAuthenticated, navigate, toast]);

  const filteredProducts = sellerProducts.filter(product => {
    const matchesSearch = product.title.includes(searchQuery) || 
                          product.productCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    const matchesQuick =
      quickFilter === "none" ||
      (quickFilter === "pending_shipment" && product.status === "pending_shipment") ||
      (quickFilter === "ending_soon" && !!product.auctionEndTime);
    return matchesSearch && matchesStatus && matchesQuick;
  });
  const filteredMessages = quickFilter === "needs_reply"
    ? sellerMessages.filter(message => !message.isRead)
    : sellerMessages;

  const handleDeleteProduct = (productId: string) => {
    deleteMutation.mutate(productId);
  };

  const handlePrintLabel = (product: SellerProduct) => {
    setSelectedProduct(product);
    setShowShippingLabel(true);
  };

  // Handle bulk shipping label printing for pending orders
  const handlePrintBulkShippingLabels = () => {
    if (pendingOrders.length > 0) {
      // For now, open the shipping label for the first pending order
      // Future enhancement: Batch print all pending labels
      const firstPendingOrder = pendingOrders[0];
      setSelectedProduct(firstPendingOrder as any);
      setShowShippingLabel(true);
      
      // Also navigate to sales tab with pending filter
      setActiveTab("sales");
      setSalesFilter("pending");
      
      toast({
        title: language === "ar" 
          ? `${pendingOrders.length} طلبات بانتظار الشحن`
          : `${pendingOrders.length} داواکاری چاوەڕێی ناردن`,
        description: language === "ar"
          ? "سيتم فتح ملصق الشحن للطلب الأول"
          : "لیبلی ناردن بۆ یەکەمین داواکاری دەکرێتەوە",
      });
    }
  };

  const handleEditProduct = (productId: string) => {
    navigate(`/sell?edit=${productId}`);
  };

  const handleBulkUpload = async (file: File) => {
    setIsUploading(true);
    setUploadResult(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await secureRequest("/api/listings/bulk-upload", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary for FormData
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "فشل في رفع الملف");
      }
      
      setUploadResult({ success: data.success, failed: data.failed, errors: data.errors || [] });
      
      if (data.success > 0) {
        toast({
          title: "تم الاستيراد بنجاح",
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      }
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const activeProducts = sellerProducts.filter(p => p.status === "active");

  const pendingOrders = sellerOrders.filter(o => o.status === "pending" || o.status === "processing");

  // Filter orders by time period
  const getFilteredOrders = () => {
    if (timePeriod === "all") return sellerOrders;
    const daysAgo = timePeriod === "7" ? 7 : 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    return sellerOrders.filter(o => new Date(o.createdAt) >= cutoffDate);
  };
  
  const filteredOrders = getFilteredOrders();
  const filteredCompletedOrders = filteredOrders.filter(o => 
    o.status === "delivered" || o.status === "completed"
  );

  const SELLER_STATS = {
    totalProducts: sellerSummary?.totalListings ?? sellerProducts.length,
    activeListings: sellerSummary?.activeListings ?? activeProducts.length,
    soldItems: timePeriod === "all" ? (sellerSummary?.totalSales ?? 0) : filteredCompletedOrders.length,
    totalRevenue: timePeriod === "all" 
      ? (sellerSummary?.totalRevenue ?? 0) 
      : filteredCompletedOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
    pendingShipments: sellerSummary?.pendingShipments ?? pendingOrders.length,
    pendingOffers: receivedOffers.filter(o => o.status === "pending").length,
    averageRating: sellerSummary?.averageRating ?? 0,
    totalReviews: sellerSummary?.ratingCount ?? 0,
  };

  // Check if seller is new (no activity yet)
  const isNewSeller = SELLER_STATS.totalProducts === 0 && 
                      SELLER_STATS.soldItems === 0 && 
                      SELLER_STATS.totalRevenue === 0;

  const isLoading = authLoading || listingsLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated || !(user as any)?.sellerApproved) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-md text-center">
          <Card className="soft-border bg-amber-50/70">
            <CardContent className="pt-6">
              <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">للبائعين المعتمدين فقط</h2>
              <p className="text-muted-foreground mb-6">يجب الحصول على موافقة المشرف للوصول لهذه الصفحة</p>
              <Link href="/sell">
                <Button className="w-full">تقديم طلب للبيع</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideHeader>
      {/* Top Bar */}
      <div className="bg-primary text-white sticky top-0 z-50 shadow-[var(--shadow-1)]">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" data-testid="button-back">
                <ArrowRight className="h-6 w-6" />
              </button>
            </Link>
            <Link href="/">
              <Logo />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                localStorage.removeItem("authToken");
                window.location.href = "/";
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-sm"
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </button>
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" data-testid="button-menu">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Bar with Notifications */}
      <div className="bg-muted/60 border-b border-border/60 sticky top-[52px] z-40">
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("notifications")}</span>
            {pendingOrders.length > 0 && (
              <Badge className="bg-red-500 text-white text-xs">{pendingOrders.length} {language === "ar" ? "طلب جديد" : "داواکاری نوێ"}</Badge>
            )}
          </div>
          <Link href="/sell">
            <Button size="lg" className="gap-3 bg-primary hover:bg-primary/90 text-lg font-bold px-8 py-6 shadow-[var(--shadow-2)]" data-testid="button-add-product">
              <Plus className="h-6 w-6" />
              {t("addProduct")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">📊 {t("sellerDashboard")}</h1>
              <p className="text-muted-foreground">
                {language === "ar"
                  ? "إدارة منتجاتك ومبيعاتك وتتبع أدائك"
                  : "بەڕێوەبردنی بەرهەمەکانت و فرۆشتنەکانت و شوێنکەوتنی کارەکەت"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-full px-4">
                7d
              </Button>
              <Button variant="outline" size="sm" className="rounded-full px-4">
                30d
              </Button>
            </div>
          </div>
        </div>

        {/* Compact Statistics Bar */}
        <div className="sticky top-[112px] z-30 rounded-xl bg-background/95 backdrop-blur border border-border/60 shadow-sm mb-6">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
            <span className="text-xs text-muted-foreground">{language === "ar" ? "الإحصائيات" : "ئامارەکان"}</span>
            <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as "7" | "30" | "all")}>
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{language === "ar" ? "7 أيام" : "7 ڕۆژ"}</SelectItem>
                <SelectItem value="30">{language === "ar" ? "30 يوم" : "30 ڕۆژ"}</SelectItem>
                <SelectItem value="all">{language === "ar" ? "الكل" : "هەموو"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 divide-x divide-border/40 rtl:divide-x-reverse">
            <button 
              className="p-3 text-center hover:bg-blue-50/50 transition-colors"
              onClick={() => setActiveTab("products")}
            >
              <p className="text-xl font-bold text-blue-700">{SELLER_STATS.totalProducts}</p>
              <p className="text-[10px] text-blue-600">{language === "ar" ? "المنتجات" : "بەرهەم"}</p>
            </button>
            <button 
              className="p-3 text-center hover:bg-green-50/50 transition-colors"
              onClick={() => setActiveTab("sales")}
            >
              <p className="text-xl font-bold text-green-700">{SELLER_STATS.soldItems}</p>
              <p className="text-[10px] text-green-600">{language === "ar" ? "المبيعات" : "فرۆشتن"}</p>
            </button>
            <div className="p-3 text-center">
              <p className="text-xl font-bold text-purple-700">{formatCurrency(SELLER_STATS.totalRevenue)}</p>
            </div>
            <button 
              className="p-3 text-center hover:bg-amber-50/50 transition-colors"
              onClick={() => { setActiveTab("sales"); setSalesFilter("pending"); }}
            >
              <p className="text-xl font-bold text-amber-700">{SELLER_STATS.pendingShipments}</p>
              <p className="text-[10px] text-amber-600">{language === "ar" ? "بانتظار الشحن" : "چاوەڕێ"}</p>
            </button>
          </div>
        </div>

        {/* Compact Share Section */}
        <div className="flex items-center justify-between gap-3 mb-6 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Share2 className="h-4 w-4 text-primary flex-shrink-0" />
            <code className="text-xs bg-background/80 px-2 py-1 rounded border truncate">
              ebey3.com/seller/{user?.id?.slice(0, 8)}
            </code>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/seller/${user?.id}`);
                toast({ title: language === "ar" ? "تم نسخ الرابط" : "لینک کۆپی کرا" });
              }}
              data-testid="button-copy-shop-link"
            >
              <Copy className="h-3 w-3 ml-1" />
              {language === "ar" ? "نسخ" : "کۆپی"}
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                const shareData = {
                  title: language === "ar" ? "متجري على E-بيع" : "فرۆشگاکەم لە E-بيع",
                  text: language === "ar" ? "تصفح متجري على E-بيع" : "فرۆشگاکەم ببینە لە E-بيع",
                  url: `${window.location.origin}/seller/${user?.id}`,
                };
                if (navigator.share) {
                  try { await navigator.share(shareData); } catch {}
                } else {
                  shareToWhatsApp(shareData.url, shareData.text);
                }
              }}
              data-testid="button-share-shop"
            >
              <Share2 className="h-3 w-3 ml-1" />
              {language === "ar" ? "مشاركة" : "هاوبەشکردن"}
            </Button>
            <Link href={`/seller/${user?.id}`}>
              <Button size="sm" variant="ghost" data-testid="button-view-shop">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Onboarding for New Sellers */}
        {isNewSeller ? (
          <SellerOnboarding 
            onAddProduct={() => navigate("/sell")}
          />
        ) : (
          <>
            {/* Task-First Design: Show action cards for items needing attention */}
            {showV2Dashboard ? (
              <ErrorBoundary>
                <NeedsAttentionSection
              pendingOrders={pendingOrders.length}
              pendingOffers={receivedOffers.filter(o => o.status === "pending").length}
              unreadMessages={sellerMessages.filter(m => !m.isRead).length}
              pendingReturns={returnRequests.filter(r => r.status === "pending").length}
              onNavigate={(tab, section) => {
                setActiveTab(tab);
                if (section) {
                  setActivitySubTab(section as "messages" | "offers" | "returns");
                }
                // Also set the sales filter if navigating to orders
                if (tab === "sales") {
                  setSalesFilter("pending");
                }
              }}
              onPrintShippingLabels={handlePrintBulkShippingLabels}
            />
          </ErrorBoundary>
        ) : (
          // Legacy yellow alert card (will be removed in Phase 2)
          pendingOrders.length > 0 && (
            <Card className="mb-8 border-2 border-yellow-300 bg-yellow-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-yellow-800 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {language === "ar" ? `تحتاج إلى اهتمامك (${pendingOrders.length})` : `ئاگاداریت پێویستە (${pendingOrders.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingOrders.slice(0, 5).map(order => (
                    <div key={order.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <img 
                          src={order.listing?.images?.[0] || "https://via.placeholder.com/48"} 
                          alt={order.listing?.title || "منتج"} 
                          className="w-12 h-12 object-cover rounded" 
                        />
                        <div>
                          <p className="font-semibold text-sm">{order.listing?.title || "منتج"}</p>
                          <p className="text-xs text-gray-500">المشتري: {order.buyer?.name || "مشتري"}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => { setActiveTab("sales"); setSalesFilter("pending"); }}
                        className="gap-1"
                      >
                        <Truck className="h-4 w-4" />
                        إدارة الشحن
                      </Button>
                    </div>
                  ))}
                  {pendingOrders.length > 5 && (
                    <Button variant="outline" className="w-full" onClick={() => { setActiveTab("sales"); setSalesFilter("pending"); }}>
                      عرض الكل ({pendingOrders.length})
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        )}

            {/* Performance Card (Phase 3: Analytics) */}
            {showAnalytics && (
              <div className="mb-6">
                <PerformanceCard period={timePeriod === "7" ? "7d" : timePeriod === "30" ? "30d" : "30d"} />
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-4xl">
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              {t("products")}
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              {t("messages")}
              {sellerMessages.filter(m => !m.isRead).length > 0 && (
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 mr-1">
                  {sellerMessages.filter(m => !m.isRead).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-2">
              <HandCoins className="h-4 w-4" />
              {t("offers")}
              {receivedOffers.filter(o => o.status === "pending").length > 0 && (
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 mr-1">
                  {receivedOffers.filter(o => o.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="returns" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              {language === "ar" ? "الإرجاعات" : "گەڕاندنەوە"}
              {returnRequests.filter(r => r.status === "pending").length > 0 && (
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 mr-1">
                  {returnRequests.filter(r => r.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              {t("sales")}
            </TabsTrigger>
            <TabsTrigger value="wallet" className="gap-2">
              <Wallet className="h-4 w-4" />
              {language === "ar" ? "المحفظة" : "جزدان"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full md:max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={language === "ar" ? "البحث في منتجاتك..." : "گەڕان لە بەرهەمەکانت..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                  data-testid="input-search-products"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkUploadOpen(true)}
                  className="gap-2"
                  data-testid="button-bulk-upload"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {language === "ar" ? "استيراد CSV" : "هاوردەکردنی CSV"}
                </Button>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-status-filter">
                    <Filter className="h-4 w-4 ml-2" />
                    <SelectValue placeholder={t("condition")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all")}</SelectItem>
                    <SelectItem value="active">{language === "ar" ? "نشط" : "چالاک"}</SelectItem>
                    <SelectItem value="sold">{t("sold")}</SelectItem>
                    <SelectItem value="draft">{language === "ar" ? "مسودة" : "ڕەشنووس"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={quickFilter === "pending_shipment" ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setQuickFilter(prev => prev === "pending_shipment" ? "none" : "pending_shipment")}
              >
                {language === "ar" ? "بانتظار الشحن" : "چاوەڕێی ناردن"}
              </Button>
              <Button
                size="sm"
                variant={quickFilter === "ending_soon" ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setQuickFilter(prev => prev === "ending_soon" ? "none" : "ending_soon")}
              >
                {language === "ar" ? "ينتهي قريباً" : "بە زووی تەواو دەبێت"}
              </Button>
              <Button
                size="sm"
                variant={quickFilter === "needs_reply" ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setQuickFilter(prev => prev === "needs_reply" ? "none" : "needs_reply")}
              >
                {language === "ar" ? "بحاجة لرد" : "پێویستی بە وەڵام"}
              </Button>
            </div>

            <div className="grid gap-4">
              {filteredProducts.map(product => (
                <Card 
                  key={product.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                  data-testid={`product-card-${product.id}`}
                >
                  <div className="flex flex-col md:flex-row">
                    <Link href={`/product/${product.id}`} className="relative cursor-pointer">
                      <img 
                        src={product.image} 
                        alt={product.title} 
                        className="w-full md:w-40 h-40 object-cover hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute top-2 right-2">
                        {getTypeBadge(product.type, language)}
                      </div>
                    </Link>
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Link href={`/product/${product.id}`} className="cursor-pointer hover:text-primary transition-colors">
                            <h3 className="font-bold text-lg">{product.title}</h3>
                          </Link>
                          <p className="text-sm text-gray-500">{language === "ar" ? "كود" : "کۆد"}: {product.productCode} • {product.category}</p>
                        </div>
                        {getStatusBadge(product.status, language)}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {product.views} {language === "ar" ? "مشاهدة" : "بینین"}
                        </span>
                        {product.type === "auction" && product.bids && (
                          <span className="flex items-center gap-1">
                            <Gavel className="h-4 w-4" />
                            {product.bids} {t("auction")}
                          </span>
                        )}
                        {product.auctionEndTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {language === "ar" ? "ينتهي قريباً" : "بە زووی تەواو دەبێت"}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {product.quantityAvailable} {language === "ar" ? "متاح" : "بەردەست"}
                        </span>
                        {product.soldDate && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {language === "ar" ? "بيع في" : "فرۆشرا لە"} {product.soldDate}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-primary">
                            {(product.finalPrice || product.currentBid || product.price).toLocaleString()} 
                            <span className="text-sm font-normal text-gray-500 mr-1">د.ع</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {product.buyer?.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/messages/${product.buyer?.id}`)}
                              className="gap-1"
                              data-testid={`button-message-buyer-${product.id}`}
                            >
                              <MessageSquare className="h-4 w-4" />
                              {language === "ar" ? "مراسلة" : "پەیوەندی"}
                            </Button>
                          )}
                          {(product.status === "sold" || product.status === "pending_shipment") && product.buyer && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handlePrintLabel(product)}
                              className="gap-1"
                              data-testid={`button-print-${product.id}`}
                            >
                              <Printer className="h-4 w-4" />
                              {language === "ar" ? "طباعة الشحن" : "چاپی ناردن"}
                            </Button>
                          )}
                          {/* Edit button - only for active/draft products (not sold) */}
                          {(product.status === "active" || product.status === "draft") && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="gap-1" 
                              onClick={() => handleEditProduct(product.id)}
                              data-testid={`button-edit-${product.id}`}
                            >
                              <Edit className="h-4 w-4" />
                              {t("edit")}
                            </Button>
                          )}
                          
                          {/* Relist button - for sold/shipped items */}
                          {(["sold", "pending_shipment", "shipped", "ended", "sold_out"].includes(product.status) || 
                            (product.saleType === "auction" && product.auctionEndTime && new Date(product.auctionEndTime) < new Date())) && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="gap-1 border-green-500 text-green-600 hover:bg-green-50" 
                              onClick={() => navigate(`/sell?relist=${product.id}`)}
                              data-testid={`button-relist-${product.id}`}
                            >
                              <Plus className="h-4 w-4" />
                              {language === "ar" ? "إعادة عرض" : "دووبارە پیشاندان"}
                            </Button>
                          )}
                          
                          {/* Update Stock button - for partially sold items with remaining stock or to add more */}
                          {product.quantitySold > 0 && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="gap-1 border-orange-500 text-orange-600 hover:bg-orange-50" 
                              onClick={() => handleUpdateStock(product)}
                              data-testid={`button-update-stock-${product.id}`}
                            >
                              <Package className="h-4 w-4" />
                              {language === "ar" ? "تعديل الكمية" : "گۆڕینی بڕ"}
                            </Button>
                          )}
                          
                          {/* Use as template button */}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="gap-1 text-blue-600 hover:bg-blue-50" 
                            onClick={() => navigate(`/sell?template=${product.id}`)}
                            data-testid={`button-template-${product.id}`}
                          >
                            <Package className="h-4 w-4" />
                            {language === "ar" ? "كقالب" : "وەک قاڵب"}
                          </Button>
                          
                          {/* Delete button - only for active/draft */}
                          {(product.status === "active" || product.status === "draft") && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="gap-1" data-testid={`button-delete-${product.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{language === "ar" ? "هل أنت متأكد؟" : "دڵنیایت؟"}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {language === "ar" 
                                      ? `سيتم حذف المنتج "${product.title}" نهائياً. لا يمكن التراجع عن هذا الإجراء.`
                                      : `بەرهەمی "${product.title}" بە تەواوی دەسڕدرێتەوە. ناتوانیت لەم کردارە بگەڕێیتەوە.`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>
                                    {t("delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {filteredProducts.length === 0 && (
                <Card className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{language === "ar" ? "لا توجد منتجات تطابق بحثك" : "هیچ بەرهەمێک نەدۆزرایەوە کە لەگەڵ گەڕانەکەت بگونجێت"}</p>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  رسائل العملاء
                </CardTitle>
              </CardHeader>
              <CardContent>
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">لا توجد رسائل من العملاء حالياً</p>
                    <p className="text-sm text-gray-400 mt-2">عندما يرسل العملاء استفسارات عن منتجاتك، ستظهر هنا</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMessages.map(message => (
                      <div 
                        key={message.id} 
                        className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${!message.isRead ? 'bg-blue-50 border-blue-200' : ''}`}
                        data-testid={`message-${message.id}`}
                      >
                        <div className="flex items-start gap-4">
                          {message.listingImage && (
                            <Link href={`/product/${message.listingId}`}>
                              <img 
                                src={message.listingImage} 
                                alt={message.listingTitle || ""} 
                                className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                              />
                            </Link>
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-gray-500" />
                                  <span className="font-semibold">{message.senderName}</span>
                                  {!message.isRead && (
                                    <Badge className="bg-blue-500 text-white text-xs">جديد</Badge>
                                  )}
                                </div>
                                {message.listingTitle && (
                                  <Link href={`/product/${message.listingId}`}>
                                    <p className="text-sm text-primary hover:underline cursor-pointer">
                                      بخصوص: {message.listingTitle}
                                    </p>
                                  </Link>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(message.createdAt).toLocaleDateString("ar-IQ", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>
                            <div className="bg-gray-100 p-3 rounded-lg">
                              <p className="text-gray-800">{message.content}</p>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/messages/${message.senderId}`)}
                                className="gap-1"
                                data-testid={`button-reply-${message.id}`}
                              >
                                <MessageSquare className="h-4 w-4" />
                                رد على الرسالة
                              </Button>
                              {!message.isRead && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    await secureRequest(`/api/messages/${message.id}/read`, { method: "PATCH" });
                                    queryClient.invalidateQueries({ queryKey: ["/api/seller-messages"] });
                                  }}
                                  className="gap-1"
                                  data-testid={`button-mark-read-${message.id}`}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  تحديد كمقروء
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HandCoins className="h-5 w-5 text-primary" />
                  العروض المستلمة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {offersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : receivedOffers.length === 0 ? (
                  <div className="text-center py-8">
                    <HandCoins className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">لا توجد عروض مستلمة حالياً</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {receivedOffers.map(offer => {
                      const listing = listings.find(l => l.id === offer.listingId);
                      return (
                        <div 
                          key={offer.id} 
                          className="border rounded-lg p-4 hover:bg-gray-50"
                          data-testid={`offer-card-${offer.id}`}
                        >
                          <div className="flex items-start gap-4">
                            {listing?.images?.[0] && (
                              <img 
                                src={listing.images[0]} 
                                alt={listing?.title} 
                                className="w-20 h-20 object-cover rounded-lg"
                                loading="lazy"
                                style={{ imageRendering: "auto" }}
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <Link href={`/product/${offer.listingId}`}>
                                    <h4 className="font-bold text-lg hover:text-primary cursor-pointer">
                                      {listing?.title || "منتج"}
                                    </h4>
                                  </Link>
                                  <p className="text-sm text-gray-500">
                                    السعر الأصلي: {listing?.price?.toLocaleString()} د.ع
                                  </p>
                                  {(offer.status === "pending" || offer.status === "countered") && (offer as any).expiresAt && (
                                    <OfferCountdown expiresAt={(offer as any).expiresAt} />
                                  )}
                                </div>
                                <Badge className={
                                  offer.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                  offer.status === "accepted" ? "bg-green-100 text-green-800" :
                                  offer.status === "rejected" ? "bg-red-100 text-red-800" :
                                  offer.status === "countered" ? "bg-blue-100 text-blue-800" :
                                  "bg-gray-100 text-gray-800"
                                }>
                                  {offer.status === "pending" ? "بانتظار الرد" :
                                   offer.status === "accepted" ? "مقبول" :
                                   offer.status === "rejected" ? "مرفوض" :
                                   offer.status === "countered" ? "عرض مقابل" :
                                   offer.status === "expired" ? "منتهي" : offer.status}
                                </Badge>
                              </div>

                              <div className="bg-primary/5 p-3 rounded-lg mb-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">العرض المقدم:</span>
                                  <span className="text-xl font-bold text-primary">
                                    {offer.offerAmount.toLocaleString()} د.ع
                                  </span>
                                </div>
                                {offer.message && (
                                  <p className="text-sm text-gray-600 mt-2 flex items-start gap-1">
                                    <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                                    {offer.message}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 mt-2">
                                  {new Date(offer.createdAt).toLocaleDateString("ar-IQ", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </p>
                              </div>

                              {offer.status === "pending" && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => offerResponseMutation.mutate({ 
                                      offerId: offer.id, 
                                      action: "accept" 
                                    })}
                                    disabled={offerResponseMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                    data-testid={`button-accept-offer-${offer.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 ml-1" />
                                    قبول
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedOfferForCounter(offer);
                                      setCounterOfferAmount("");
                                      setCounterOfferDialogOpen(true);
                                    }}
                                    disabled={offerResponseMutation.isPending}
                                    data-testid={`button-counter-offer-${offer.id}`}
                                  >
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                    عرض مقابل
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => offerResponseMutation.mutate({ 
                                      offerId: offer.id, 
                                      action: "reject" 
                                    })}
                                    disabled={offerResponseMutation.isPending}
                                    data-testid={`button-reject-offer-${offer.id}`}
                                  >
                                    رفض
                                  </Button>
                                </div>
                              )}

                              {offer.status === "countered" && offer.counterAmount && (
                                <div className="bg-blue-50 p-2 rounded mt-2">
                                  <p className="text-sm text-blue-800">
                                    عرضك المقابل: {offer.counterAmount.toLocaleString()} د.ع
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="returns" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-orange-500" />
                  طلبات الإرجاع
                </CardTitle>
              </CardHeader>
              <CardContent>
                {returnsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : returnRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <RotateCcw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">لا توجد طلبات إرجاع</p>
                    <p className="text-sm text-gray-400 mt-2">عندما يطلب المشترون إرجاع منتجات، ستظهر هنا</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {returnRequests.map(request => (
                      <div 
                        key={request.id} 
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        data-testid={`return-request-${request.id}`}
                      >
                        <div className="flex items-start gap-4">
                          {request.listing?.images?.[0] && (
                            <img 
                              src={request.listing.images[0]} 
                              alt={request.listing?.title || "منتج"} 
                              className="w-20 h-20 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold">{request.listing?.title || "منتج"}</h4>
                                <p className="text-sm text-gray-500">
                                  المشتري: {request.buyer?.displayName || "مشتري"}
                                </p>
                              </div>
                              <Badge className={
                                request.status === "approved" 
                                  ? "bg-green-100 text-green-700 border-0"
                                  : request.status === "rejected"
                                  ? "bg-red-100 text-red-700 border-0"
                                  : "bg-yellow-100 text-yellow-700 border-0"
                              }>
                                {request.status === "approved" ? "مقبول" 
                                  : request.status === "rejected" ? "مرفوض" 
                                  : "قيد المراجعة"}
                              </Badge>
                            </div>
                            
                            <div className="bg-gray-50 p-3 rounded mb-3">
                              <p className="text-sm font-medium text-gray-700 mb-1">
                                سبب الإرجاع: {getReturnReasonLabel(request.reason)}
                              </p>
                              {request.details && (
                                <p className="text-sm text-gray-600">{request.details}</p>
                              )}
                            </div>
                            
                            <p className="text-xs text-gray-400 mb-3">
                              تاريخ الطلب: {new Date(request.createdAt).toLocaleDateString("ar-IQ")}
                            </p>
                            
                            {request.status === "pending" && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 gap-1"
                                  onClick={() => {
                                    setSelectedReturnRequest(request);
                                    setReturnResponseOpen(true);
                                  }}
                                  data-testid={`button-respond-return-${request.id}`}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  الرد على الطلب
                                </Button>
                              </div>
                            )}
                            
                            {request.status !== "pending" && request.sellerResponse && (
                              <div className="bg-blue-50 p-2 rounded mt-2">
                                <p className="text-sm text-blue-800">
                                  ردك: {request.sellerResponse}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
              <h3 className="text-lg font-bold">إدارة الطلبات والشحن</h3>
              <Select value={salesFilter} onValueChange={setSalesFilter}>
                <SelectTrigger className="w-48" data-testid="select-sales-filter">
                  <Filter className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="حالة الشحن" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="pending_payment">بانتظار الدفع</SelectItem>
                  <SelectItem value="pending">بانتظار الشحن</SelectItem>
                  <SelectItem value="shipped">تم الشحن</SelectItem>
                  <SelectItem value="delivered">تم التسليم</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {ordersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : sellerOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد طلبات حتى الآن</p>
                <p className="text-sm text-gray-400 mt-2">عندما يقبل المشترون عروضك أو يشترون منتجاتك، ستظهر الطلبات هنا</p>
              </Card>
            ) : (() => {
              const filteredOrders = sellerOrders.filter(order => {
                if (salesFilter === "all") return true;
                if (salesFilter === "pending_payment") return order.status === "pending_payment";
                if (salesFilter === "pending") return order.status === "pending" || order.status === "processing";
                if (salesFilter === "shipped") return order.status === "shipped";
                if (salesFilter === "delivered") return order.status === "delivered" || order.status === "completed";
                return true;
              });
              
              if (filteredOrders.length === 0) {
                return (
                  <Card className="p-8 text-center">
                    <Filter className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">لا توجد طلبات تطابق الفلتر المحدد</p>
                    <Button variant="outline" className="mt-4" onClick={() => setSalesFilter("all")}>
                      عرض جميع الطلبات
                    </Button>
                  </Card>
                );
              }
              
              return (
              <div className="grid gap-4">
                {filteredOrders.map(order => (
                  <Card key={order.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`order-card-${order.id}`}>
                    <div className="flex flex-col md:flex-row">
                      <Link href={`/product/${order.listingId}`} className="relative cursor-pointer group">
                        {order.listing?.images?.[0] && (
                          <img 
                            src={order.listing.images[0]} 
                            alt={order.listing?.title || "منتج"} 
                            className="w-full md:w-40 h-40 object-cover group-hover:opacity-80 transition-opacity"
                            loading="lazy"
                            style={{ imageRendering: "auto" }}
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                          <ExternalLink className="h-6 w-6 text-white" />
                        </div>
                      </Link>
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Link href={`/product/${order.listingId}`} className="hover:text-primary transition-colors">
                              <h3 className="font-bold text-lg flex items-center gap-2">
                                {order.listing?.title || "منتج"}
                                <ExternalLink className="h-4 w-4 text-gray-400" />
                              </h3>
                            </Link>
                            <p className="text-sm text-gray-500">
                              طلب في {new Date(order.createdAt).toLocaleDateString("ar-IQ")}
                            </p>
                            {order.listing?.productCode && (
                              <p className="text-xs text-gray-400">كود المنتج: {order.listing.productCode}</p>
                            )}
                          </div>
                          <Badge 
                            className={
                              order.status === "completed" || order.status === "delivered" ? "bg-green-100 text-green-800 border-0" :
                              order.status === "shipped" ? "bg-blue-100 text-blue-800 border-0" :
                              (order.status === "pending" || order.status === "processing") ? "bg-yellow-100 text-yellow-800 border-0" :
                              order.status === "returned" ? "bg-orange-100 text-orange-800 border-0" :
                              order.status === "unreachable" ? "bg-red-100 text-red-800 border-0" :
                              order.status === "cancelled" ? "bg-gray-100 text-gray-800 border-0" :
                              "bg-gray-100 text-gray-800 border-0"
                            }
                          >
                            {(order.status === "pending" || order.status === "processing") ? "بانتظار الشحن" :
                             order.status === "shipped" ? "تم الشحن" :
                             order.status === "completed" || order.status === "delivered" ? "تم التسليم" :
                             order.status === "returned" ? "مُرجع" :
                             order.status === "unreachable" ? "متعذر الوصول" :
                             order.status === "cancelled" ? "ملغي" :
                             order.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <Wallet className="h-3.5 w-3.5" />
                            {order.amount.toLocaleString()} د.ع
                          </span>
                          {order.deliveryStatus && (
                            <span className="flex items-center gap-1">
                              <Truck className="h-3.5 w-3.5" />
                              {order.deliveryStatus}
                            </span>
                          )}
                          {order.buyer?.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {order.buyer.city}
                            </span>
                          )}
                        </div>

                        {order.buyer && (
                          <div className="bg-blue-50 p-3 rounded-lg mb-3">
                            <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              معلومات المشتري
                            </p>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{order.buyer.name || "مشتري"}</p>
                              {order.buyer.phone && (
                                <p className="text-sm text-gray-600">📱 {order.buyer.phone}</p>
                              )}
                              {(order.buyer.city || order.buyer.district || order.buyer.address) && (
                                <div className="text-sm text-gray-600 flex items-start gap-1">
                                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <span>
                                    {[order.buyer.address, order.buyer.district, order.buyer.city]
                                      .filter(Boolean)
                                      .join("، ")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-xl font-bold text-green-600">
                            {order.amount.toLocaleString()} د.ع
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {order.status === "pending_payment" && (
                              <Button
                                size="sm"
                                onClick={() => confirmPaymentMutation.mutate(order.id)}
                                disabled={confirmPaymentMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 gap-1"
                                data-testid={`button-confirm-payment-${order.id}`}
                              >
                                <CheckCircle className="h-4 w-4" />
                                تأكيد استلام الدفع
                              </Button>
                            )}
                            {(order.status === "pending" || order.status === "processing") && (
                              <Button
                                size="sm"
                                onClick={() => markAsShippedMutation.mutate(order.id)}
                                disabled={markAsShippedMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700 gap-1"
                                data-testid={`button-ship-${order.id}`}
                              >
                                <Truck className="h-4 w-4" />
                                تأكيد الشحن
                              </Button>
                            )}
                            {order.status === "shipped" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => markAsDeliveredMutation.mutate(order.id)}
                                  disabled={markAsDeliveredMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700 gap-1"
                                  data-testid={`button-deliver-${order.id}`}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  تم التسليم
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedOrderForAction(order);
                                    setIssueDialogOpen(true);
                                  }}
                                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                  data-testid={`button-issue-${order.id}`}
                                >
                                  <AlertCircle className="h-4 w-4" />
                                  مشكلة
                                </Button>
                              </>
                            )}
                            {(order.status === "delivered" || order.status === "completed") && !order.buyerRating && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrderForAction(order);
                                  setRatingDialogOpen(true);
                                }}
                                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50 gap-1"
                                data-testid={`button-rate-${order.id}`}
                              >
                                <Star className="h-4 w-4" />
                                تقييم المشتري
                              </Button>
                            )}
                            {order.buyerRating && (
                              <div className="flex items-center gap-1 text-sm text-yellow-600">
                                <Star className="h-4 w-4 fill-yellow-400" />
                                <span>{order.buyerRating}/5</span>
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/messages/${order.buyer?.id}`)}
                              className="gap-1"
                              data-testid={`button-message-buyer-${order.id}`}
                            >
                              <MessageSquare className="h-4 w-4" />
                              مراسلة
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="wallet" className="space-y-6">
            {walletLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-5">
                  <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-yellow-200 p-2 rounded-lg">
                          <Clock className="h-5 w-5 text-yellow-700" />
                        </div>
                        <div>
                          <p className="text-sm text-yellow-700">
                            {language === "ar" ? "قيد الانتظار" : "چاوەڕوان"}
                          </p>
                          <p className="text-2xl font-bold text-yellow-800">
                            {(walletBalance?.pending || 0).toLocaleString()} د.ع
                          </p>
                          <p className="text-xs text-yellow-600">
                            {language === "ar"
                              ? `خلال فترة الحجز ${walletBalance?.holdDays ?? 2} أيام`
                              : `لە ماوەی ${walletBalance?.holdDays ?? 2} ڕۆژدا`}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-200 p-2 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-700" />
                        </div>
                        <div>
                          <p className="text-sm text-green-700">
                            {language === "ar" ? "متاح للسحب" : "ئامادە بۆ کێشانەوە"}
                          </p>
                          <p className="text-2xl font-bold text-green-800">
                            {(walletBalance?.available || 0).toLocaleString()} د.ع
                          </p>
                          <p className="text-xs text-green-600">
                            {language === "ar" ? "جاهز للدفعة القادمة" : "ئامادەیە بۆ دفعی داهاتوو"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-200 p-2 rounded-lg">
                          <BanknoteIcon className="h-5 w-5 text-slate-700" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-700">
                            {language === "ar" ? "مدفوع سابقاً" : "پێشووتر دراو"}
                          </p>
                          <p className="text-2xl font-bold text-slate-800">
                            {(walletBalance?.paid || 0).toLocaleString()} د.ع
                          </p>
                          <p className="text-xs text-slate-600">
                            {language === "ar" ? "إجمالي الدفعات السابقة" : "کۆی دفعەکانی پێشوو"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-200 p-2 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-700" />
                        </div>
                        <div>
                          <p className="text-sm text-blue-700">
                            {language === "ar" ? "الدفعة القادمة" : "دفعی داهاتوو"}
                          </p>
                          <p className="text-lg font-bold text-blue-800">
                            {walletBalance?.nextPayoutDate
                              ? new Date(walletBalance.nextPayoutDate).toLocaleDateString(language === "ar" ? "ar-IQ" : "ckb-IQ")
                              : "-"}
                          </p>
                          <p className="text-xs text-blue-600">
                            {language === "ar" ? "يوم الأحد أسبوعياً" : "ڕۆژی یەکشەممە هەفتانە"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-200 p-2 rounded-lg">
                          <TrendingDown className="h-5 w-5 text-purple-700" />
                        </div>
                        <div>
                          <p className="text-sm text-purple-700">
                            {language === "ar" ? "مبيعات مجانية متبقية" : "فرۆشتنی بێبەرامبەر"}
                          </p>
                          <p className="text-2xl font-bold text-purple-800">
                            {walletBalance?.freeSalesRemaining || 0} / 15
                          </p>
                          <p className="text-xs text-purple-600">
                            {language === "ar" ? "بدون عمولة 5%" : "بێ کۆمیسیۆنی 5%"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      {language === "ar" ? "كيف تعمل المدفوعات" : "چۆن پارەکان دەگوازرێنەوە"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-lg font-bold text-primary">1</span>
                        </div>
                        <h4 className="font-semibold mb-1">
                          {language === "ar" ? "البيع" : "فرۆشتن"}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {language === "ar" ? "المشتري يستلم المنتج" : "کڕیار بەرهەم وەردەگرێت"}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-lg font-bold text-primary">2</span>
                        </div>
                        <h4 className="font-semibold mb-1">
                          {language === "ar" ? "فترة الانتظار" : "ماوەی چاوەڕوان"}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {language === "ar" ? "5 أيام حماية من الإرجاع" : "5 ڕۆژ پاراستن لە گەڕاندنەوە"}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-lg font-bold text-primary">3</span>
                        </div>
                        <h4 className="font-semibold mb-1">
                          {language === "ar" ? "متاح للسحب" : "ئامادە"}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {language === "ar" ? "المبلغ جاهز" : "بڕەکە ئامادەیە"}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-lg font-bold text-primary">4</span>
                        </div>
                        <h4 className="font-semibold mb-1">
                          {language === "ar" ? "الدفع" : "دفع"}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {language === "ar" ? "كل أحد أسبوعياً" : "هەر یەکشەممەیەک"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      {language === "ar" ? "سجل المعاملات" : "تۆماری مامەڵەکان"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactionsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : walletTransactions.length === 0 ? (
                      <div className="text-center py-8">
                        <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">
                          {language === "ar" ? "لا توجد معاملات بعد" : "هێشتا هیچ مامەڵەیەک نییە"}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {language === "ar" ? "ستظهر أرباحك هنا بعد إتمام المبيعات" : "قازانجەکانت لێرە دەردەکەون"}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {walletTransactions.map((txn) => (
                          <div key={txn.id} className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                txn.amount >= 0 ? "bg-green-100" : "bg-red-100"
                              }`}>
                                {txn.amount >= 0 ? (
                                  <ArrowDownToLine className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ArrowUpFromLine className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{txn.description}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(txn.createdAt).toLocaleDateString(language === "ar" ? "ar-IQ" : "ckb-IQ")}
                                </p>
                              </div>
                            </div>
                            <div className="text-left">
                              <p className={`font-bold ${txn.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {txn.amount >= 0 ? "+" : ""}{txn.amount.toLocaleString()} د.ع
                              </p>
                              <Badge variant="outline" className={`text-xs ${
                                txn.status === "available" ? "border-green-300 text-green-600" :
                                txn.status === "pending" ? "border-yellow-300 text-yellow-600" :
                                txn.status === "paid" ? "border-blue-300 text-blue-600" :
                                "border-gray-300 text-gray-600"
                              }`}>
                                {txn.status === "available" ? (language === "ar" ? "متاح" : "ئامادە") :
                                 txn.status === "pending" ? (language === "ar" ? "قيد الانتظار" : "چاوەڕوان") :
                                 txn.status === "paid" ? (language === "ar" ? "مدفوع" : "دراو") :
                                 txn.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {language === "ar" ? "سجل الدفعات" : "تۆماری دفعەکان"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {payoutsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : payouts.length === 0 ? (
                      <div className="text-center py-8">
                        <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">
                          {language === "ar" ? "لا توجد دفعات بعد" : "هێشتا هیچ دفعەیەک نییە"}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {language === "ar" ? "ستظهر الدفعات هنا بعد الجدولة الأسبوعية" : "دفعەکان لێرە دەردەکەون لە دوای دەربهێنانی هەفتانە"}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {payouts.map((payout) => (
                          <div key={payout.id} className="py-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {new Date(payout.weekStartDate).toLocaleDateString(language === "ar" ? "ar-IQ" : "ckb-IQ")}{" "}
                                -{" "}
                                {new Date(payout.weekEndDate).toLocaleDateString(language === "ar" ? "ar-IQ" : "ckb-IQ")}
                              </p>
                              <p className="text-xs text-gray-500">
                                {payout.paymentMethod || "-"}
                              </p>
                            </div>
                            <div className="text-left">
                              <p className="font-bold">
                                {payout.netPayout.toLocaleString()} د.ع
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {payout.status === "paid"
                                  ? (language === "ar" ? "مدفوع" : "دراو")
                                  : payout.status === "pending"
                                  ? (language === "ar" ? "قيد الانتظار" : "چاوەڕوان")
                                  : payout.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {selectedProduct?.buyer && (
        <ShippingLabel
          open={showShippingLabel}
          onOpenChange={setShowShippingLabel}
          orderDetails={{
            orderId: `ORD-${selectedProduct.id}`,
            productTitle: selectedProduct.title,
            productCode: selectedProduct.productCode,
            sellerName: user?.displayName || "البائع",
            sellerPhone: user?.phone || "",
            sellerCity: user?.city || "العراق",
            sellerAddress: user?.addressLine1 || "",
            buyerName: selectedProduct.buyer.name,
            buyerPhone: selectedProduct.buyer.phone || "",
            deliveryAddress: selectedProduct.buyer.address || "",
            city: selectedProduct.buyer.city || "",
            district: selectedProduct.buyer.district || "",
            price: selectedProduct.finalPrice || selectedProduct.price,
            saleDate: new Date(selectedProduct.soldDate || Date.now()),
            paymentMethod: "الدفع عند الاستلام",
          }}
        />
      )}

      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              تعديل الكمية المتوفرة
            </DialogTitle>
            <DialogDescription>
              قم بتحديث عدد القطع المتوفرة لهذا المنتج. لا يمكن تقليل الكمية عن عدد المبيعات الحالية.
            </DialogDescription>
          </DialogHeader>
          
          {(() => {
            const product = sellerProducts.find(p => p.id === stockProductId);
            return product ? (
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium text-primary">{product.title}</p>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span>المبيعات: {product.quantitySold}</span>
                    <span>الحالي: {product.quantityAvailable}</span>
                    <span>المتبقي: {product.quantityAvailable - product.quantitySold}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newQuantity">الكمية الجديدة</Label>
                  <Input
                    id="newQuantity"
                    type="number"
                    min={product.quantitySold}
                    value={newStockQuantity}
                    onChange={(e) => setNewStockQuantity(e.target.value)}
                    placeholder={`الحد الأدنى: ${product.quantitySold}`}
                    data-testid="input-new-quantity"
                  />
                  <p className="text-xs text-muted-foreground">
                    يجب أن تكون الكمية {product.quantitySold} على الأقل (عدد المبيعات الحالية)
                  </p>
                </div>
              </div>
            ) : null;
          })()}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStockDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={submitStockUpdate}
              disabled={stockUpdateMutation.isPending}
              data-testid="button-confirm-stock-update"
            >
              {stockUpdateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ التغييرات"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Reporting Dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              الإبلاغ عن مشكلة
            </DialogTitle>
            <DialogDescription>
              حدد نوع المشكلة مع هذا الطلب
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نوع المشكلة</Label>
              <Select value={selectedIssueType} onValueChange={setSelectedIssueType}>
                <SelectTrigger data-testid="select-issue-type">
                  <SelectValue placeholder="اختر نوع المشكلة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unreachable">المشتري غير متاح</SelectItem>
                  <SelectItem value="returned">تم إرجاع المنتج</SelectItem>
                  <SelectItem value="cancelled">إلغاء الطلب</SelectItem>
                  <SelectItem value="no_answer">لا يرد على الهاتف</SelectItem>
                  <SelectItem value="wrong_address">عنوان خاطئ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Input
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                placeholder="أضف تفاصيل إضافية..."
                data-testid="input-issue-note"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={() => {
                if (selectedOrderForAction && selectedIssueType) {
                  reportIssueMutation.mutate({
                    orderId: selectedOrderForAction.id,
                    issueType: selectedIssueType,
                    issueNote: issueNote || undefined,
                    status: selectedIssueType,
                  });
                }
              }}
              disabled={!selectedIssueType || reportIssueMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="button-confirm-issue"
            >
              {reportIssueMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                "تأكيد"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buyer Rating Dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              تقييم المشتري
            </DialogTitle>
            <DialogDescription>
              قيّم تجربتك مع هذا المشتري
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>التقييم</Label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setBuyerRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                    data-testid={`button-star-${star}`}
                  >
                    <Star 
                      className={`h-8 w-8 ${star <= buyerRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {buyerRating === 1 ? "سيء" :
                 buyerRating === 2 ? "مقبول" :
                 buyerRating === 3 ? "جيد" :
                 buyerRating === 4 ? "جيد جداً" :
                 "ممتاز"}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Input
                value={buyerFeedback}
                onChange={(e) => setBuyerFeedback(e.target.value)}
                placeholder="أضف ملاحظة عن المشتري..."
                data-testid="input-buyer-feedback"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRatingDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={() => {
                if (selectedOrderForAction) {
                  rateBuyerMutation.mutate({
                    orderId: selectedOrderForAction.id,
                    rating: buyerRating,
                    feedback: buyerFeedback || undefined,
                  });
                }
              }}
              disabled={rateBuyerMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
              data-testid="button-confirm-rating"
            >
              {rateBuyerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                "إرسال التقييم"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Response Dialog */}
      <Dialog open={returnResponseOpen} onOpenChange={setReturnResponseOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-500" />
              الرد على طلب الإرجاع
            </DialogTitle>
            <DialogDescription>
              قم بمراجعة طلب الإرجاع وقرر قبوله أو رفضه
            </DialogDescription>
          </DialogHeader>
          
          {selectedReturnRequest && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium text-sm">{selectedReturnRequest.listing?.title || "منتج"}</p>
                <p className="text-sm text-gray-500 mt-1">
                  سبب الإرجاع: {getReturnReasonLabel(selectedReturnRequest.reason)}
                </p>
                {selectedReturnRequest.details && (
                  <p className="text-sm text-gray-600 mt-1">{selectedReturnRequest.details}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>رسالة للمشتري (اختياري)</Label>
                <Input
                  value={returnResponseText}
                  onChange={(e) => setReturnResponseText(e.target.value)}
                  placeholder="أضف رسالة توضيحية للمشتري..."
                  data-testid="input-return-response"
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReturnResponseOpen(false);
                setSelectedReturnRequest(null);
                setReturnResponseText("");
              }}
              data-testid="button-cancel-return-response"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedReturnRequest) {
                  returnResponseMutation.mutate({
                    id: selectedReturnRequest.id,
                    status: "rejected",
                    sellerResponse: returnResponseText || undefined,
                  });
                }
              }}
              disabled={returnResponseMutation.isPending}
              data-testid="button-reject-return"
            >
              <XCircle className="h-4 w-4 ml-1" />
              رفض
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (selectedReturnRequest) {
                  returnResponseMutation.mutate({
                    id: selectedReturnRequest.id,
                    status: "approved",
                    sellerResponse: returnResponseText || undefined,
                  });
                }
              }}
              disabled={returnResponseMutation.isPending}
              data-testid="button-approve-return"
            >
              {returnResponseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : (
                <CheckCircle className="h-4 w-4 ml-1" />
              )}
              قبول الإرجاع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Counter Offer Dialog */}
      <Dialog open={counterOfferDialogOpen} onOpenChange={setCounterOfferDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-primary" />
              إرسال عرض مقابل
            </DialogTitle>
            <DialogDescription>
              قدم سعراً مختلفاً للمشتري
            </DialogDescription>
          </DialogHeader>
          
          {selectedOfferForCounter && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium text-sm">
                  {listings.find(l => l.id === selectedOfferForCounter.listingId)?.title || "المنتج"}
                </p>
                <div className="flex justify-between items-center mt-2 text-sm">
                  <span className="text-gray-500">السعر الأصلي:</span>
                  <span>{listings.find(l => l.id === selectedOfferForCounter.listingId)?.price?.toLocaleString()} د.ع</span>
                </div>
                <div className="flex justify-between items-center mt-1 text-sm">
                  <span className="text-gray-500">عرض المشتري:</span>
                  <span className="text-primary font-bold">{selectedOfferForCounter.offerAmount?.toLocaleString()} د.ع</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>السعر المقترح (د.ع)</Label>
                <Input
                  type="number"
                  value={counterOfferAmount}
                  onChange={(e) => setCounterOfferAmount(e.target.value)}
                  placeholder="أدخل السعر الذي تقترحه..."
                  data-testid="input-counter-offer-amount"
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCounterOfferDialogOpen(false);
                setSelectedOfferForCounter(null);
                setCounterOfferAmount("");
              }}
              data-testid="button-cancel-counter-offer"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (selectedOfferForCounter && counterOfferAmount) {
                  offerResponseMutation.mutate({
                    offerId: selectedOfferForCounter.id,
                    action: "counter",
                    counterAmount: parseInt(counterOfferAmount),
                  });
                }
              }}
              disabled={offerResponseMutation.isPending || !counterOfferAmount}
              data-testid="button-send-counter-offer"
            >
              {offerResponseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : (
                <ArrowRight className="h-4 w-4 ml-1" />
              )}
              إرسال العرض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              استيراد منتجات من ملف CSV
            </DialogTitle>
            <DialogDescription>
              قم برفع ملف CSV يحتوي على بيانات منتجاتك لإضافتها دفعة واحدة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                id="csv-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBulkUpload(file);
                }}
                disabled={isUploading}
                data-testid="input-csv-file"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                    <p className="text-sm text-gray-600">جاري معالجة الملف...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-1">اضغط لاختيار ملف CSV</p>
                    <p className="text-xs text-gray-400">الحد الأقصى: 5 ميجابايت</p>
                  </div>
                )}
              </label>
            </div>

            {uploadResult && (
              <div className={`p-4 rounded-lg ${uploadResult.failed > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {uploadResult.failed > 0 ? (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  <span className="font-medium">
                    تم استيراد {uploadResult.success} منتج
                    {uploadResult.failed > 0 && ` (فشل ${uploadResult.failed})`}
                  </span>
                </div>
                {uploadResult.errors.length > 0 && (
                  <div className="text-sm text-amber-700 max-h-32 overflow-y-auto">
                    {uploadResult.errors.slice(0, 5).map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <p className="text-gray-500">... و{uploadResult.errors.length - 5} أخطاء أخرى</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2 text-sm">تحتاج إلى قالب؟</h4>
              <p className="text-xs text-blue-700 mb-2">
                قم بتحميل قالب CSV مع الأعمدة المطلوبة والأمثلة
              </p>
              <a
                href="/api/listings/csv-template"
                download
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                data-testid="link-download-template"
              >
                <Download className="h-4 w-4" />
                تحميل القالب
              </a>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBulkUploadOpen(false);
                setUploadResult(null);
              }}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile bottom navigation for seller dashboard (Phase 2) */}
      {showMobileNav && (
        <SellerBottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            // Set sales filter when navigating to orders/sales
            if (tab === "sales" || tab === "orders") {
              setSalesFilter("all");
            }
          }}
          unreadMessages={sellerMessages.filter(m => !m.isRead).length}
          pendingOffers={receivedOffers.filter(o => o.status === "pending").length}
          pendingReturns={returnRequests.filter(r => r.status === "pending").length}
          pendingOrders={pendingOrders.length}
          useNewTabNames={showConsolidatedTabs}
        />
      )}
    </Layout>
  );
}
