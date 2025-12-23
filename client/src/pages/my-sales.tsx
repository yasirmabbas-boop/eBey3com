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
} from "lucide-react";
import type { Transaction, Listing, Offer } from "@shared/schema";

interface EnrichedTransaction extends Transaction {
  listing?: Listing;
  buyerInfo?: { displayName?: string; username?: string; city?: string };
}

interface EnrichedOffer extends Offer {
  listing?: Listing;
  buyerInfo?: { displayName?: string; username?: string };
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
    case "delivered":
      return (
        <Badge className="bg-green-100 text-green-800 border-0">
          <CheckCircle className="h-3 w-3 ml-1" />
          تم التسليم
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-0">
          <Clock className="h-3 w-3 ml-1" />
          بانتظار الشحن
        </Badge>
      );
    case "shipped":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-0">
          <Truck className="h-3 w-3 ml-1" />
          تم الشحن
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

const getOfferStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-0">
          <Clock className="h-3 w-3 ml-1" />
          بانتظار الرد
        </Badge>
      );
    case "accepted":
      return (
        <Badge className="bg-green-100 text-green-800 border-0">
          <Check className="h-3 w-3 ml-1" />
          تم القبول
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800 border-0">
          <X className="h-3 w-3 ml-1" />
          مرفوض
        </Badge>
      );
    case "countered":
      return (
        <Badge className="bg-purple-100 text-purple-800 border-0">
          <MessageSquare className="h-3 w-3 ml-1" />
          عرض مضاد
        </Badge>
      );
    default:
      return null;
  }
};

export default function MySales() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSale, setSelectedSale] = useState<EnrichedTransaction | null>(null);
  const [showShippingLabel, setShowShippingLabel] = useState(false);

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

  const pendingOffers = offers.filter(o => o.status === "pending");
  const completedSales = transactions.filter(t => t.status === "completed" || t.status === "delivered");
  const pendingSales = transactions.filter(t => t.status === "pending" || t.status === "shipped");

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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  {pendingSales.length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        بانتظار الشحن ({pendingSales.length})
                      </h3>
                      <div className="space-y-3">
                        {pendingSales.map((sale) => (
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
                                className="w-16 h-16 object-cover rounded"
                              />
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm line-clamp-2">
                                  {sale.listing?.title || "منتج"}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  {sale.amount.toLocaleString()} د.ع
                                </p>
                                <div className="mt-2">{getStatusBadge(sale.status)}</div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {completedSales.length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        المبيعات المكتملة ({completedSales.length})
                      </h3>
                      <div className="space-y-3">
                        {completedSales.map((sale) => (
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
                                className="w-16 h-16 object-cover rounded"
                              />
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm line-clamp-2">
                                  {sale.listing?.title || "منتج"}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  {sale.amount.toLocaleString()} د.ع
                                </p>
                                <div className="mt-2">{getStatusBadge(sale.status)}</div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-2 space-y-6">
                  {selectedSale ? (
                    <>
                      <Card className="p-6 border-2 border-primary">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                              {selectedSale.listing?.title || "منتج"}
                            </h2>
                            <p className="text-gray-600 mt-1">
                              رقم الطلب: {selectedSale.id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(selectedSale.status)}
                          </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                    </>
                  ) : (
                    <Card className="p-8 text-center">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">اختر طلباً من القائمة لعرض التفاصيل</p>
                    </Card>
                  )}
                </div>
              </div>
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
              <div className="space-y-4">
                {offers.map((offer) => (
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
                          {getOfferStatusBadge(offer.status)}
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
            sellerName: user?.displayName || user?.username || "",
            sellerCity: (user as any)?.city || "",
            buyerName: selectedSale.buyerInfo.displayName || selectedSale.buyerInfo.username || "مشتري",
            buyerPhone: "",
            deliveryAddress: selectedSale.deliveryAddress || "",
            city: selectedSale.buyerInfo.city || "",
            district: "",
            price: selectedSale.amount,
            saleDate: new Date(selectedSale.createdAt),
            paymentMethod: selectedSale.paymentMethod || "الدفع عند الاستلام",
          }}
        />
      )}
    </Layout>
  );
}
