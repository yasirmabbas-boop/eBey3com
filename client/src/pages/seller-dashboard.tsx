import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";
import type { Listing } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ShippingLabel } from "@/components/shipping-label";
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
} from "lucide-react";
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
  buyer?: {
    name: string;
    phone: string;
    address: string;
    district: string;
  };
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800 border-0">نشط</Badge>;
    case "sold":
      return <Badge className="bg-blue-100 text-blue-800 border-0">مباع</Badge>;
    case "pending_shipment":
      return <Badge className="bg-yellow-100 text-yellow-800 border-0">بانتظار الشحن</Badge>;
    case "shipped":
      return <Badge className="bg-purple-100 text-purple-800 border-0">تم الشحن</Badge>;
    case "draft":
      return <Badge className="bg-gray-100 text-gray-800 border-0">مسودة</Badge>;
    default:
      return null;
  }
};

const getTypeBadge = (type: string) => {
  return type === "auction" ? (
    <Badge variant="outline" className="border-primary text-primary">
      <Gavel className="h-3 w-3 ml-1" />
      مزاد
    </Badge>
  ) : (
    <Badge variant="outline" className="border-green-600 text-green-600">
      <ShoppingBag className="h-3 w-3 ml-1" />
      سعر ثابت
    </Badge>
  );
};

export default function SellerDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showShippingLabel, setShowShippingLabel] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null);

  const { data: listings = [], isLoading: listingsLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/listings?sellerId=${encodeURIComponent(user.id)}`);
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: sellerSummary } = useQuery<{
    totalListings: number;
    activeListings: number;
    totalSales: number;
    totalRevenue: number;
    averageRating: number;
    ratingCount: number;
  }>({
    queryKey: ["/api/account/seller-summary"],
    enabled: !!user?.id && user?.accountType === "seller",
  });

  const sellerProducts: SellerProduct[] = listings.map(l => ({
    id: l.id,
    title: l.title,
    price: l.price,
    image: l.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
    status: l.isActive ? "active" : "draft",
    type: l.saleType || "fixed",
    views: 0,
    bids: l.totalBids || 0,
    currentBid: l.currentBid || undefined,
    endDate: l.auctionEndTime ? new Date(l.auctionEndTime).toLocaleDateString("ar-IQ") : undefined,
    category: l.category,
    productCode: (l as any).productCode || `P-${l.id.slice(0, 6)}`,
  }));

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/listings/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete listing");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم حذف المنتج", description: "تم حذف المنتج بنجاح من قائمتك" });
      queryClient.invalidateQueries({ queryKey: ["/api/listings", user?.id] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في حذف المنتج", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول للوصول إلى لوحة تحكم البائع",
        variant: "destructive",
      });
      navigate("/signin?redirect=/seller-dashboard");
    } else if (!authLoading && isAuthenticated && user?.accountType !== "seller") {
      toast({
        title: "غير مصرح",
        description: "هذه الصفحة مخصصة للبائعين فقط",
        variant: "destructive",
      });
      navigate("/buyer-dashboard");
    }
  }, [authLoading, isAuthenticated, user, navigate, toast]);

  const filteredProducts = sellerProducts.filter(product => {
    const matchesSearch = product.title.includes(searchQuery) || 
                          product.productCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteProduct = (productId: string) => {
    deleteMutation.mutate(productId);
  };

  const handlePrintLabel = (product: SellerProduct) => {
    setSelectedProduct(product);
    setShowShippingLabel(true);
  };

  const handleEditProduct = (productId: string) => {
    navigate(`/sell?edit=${productId}`);
  };

  const activeProducts = sellerProducts.filter(p => p.status === "active");
  const soldProducts = sellerProducts.filter(p => ["sold", "pending_shipment", "shipped"].includes(p.status));
  const pendingShipments = sellerProducts.filter(p => p.status === "pending_shipment" || p.status === "sold");

  const SELLER_STATS = {
    totalProducts: sellerSummary?.totalListings || sellerProducts.length,
    activeListings: sellerSummary?.activeListings || activeProducts.length,
    soldItems: sellerSummary?.totalSales || soldProducts.length,
    totalRevenue: sellerSummary?.totalRevenue || (soldProducts.length > 0 
      ? soldProducts.reduce((sum, p) => sum + (p.finalPrice || p.currentBid || p.price), 0)
      : 0),
    pendingShipments: pendingShipments.length,
    totalViews: sellerProducts.length > 0 
      ? sellerProducts.reduce((sum, p) => sum + (p.views || 0), 0)
      : 0,
    averageRating: sellerSummary?.averageRating || 0,
    totalReviews: sellerSummary?.ratingCount || 0,
  };

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

  if (!isAuthenticated || user?.accountType !== "seller") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-md text-center">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">للبائعين فقط</h2>
              <p className="text-muted-foreground mb-6">هذه الصفحة مخصصة للبائعين المسجلين فقط</p>
              <Link href="/signin">
                <Button className="w-full">تسجيل الدخول كبائع</Button>
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">📊 لوحة تحكم البائع</h1>
            <p className="text-gray-600">إدارة منتجاتك ومبيعاتك وتتبع أدائك</p>
          </div>
          <Link href="/sell">
            <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90" data-testid="button-add-product">
              <Plus className="h-5 w-5" />
              إضافة منتج جديد
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">إجمالي المنتجات</p>
                  <p className="text-3xl font-bold text-blue-800">{SELLER_STATS.totalProducts}</p>
                </div>
                <Package className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">المبيعات</p>
                  <p className="text-3xl font-bold text-green-800">{SELLER_STATS.soldItems}</p>
                </div>
                <DollarSign className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">الإيرادات</p>
                  <p className="text-2xl font-bold text-purple-800">{(SELLER_STATS.totalRevenue / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-purple-600">د.ع</p>
                </div>
                <TrendingUp className="h-10 w-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-medium">بانتظار الشحن</p>
                  <p className="text-3xl font-bold text-yellow-800">{pendingShipments.length}</p>
                </div>
                <Clock className="h-10 w-10 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {pendingShipments.length > 0 && (
          <Card className="mb-8 border-2 border-yellow-300 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                تحتاج إلى اهتمامك ({pendingShipments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingShipments.map(product => (
                  <div key={product.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <img src={product.image} alt={product.title} className="w-12 h-12 object-cover rounded" />
                      <div>
                        <p className="font-semibold text-sm">{product.title}</p>
                        <p className="text-xs text-gray-500">المشتري: {product.buyer?.name}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handlePrintLabel(product)}
                      className="gap-1"
                      data-testid={`button-print-label-${product.id}`}
                    >
                      <Printer className="h-4 w-4" />
                      طباعة بطاقة الشحن
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              المنتجات
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              المبيعات
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              الإحصائيات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    المنتجات النشطة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activeProducts.slice(0, 3).map(product => (
                      <div key={product.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                        <img src={product.image} alt={product.title} className="w-12 h-12 object-cover rounded" />
                        <div className="flex-1">
                          <p className="font-semibold text-sm line-clamp-1">{product.title}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Eye className="h-3 w-3" />
                            {product.views} مشاهدة
                            {product.type === "auction" && (
                              <>
                                <span>•</span>
                                <Gavel className="h-3 w-3" />
                                {product.bids} مزايدة
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-primary">{(product.currentBid || product.price).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">د.ع</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {activeProducts.length > 3 && (
                    <Button variant="ghost" className="w-full mt-2" onClick={() => setActiveTab("products")}>
                      عرض الكل ({activeProducts.length})
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    آخر المبيعات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {soldProducts.slice(0, 3).map(product => (
                      <div key={product.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                        <img src={product.image} alt={product.title} className="w-12 h-12 object-cover rounded" />
                        <div className="flex-1">
                          <p className="font-semibold text-sm line-clamp-1">{product.title}</p>
                          <p className="text-xs text-gray-500">{product.soldDate}</p>
                        </div>
                        <div className="text-left">
                          {getStatusBadge(product.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {soldProducts.length > 3 && (
                    <Button variant="ghost" className="w-full mt-2" onClick={() => setActiveTab("sales")}>
                      عرض الكل ({soldProducts.length})
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  تقييمك كبائع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-yellow-600">{SELLER_STATS.averageRating}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className={`h-4 w-4 ${i <= Math.floor(SELLER_STATS.averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{SELLER_STATS.totalReviews} تقييم</p>
                  </div>
                  <Separator orientation="vertical" className="h-16" />
                  <div className="flex-1 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{SELLER_STATS.totalViews}</p>
                      <p className="text-sm text-gray-500">مشاهدة</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{SELLER_STATS.soldItems}</p>
                      <p className="text-sm text-gray-500">مبيعة</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{SELLER_STATS.activeListings}</p>
                      <p className="text-sm text-gray-500">نشطة</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full md:max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="البحث في منتجاتك..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                  data-testid="input-search-products"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-status-filter">
                    <Filter className="h-4 w-4 ml-2" />
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="sold">مباع</SelectItem>
                    <SelectItem value="pending_shipment">بانتظار الشحن</SelectItem>
                    <SelectItem value="shipped">تم الشحن</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4">
              {filteredProducts.map(product => (
                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row">
                    <Link href={`/product/${product.id}`} className="relative cursor-pointer">
                      <img 
                        src={product.image} 
                        alt={product.title} 
                        className="w-full md:w-40 h-40 object-cover hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute top-2 right-2">
                        {getTypeBadge(product.type)}
                      </div>
                    </Link>
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Link href={`/product/${product.id}`} className="cursor-pointer hover:text-primary transition-colors">
                            <h3 className="font-bold text-lg">{product.title}</h3>
                          </Link>
                          <p className="text-sm text-gray-500">كود: {product.productCode} • {product.category}</p>
                        </div>
                        {getStatusBadge(product.status)}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {product.views} مشاهدة
                        </span>
                        {product.type === "auction" && product.bids && (
                          <span className="flex items-center gap-1">
                            <Gavel className="h-4 w-4" />
                            {product.bids} مزايدة
                          </span>
                        )}
                        {product.soldDate && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            بيع في {product.soldDate}
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
                          {(product.status === "sold" || product.status === "pending_shipment") && product.buyer && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handlePrintLabel(product)}
                              className="gap-1"
                              data-testid={`button-print-${product.id}`}
                            >
                              <Printer className="h-4 w-4" />
                              طباعة الشحن
                            </Button>
                          )}
                          {product.status === "active" || product.status === "draft" ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="gap-1" 
                                onClick={() => handleEditProduct(product.id)}
                                data-testid={`button-edit-${product.id}`}
                              >
                                <Edit className="h-4 w-4" />
                                تعديل
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive" className="gap-1" data-testid={`button-delete-${product.id}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      سيتم حذف المنتج "{product.title}" نهائياً. لا يمكن التراجع عن هذا الإجراء.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>
                                      حذف
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {filteredProducts.length === 0 && (
                <Card className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">لا توجد منتجات تطابق بحثك</p>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <div className="grid gap-4">
              {soldProducts.map(product => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <img 
                      src={product.image} 
                      alt={product.title} 
                      className="w-full md:w-32 h-32 object-cover"
                    />
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-lg">{product.title}</h3>
                          <p className="text-sm text-gray-500">بيع في {product.soldDate}</p>
                        </div>
                        {getStatusBadge(product.status)}
                      </div>

                      {product.buyer && (
                        <div className="bg-blue-50 p-3 rounded-lg mb-3">
                          <p className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            معلومات المشتري
                          </p>
                          <p className="text-sm">{product.buyer.name}</p>
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {product.buyer.address}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-green-600">
                          {(product.finalPrice || product.price).toLocaleString()} د.ع
                        </p>
                        {(product.status === "sold" || product.status === "pending_shipment") && product.buyer && (
                          <Button 
                            onClick={() => handlePrintLabel(product)}
                            className="gap-2"
                            data-testid={`button-print-sales-${product.id}`}
                          >
                            <Printer className="h-4 w-4" />
                            طباعة بطاقة الشحن
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {soldProducts.length === 0 && (
                <Card className="p-8 text-center">
                  <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">لا توجد مبيعات حتى الآن</p>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-500">إجمالي المشاهدات</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-blue-600">{SELLER_STATS.totalViews}</p>
                  <p className="text-sm text-green-600 mt-1">↑ 12% من الأسبوع الماضي</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-500">معدل التحويل</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-purple-600">
                    {((SELLER_STATS.soldItems / SELLER_STATS.totalViews) * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-green-600 mt-1">↑ 3% من الشهر الماضي</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-500">متوسط سعر البيع</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-green-600">
                    {Math.round(SELLER_STATS.totalRevenue / SELLER_STATS.soldItems / 1000)}K
                  </p>
                  <p className="text-xs text-gray-500 mt-1">د.ع</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>أداء الفئات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>ساعات</span>
                    <div className="flex-1 mx-4">
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: "65%" }}></div>
                      </div>
                    </div>
                    <span className="font-bold">65%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>إلكترونيات</span>
                    <div className="flex-1 mx-4">
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: "25%" }}></div>
                      </div>
                    </div>
                    <span className="font-bold">25%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>تحف وأثاث</span>
                    <div className="flex-1 mx-4">
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: "10%" }}></div>
                      </div>
                    </div>
                    <span className="font-bold">10%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedProduct?.buyer && (
        <ShippingLabel
          open={showShippingLabel}
          onOpenChange={setShowShippingLabel}
          orderDetails={{
            orderId: `ORD-${selectedProduct.id}`,
            productTitle: selectedProduct.title,
            productCode: selectedProduct.productCode,
            sellerName: "أحمد العراقي",
            sellerCity: "بغداد",
            buyerName: selectedProduct.buyer.name,
            buyerPhone: selectedProduct.buyer.phone,
            deliveryAddress: selectedProduct.buyer.address,
            city: selectedProduct.buyer.district,
            district: selectedProduct.buyer.district,
            price: selectedProduct.finalPrice || selectedProduct.price,
            saleDate: new Date(selectedProduct.soldDate || Date.now()),
            paymentMethod: "الدفع عند الاستلام",
          }}
        />
      )}
    </Layout>
  );
}
