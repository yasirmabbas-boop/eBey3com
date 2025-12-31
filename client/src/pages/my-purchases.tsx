import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { StarRating } from "@/components/star-rating";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Loader2,
  ShoppingBag,
  Lock,
  MapPin,
  Phone,
  CreditCard,
  MessageCircle,
  ExternalLink,
  ChevronLeft,
  Store,
  Star,
  Calendar,
  Send,
} from "lucide-react";

interface Purchase {
  id: string;
  listingId: string;
  amount: number;
  status: string;
  deliveryStatus?: string;
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryCity?: string;
  paymentMethod?: string;
  trackingNumber?: string;
  shippedAt?: string;
  trackingAvailableAt?: string;
  createdAt: string;
  completedAt?: string;
  hasReview?: boolean;
  listing?: {
    id: string;
    title: string;
    price: number;
    images: string[];
    sellerName: string;
    sellerId: string;
    city: string;
  };
}

function RateSellerCard({ 
  purchase, 
  userId,
  onReviewSubmitted 
}: { 
  purchase: Purchase; 
  userId: string;
  onReviewSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(purchase.hasReview || false);
  const { toast } = useToast();

  const submitReviewMutation = useMutation({
    mutationFn: async (data: { sellerId: string; reviewerId: string; listingId: string; rating: number; comment: string }) => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit review");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إرسال التقييم",
        description: "شكراً لك على تقييم البائع",
      });
      setIsSubmitted(true);
      onReviewSubmitted();
    },
    onError: () => {
      toast({
        title: "فشل إرسال التقييم",
        description: "حدث خطأ، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!purchase.listing?.sellerId || !purchase.listingId || rating === 0) return;
    submitReviewMutation.mutate({
      sellerId: purchase.listing.sellerId,
      reviewerId: userId,
      listingId: purchase.listingId,
      rating,
      comment,
    });
  };

  if (isSubmitted) {
    return (
      <Card className="p-5 bg-green-50 border-green-200">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-green-500" />
          <div>
            <h3 className="font-bold text-green-700">تم تقييم البائع</h3>
            <p className="text-sm text-green-600">شكراً لك على مشاركة تجربتك</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 bg-yellow-50 border-yellow-200">
      <h3 className="font-bold text-base mb-4 flex items-center gap-2">
        <Star className="h-5 w-5 text-yellow-500" />
        قيّم البائع
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        كيف كانت تجربتك مع {purchase.listing?.sellerName || "البائع"}؟
      </p>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">التقييم</p>
          <StarRating value={rating} onChange={setRating} size="lg" />
        </div>
        
        <div>
          <p className="text-sm font-medium mb-2">تعليق (اختياري)</p>
          <Textarea
            placeholder="شارك تجربتك مع هذا البائع..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="resize-none"
            data-testid="input-review-comment"
          />
        </div>
        
        <Button 
          onClick={handleSubmit}
          disabled={rating === 0 || submitReviewMutation.isPending}
          className="w-full gap-2"
          data-testid="button-submit-review"
        >
          {submitReviewMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          إرسال التقييم
        </Button>
      </div>
    </Card>
  );
}

type DeliveryStep = "paid" | "tracking" | "delivered";

const getDeliverySteps = (purchase: Purchase): { step: DeliveryStep; completed: boolean; date?: string }[] => {
  const status = purchase.status || purchase.deliveryStatus || "pending";
  
  return [
    {
      step: "paid" as DeliveryStep,
      completed: true,
      date: purchase.createdAt,
    },
    {
      step: "tracking" as DeliveryStep,
      completed: !!purchase.trackingNumber || status === "shipped" || status === "in_transit" || status === "delivered" || status === "completed",
      date: purchase.trackingAvailableAt || purchase.shippedAt,
    },
    {
      step: "delivered" as DeliveryStep,
      completed: status === "delivered" || status === "completed",
      date: purchase.completedAt,
    },
  ];
};

const getStepLabel = (step: DeliveryStep): string => {
  switch (step) {
    case "paid": return "تم الطلب";
    case "tracking": return "تم الشحن";
    case "delivered": return "تم التسليم";
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "delivered":
    case "completed":
      return (
        <Badge className="bg-green-500 text-white border-0 text-sm px-3 py-1">
          تم التسليم
        </Badge>
      );
    case "shipped":
    case "in_transit":
      return (
        <Badge className="bg-blue-500 text-white border-0 text-sm px-3 py-1">
          تم الشحن - قيد التوصيل
        </Badge>
      );
    case "processing":
    case "pending":
      return (
        <Badge className="bg-yellow-500 text-white border-0 text-sm px-3 py-1">
          قيد التجهيز
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-500 text-white border-0 text-sm px-3 py-1">
          {status}
        </Badge>
      );
  }
};

function DeliveryTimeline({ purchase }: { purchase: Purchase }) {
  const steps = getDeliverySteps(purchase);
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString("ar-IQ", { month: "short", day: "numeric" });
  };
  
  return (
    <div className="py-6">
      <div className="flex items-center justify-between relative">
        {steps.map((stepInfo, index) => {
          const formattedDate = formatDate(stepInfo.date);
          return (
            <div key={stepInfo.step} className="flex flex-col items-center flex-1 relative z-10">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  stepInfo.completed 
                    ? "bg-green-500 text-white" 
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {stepInfo.completed ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-current" />
                )}
              </div>
              <p className={`text-xs mt-2 font-medium text-center ${
                stepInfo.completed ? "text-green-600" : "text-gray-400"
              }`}>
                {getStepLabel(stepInfo.step)}
              </p>
              {formattedDate ? (
                <p className="text-[10px] text-gray-500 mt-0.5">{formattedDate}</p>
              ) : !stepInfo.completed ? (
                <p className="text-[10px] text-gray-400 mt-0.5">في انتظار التحديث</p>
              ) : null}
            </div>
          );
        })}
        
        {/* Progress lines */}
        <div className="absolute top-4 right-[16.66%] left-[16.66%] h-0.5 bg-gray-200 -z-0">
          <div 
            className="h-full bg-green-500 transition-all"
            style={{ 
              width: steps[2].completed ? "100%" : steps[1].completed ? "50%" : "0%" 
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function MyPurchases() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<Purchase | null>(null);
  const queryClient = useQueryClient();

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/account/purchases"],
    enabled: !!user?.id,
  });

  const handleReviewSubmitted = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/account/purchases"] });
  };

  const isLoading = authLoading || purchasesLoading;

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
          <Card className="border-amber-200 bg-amber-50 p-6">
            <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">يجب تسجيل الدخول</h2>
            <p className="text-muted-foreground mb-6">يرجى تسجيل الدخول لعرض مشترياتك</p>
            <Link href="/signin">
              <Button className="w-full">تسجيل الدخول</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    );
  }

  if (purchases.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">مشترياتي</h1>
            <p className="text-gray-600">تتبع طلباتك وتسليماتك</p>
          </div>
          <Card className="p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">لا توجد مشتريات حتى الآن</h2>
            <p className="text-gray-500 mb-6">عندما تقوم بشراء منتجات، ستظهر هنا</p>
            <Link href="/search">
              <Button className="bg-primary hover:bg-primary/90">
                تصفح المنتجات
              </Button>
            </Link>
          </Card>
        </div>
      </Layout>
    );
  }

  const currentOrder = selectedOrder || purchases[0];
  const deliveryStatus = currentOrder?.status || currentOrder?.deliveryStatus || "pending";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">مشترياتي</h1>
          <p className="text-gray-600">تتبع طلباتك وتسليماتك في مكان واحد</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details - eBay Style (Left side for RTL) */}
          <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
            {currentOrder && (
              <>
                {/* Order Header with Status */}
                <Card className="p-6 bg-gray-900 text-white">
                  <div className="flex items-start gap-4">
                    {currentOrder.listing?.images?.[0] ? (
                      <img
                        src={currentOrder.listing.images[0]}
                        alt={currentOrder.listing?.title || "منتج"}
                        className="w-24 h-24 object-cover rounded-lg"
                        loading="lazy"
                        style={{ imageRendering: "auto" }}
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-700 rounded-lg flex items-center justify-center">
                        <Package className="h-10 w-10 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="mb-2">
                        {getStatusBadge(deliveryStatus)}
                      </div>
                      <p className="text-sm text-gray-300">
                        {deliveryStatus === "delivered" || deliveryStatus === "completed" 
                          ? `تم التسليم في ${currentOrder.completedAt ? new Date(currentOrder.completedAt).toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : ""}`
                          : deliveryStatus === "shipped" || deliveryStatus === "in_transit"
                          ? "تم شحن طلبك - في الطريق إليك"
                          : "جاري تجهيز طلبك"}
                      </p>
                      <Link href={`/product/${currentOrder.listingId}`}>
                        <h2 className="text-lg font-bold mt-2 hover:text-blue-300 transition-colors cursor-pointer">
                          {currentOrder.listing?.title || "منتج"}
                        </h2>
                      </Link>
                      {currentOrder.trackingNumber && (
                        <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                          رقم التتبع: {currentOrder.trackingNumber}
                          <ExternalLink className="h-3 w-3" />
                        </p>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Track Package Button */}
                {currentOrder.trackingNumber && (
                  <Button 
                    variant="outline" 
                    className="w-full py-6 text-lg border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                    data-testid="button-track-package"
                  >
                    <Truck className="h-5 w-5 ml-2" />
                    تتبع الشحنة
                  </Button>
                )}

                {/* Delivery Timeline */}
                <Card className="p-6">
                  <h3 className="font-bold text-lg mb-2">معلومات التوصيل</h3>
                  {(deliveryStatus === "delivered" || deliveryStatus === "completed") && currentOrder.completedAt && (
                    <p className="text-green-600 font-medium mb-2">
                      تم التسليم في {new Date(currentOrder.completedAt).toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  )}
                  <DeliveryTimeline purchase={currentOrder} />
                </Card>

                {/* Order Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Shipping Address */}
                  <Card className="p-5">
                    <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      عنوان الشحن
                    </h3>
                    <div className="space-y-2 text-sm">
                      {currentOrder.deliveryAddress ? (
                        <>
                          <p className="font-medium">{currentOrder.deliveryAddress}</p>
                          {currentOrder.deliveryCity && (
                            <p className="text-gray-600">{currentOrder.deliveryCity}</p>
                          )}
                          {currentOrder.deliveryPhone && (
                            <p className="text-gray-600 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {currentOrder.deliveryPhone}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500">لم يتم تحديد عنوان</p>
                      )}
                    </div>
                  </Card>

                  {/* Payment Info */}
                  <Card className="p-5">
                    <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      معلومات الدفع
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">طريقة الدفع</span>
                        <span className="font-medium">
                          {currentOrder.paymentMethod === "card" ? "بطاقة ائتمان" : "الدفع عند الاستلام"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">تاريخ الطلب</span>
                        <span className="font-medium">
                          {new Date(currentOrder.createdAt).toLocaleDateString("ar-IQ")}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-base">
                        <span className="font-bold">المجموع</span>
                        <span className="font-bold text-primary">
                          {currentOrder.amount?.toLocaleString() || 0} د.ع
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Seller Info Card */}
                <Card className="p-5 bg-blue-50 border-blue-200">
                  <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                    <Store className="h-5 w-5 text-blue-600" />
                    معلومات البائع
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Store className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">{currentOrder.listing?.sellerName || "بائع"}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {currentOrder.listing?.city || "العراق"}
                          </p>
                        </div>
                      </div>
                      {currentOrder.listing?.sellerId && (
                        <Link href={`/messages?to=${currentOrder.listing.sellerId}`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            <MessageCircle className="h-4 w-4" />
                            مراسلة
                          </Button>
                        </Link>
                      )}
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">رقم الطلب</span>
                      <span className="font-mono font-medium">{currentOrder.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">تاريخ الطلب</span>
                      <span className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(currentOrder.createdAt).toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Rate Seller - Only show for completed orders */}
                {(deliveryStatus === "delivered" || deliveryStatus === "completed") && currentOrder.listing?.sellerId && user?.id && (
                  <RateSellerCard 
                    purchase={currentOrder} 
                    userId={user.id}
                    onReviewSubmitted={handleReviewSubmitted}
                  />
                )}

                {/* Item Info */}
                <Card className="p-5">
                  <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    معلومات المنتج
                  </h3>
                  <div className="flex gap-4">
                    {currentOrder.listing?.images?.[0] ? (
                      <Link href={`/product/${currentOrder.listingId}`}>
                        <img
                          src={currentOrder.listing.images[0]}
                          alt={currentOrder.listing?.title || "منتج"}
                          className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          loading="lazy"
                          style={{ imageRendering: "auto" }}
                        />
                      </Link>
                    ) : (
                      <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Link href={`/product/${currentOrder.listingId}`}>
                        <h4 className="font-semibold text-lg hover:text-primary transition-colors">
                          {currentOrder.listing?.title || "منتج"}
                        </h4>
                      </Link>
                      <p className="text-xl font-bold text-primary mt-2">
                        {currentOrder.amount?.toLocaleString() || 0} د.ع
                      </p>
                      <Link href={`/product/${currentOrder.listingId}`}>
                        <Button variant="outline" size="sm" className="mt-3 gap-1">
                          <ExternalLink className="h-4 w-4" />
                          عرض المنتج
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>

                {/* Tracking Details */}
                {currentOrder.trackingNumber && (
                  <Card className="p-5">
                    <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                      <Truck className="h-5 w-5 text-primary" />
                      تفاصيل التتبع
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">رقم التتبع</p>
                        <p className="font-mono font-medium text-lg">{currentOrder.trackingNumber}</p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1">
                        <ExternalLink className="h-4 w-4" />
                        تتبع
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Actions */}
                <Card className="p-5">
                  <h3 className="font-bold text-base mb-4">إجراءات أخرى</h3>
                  <div className="space-y-3">
                    {currentOrder.listing?.sellerId && (
                      <Link href={`/messages?to=${currentOrder.listing.sellerId}`}>
                        <Button variant="ghost" className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          <MessageCircle className="h-4 w-4 ml-2" />
                          تواصل مع البائع
                        </Button>
                      </Link>
                    )}
                    <Button variant="ghost" className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      <ChevronLeft className="h-4 w-4 ml-2" />
                      الإبلاغ عن مشكلة
                    </Button>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Orders List (Right side for RTL) */}
          <div className="lg:col-span-1 space-y-4 order-1 lg:order-2">
            <h3 className="font-bold text-lg">طلباتي ({purchases.length})</h3>
            {purchases.map((purchase) => (
              <Card
                key={purchase.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                  currentOrder?.id === purchase.id
                    ? "ring-2 ring-primary border-primary"
                    : ""
                }`}
                onClick={() => setSelectedOrder(purchase)}
                data-testid={`card-purchase-${purchase.id}`}
              >
                <div className="flex gap-3">
                  {purchase.listing?.images?.[0] ? (
                    <img
                      src={purchase.listing.images[0]}
                      alt={purchase.listing?.title || "منتج"}
                      className="w-20 h-20 object-cover rounded-lg"
                      loading="lazy"
                      style={{ imageRendering: "auto" }}
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm line-clamp-2">
                      {purchase.listing?.title || "منتج"}
                    </h4>
                    <p className="text-sm font-bold text-primary mt-1">
                      {purchase.amount?.toLocaleString() || 0} د.ع
                    </p>
                    <div className="mt-2">
                      {getStatusBadge(purchase.status || purchase.deliveryStatus || "pending")}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
