import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
  listing?: {
    id: string;
    title: string;
    price: number;
    images: string[];
  };
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "delivered":
    case "completed":
      return <Badge className="bg-green-100 text-green-800 border-0"><CheckCircle className="h-3 w-3 ml-1" />تم التسليم</Badge>;
    case "in_transit":
      return <Badge className="bg-blue-100 text-blue-800 border-0"><Truck className="h-3 w-3 ml-1" />قيد التوصيل</Badge>;
    case "processing":
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 border-0"><Clock className="h-3 w-3 ml-1" />قيد التجهيز</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800 border-0">{status}</Badge>;
  }
};

export default function BuyerDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: summary, isLoading: summaryLoading } = useQuery<BuyerSummary>({
    queryKey: ["/api/account/buyer-summary"],
    enabled: !!user?.id && user?.accountType === "buyer",
  });

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/account/purchases"],
    enabled: !!user?.id && user?.accountType === "buyer",
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول للوصول إلى لوحة التحكم",
        variant: "destructive",
      });
      navigate("/signin?redirect=/buyer-dashboard");
    } else if (!isLoading && isAuthenticated && user?.accountType === "seller") {
      toast({
        title: "غير مصرح",
        description: "هذه الصفحة مخصصة للمشترين فقط",
        variant: "destructive",
      });
      navigate("/seller-dashboard");
    }
  }, [isLoading, isAuthenticated, user, navigate, toast]);

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

  if (!isAuthenticated || user?.accountType === "seller") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-md text-center">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">{user?.accountType === "seller" ? "للمشترين فقط" : "يجب تسجيل الدخول"}</h2>
              <p className="text-muted-foreground mb-6">{user?.accountType === "seller" ? "هذه الصفحة مخصصة للمشترين فقط" : "يرجى تسجيل الدخول للوصول إلى لوحة التحكم"}</p>
              <Link href={user?.accountType === "seller" ? "/seller-dashboard" : "/signin"}>
                <Button className="w-full">{user?.accountType === "seller" ? "الذهاب للوحة البائع" : "تسجيل الدخول"}</Button>
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
          <h1 className="text-3xl font-bold text-primary mb-2">لوحة تحكم المشتري</h1>
          <p className="text-muted-foreground">مرحباً {user?.displayName}، تابع طلباتك ومشترياتك من هنا</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
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
          <Card>
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
          <Card>
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
          <Card>
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

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/my-purchases">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2" data-testid="button-my-purchases">
              <Package className="h-6 w-6" />
              <span>مشترياتي</span>
            </Button>
          </Link>
          <Link href="/search">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2" data-testid="button-browse">
              <ShoppingBag className="h-6 w-6" />
              <span>تصفح المنتجات</span>
            </Button>
          </Link>
          <Link href="/live-auction">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2" data-testid="button-auctions">
              <Clock className="h-6 w-6" />
              <span>المزادات الحية</span>
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2" data-testid="button-settings">
              <Star className="h-6 w-6" />
              <span>الإعدادات</span>
            </Button>
          </Link>
        </div>

        {/* Recent Orders */}
        <Card>
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
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد طلبات حتى الآن</p>
                <Link href="/search">
                  <Button className="mt-4">تصفح المنتجات</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentPurchases.map((purchase) => (
                  <div key={purchase.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    {purchase.listing?.images?.[0] ? (
                      <img
                        src={purchase.listing.images[0]}
                        alt={purchase.listing?.title || "منتج"}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium">{purchase.listing?.title || "منتج"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(purchase.createdAt).toLocaleDateString("ar-IQ")}
                      </p>
                    </div>
                    <div className="text-left">
                      {getStatusBadge(purchase.status)}
                      <p className="text-sm font-bold mt-1">{purchase.amount?.toLocaleString() || 0} د.ع</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
