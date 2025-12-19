import { useEffect } from "react";
import { useLocation, Link } from "wouter";
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
} from "lucide-react";

const BUYER_STATS = {
  totalPurchases: 8,
  pendingOrders: 2,
  completedOrders: 6,
  totalSpent: 1250000,
  wishlistItems: 12,
  reviewsGiven: 5,
};

const RECENT_ORDERS = [
  {
    id: "1",
    title: "ساعة أوميغا سيماستر",
    price: 380000,
    image: "https://images.unsplash.com/photo-1523170335684-f42f53bba104?w=500&h=500&fit=crop",
    status: "delivered",
    date: "2025-12-18",
  },
  {
    id: "2",
    title: "جاكيت جلد إيطالي",
    price: 95000,
    image: "https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=500&h=500&fit=crop",
    status: "in_transit",
    date: "2025-12-15",
  },
  {
    id: "3",
    title: "ساعة رولكس ذهبية",
    price: 520000,
    image: "https://images.unsplash.com/photo-1579836343264-8b5a5bac4fdf?w=500&h=500&fit=crop",
    status: "processing",
    date: "2025-12-17",
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "delivered":
      return <Badge className="bg-green-100 text-green-800 border-0"><CheckCircle className="h-3 w-3 ml-1" />تم التسليم</Badge>;
    case "in_transit":
      return <Badge className="bg-blue-100 text-blue-800 border-0"><Truck className="h-3 w-3 ml-1" />قيد التوصيل</Badge>;
    case "processing":
      return <Badge className="bg-yellow-100 text-yellow-800 border-0"><Clock className="h-3 w-3 ml-1" />قيد التجهيز</Badge>;
    default:
      return null;
  }
};

export default function BuyerDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

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
                  <p className="text-2xl font-bold">{BUYER_STATS.totalPurchases}</p>
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
                  <p className="text-2xl font-bold text-blue-600">{BUYER_STATS.pendingOrders}</p>
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
                  <p className="text-2xl font-bold text-green-600">{BUYER_STATS.completedOrders}</p>
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
                  <p className="text-2xl font-bold text-red-600">{BUYER_STATS.wishlistItems}</p>
                </div>
                <Heart className="h-8 w-8 text-red-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/my-purchases">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
              <Package className="h-6 w-6" />
              <span>مشترياتي</span>
            </Button>
          </Link>
          <Link href="/search">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
              <ShoppingBag className="h-6 w-6" />
              <span>تصفح المنتجات</span>
            </Button>
          </Link>
          <Link href="/live-auction">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
              <Clock className="h-6 w-6" />
              <span>المزادات الحية</span>
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
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
            <div className="space-y-4">
              {RECENT_ORDERS.map((order) => (
                <div key={order.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <img
                    src={order.image}
                    alt={order.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium">{order.title}</h3>
                    <p className="text-sm text-muted-foreground">{order.date}</p>
                  </div>
                  <div className="text-left">
                    {getStatusBadge(order.status)}
                    <p className="text-sm font-bold mt-1">{order.price.toLocaleString()} د.ع</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
