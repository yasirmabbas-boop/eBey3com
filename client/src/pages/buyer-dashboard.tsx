import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
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
  sellerRating?: number;
  sellerFeedback?: string;
  shippingAddress?: string;
  listing?: {
    id: string;
    title: string;
    price: number;
    images: string[];
  };
  seller?: {
    id: string;
    displayName: string;
    avatar?: string;
  };
}

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

export default function BuyerDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("orders");

  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Purchase | null>(null);

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
          <TabsList className="w-full grid grid-cols-3 mb-4" dir="rtl">
            <TabsTrigger value="orders" className="text-sm">
              الطلبات
              {(summary?.pendingOrders || 0) > 0 && (
                <span className="mr-1 text-xs bg-blue-500 text-white px-1.5 rounded-full">{summary?.pendingOrders}</span>
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
                {purchases.map((purchase) => (
                  <div 
                    key={purchase.id} 
                    className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 hover:border-border transition-colors cursor-pointer active:bg-muted/50"
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
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl" dir="rtl">
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

                  {(selectedOrder.status === "pending" || selectedOrder.status === "processing") && (
                    <Button variant="outline" className="w-full text-rose-600 border-rose-200 hover:bg-rose-50">
                      <AlertTriangle className="h-4 w-4 ml-2" />
                      الإبلاغ عن مشكلة
                    </Button>
                  )}
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
      </div>
    </Layout>
  );
}
