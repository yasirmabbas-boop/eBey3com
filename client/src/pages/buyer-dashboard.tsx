import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/queryClient";
import {
  Package,
  Heart,
  Clock,
  CheckCircle,
  Truck,
  ShoppingBag,
  Star,
  Loader2,
  Lock,
  HandCoins,
  XCircle,
  ArrowLeftRight,
  StarIcon,
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
  amount: number;
  status: string;
  createdAt: string;
  sellerRating?: number;
  sellerFeedback?: string;
  listing?: {
    id: string;
    title: string;
    price: number;
    images: string[];
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

const getStatusBadge = (status: string) => {
  switch (status) {
    case "delivered":
    case "completed":
      return <Badge className="bg-emerald-50 text-emerald-700 border-0"><CheckCircle className="h-3 w-3 ml-1" />تم التسليم</Badge>;
    case "in_transit":
      return <Badge className="bg-blue-50 text-blue-700 border-0"><Truck className="h-3 w-3 ml-1" />قيد التوصيل</Badge>;
    case "processing":
    case "pending":
      return <Badge className="bg-amber-50 text-amber-700 border-0"><Clock className="h-3 w-3 ml-1" />قيد التجهيز</Badge>;
    default:
      return <Badge className="bg-muted text-muted-foreground border-0">{status}</Badge>;
  }
};

const getOfferStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge className="bg-amber-50 text-amber-700 border-0"><Clock className="h-3 w-3 ml-1" />قيد الانتظار</Badge>;
    case "accepted":
      return <Badge className="bg-emerald-50 text-emerald-700 border-0"><CheckCircle className="h-3 w-3 ml-1" />مقبول</Badge>;
    case "rejected":
      return <Badge className="bg-rose-50 text-rose-700 border-0"><XCircle className="h-3 w-3 ml-1" />مرفوض</Badge>;
    case "countered":
      return <Badge className="bg-violet-50 text-violet-700 border-0"><ArrowLeftRight className="h-3 w-3 ml-1" />عرض مقابل</Badge>;
    case "expired":
      return <Badge className="bg-muted text-muted-foreground border-0"><Clock className="h-3 w-3 ml-1" />منتهي</Badge>;
    default:
      return <Badge className="bg-muted text-muted-foreground border-0">{status}</Badge>;
  }
};

export default function BuyerDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const counterResponseMutation = useMutation({
    mutationFn: async ({ offerId, action }: { offerId: string; action: "accept" | "reject" }) => {
      const authToken = localStorage.getItem("authToken");
      const res = await fetch(`/api/offers/${offerId}/buyer-respond`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
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

  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");

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
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-md text-center">
          <Card className="soft-border bg-amber-50/70">
            <CardContent className="pt-6">
              <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">يجب تسجيل الدخول</h2>
              <p className="text-muted-foreground mb-6">يرجى تسجيل الدخول للوصول إلى لوحة التحكم</p>
              <Link href="/signin">
                <Button className="w-full">تسجيل الدخول</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const recentPurchases = purchases.slice(0, 5);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">لوحة تحكم المشتري</h1>
          <p className="text-muted-foreground">مرحباً {user?.displayName}، تابع طلباتك ومشترياتك من هنا</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="soft-border elev-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المشتريات</p>
                  {summaryLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{summary?.totalPurchases || 0}</p>
                  )}
                </div>
                <ShoppingBag className="h-8 w-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="soft-border elev-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">طلبات قيد التوصيل</p>
                  {summaryLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-blue-600">{summary?.pendingOrders || 0}</p>
                  )}
                </div>
                <Truck className="h-8 w-8 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="soft-border elev-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">طلبات مكتملة</p>
                  {summaryLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-green-600">{summary?.completedOrders || 0}</p>
                  )}
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="soft-border elev-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">المفضلة</p>
                  {summaryLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-red-600">{summary?.wishlistItems || 0}</p>
                  )}
                </div>
                <Heart className="h-8 w-8 text-red-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Buyer Wallet */}
        <Card className="soft-border elev-1 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5" />
              محفظتي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-sm text-emerald-700">الرصيد المتاح</p>
                {walletLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mt-2 text-emerald-700" />
                ) : (
                  <p className="text-2xl font-bold text-emerald-800">
                    {(buyerWalletBalance?.available || 0).toLocaleString()} د.ع
                  </p>
                )}
              </div>
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-sm text-amber-700">رصيد قيد الانتظار</p>
                {walletLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mt-2 text-amber-700" />
                ) : (
                  <p className="text-2xl font-bold text-amber-800">
                    {(buyerWalletBalance?.pending || 0).toLocaleString()} د.ع
                  </p>
                )}
              </div>
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-sm text-blue-700">إجمالي الرصيد</p>
                {walletLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mt-2 text-blue-700" />
                ) : (
                  <p className="text-2xl font-bold text-blue-800">
                    {(buyerWalletBalance?.total || 0).toLocaleString()} د.ع
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-sm font-semibold mb-2">آخر الحركات</h4>
              {walletTxLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : buyerWalletTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد حركات مالية حتى الآن</p>
              ) : (
                <div className="divide-y">
                  {buyerWalletTransactions.slice(0, 5).map((txn) => (
                    <div key={txn.id} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${txn.amount >= 0 ? "bg-emerald-100" : "bg-rose-100"}`}>
                          {txn.amount >= 0 ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{txn.description || "حركة مالية"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(txn.createdAt).toLocaleDateString("ar-IQ")}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`font-bold ${txn.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {txn.amount >= 0 ? "+" : ""}{txn.amount.toLocaleString()} د.ع
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {txn.status === "available" ? "متاح" : txn.status === "pending" ? "قيد الانتظار" : txn.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/my-purchases">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2 soft-border" data-testid="button-my-purchases">
              <Package className="h-6 w-6" />
              <span>مشترياتي</span>
            </Button>
          </Link>
          <Link href="/search">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2 soft-border" data-testid="button-browse">
              <ShoppingBag className="h-6 w-6" />
              <span>تصفح المنتجات</span>
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2 soft-border" data-testid="button-settings">
              <Star className="h-6 w-6" />
              <span>الإعدادات</span>
            </Button>
          </Link>
        </div>

        {/* Recent Orders */}
        <Card className="soft-border elev-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>آخر الطلبات</CardTitle>
              <Link href="/my-purchases">
                <Button variant="link" size="sm">عرض الكل</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {purchasesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : recentPurchases.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد طلبات حتى الآن</p>
                <Link href="/search">
                  <Button className="mt-4 elev-1">تصفح المنتجات</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentPurchases.map((purchase) => (
                  <div key={purchase.id} className="flex items-center gap-4 p-4 soft-border rounded-lg bg-card/60 hover:bg-muted/40 transition-colors">
                    {purchase.listing?.images?.[0] ? (
                      <img
                        src={purchase.listing.images[0]}
                        alt={purchase.listing?.title || "منتج"}
                        className="w-20 h-20 rounded-lg object-cover"
                        loading="lazy"
                        style={{ imageRendering: "auto" }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-muted/60 flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground/60" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium">{purchase.listing?.title || "منتج"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(purchase.createdAt).toLocaleDateString("ar-IQ")}
                      </p>
                    </div>
                    <div className="text-left flex flex-col items-end gap-1">
                      {getStatusBadge(purchase.status)}
                      <p className="text-sm font-bold">{purchase.amount?.toLocaleString() || 0} د.ع</p>
                      {(purchase.status === "delivered" || purchase.status === "completed") && !purchase.sellerRating && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 mt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRatingDialog(purchase);
                          }}
                          data-testid={`button-rate-seller-${purchase.id}`}
                        >
                          <Star className="h-3 w-3 ml-1" />
                          قيّم البائع
                        </Button>
                      )}
                      {purchase.sellerRating && (
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: purchase.sellerRating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Offers */}
        <Card className="mt-8 soft-border elev-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <HandCoins className="h-5 w-5 text-primary" />
                عروضي
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {offersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : myOffers.length === 0 ? (
              <div className="text-center py-8">
                <HandCoins className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-muted-foreground">لم تقدم أي عروض بعد</p>
                <p className="text-sm text-muted-foreground/70 mt-1">عندما تقدم عروض على منتجات قابلة للتفاوض، ستظهر هنا</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myOffers.map((offer) => (
                  <div key={offer.id} className="flex items-center gap-4 p-4 soft-border rounded-lg bg-card/60 hover:bg-muted/40 transition-colors" data-testid={`card-offer-${offer.id}`}>
                    {offer.listing?.images?.[0] ? (
                      <img
                        src={offer.listing.images[0]}
                        alt={offer.listing?.title || "منتج"}
                        className="w-20 h-20 rounded-lg object-cover"
                        loading="lazy"
                        style={{ imageRendering: "auto" }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Link href={`/product/${offer.listingId}`}>
                        <h3 className="font-medium hover:text-primary transition-colors">{offer.listing?.title || "منتج"}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        عرضك: {offer.offerAmount?.toLocaleString()} د.ع
                        {offer.listing?.price && (
                          <span className="text-gray-400 mr-2">
                            (السعر الأصلي: {offer.listing.price.toLocaleString()} د.ع)
                          </span>
                        )}
                      </p>
                      {offer.status === "countered" && offer.counterAmount && (
                        <div className="mt-2 p-2 bg-purple-50 rounded-lg">
                          <p className="text-sm text-purple-600 font-medium">
                            عرض البائع المقابل: {offer.counterAmount.toLocaleString()} د.ع
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => counterResponseMutation.mutate({ 
                                offerId: offer.id, 
                                action: "accept" 
                              })}
                              disabled={counterResponseMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                              data-testid={`button-accept-counter-${offer.id}`}
                            >
                              <CheckCircle className="h-4 w-4 ml-1" />
                              قبول
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => counterResponseMutation.mutate({ 
                                offerId: offer.id, 
                                action: "reject" 
                              })}
                              disabled={counterResponseMutation.isPending}
                              data-testid={`button-reject-counter-${offer.id}`}
                            >
                              <XCircle className="h-4 w-4 ml-1" />
                              رفض
                            </Button>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(offer.createdAt).toLocaleDateString("ar-IQ")}
                      </p>
                    </div>
                    <div className="text-left">
                      {getOfferStatusBadge(offer.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Dialog */}
        <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle>تقييم البائع</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">كيف كانت تجربتك مع البائع؟</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingValue(star)}
                      className="p-1 transition-transform hover:scale-110"
                      data-testid={`star-${star}`}
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= ratingValue
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {ratingValue > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {ratingValue === 5 && "ممتاز! 🌟"}
                    {ratingValue === 4 && "جيد جداً 😊"}
                    {ratingValue === 3 && "جيد 👍"}
                    {ratingValue === 2 && "مقبول 😐"}
                    {ratingValue === 1 && "ضعيف 😔"}
                  </p>
                )}
              </div>
              <div>
                <Textarea
                  placeholder="أضف تعليقاً (اختياري)"
                  value={ratingFeedback}
                  onChange={(e) => setRatingFeedback(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={submitRating}
                  disabled={ratingValue < 1 || rateSellerMutation.isPending}
                >
                  {rateSellerMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : null}
                  إرسال التقييم
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRatingDialogOpen(false)}
                >
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
