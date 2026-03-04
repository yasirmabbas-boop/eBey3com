import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShippingLabel } from "@/components/shipping-label";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Printer,
  User,
  Loader2,
  Tag,
  X,
  Check,
  MessageSquare,
  ShoppingBag,
  Eye,
  Filter,
  Calendar,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Transaction, Listing, Offer } from "@shared/schema";

interface EnrichedTransaction extends Transaction {
  listing?: Listing;
  buyerInfo?: { 
    displayName?: string; 
    username?: string; 
    city?: string;
    district?: string;
    addressLine1?: string;
    addressLine2?: string;
    phone?: string;
  };
}

interface EnrichedOffer extends Offer {
  listing?: Listing;
  buyerInfo?: { displayName?: string; username?: string };
}

const statusLabels: Record<string, { ar: string; ku: string; en: string }> = {
  delivered: { ar: "تم التسليم", ku: "گەیەندرا", en: "Delivered" },
  cancelled: { ar: "ملغي", ku: "هەڵوەشاوە", en: "Cancelled" },
  pending: { ar: "بانتظار الشحن", ku: "چاوەڕێی ناردن", en: "Awaiting Shipment" },
  shipped: { ar: "تم الشحن", ku: "نێردرا", en: "Shipped" },
};

const offerLabels: Record<string, { ar: string; ku: string; en: string }> = {
  pending: { ar: "بانتظار الرد", ku: "چاوەڕێی وەڵام", en: "Awaiting Response" },
  accepted: { ar: "تم القبول", ku: "قبوڵکرا", en: "Accepted" },
  rejected: { ar: "مرفوض", ku: "ڕەتکراوە", en: "Rejected" },
  countered: { ar: "عرض مضاد", ku: "پێشنیاری دژ", en: "Counter Offer" },
};

const getStatusBadge = (status: string, language: string = "ar") => {
  const lang = language as "ar" | "ku" | "en";
  switch (status) {
    case "completed":
    case "delivered":
      return (
        <Badge className="bg-green-100 text-green-800 border-0">
          <CheckCircle className="h-3 w-3 ml-1" />
          {statusLabels.delivered[lang] || statusLabels.delivered.en}
        </Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-red-100 text-red-800 border-0">
          <XCircle className="h-3 w-3 ml-1" />
          {statusLabels.cancelled[lang] || statusLabels.cancelled.en}
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-0">
          <Clock className="h-3 w-3 ml-1" />
          {statusLabels.pending[lang] || statusLabels.pending.en}
        </Badge>
      );
    case "shipped":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-0">
          <Truck className="h-3 w-3 ml-1" />
          {statusLabels.shipped[lang] || statusLabels.shipped.en}
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-100 text-gray-800 border-0">
          {status}
        </Badge>
      );
  }
};

const getOfferStatusBadge = (status: string, language: string = "ar") => {
  const lang = language as "ar" | "ku" | "en";
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-0">
          <Clock className="h-3 w-3 ml-1" />
          {offerLabels.pending[lang] || offerLabels.pending.en}
        </Badge>
      );
    case "accepted":
      return (
        <Badge className="bg-green-100 text-green-800 border-0">
          <Check className="h-3 w-3 ml-1" />
          {offerLabels.accepted[lang] || offerLabels.accepted.en}
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800 border-0">
          <X className="h-3 w-3 ml-1" />
          {offerLabels.rejected[lang] || offerLabels.rejected.en}
        </Badge>
      );
    case "countered":
      return (
        <Badge className="bg-purple-100 text-purple-800 border-0">
          <MessageSquare className="h-3 w-3 ml-1" />
          {offerLabels.countered[lang] || offerLabels.countered.en}
        </Badge>
      );
    default:
      return null;
  }
};

type SalesStatusFilter = "all" | "pending" | "shipped" | "delivered" | "completed" | "cancelled";
type OffersStatusFilter = "all" | "pending" | "accepted" | "rejected" | "countered";
type TimelineFilter = "all" | "today" | "week" | "month";

const filterByTimeline = <T extends { createdAt: Date | string }>(items: T[], timeline: TimelineFilter): T[] => {
  if (timeline === "all") return items;
  
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return items.filter(item => {
    const itemDate = new Date(item.createdAt);
    switch (timeline) {
      case "today":
        return itemDate >= startOfDay;
      case "week":
        return itemDate >= startOfWeek;
      case "month":
        return itemDate >= startOfMonth;
      default:
        return true;
    }
  });
};

export default function MySales() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSale, setSelectedSale] = useState<EnrichedTransaction | null>(null);
  const [showShippingLabel, setShowShippingLabel] = useState(false);
  const [salesStatusFilter, setSalesStatusFilter] = useState<SalesStatusFilter>("all");
  const [salesTimelineFilter, setSalesTimelineFilter] = useState<TimelineFilter>("all");
  const [offersStatusFilter, setOffersStatusFilter] = useState<OffersStatusFilter>("all");
  const [offersTimelineFilter, setOffersTimelineFilter] = useState<TimelineFilter>("all");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<EnrichedTransaction[]>({
    queryKey: ["/api/seller-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/transactions/${user.id}`);
      if (!res.ok) return [];
      const txs: Transaction[] = await res.json();
      const sellerTxs = txs.filter(t => t.sellerId === user.id);
      
      const enriched = await Promise.all(sellerTxs.map(async (tx) => {
        const listingRes = await fetch(`/api/listings/${tx.listingId}`);
        const listing = listingRes.ok ? await listingRes.json() : undefined;
        const buyerRes = await fetch(`/api/users/${tx.buyerId}`);
        const buyerInfo = buyerRes.ok ? await buyerRes.json() : undefined;
        return { ...tx, listing, buyerInfo };
      }));
      return enriched;
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  const { data: offers = [], isLoading: offersLoading } = useQuery<EnrichedOffer[]>({
    queryKey: ["/api/seller-offers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/offers/received/${user.id}`);
      if (!res.ok) return [];
      const offersList: Offer[] = await res.json();
      
      const enriched = await Promise.all(offersList.map(async (offer) => {
        const listingRes = await fetch(`/api/listings/${offer.listingId}`);
        const listing = listingRes.ok ? await listingRes.json() : undefined;
        const buyerRes = await fetch(`/api/users/${offer.buyerId}`);
        const buyerInfo = buyerRes.ok ? await buyerRes.json() : undefined;
        return { ...offer, listing, buyerInfo };
      }));
      return enriched;
    },
    enabled: !!user?.id,
  });

  const respondToOfferMutation = useMutation({
    mutationFn: async ({ offerId, status }: { offerId: string; status: string }) => {
      const res = await fetch(`/api/offers/${offerId}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("فشل في الرد على العرض");
      return res.json();
    },
    onSuccess: (_, { status }) => {
      toast({
        title: status === "accepted" ? "تم قبول العرض" : "تم رفض العرض",
        description: status === "accepted" ? "سيتم إنشاء طلب بيع جديد" : "تم إبلاغ المشتري",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seller-offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller-transactions"] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في الرد على العرض",
        variant: "destructive",
      });
    },
  });

  const markAsShippedMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const authToken = localStorage.getItem("authToken");
      const res = await fetch(`/api/transactions/${transactionId}/ship`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل في تحديث حالة الشحن");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "تم تأكيد الشحن! 📦",
        description: data.isGuestBuyer 
          ? "يرجى التواصل مع المشتري عبر الهاتف لإبلاغه بالشحن" 
          : "تم إرسال إشعار للمشتري",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seller-transactions"] });
      if (selectedSale) {
        setSelectedSale({ ...selectedSale, status: "shipped" });
      }
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة الشحن",
        variant: "destructive",
      });
    },
  });

  const markAsDeliveredMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const authToken = localStorage.getItem("authToken");
      const res = await fetch(`/api/transactions/${transactionId}/deliver`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل في تحديث حالة التسليم");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم تأكيد التسليم! ✅",
        description: "تم تسجيل الطلب كمُسلّم بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seller-transactions"] });
      if (selectedSale) {
        setSelectedSale({ ...selectedSale, status: "delivered" });
      }
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة التسليم",
        variant: "destructive",
      });
    },
  });

  const cancelSaleMutation = useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: string; reason: string }) => {
      const authToken = localStorage.getItem("authToken");
      const res = await fetch(`/api/transactions/${transactionId}/seller-cancel`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "فشل في إلغاء الطلب");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إلغاء الطلب",
        description: "تم إلغاء الطلب وإبلاغ المشتري",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seller-transactions"] });
      setShowCancelDialog(false);
      setCancelReason("");
      setSelectedSale(null);
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إلغاء الطلب",
        variant: "destructive",
      });
    },
  });

  const filteredSales = filterByTimeline(
    salesStatusFilter === "all" 
      ? transactions 
      : transactions.filter(t => t.status === salesStatusFilter || (salesStatusFilter === "completed" && t.status === "delivered")),
    salesTimelineFilter
  );

  const filteredOffers = filterByTimeline(
    offersStatusFilter === "all" 
      ? offers 
      : offers.filter(o => o.status === offersStatusFilter),
    offersTimelineFilter
  );

  const pendingOffers = offers.filter(o => o.status === "pending");

  if (authLoading) {
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
        <div className="container mx-auto px-4 py-16 text-center">
          <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">تسجيل الدخول مطلوب</h2>
          <p className="text-muted-foreground mb-4">يجب تسجيل الدخول لعرض مبيعاتك</p>
          <Link href="/signin">
            <Button data-testid="button-signin">تسجيل الدخول</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const canPrintShippingLabel = selectedSale && (selectedSale.status === "pending" || selectedSale.status === "shipped");

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">📦 مبيعاتي</h1>
          <p className="text-gray-600">إدارة طلباتك والعروض المقدمة</p>
        </div>

        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="sales" className="gap-2">
              <Package className="h-4 w-4" />
              المبيعات ({transactions.length})
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-2">
              <Tag className="h-4 w-4" />
              العروض ({pendingOffers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            {transactionsLoading ? (
              <div className="text-center py-16">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">جاري تحميل المبيعات...</p>
              </div>
            ) : transactions.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">لا توجد مبيعات بعد</h3>
                <p className="text-gray-500 mb-4">عندما يشتري أحد منتجاتك، ستظهر هنا</p>
                <Link href="/sell">
                  <Button data-testid="button-create-listing">أضف منتجاً للبيع</Button>
                </Link>
              </Card>
            ) : (
              <>
                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Select value={salesStatusFilter} onValueChange={(v) => setSalesStatusFilter(v as SalesStatusFilter)}>
                      <SelectTrigger className="w-36" data-testid="select-sales-status">
                        <SelectValue placeholder="الحالة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="pending">بانتظار الشحن</SelectItem>
                        <SelectItem value="shipped">تم الشحن</SelectItem>
                        <SelectItem value="delivered">تم التسليم</SelectItem>
                        <SelectItem value="completed">مكتملة</SelectItem>
                        <SelectItem value="cancelled">ملغية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <Select value={salesTimelineFilter} onValueChange={(v) => setSalesTimelineFilter(v as TimelineFilter)}>
                      <SelectTrigger className="w-32" data-testid="select-sales-timeline">
                        <SelectValue placeholder="الفترة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="today">اليوم</SelectItem>
                        <SelectItem value="week">هذا الأسبوع</SelectItem>
                        <SelectItem value="month">هذا الشهر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-sm text-gray-500 self-center">
                    ({filteredSales.length} نتيجة)
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="space-y-3">
                    {filteredSales.map((sale) => (
                      <Card
                        key={sale.id}
                        className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                          selectedSale?.id === sale.id ? "ring-2 ring-primary border-primary" : ""
                        }`}
                        onClick={() => setSelectedSale(sale)}
                        data-testid={`sale-card-${sale.id}`}
                      >
                        <div className="flex gap-3">
                          <img
                            src={sale.listing?.images?.[0] || "https://via.placeholder.com/100"}
                            alt={sale.listing?.title || "منتج"}
                            className="w-20 h-20 object-cover rounded-lg"
                            loading="lazy"
                            style={{ imageRendering: "auto" }}
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm line-clamp-2">
                              {sale.listing?.title || "منتج"}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1">
                              {sale.amount.toLocaleString()} د.ع
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(sale.createdAt).toLocaleDateString("ar-IQ")}
                            </p>
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              {getStatusBadge(sale.status, language)}
                              {/* Views - Hidden */}
                              {/* <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {(sale.listing as any)?.views || 0}
                              </span> */}
                            </div>
                            {["pending", "pending_payment", "pending_shipping"].includes(sale.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2 text-red-600 border-red-300 hover:bg-red-50 w-full gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSale(sale);
                                  setShowCancelDialog(true);
                                }}
                                data-testid={`button-cancel-sale-card-${sale.id}`}
                              >
                                <XCircle className="h-4 w-4" />
                                إلغاء الطلب
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                    {filteredSales.length === 0 && (
                      <Card className="p-6 text-center">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">لا توجد نتائج للفلتر المحدد</p>
                      </Card>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  {selectedSale ? (
                    <>
                      <Card className="p-6 border-2 border-primary">
                        <div className="flex items-start gap-4 mb-4">
                          {selectedSale.listing?.images?.[0] && (
                            <Link href={`/product/${selectedSale.listingId}`}>
                              <img
                                src={selectedSale.listing.images[0]}
                                alt={selectedSale.listing?.title || "منتج"}
                                className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                loading="lazy"
                                style={{ imageRendering: "auto" }}
                              />
                            </Link>
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <Link href={`/product/${selectedSale.listingId}`}>
                                  <h2 className="text-xl font-bold text-gray-900 hover:text-primary transition-colors">
                                    {selectedSale.listing?.title || "منتج"}
                                  </h2>
                                </Link>
                                <p className="text-gray-600 mt-1">
                                  رقم الطلب: {selectedSale.id.slice(0, 8).toUpperCase()}
                                  {(selectedSale.listing as any)?.sku && (
                                    <span className="inline-flex items-center gap-1 mr-3 px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                                      🔒 SKU: {(selectedSale.listing as any).sku}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(selectedSale.status, language)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">السعر</p>
                            <p className="font-bold text-lg text-green-600">
                              {selectedSale.amount.toLocaleString()}
                              <span className="text-sm ml-1">د.ع</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">تاريخ البيع</p>
                            <p className="font-semibold text-sm">
                              {new Date(selectedSale.createdAt).toLocaleDateString("ar-IQ")}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">طريقة الدفع</p>
                            <p className="font-semibold text-sm">{selectedSale.paymentMethod || "نقداً"}</p>
                          </div>
                          {/* Views - Hidden */}
                          {/* <div>
                            <p className="text-xs text-gray-600 mb-1">المشاهدات</p>
                            <p className="font-semibold text-sm flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {(selectedSale.listing as any)?.views || 0}
                            </p>
                          </div> */}
                          <div>
                            <Link href={`/product/${selectedSale.listingId}`}>
                              <Button variant="outline" size="sm" className="w-full">
                                عرض المنتج
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-6 bg-blue-50 border-blue-200">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                          <User className="h-5 w-5 text-blue-600" />
                          معلومات المشتري
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-600">اسم المشتري</p>
                            <p className="font-semibold text-lg">
                              {selectedSale.buyerInfo?.displayName || selectedSale.buyerInfo?.username || "مشتري"}
                            </p>
                          </div>
                          {selectedSale.deliveryAddress && (
                            <div className="md:col-span-2">
                              <p className="text-xs text-gray-600">العنوان</p>
                              <p className="font-semibold text-sm flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {selectedSale.deliveryAddress}
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>

                      {canPrintShippingLabel && (
                        <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-bold text-green-800 text-lg mb-1 flex items-center gap-2">
                                <Printer className="h-5 w-5" />
                                بطاقة الشحن جاهزة
                              </h3>
                              <p className="text-sm text-green-700">
                                اطبع بطاقة الشحن وألصقها على الطرد
                              </p>
                            </div>
                            <Button
                              onClick={() => setShowShippingLabel(true)}
                              className="bg-green-600 hover:bg-green-700 text-white gap-2"
                              data-testid="button-print-shipping-label"
                            >
                              <Printer className="h-5 w-5" />
                              طباعة
                            </Button>
                          </div>
                        </Card>
                      )}

                      {/* Mark as Shipped Button */}
                      {selectedSale.status === "pending" && (
                        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-bold text-blue-800 text-lg mb-1 flex items-center gap-2">
                                <Truck className="h-5 w-5" />
                                تأكيد الشحن
                              </h3>
                              <p className="text-sm text-blue-700">
                                بعد إرسال الطرد، اضغط لإبلاغ المشتري
                              </p>
                            </div>
                            <Button
                              onClick={() => markAsShippedMutation.mutate(selectedSale.id)}
                              disabled={markAsShippedMutation.isPending}
                              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                              data-testid="button-mark-shipped"
                            >
                              {markAsShippedMutation.isPending ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Truck className="h-5 w-5" />
                              )}
                              تم الشحن
                            </Button>
                          </div>
                        </Card>
                      )}
                      
                      {selectedSale.status === "shipped" && (
                        <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-bold text-green-800 text-lg mb-1 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5" />
                                تأكيد التسليم
                              </h3>
                              <p className="text-sm text-green-700">
                                بعد وصول الطرد للمشتري، اضغط لتأكيد التسليم
                              </p>
                            </div>
                            <Button
                              onClick={() => markAsDeliveredMutation.mutate(selectedSale.id)}
                              disabled={markAsDeliveredMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white gap-2"
                              data-testid="button-mark-delivered"
                            >
                              {markAsDeliveredMutation.isPending ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <CheckCircle className="h-5 w-5" />
                              )}
                              تم التسليم
                            </Button>
                          </div>
                        </Card>
                      )}

                      {/* Cancel Sale Button - only for pending/pending_payment/pending_shipping orders */}
                      {["pending", "pending_payment", "pending_shipping"].includes(selectedSale.status) && (
                        <Card className="p-6 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-bold text-red-800 text-lg mb-1 flex items-center gap-2">
                                <XCircle className="h-5 w-5" />
                                إلغاء الطلب
                              </h3>
                              <p className="text-sm text-red-700">
                                إلغاء هذا الطلب وإبلاغ المشتري
                              </p>
                            </div>
                            <Button
                              onClick={() => setShowCancelDialog(true)}
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-100 gap-2"
                              data-testid="button-cancel-sale"
                            >
                              <XCircle className="h-5 w-5" />
                              إلغاء
                            </Button>
                          </div>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card className="p-8 text-center">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">اختر طلباً من القائمة لعرض التفاصيل</p>
                    </Card>
                  )}
                </div>
              </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="offers">
            {offersLoading ? (
              <div className="text-center py-16">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">جاري تحميل العروض...</p>
              </div>
            ) : offers.length === 0 ? (
              <Card className="p-8 text-center">
                <Tag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">لا توجد عروض</h3>
                <p className="text-gray-500">عندما يقدم مشتري عرضاً على منتجاتك، سيظهر هنا</p>
              </Card>
            ) : (
              <>
                {/* Offers Filters */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Select value={offersStatusFilter} onValueChange={(v) => setOffersStatusFilter(v as OffersStatusFilter)}>
                      <SelectTrigger className="w-36" data-testid="select-offers-status">
                        <SelectValue placeholder="الحالة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="pending">بانتظار الرد</SelectItem>
                        <SelectItem value="accepted">مقبول</SelectItem>
                        <SelectItem value="rejected">مرفوض</SelectItem>
                        <SelectItem value="countered">عرض مضاد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <Select value={offersTimelineFilter} onValueChange={(v) => setOffersTimelineFilter(v as TimelineFilter)}>
                      <SelectTrigger className="w-32" data-testid="select-offers-timeline">
                        <SelectValue placeholder="الفترة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="today">اليوم</SelectItem>
                        <SelectItem value="week">هذا الأسبوع</SelectItem>
                        <SelectItem value="month">هذا الشهر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-sm text-gray-500 self-center">
                    ({filteredOffers.length} نتيجة)
                  </span>
                </div>

                <div className="space-y-4">
                {filteredOffers.length === 0 ? (
                  <Card className="p-6 text-center">
                    <Tag className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">لا توجد نتائج للفلتر المحدد</p>
                  </Card>
                ) : filteredOffers.map((offer) => (
                  <Card key={offer.id} className="p-4" data-testid={`offer-card-${offer.id}`}>
                    <div className="flex gap-4">
                      <img
                        src={offer.listing?.images?.[0] || "https://via.placeholder.com/100"}
                        alt={offer.listing?.title || "منتج"}
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-lg">{offer.listing?.title || "منتج"}</h4>
                            <p className="text-sm text-gray-600">
                              من: {offer.buyerInfo?.displayName || offer.buyerInfo?.username || "مشتري"}
                            </p>
                          </div>
                          {getOfferStatusBadge(offer.status, language)}
                        </div>

                        <div className="mt-3 flex items-center gap-4">
                          <div>
                            <p className="text-xs text-gray-500">السعر الأصلي</p>
                            <p className="font-semibold">{offer.listing?.price?.toLocaleString()} د.ع</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">العرض المقدم</p>
                            <p className="font-bold text-primary text-lg">{offer.offerAmount.toLocaleString()} د.ع</p>
                          </div>
                        </div>

                        {offer.message && (
                          <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            "{offer.message}"
                          </p>
                        )}

                        {offer.status === "pending" && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => respondToOfferMutation.mutate({ offerId: offer.id, status: "accepted" })}
                              disabled={respondToOfferMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                              data-testid={`button-accept-offer-${offer.id}`}
                            >
                              <Check className="h-4 w-4 ml-1" />
                              قبول
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => respondToOfferMutation.mutate({ offerId: offer.id, status: "rejected" })}
                              disabled={respondToOfferMutation.isPending}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              data-testid={`button-reject-offer-${offer.id}`}
                            >
                              <X className="h-4 w-4 ml-1" />
                              رفض
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedSale && selectedSale.buyerInfo && (
        <ShippingLabel
          open={showShippingLabel}
          onOpenChange={setShowShippingLabel}
          orderDetails={{
            orderId: selectedSale.id.slice(0, 8).toUpperCase(),
            productTitle: selectedSale.listing?.title || "منتج",
            productCode: (selectedSale.listing as any)?.productCode || "",
            sku: (selectedSale.listing as any)?.sku || undefined,
            sellerName: user?.displayName || (user as any)?.username || "",
            sellerPhone: user?.phone || "",
            sellerCity: user?.city || "",
            sellerAddress: user?.addressLine1 || "",
            buyerName: selectedSale.buyerInfo.displayName || selectedSale.buyerInfo.username || "مشتري",
            buyerPhone: selectedSale.buyerInfo.phone || "",
            deliveryAddress: selectedSale.deliveryAddress || selectedSale.buyerInfo.addressLine1 || "",
            city: selectedSale.buyerInfo.city || "",
            district: selectedSale.buyerInfo.district || "",
            price: selectedSale.amount,
            saleDate: new Date(selectedSale.createdAt),
            paymentMethod: selectedSale.paymentMethod || "الدفع عند الاستلام",
          }}
        />
      )}

      {/* Cancel Sale Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              إلغاء الطلب
            </DialogTitle>
            <DialogDescription>
              يرجى تقديم سبب الإلغاء. سيتم إبلاغ المشتري بالإلغاء.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="سبب الإلغاء (مثال: المنتج غير متوفر، تم البيع لشخص آخر...)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-cancel-reason"
            />
            <p className="text-xs text-gray-500 mt-2">
              * سيتم تسجيل هذا الإلغاء ويمكن للمشرفين مراجعته
            </p>
          </div>
          <DialogFooter className="gap-2 flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason("");
              }}
            >
              تراجع
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedSale) {
                  cancelSaleMutation.mutate({ 
                    transactionId: selectedSale.id, 
                    reason: cancelReason 
                  });
                }
              }}
              disabled={cancelReason.trim().length < 5 || cancelSaleMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {cancelSaleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : null}
              تأكيد الإلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
