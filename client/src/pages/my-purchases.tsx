import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ShoppingBag,
  Lock,
} from "lucide-react";

interface Purchase {
  id: string;
  listingId: string;
  amount: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  deliveryAddress?: string;
  listing?: {
    id: string;
    title: string;
    price: number;
    images: string[];
    sellerName: string;
    city: string;
  };
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "delivered":
    case "completed":
      return (
        <Badge className="bg-green-100 text-green-800 border-0">
          <CheckCircle className="h-3 w-3 ml-1" />
          تم التسليم
        </Badge>
      );
    case "in_transit":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-0">
          <Truck className="h-3 w-3 ml-1" />
          قيد التوصيل
        </Badge>
      );
    case "processing":
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-0">
          <Clock className="h-3 w-3 ml-1" />
          قيد التجهيز
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case "delivered":
    case "completed":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "in_transit":
      return <Truck className="h-5 w-5 text-blue-600" />;
    case "processing":
    case "pending":
      return <Clock className="h-5 w-5 text-yellow-600" />;
    default:
      return <AlertCircle className="h-5 w-5 text-gray-600" />;
  }
};

export default function MyPurchases() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<Purchase | null>(null);

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/account/purchases"],
    enabled: !!user?.id,
  });

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">مشترياتي</h1>
          <p className="text-gray-600">تتبع طلباتك وتسليماتك</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Orders List */}
          <div className="lg:col-span-1 space-y-4">
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
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm line-clamp-2">
                      {purchase.listing?.title || "منتج"}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      {purchase.amount?.toLocaleString() || 0} د.ع
                    </p>
                    <div className="mt-2">
                      {getStatusBadge(purchase.status)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {currentOrder && (
              <>
                {/* Order Header */}
                <Card className="p-6 border-2 border-primary">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {currentOrder.listing?.title || "منتج"}
                      </h2>
                      <p className="text-gray-600 mt-1">
                        رقم الطلب: {currentOrder.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(currentOrder.status)}
                      {getStatusBadge(currentOrder.status)}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">السعر</p>
                      <p className="font-bold text-lg">
                        {currentOrder.amount?.toLocaleString() || 0}
                        <span className="text-sm mr-1">د.ع</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">تاريخ الطلب</p>
                      <p className="font-semibold text-sm">
                        {new Date(currentOrder.createdAt).toLocaleDateString("ar-IQ")}
                      </p>
                    </div>
                    {currentOrder.listing?.city && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">الموقع</p>
                        <p className="font-semibold text-sm">
                          {currentOrder.listing.city}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Seller Info */}
                {currentOrder.listing?.sellerName && (
                  <Card className="p-6 bg-blue-50 border-blue-200">
                    <h3 className="font-bold text-lg mb-4">معلومات البائع</h3>
                    <div>
                      <p className="text-xs text-gray-600">اسم البائع</p>
                      <p className="font-semibold text-lg">{currentOrder.listing.sellerName}</p>
                    </div>
                  </Card>
                )}

                {/* Order Status */}
                <Card className="p-6">
                  <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    حالة الطلب
                  </h3>
                  <div className="flex items-center gap-4">
                    {getStatusIcon(currentOrder.status)}
                    <div>
                      <p className="font-bold">
                        {currentOrder.status === "completed" || currentOrder.status === "delivered" 
                          ? "تم التسليم بنجاح" 
                          : currentOrder.status === "in_transit" 
                          ? "الطلب في الطريق إليك" 
                          : "الطلب قيد التجهيز"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {currentOrder.completedAt 
                          ? `تم التسليم في ${new Date(currentOrder.completedAt).toLocaleDateString("ar-IQ")}`
                          : "سيتم إعلامك عند تحديث الحالة"}
                      </p>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
