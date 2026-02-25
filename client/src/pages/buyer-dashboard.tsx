import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/queryClient";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  Star,
  Loader2,
  Lock,
  HandCoins,
  XCircle,
  ArrowLeftRight,
  Wallet,
  ShoppingBag,
  MessageCircle,
  AlertTriangle,
  MapPin,
  User,
  ChevronLeft,
  ExternalLink,
} from "lucide-react";

interface BuyerSummary {
  totalPurchases: number;
  pendingOrders: number;
  completedOrders: number;
  totalSpent: number;
  wishlistItems: number;
  activeOffers: number;
}

interface Purchase {
  id: string;
  listingId: string;
  sellerId?: string;
  amount: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  sellerRating?: number;
  sellerFeedback?: string;
  shippingAddress?: string;
  listing?: {
    id: string;
    title: string;
    price: number;
    images: string[];
    returnPolicy?: string;
  };
  seller?: {
    id: string;
    displayName: string;
    avatar?: string;
  };
}

interface ReturnRequest {
  id: string;
  transactionId: string;
  reason: string;
  details?: string;
  status: string;
  sellerResponse?: string;
  respondedAt?: string;
  refundAmount?: number;
  refundProcessed?: boolean;
  autoApproved?: boolean;
  category?: string;
  createdAt: string;
  listing?: {
    id: string;
    title: string;
    images: string[];
  };
  transaction?: {
    amount: number;
    createdAt: string;
  };
}

const RETURN_REASONS = [
  { value: "changed_mind", label: "غيرت رأيي" },
  { value: "damaged", label: "المنتج تالف أو مكسور" },
  { value: "different_from_description", label: "المنتج مختلف عن الوصف" },
  { value: "missing_parts", label: "ناقص أجزاء أو ملحقات" },
  { value: "wrong_item", label: "استلمت منتج خاطئ" },
  { value: "not_as_expected", label: "لم يلبِ توقعاتي" },
];

const ISSUE_REASONS = [
  { value: "damaged", label: "المنتج تالف" },
  { value: "different_from_description", label: "مختلف عن الوصف" },
  { value: "missing_parts", label: "ناقص ملحقات" },
  { value: "wrong_item", label: "منتج خاطئ" },
  { value: "seller_unresponsive", label: "البائع لا يرد" },
  { value: "other", label: "مشكلة أخرى" },
];

interface BuyerOffer {
  id: string;
  listingId: string;
  offerAmount: number;
  message?: string;
  status: string;
  counterAmount?: number;
  counterMessage?: string;
  createdAt: string;
  listing?: {
    id: string;
    title: string;
    price: number;
    images: string[];
    sellerName: string;
  };
}

interface BuyerWalletBalance {
  pending: number;
  available: number;
  total: number;
}

interface BuyerWalletTransaction {
  id: string;
  type: string;
  amount: number;
  description?: string;
  status: string;
  createdAt: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "delivered":
    case "completed":
      return <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">تم التسليم</span>;
    case "in_transit":
      return <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">قيد التوصيل</span>;
    case "processing":
    case "pending":
      return <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">قيد التجهيز</span>;
    case "no_answer_pending":
      return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">بانتظار إعادة الجدولة</span>;
    case "cancelled":
      return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">ملغي</span>;
    case "refused":
      return <span className="text-xs px-2 py-1 rounded-full bg-rose-100 text-rose-700">مرفوض</span>;
    default:
      return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{status}</span>;
  }
};

const OfferStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "pending":
      return <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">قيد الانتظار</span>;
    case "accepted":
      return <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">مقبول</span>;
    case "rejected":
      return <span className="text-xs px-2 py-1 rounded-full bg-rose-100 text-rose-700">مرفوض</span>;
    case "countered":
      return <span className="text-xs px-2 py-1 rounded-full bg-violet-100 text-violet-700">عرض مقابل</span>;
    case "expired":
      return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">منتهي</span>;
    default:
      return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{status}</span>;
  }
};

const ReturnStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "pending":
      return <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">قيد المراجعة</span>;
    case "approved":
      return <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">تمت الموافقة</span>;
    case "rejected":
      return <span className="text-xs px-2 py-1 rounded-full bg-rose-100 text-rose-700">مرفوض</span>;
    case "escalated":
      return <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">تم التصعيد للإدارة</span>;
    case "completed":
      return <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">مكتمل</span>;
    case "refunded":
      return <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">تم الاسترداد</span>;
    default:
      return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{status}</span>;
  }
};

const RETURN_REASON_LABELS: Record<string, string> = {
  changed_mind: "غيرت رأيي",
  damaged: "المنتج تالف أو مكسور",
  different_from_description: "المنتج مختلف عن الوصف",
  missing_parts: "ناقص أجزاء أو ملحقات",
  wrong_item: "استلمت منتج خاطئ",
  not_as_expected: "لم يلبِ توقعاتي",
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
    const timer = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <p className={`text-xs flex items-center gap-1 ${isExpired ? "text-red-500" : "text-orange-500"}`}>
      <Clock className="h-3 w-3" />
      {timeLeft}
    </p>
  );
}

export default function BuyerDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("orders");
  const [deepLinkOrderId, setDeepLinkOrderId] = useState<string | null>(null);
  const [deepLinkOfferId, setDeepLinkOfferId] = useState<string | null>(null);
  const [deepLinkReturnId, setDeepLinkReturnId] = useState<string | null>(null);

  // Handle deep linking from notifications
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const orderId = params.get("orderId");
    const offerId = params.get("offerId");
    const returnId = params.get("returnId");
    
    if (tab) {
      if (tab === "purchases") setActiveTab("orders");
      else if (tab === "offers") setActiveTab("offers");
      else if (tab === "returns") setActiveTab("returns");
      else setActiveTab(tab);
    }
    
    if (orderId) setDeepLinkOrderId(orderId);
    if (offerId) setDeepLinkOfferId(offerId);
    if (returnId) setDeepLinkReturnId(returnId);
    
    // Clear query params from URL without reloading
    if (tab || orderId || offerId || returnId) {
      window.history.replaceState({}, "", "/buyer-dashboard");
    }
  }, [location]);

  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Purchase | null>(null);

  // Return request state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnDetails, setReturnDetails] = useState("");

  // Report issue state
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueReason, setIssueReason] = useState("");
  const [issueDetails, setIssueDetails] = useState("");

  const openOrderDetail = (order: Purchase) => {
    setSelectedOrder(order);
    setOrderDetailOpen(true);
  };

  const counterResponseMutation = useMutation({
    mutationFn: async ({ offerId, action }: { offerId: string; action: "accept" | "reject" }) => {
      const res = await fetch(`/api/offers/${offerId}/buyer-respond`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed to respond to counter offer");
      return res.json();
    },
    onSuccess: (_, variables) => {
      const message = variables.action === "accept" 
        ? "تم قبول العرض المقابل - تم إنشاء طلب جديد" 
        : "تم رفض العرض المقابل";
      toast({ title: "تم", description: message });
      queryClient.invalidateQueries({ queryKey: ["/api/my-offers"] });
      if (variables.action === "accept") {
        queryClient.invalidateQueries({ queryKey: ["/api/account/purchases"] });
        queryClient.invalidateQueries({ queryKey: ["/api/account/buyer-summary"] });
      }
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في الرد على العرض المقابل", variant: "destructive" });
    },
  });

  const rateSellerMutation = useMutation({
    mutationFn: async ({ transactionId, rating, feedback }: { transactionId: string; rating: number; feedback?: string }) => {
      const res = await fetch(`/api/transactions/${transactionId}/rate-seller`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ rating, feedback }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "فشل في تسجيل التقييم");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم", description: "شكراً لتقييمك للبائع" });
      setRatingDialogOpen(false);
      setSelectedPurchase(null);
      setRatingValue(0);
      setRatingFeedback("");
      queryClient.invalidateQueries({ queryKey: ["/api/account/purchases"] });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const openRatingDialog = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setRatingValue(0);
    setRatingFeedback("");
    setRatingDialogOpen(true);
  };

  const submitRating = () => {
    if (!selectedPurchase || ratingValue < 1) return;
    rateSellerMutation.mutate({
      transactionId: selectedPurchase.id,
      rating: ratingValue,
      feedback: ratingFeedback || undefined,
    });
  };

  // Return request mutation
  const returnRequestMutation = useMutation({
    mutationFn: async ({ transactionId, reason, details }: { transactionId: string; reason: string; details?: string }) => {
      const res = await fetch("/api/return-requests", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ transactionId, reason, details }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "فشل في إرسال طلب الإرجاع");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم", description: "تم إرسال طلب الإرجاع بنجاح" });
      setReturnDialogOpen(false);
      setOrderDetailOpen(false);
      setReturnReason("");
      setReturnDetails("");
      queryClient.invalidateQueries({ queryKey: ["/api/account/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/return-requests/my"] });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  // Reschedule delivery mutation (for no-answer orders)
  const rescheduleMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await fetch(`/api/orders/${transactionId}/reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "فشل في إعادة جدولة التوصيل");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم", description: "تمت إعادة جدولة التوصيل بنجاح. سيتم إرسال سائق جديد قريباً." });
      queryClient.invalidateQueries({ queryKey: ["/api/account/purchases"] });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  // Escalate return request mutation
  const escalateReturnMutation = useMutation({
    mutationFn: async (returnRequestId: string) => {
      const res = await fetch(`/api/return-requests/${returnRequestId}/escalate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "فشل في تصعيد الطلب");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم", description: "تم تصعيد طلب الإرجاع للإدارة. سيتم مراجعته خلال 24-48 ساعة." });
      queryClient.invalidateQueries({ queryKey: ["/api/return-requests/my"] });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  // Report issue mutation
  const reportIssueMutation = useMutation({
    mutationFn: async ({ transactionId, reason, details }: { transactionId: string; reason: string; details?: string }) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ 
          reportType: "transaction_issue",
          targetId: transactionId, 
          targetType: "transaction",
          reason, 
          details 
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "فشل في إرسال البلاغ");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم", description: "تم إرسال البلاغ بنجاح وسنراجعه قريباً" });
      setIssueDialogOpen(false);
      setOrderDetailOpen(false);
      setIssueReason("");
      setIssueDetails("");
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const openReturnDialog = () => {
    setReturnReason("");
    setReturnDetails("");
    setReturnDialogOpen(true);
  };

  const openIssueDialog = () => {
    setIssueReason("");
    setIssueDetails("");
    setIssueDialogOpen(true);
  };

  const submitReturnRequest = () => {
    if (!selectedOrder || !returnReason) return;
    returnRequestMutation.mutate({
      transactionId: selectedOrder.id,
      reason: returnReason,
      details: returnDetails || undefined,
    });
  };

  const submitIssueReport = () => {
    if (!selectedOrder || !issueReason) return;
    reportIssueMutation.mutate({
      transactionId: selectedOrder.id,
      reason: issueReason,
      details: issueDetails || undefined,
    });
  };

  // Check if return is allowed based on return policy
  const isReturnAllowed = (order: Purchase): { allowed: boolean; reason?: string; daysRemaining?: number } => {
    if (!["delivered", "completed"].includes(order.status)) {
      return { allowed: false, reason: "not_delivered" };
    }

    const returnPolicy = order.listing?.returnPolicy || "لا يوجد إرجاع";
    let policyDays = 0;
    
    if (returnPolicy === "يوم واحد") policyDays = 1;
    else if (returnPolicy === "3 أيام") policyDays = 3;
    else if (returnPolicy === "7 أيام") policyDays = 7;
    else if (returnPolicy === "14 يوم") policyDays = 14;
    else if (returnPolicy === "30 يوم") policyDays = 30;
    else if (returnPolicy === "استبدال فقط") policyDays = 7;

    if (policyDays === 0) {
      return { allowed: false, reason: "no_return_policy" };
    }

    const deliveredAt = order.completedAt ? new Date(order.completedAt) : new Date(order.createdAt);
    const daysSinceDelivery = Math.floor((Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = policyDays - daysSinceDelivery;

    if (daysRemaining <= 0) {
      return { allowed: false, reason: "expired", daysRemaining: 0 };
    }

    return { allowed: true, daysRemaining };
  };

  const { data: summary, isLoading: summaryLoading } = useQuery<BuyerSummary>({
    queryKey: ["/api/account/buyer-summary"],
    enabled: !!user?.id,
  });

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/account/purchases"],
    enabled: !!user?.id,
  });

  const { data: myOffers = [], isLoading: offersLoading } = useQuery<BuyerOffer[]>({
    queryKey: ["/api/my-offers"],
    enabled: !!user?.id,
  });

  const { data: buyerWalletBalance, isLoading: walletLoading } = useQuery<BuyerWalletBalance>({
    queryKey: ["/api/buyer/wallet/balance"],
    enabled: !!user?.id,
  });

  const { data: buyerWalletTransactions = [], isLoading: walletTxLoading } = useQuery<BuyerWalletTransaction[]>({
    queryKey: ["/api/buyer/wallet/transactions"],
    enabled: !!user?.id,
  });

  const { data: myReturns = [], isLoading: returnsLoading } = useQuery<ReturnRequest[]>({
    queryKey: ["/api/return-requests/my"],
    queryFn: async () => {
      const res = await fetch("/api/return-requests/my", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch returns");
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Auto-open order detail when deep linked from notification
  useEffect(() => {
    if (deepLinkOrderId && purchases.length > 0) {
      const order = purchases.find(p => p.id === deepLinkOrderId);
      if (order) {
        openOrderDetail(order);
        setDeepLinkOrderId(null);
      }
    }
  }, [deepLinkOrderId, purchases]);

  // Auto-scroll to return request when deep linked
  useEffect(() => {
    if (deepLinkReturnId && myReturns.length > 0) {
      const el = document.getElementById(`return-${deepLinkReturnId}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    }
  }, [deepLinkReturnId, myReturns]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول للوصول إلى لوحة التحكم",
        variant: "destructive",
      });
      navigate("/signin?redirect=/buyer-dashboard");
    }
  }, [isLoading, isAuthenticated, navigate, toast]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <Lock className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-semibold mb-2">يجب تسجيل الدخول</h2>
          <p className="text-muted-foreground mb-6 text-center">يرجى تسجيل الدخول للوصول إلى لوحة التحكم</p>
          <Link href="/signin">
            <Button>تسجيل الدخول</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const pendingOffers = myOffers.filter(o => o.status === "countered" || o.status === "pending");

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Simple Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">مشترياتي</h1>
          <p className="text-sm text-muted-foreground">مرحباً {user?.displayName}</p>
        </div>

        {/* Quick Stats Strip */}
        <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full whitespace-nowrap">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{summaryLoading ? "..." : summary?.totalPurchases || 0} طلب</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full whitespace-nowrap">
            <Truck className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">{summaryLoading ? "..." : summary?.pendingOrders || 0} قيد التوصيل</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full whitespace-nowrap">
            <Wallet className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">{walletLoading ? "..." : (buyerWalletBalance?.available || 0).toLocaleString()} د.ع</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4" dir="rtl">
            <TabsTrigger value="orders" className="text-sm">
              الطلبات
              {(summary?.pendingOrders || 0) > 0 && (
                <span className="mr-1 text-xs bg-blue-500 text-white px-1.5 rounded-full">{summary?.pendingOrders}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="returns" className="text-sm">
              المرتجعات
              {myReturns.filter(r => r.status === "pending").length > 0 && (
                <span className="mr-1 text-xs bg-amber-500 text-white px-1.5 rounded-full">{myReturns.filter(r => r.status === "pending").length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="offers" className="text-sm">
              العروض
              {pendingOffers.length > 0 && (
                <span className="mr-1 text-xs bg-violet-500 text-white px-1.5 rounded-full">{pendingOffers.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="wallet" className="text-sm">المحفظة</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-0">
            {purchasesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد طلبات حتى الآن</p>
                <Link href="/search">
                  <Button variant="outline" className="mt-4">تصفح المنتجات</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {/* No-answer pending orders: show urgent reschedule banner */}
                {purchases.filter(p => p.status === "no_answer_pending").map((purchase) => (
                  <div
                    key={`no-answer-${purchase.id}`}
                    className="p-4 bg-red-50 border-2 border-red-300 rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold text-sm text-red-800 mb-1">
                          السائق لم يتمكن من الوصول إليك!
                        </p>
                        <p className="text-xs text-red-700 mb-3">
                          لديك 24 ساعة لإعادة جدولة التوصيل لطلب "{purchase.listing?.title || 'منتج'}". إذا لم تقم بإعادة الجدولة، سيتم إلغاء الطلب وتعليق حسابك من الطلب لمدة 7 أيام.
                        </p>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={rescheduleMutation.isPending}
                          onClick={() => rescheduleMutation.mutate(purchase.id)}
                        >
                          {rescheduleMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin ml-1" />
                          ) : (
                            <RotateCcw className="h-4 w-4 ml-1" />
                          )}
                          إعادة جدولة التوصيل
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className={`flex items-center gap-3 p-3 bg-card rounded-xl border transition-colors cursor-pointer active:bg-muted/50 ${
                      purchase.status === "no_answer_pending"
                        ? "border-red-300 bg-red-50/30"
                        : "border-border/50 hover:border-border"
                    }`}
                    onClick={() => openOrderDetail(purchase)}
                    data-testid={`order-${purchase.id}`}
                  >
                    {purchase.listing?.images?.[0] ? (
                      <img
                        src={purchase.listing.images[0]}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Package className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{purchase.listing?.title || "منتج"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={purchase.status} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(purchase.createdAt).toLocaleDateString("ar-IQ")}
                        </span>
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="font-bold text-sm">{purchase.amount?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">د.ع</p>
                      
                      {/* Rating section */}
                      {(purchase.status === "delivered" || purchase.status === "completed") && (
                        <div className="mt-2">
                          {purchase.sellerRating ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                              <CheckCircle className="h-3 w-3" />
                              تم التقييم
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 p-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                openRatingDialog(purchase);
                              }}
                              data-testid={`button-rate-seller-${purchase.id}`}
                            >
                              <Star className="h-3 w-3 ml-1" />
                              قيّم
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Returns Tab */}
          <TabsContent value="returns" className="mt-0">
            {returnsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : myReturns.length === 0 ? (
              <div className="text-center py-12">
                <RotateCcw className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد طلبات إرجاع</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myReturns.map((ret) => (
                  <div
                    key={ret.id}
                    className={`bg-white border rounded-xl p-4 space-y-3 ${deepLinkReturnId === ret.id ? "ring-2 ring-primary" : ""}`}
                    id={`return-${ret.id}`}
                  >
                    {/* Product info row */}
                    <div className="flex items-start gap-3">
                      {ret.listing?.images?.[0] ? (
                        <img
                          src={ret.listing.images[0]}
                          alt={ret.listing?.title || ""}
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Package className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{ret.listing?.title || "منتج"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {RETURN_REASON_LABELS[ret.reason] || ret.reason}
                        </p>
                        {ret.transaction?.amount && (
                          <p className="text-xs text-muted-foreground">
                            المبلغ: {ret.transaction.amount.toLocaleString()} د.ع
                          </p>
                        )}
                      </div>
                      <ReturnStatusBadge status={ret.status} />
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(ret.createdAt).toLocaleDateString("ar-IQ")}</span>
                    </div>

                    {/* Details if provided */}
                    {ret.details && (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                        <p className="text-xs text-muted-foreground mb-1">تفاصيل الطلب:</p>
                        {ret.details}
                      </div>
                    )}

                    {/* Seller response */}
                    {ret.sellerResponse && (
                      <div className={`rounded-lg p-3 text-sm ${
                        ret.status === "approved" ? "bg-emerald-50 text-emerald-800" :
                        ret.status === "rejected" ? "bg-rose-50 text-rose-800" :
                        "bg-blue-50 text-blue-800"
                      }`}>
                        <p className="text-xs font-medium mb-1">
                          <MessageCircle className="h-3 w-3 inline ml-1" />
                          رد البائع:
                        </p>
                        {ret.sellerResponse}
                        {ret.respondedAt && (
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(ret.respondedAt).toLocaleDateString("ar-IQ")}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Auto-approved notice */}
                    {ret.autoApproved && (
                      <div className="bg-emerald-50 rounded-lg p-2 text-xs text-emerald-700 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        تمت الموافقة تلقائياً وفقاً لسياسة الإرجاع
                      </div>
                    )}

                    {/* Refund info */}
                    {ret.refundAmount && ret.refundAmount > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <Wallet className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">
                          مبلغ الاسترداد: {ret.refundAmount.toLocaleString()} د.ع
                          {ret.refundProcessed ? " (تم)" : " (قيد المعالجة)"}
                        </span>
                      </div>
                    )}

                    {/* Pending status info */}
                    {ret.status === "pending" && (
                      <div className="bg-amber-50 rounded-lg p-2 text-xs text-amber-700 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        بانتظار رد البائع على طلب الإرجاع
                      </div>
                    )}

                    {/* Escalated status info */}
                    {ret.status === "escalated" && (
                      <div className="bg-orange-50 rounded-lg p-2 text-xs text-orange-700 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        تم تصعيد الطلب للإدارة — جارٍ المراجعة
                      </div>
                    )}

                    {/* Escalate button for rejected returns */}
                    {ret.status === "rejected" && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                        <p className="text-xs text-orange-800">
                          <AlertTriangle className="h-3 w-3 inline ml-1" />
                          هل تعتقد أن هذا القرار غير عادل؟ يمكنك تصعيد الطلب للإدارة للمراجعة.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs border-orange-300 text-orange-700 hover:bg-orange-100"
                          onClick={() => escalateReturnMutation.mutate(ret.id)}
                          disabled={escalateReturnMutation.isPending}
                        >
                          {escalateReturnMutation.isPending && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                          تصعيد للإدارة
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers" className="mt-0">
            {offersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : myOffers.length === 0 ? (
              <div className="text-center py-12">
                <HandCoins className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">لم تقدم أي عروض بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOffers.map((offer) => (
                  <div 
                    key={offer.id} 
                    className="p-3 bg-card rounded-xl border border-border/50"
                    data-testid={`offer-${offer.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {offer.listing?.images?.[0] ? (
                        <img
                          src={offer.listing.images[0]}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Package className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <Link href={`/product/${offer.listingId}`}>
                          <p className="font-medium text-sm truncate hover:text-primary">{offer.listing?.title || "منتج"}</p>
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          عرضك: <span className="font-medium">{offer.offerAmount?.toLocaleString()} د.ع</span>
                        </p>
                        {(offer.status === "pending" || offer.status === "countered") && (offer as any).expiresAt && (
                          <OfferCountdown expiresAt={(offer as any).expiresAt} />
                        )}
                      </div>
                      <OfferStatusBadge status={offer.status} />
                    </div>

                    {/* Counter offer actions */}
                    {offer.status === "countered" && offer.counterAmount && (
                      <div className="mt-3 p-3 bg-violet-50 rounded-lg">
                        <p className="text-sm text-violet-700 mb-2">
                          عرض البائع: <span className="font-bold">{offer.counterAmount.toLocaleString()} د.ع</span>
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => counterResponseMutation.mutate({ offerId: offer.id, action: "accept" })}
                            disabled={counterResponseMutation.isPending}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-8"
                          >
                            <CheckCircle className="h-4 w-4 ml-1" />
                            قبول
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => counterResponseMutation.mutate({ offerId: offer.id, action: "reject" })}
                            disabled={counterResponseMutation.isPending}
                            className="flex-1 h-8 border-rose-200 text-rose-600 hover:bg-rose-50"
                          >
                            <XCircle className="h-4 w-4 ml-1" />
                            رفض
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet" className="mt-0">
            {/* Balance Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-xs text-emerald-600 mb-1">متاح</p>
                {walletLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                ) : (
                  <p className="text-lg font-bold text-emerald-700">{(buyerWalletBalance?.available || 0).toLocaleString()} <span className="text-xs font-normal">د.ع</span></p>
                )}
              </div>
              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-xs text-amber-600 mb-1">قيد الانتظار</p>
                {walletLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                ) : (
                  <p className="text-lg font-bold text-amber-700">{(buyerWalletBalance?.pending || 0).toLocaleString()} <span className="text-xs font-normal">د.ع</span></p>
                )}
              </div>
            </div>

            {/* Transactions */}
            <div>
              <p className="text-sm font-medium mb-3">آخر الحركات</p>
              {walletTxLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : buyerWalletTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">لا توجد حركات</p>
              ) : (
                <div className="space-y-2">
                  {buyerWalletTransactions.slice(0, 10).map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${txn.amount >= 0 ? "bg-emerald-100" : "bg-rose-100"}`}>
                          {txn.amount >= 0 ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm">{txn.description || "حركة مالية"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(txn.createdAt).toLocaleDateString("ar-IQ")}
                          </p>
                        </div>
                      </div>
                      <p className={`font-bold text-sm ${txn.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {txn.amount >= 0 ? "+" : ""}{txn.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Order Detail Sheet */}
        <Sheet open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl" dir="rtl" style={{ zIndex: 100000 }}>
            {selectedOrder && (
              <div className="flex flex-col h-full">
                {/* Header */}
                <SheetHeader className="pb-4 border-b">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={() => setOrderDetailOpen(false)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <SheetTitle className="text-lg">تفاصيل الطلب</SheetTitle>
                  </div>
                </SheetHeader>

                {/* Content */}
                <div className="flex-1 overflow-y-auto py-4 pb-32 space-y-6">
                  {/* Product Info */}
                  <div className="flex gap-4">
                    {selectedOrder.listing?.images?.[0] ? (
                      <img
                        src={selectedOrder.listing.images[0]}
                        alt=""
                        className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Package className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{selectedOrder.listing?.title || "منتج"}</h3>
                      <p className="text-2xl font-bold mt-1">{selectedOrder.amount?.toLocaleString() || 0} <span className="text-sm font-normal text-muted-foreground">د.ع</span></p>
                      <div className="mt-2">
                        <StatusBadge status={selectedOrder.status} />
                      </div>
                    </div>
                  </div>

                  {/* Order Timeline */}
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-sm font-medium mb-3">حالة الطلب</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">تم تأكيد الطلب</p>
                          <p className="text-xs text-muted-foreground">{new Date(selectedOrder.createdAt).toLocaleDateString("ar-IQ")}</p>
                        </div>
                      </div>
                      {(selectedOrder.status === "shipped" || selectedOrder.status === "in_transit" || selectedOrder.status === "delivered" || selectedOrder.status === "completed") && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Truck className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">تم الشحن</p>
                          </div>
                        </div>
                      )}
                      {(selectedOrder.status === "delivered" || selectedOrder.status === "completed") && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">تم التسليم</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">تفاصيل</p>
                    <div className="bg-card rounded-xl border border-border/50 divide-y divide-border/50">
                      <div className="flex items-center justify-between p-3">
                        <span className="text-sm text-muted-foreground">رقم الطلب</span>
                        <span className="text-sm font-mono">{selectedOrder.id.slice(0, 8)}...</span>
                      </div>
                      <div className="flex items-center justify-between p-3">
                        <span className="text-sm text-muted-foreground">تاريخ الطلب</span>
                        <span className="text-sm">{new Date(selectedOrder.createdAt).toLocaleDateString("ar-IQ")}</span>
                      </div>
                      {selectedOrder.seller && (
                        <Link href={`/seller/${selectedOrder.sellerId}`}>
                          <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                            <span className="text-sm text-muted-foreground">البائع</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-primary">{selectedOrder.seller.displayName}</span>
                              <ExternalLink className="h-3 w-3 text-primary" />
                            </div>
                          </div>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Rating Section - If already rated */}
                  {selectedOrder.sellerRating && (
                    <div className="bg-amber-50 rounded-xl p-4">
                      <p className="text-sm font-medium mb-2">تقييمك للبائع</p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: selectedOrder.sellerRating }).map((_, i) => (
                          <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                        ))}
                        {Array.from({ length: 5 - selectedOrder.sellerRating }).map((_, i) => (
                          <Star key={i} className="h-5 w-5 text-amber-200" />
                        ))}
                      </div>
                      {selectedOrder.sellerFeedback && (
                        <p className="text-sm text-amber-700 mt-2">"{selectedOrder.sellerFeedback}"</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t space-y-3 pb-24 safe-area-bottom">
                  {/* Status-based actions */}
                  {(selectedOrder.status === "delivered" || selectedOrder.status === "completed") && !selectedOrder.sellerRating && (
                    <Button 
                      className="w-full bg-amber-500 hover:bg-amber-600" 
                      onClick={() => {
                        setOrderDetailOpen(false);
                        openRatingDialog(selectedOrder);
                      }}
                    >
                      <Star className="h-4 w-4 ml-2" />
                      قيّم البائع
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {selectedOrder.sellerId && (
                      <Link href={`/messages/${selectedOrder.sellerId}`} className="contents">
                        <Button variant="outline" className="w-full" onClick={() => setOrderDetailOpen(false)}>
                          <MessageCircle className="h-4 w-4 ml-2" />
                          مراسلة البائع
                        </Button>
                      </Link>
                    )}
                    
                    <Link href={`/product/${selectedOrder.listingId}`} className="contents">
                      <Button variant="outline" className="w-full" onClick={() => setOrderDetailOpen(false)}>
                        <ExternalLink className="h-4 w-4 ml-2" />
                        عرض المنتج
                      </Button>
                    </Link>
                  </div>

                  {/* Return Request Button - for delivered orders within return policy */}
                  {(selectedOrder.status === "delivered" || selectedOrder.status === "completed") && (() => {
                    const returnCheck = isReturnAllowed(selectedOrder);
                    if (returnCheck.allowed) {
                      return (
                        <Button 
                          variant="outline" 
                          className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={openReturnDialog}
                        >
                          <RotateCcw className="h-4 w-4 ml-2" />
                          طلب إرجاع ({returnCheck.daysRemaining} أيام متبقية)
                        </Button>
                      );
                    }
                    return null;
                  })()}

                  {/* Report Issue Button */}
                  <Button 
                    variant="outline" 
                    className="w-full text-rose-600 border-rose-200 hover:bg-rose-50"
                    onClick={openIssueDialog}
                  >
                    <AlertTriangle className="h-4 w-4 ml-2" />
                    الإبلاغ عن مشكلة
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Rating Dialog */}
        <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle>تقييم البائع</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">كيف كانت تجربتك؟</p>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingValue(star)}
                      className="p-1 transition-transform hover:scale-110"
                      data-testid={`star-${star}`}
                    >
                      <Star
                        className={`h-10 w-10 ${
                          star <= ratingValue
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {ratingValue > 0 && (
                  <p className="text-sm text-muted-foreground mt-3">
                    {ratingValue === 5 && "ممتاز!"}
                    {ratingValue === 4 && "جيد جداً"}
                    {ratingValue === 3 && "جيد"}
                    {ratingValue === 2 && "مقبول"}
                    {ratingValue === 1 && "ضعيف"}
                  </p>
                )}
              </div>
              <Textarea
                placeholder="أضف تعليقاً (اختياري)"
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                className="resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={submitRating}
                  disabled={ratingValue < 1 || rateSellerMutation.isPending}
                >
                  {rateSellerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  إرسال
                </Button>
                <Button variant="outline" onClick={() => setRatingDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Return Request Dialog */}
        <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
          <DialogContent className="max-w-sm z-[100010]" dir="rtl">
            <DialogHeader>
              <DialogTitle>طلب إرجاع</DialogTitle>
              <DialogDescription>
                اختر سبب الإرجاع وأضف تفاصيل إضافية إذا لزم الأمر
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>سبب الإرجاع *</Label>
                <Select value={returnReason} onValueChange={setReturnReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر سبب الإرجاع" />
                  </SelectTrigger>
                  <SelectContent>
                    {RETURN_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>تفاصيل إضافية (اختياري)</Label>
                <Textarea
                  placeholder="صف المشكلة بالتفصيل..."
                  value={returnDetails}
                  onChange={(e) => setReturnDetails(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>

              {selectedOrder?.listing?.returnPolicy && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <p className="font-medium text-blue-800">سياسة الإرجاع للمنتج</p>
                  <p className="text-blue-600">{selectedOrder.listing.returnPolicy}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={submitReturnRequest}
                  disabled={!returnReason || returnRequestMutation.isPending}
                >
                  {returnRequestMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  إرسال الطلب
                </Button>
                <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Report Issue Dialog */}
        <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
          <DialogContent className="max-w-sm z-[100010]" dir="rtl">
            <DialogHeader>
              <DialogTitle>الإبلاغ عن مشكلة</DialogTitle>
              <DialogDescription>
                صف المشكلة التي تواجهها وسنقوم بمراجعتها
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>نوع المشكلة *</Label>
                <Select value={issueReason} onValueChange={setIssueReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع المشكلة" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>وصف المشكلة *</Label>
                <Textarea
                  placeholder="صف المشكلة بالتفصيل..."
                  value={issueDetails}
                  onChange={(e) => setIssueDetails(e.target.value)}
                  className="resize-none"
                  rows={4}
                />
              </div>

              <div className="bg-amber-50 rounded-lg p-3 text-sm">
                <p className="text-amber-700">
                  سيتم مراجعة بلاغك خلال 24-48 ساعة وسنتواصل معك
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={submitIssueReport}
                  disabled={!issueReason || !issueDetails || reportIssueMutation.isPending}
                >
                  {reportIssueMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  إرسال البلاغ
                </Button>
                <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
