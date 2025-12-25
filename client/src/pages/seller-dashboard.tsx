import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";
import type { Listing, Offer, Message } from "@shared/schema";
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
  HandCoins,
  MessageSquare,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
  quantityAvailable: number;
  quantitySold: number;
  buyer?: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    city?: string;
    district?: string;
  };
}

interface SellerOrder {
  id: string;
  listingId: string;
  amount: number;
  status: string;
  deliveryStatus: string;
  createdAt: string;
  completedAt?: string;
  listing?: {
    id: string;
    title: string;
    price: number;
    images: string[];
    productCode?: string;
  };
  buyer?: {
    id: string;
    name: string;
    phone?: string;
  };
}

interface SellerMessage extends Message {
  senderName: string;
  listingTitle: string | null;
  listingImage: string | null;
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
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProductId, setStockProductId] = useState<string | null>(null);
  const [newStockQuantity, setNewStockQuantity] = useState("");

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

  const { data: receivedOffers = [], isLoading: offersLoading } = useQuery<(Offer & { listing?: Listing; buyerName?: string })[]>({
    queryKey: ["/api/received-offers"],
    queryFn: async () => {
      const res = await fetch("/api/received-offers");
      if (!res.ok) throw new Error("Failed to fetch offers");
      return res.json();
    },
    enabled: !!user?.id && user?.accountType === "seller",
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

  const { data: sellerOrders = [], isLoading: ordersLoading } = useQuery<SellerOrder[]>({
    queryKey: ["/api/account/seller-orders"],
    queryFn: async () => {
      const res = await fetch("/api/account/seller-orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: !!user?.id && user?.accountType === "seller",
  });

  const { data: sellerMessages = [], isLoading: messagesLoading } = useQuery<SellerMessage[]>({
    queryKey: ["/api/seller-messages"],
    queryFn: async () => {
      const res = await fetch("/api/seller-messages");
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!user?.id && user?.accountType === "seller",
  });

  const sellerProducts: SellerProduct[] = listings.map(l => {
    let status = "draft";
    if (l.isActive) {
      status = "active";
    }
    if ((l.quantitySold || 0) > 0) {
      status = "sold";
    }
    
    return {
      id: l.id,
      title: l.title,
      price: l.price,
      image: l.images?.[0] || "",
      status,
      type: l.saleType || "fixed",
      views: l.views || 0,
      bids: l.totalBids || 0,
      currentBid: l.currentBid || undefined,
      endDate: l.auctionEndTime ? new Date(l.auctionEndTime).toLocaleDateString("ar-IQ") : undefined,
      category: l.category,
      productCode: l.productCode || `P-${l.id.slice(0, 6)}`,
      quantityAvailable: l.quantityAvailable || 1,
      quantitySold: l.quantitySold || 0,
    };
  });

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

  const offerResponseMutation = useMutation({
    mutationFn: async ({ offerId, status, counterAmount }: { offerId: string; status: string; counterAmount?: number }) => {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, counterAmount }),
      });
      if (!res.ok) throw new Error("Failed to respond to offer");
      return res.json();
    },
    onSuccess: (_, variables) => {
      const messages: Record<string, string> = {
        accepted: "تم قبول العرض بنجاح - تم إنشاء طلب جديد",
        rejected: "تم رفض العرض",
        countered: "تم إرسال عرض مقابل",
      };
      toast({ title: "تم", description: messages[variables.status] || "تم تحديث العرض" });
      queryClient.invalidateQueries({ queryKey: ["/api/received-offers"] });
      if (variables.status === "accepted") {
        queryClient.invalidateQueries({ queryKey: ["/api/account/seller-orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/account/seller-summary"] });
      }
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في الرد على العرض", variant: "destructive" });
    },
  });

  const stockUpdateMutation = useMutation({
    mutationFn: async ({ productId, quantityAvailable }: { productId: string; quantityAvailable: number }) => {
      const res = await fetch(`/api/listings/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantityAvailable }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update stock");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تحديث المخزون", description: "تم تحديث الكمية المتوفرة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/listings", user?.id] });
      setStockDialogOpen(false);
      setStockProductId(null);
      setNewStockQuantity("");
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const handleUpdateStock = (product: SellerProduct) => {
    setStockProductId(product.id);
    setNewStockQuantity(product.quantityAvailable.toString());
    setStockDialogOpen(true);
  };

  const submitStockUpdate = () => {
    if (!stockProductId || !newStockQuantity) return;
    stockUpdateMutation.mutate({ 
      productId: stockProductId, 
      quantityAvailable: parseInt(newStockQuantity, 10) 
    });
  };

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
    totalProducts: sellerSummary?.totalListings ?? sellerProducts.length,
    activeListings: sellerSummary?.activeListings ?? activeProducts.length,
    soldItems: sellerSummary?.totalSales ?? 0,
    totalRevenue: sellerSummary?.totalRevenue ?? 0,
    pendingOffers: receivedOffers.filter(o => o.status === "pending").length,
    averageRating: sellerSummary?.averageRating ?? 0,
    totalReviews: sellerSummary?.ratingCount ?? 0,
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
          <TabsList className="grid grid-cols-6 w-full max-w-3xl">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              المنتجات
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              الرسائل
              {sellerMessages.filter(m => !m.isRead).length > 0 && (
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 mr-1">
                  {sellerMessages.filter(m => !m.isRead).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-2">
              <HandCoins className="h-4 w-4" />
              العروض
              {receivedOffers.filter(o => o.status === "pending").length > 0 && (
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 mr-1">
                  {receivedOffers.filter(o => o.status === "pending").length}
                </Badge>
              )}
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
                  {soldProducts.length === 0 ? (
                    <div className="text-center py-6">
                      <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">لا توجد مبيعات حتى الآن</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {soldProducts.slice(0, 3).map(product => (
                          <div key={product.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                            <img src={product.image} alt={product.title} className="w-12 h-12 object-cover rounded" />
                            <div className="flex-1">
                              <p className="font-semibold text-sm line-clamp-1">{product.title}</p>
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
                    </>
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
                      <p className="text-2xl font-bold text-blue-600">{SELLER_STATS.pendingOffers}</p>
                      <p className="text-sm text-gray-500">عروض معلقة</p>
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
                          {/* Edit button - only for active/draft products (not sold) */}
                          {(product.status === "active" || product.status === "draft") && (
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
                          )}
                          
                          {/* Relist button - for sold/shipped items */}
                          {["sold", "pending_shipment", "shipped"].includes(product.status) && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="gap-1 border-green-500 text-green-600 hover:bg-green-50" 
                              onClick={() => navigate(`/sell?relist=${product.id}`)}
                              data-testid={`button-relist-${product.id}`}
                            >
                              <Plus className="h-4 w-4" />
                              إعادة عرض
                            </Button>
                          )}
                          
                          {/* Update Stock button - for partially sold items with remaining stock or to add more */}
                          {product.quantitySold > 0 && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="gap-1 border-orange-500 text-orange-600 hover:bg-orange-50" 
                              onClick={() => handleUpdateStock(product)}
                              data-testid={`button-update-stock-${product.id}`}
                            >
                              <Package className="h-4 w-4" />
                              تعديل الكمية
                            </Button>
                          )}
                          
                          {/* Use as template button */}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="gap-1 text-blue-600 hover:bg-blue-50" 
                            onClick={() => navigate(`/sell?template=${product.id}`)}
                            data-testid={`button-template-${product.id}`}
                          >
                            <Package className="h-4 w-4" />
                            كقالب
                          </Button>
                          
                          {/* Delete button - only for active/draft */}
                          {(product.status === "active" || product.status === "draft") && (
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
                          )}
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

          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  رسائل العملاء
                </CardTitle>
              </CardHeader>
              <CardContent>
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : sellerMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">لا توجد رسائل من العملاء حالياً</p>
                    <p className="text-sm text-gray-400 mt-2">عندما يرسل العملاء استفسارات عن منتجاتك، ستظهر هنا</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sellerMessages.map(message => (
                      <div 
                        key={message.id} 
                        className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${!message.isRead ? 'bg-blue-50 border-blue-200' : ''}`}
                        data-testid={`message-${message.id}`}
                      >
                        <div className="flex items-start gap-4">
                          {message.listingImage && (
                            <Link href={`/product/${message.listingId}`}>
                              <img 
                                src={message.listingImage} 
                                alt={message.listingTitle || ""} 
                                className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                              />
                            </Link>
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-gray-500" />
                                  <span className="font-semibold">{message.senderName}</span>
                                  {!message.isRead && (
                                    <Badge className="bg-blue-500 text-white text-xs">جديد</Badge>
                                  )}
                                </div>
                                {message.listingTitle && (
                                  <Link href={`/product/${message.listingId}`}>
                                    <p className="text-sm text-primary hover:underline cursor-pointer">
                                      بخصوص: {message.listingTitle}
                                    </p>
                                  </Link>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(message.createdAt).toLocaleDateString("ar-IQ", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>
                            <div className="bg-gray-100 p-3 rounded-lg">
                              <p className="text-gray-800">{message.content}</p>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/messages/${message.senderId}`)}
                                className="gap-1"
                                data-testid={`button-reply-${message.id}`}
                              >
                                <MessageSquare className="h-4 w-4" />
                                رد على الرسالة
                              </Button>
                              {!message.isRead && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    await fetch(`/api/messages/${message.id}/read`, { method: "PATCH" });
                                    queryClient.invalidateQueries({ queryKey: ["/api/seller-messages"] });
                                  }}
                                  className="gap-1"
                                  data-testid={`button-mark-read-${message.id}`}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  تحديد كمقروء
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HandCoins className="h-5 w-5 text-primary" />
                  العروض المستلمة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {offersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : receivedOffers.length === 0 ? (
                  <div className="text-center py-8">
                    <HandCoins className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">لا توجد عروض مستلمة حالياً</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {receivedOffers.map(offer => {
                      const listing = listings.find(l => l.id === offer.listingId);
                      return (
                        <div key={offer.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start gap-4">
                            {listing?.images?.[0] && (
                              <img 
                                src={listing.images[0]} 
                                alt={listing?.title} 
                                className="w-20 h-20 object-cover rounded-lg"
                                loading="lazy"
                                style={{ imageRendering: "auto" }}
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <Link href={`/product/${offer.listingId}`}>
                                    <h4 className="font-bold text-lg hover:text-primary cursor-pointer">
                                      {listing?.title || "منتج"}
                                    </h4>
                                  </Link>
                                  <p className="text-sm text-gray-500">
                                    السعر الأصلي: {listing?.price?.toLocaleString()} د.ع
                                  </p>
                                </div>
                                <Badge className={
                                  offer.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                  offer.status === "accepted" ? "bg-green-100 text-green-800" :
                                  offer.status === "rejected" ? "bg-red-100 text-red-800" :
                                  offer.status === "countered" ? "bg-blue-100 text-blue-800" :
                                  "bg-gray-100 text-gray-800"
                                }>
                                  {offer.status === "pending" ? "بانتظار الرد" :
                                   offer.status === "accepted" ? "مقبول" :
                                   offer.status === "rejected" ? "مرفوض" :
                                   offer.status === "countered" ? "عرض مقابل" :
                                   offer.status === "expired" ? "منتهي" : offer.status}
                                </Badge>
                              </div>

                              <div className="bg-primary/5 p-3 rounded-lg mb-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">العرض المقدم:</span>
                                  <span className="text-xl font-bold text-primary">
                                    {offer.offerAmount.toLocaleString()} د.ع
                                  </span>
                                </div>
                                {offer.message && (
                                  <p className="text-sm text-gray-600 mt-2 flex items-start gap-1">
                                    <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                                    {offer.message}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 mt-2">
                                  {new Date(offer.createdAt).toLocaleDateString("ar-IQ", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </p>
                              </div>

                              {offer.status === "pending" && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => offerResponseMutation.mutate({ 
                                      offerId: offer.id, 
                                      status: "accepted" 
                                    })}
                                    disabled={offerResponseMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                    data-testid={`button-accept-offer-${offer.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 ml-1" />
                                    قبول
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => offerResponseMutation.mutate({ 
                                      offerId: offer.id, 
                                      status: "rejected" 
                                    })}
                                    disabled={offerResponseMutation.isPending}
                                    data-testid={`button-reject-offer-${offer.id}`}
                                  >
                                    رفض
                                  </Button>
                                </div>
                              )}

                              {offer.status === "countered" && offer.counterAmount && (
                                <div className="bg-blue-50 p-2 rounded mt-2">
                                  <p className="text-sm text-blue-800">
                                    عرضك المقابل: {offer.counterAmount.toLocaleString()} د.ع
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            {ordersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : sellerOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد طلبات حتى الآن</p>
                <p className="text-sm text-gray-400 mt-2">عندما يقبل المشترون عروضك أو يشترون منتجاتك، ستظهر الطلبات هنا</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sellerOrders.map(order => (
                  <Card key={order.id} className="overflow-hidden" data-testid={`order-card-${order.id}`}>
                    <div className="flex flex-col md:flex-row">
                      {order.listing?.images?.[0] && (
                        <img 
                          src={order.listing.images[0]} 
                          alt={order.listing?.title || "منتج"} 
                          className="w-full md:w-32 h-32 object-cover"
                          loading="lazy"
                          style={{ imageRendering: "auto" }}
                        />
                      )}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg">{order.listing?.title || "منتج"}</h3>
                            <p className="text-sm text-gray-500">
                              طلب في {new Date(order.createdAt).toLocaleDateString("ar-IQ")}
                            </p>
                            {order.listing?.productCode && (
                              <p className="text-xs text-gray-400">كود المنتج: {order.listing.productCode}</p>
                            )}
                          </div>
                          <Badge 
                            variant={order.status === "completed" ? "default" : "secondary"}
                            className={
                              order.status === "completed" ? "bg-green-100 text-green-800" :
                              order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                              "bg-blue-100 text-blue-800"
                            }
                          >
                            {order.status === "pending" ? "قيد الانتظار" :
                             order.status === "completed" ? "مكتمل" :
                             order.status === "processing" ? "قيد المعالجة" :
                             order.status}
                          </Badge>
                        </div>

                        {order.buyer && (
                          <div className="bg-blue-50 p-3 rounded-lg mb-3">
                            <p className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              معلومات المشتري
                            </p>
                            <p className="text-sm">{order.buyer.name || "مشتري"}</p>
                            {order.buyer.phone && (
                              <p className="text-xs text-gray-600">{order.buyer.phone}</p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <p className="text-xl font-bold text-green-600">
                            {order.amount.toLocaleString()} د.ع
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {order.deliveryStatus === "pending" ? "بانتظار الشحن" :
                             order.deliveryStatus === "shipped" ? "تم الشحن" :
                             order.deliveryStatus === "delivered" ? "تم التوصيل" :
                             order.deliveryStatus}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-500">إجمالي المنتجات</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-blue-600">{SELLER_STATS.totalProducts}</p>
                  <p className="text-sm text-gray-500 mt-1">منتج في متجرك</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-500">العروض المعلقة</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-purple-600">{SELLER_STATS.pendingOffers}</p>
                  <p className="text-sm text-gray-500 mt-1">تحتاج ردك</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-500">متوسط سعر البيع</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-green-600">
                    {SELLER_STATS.soldItems > 0 ? Math.round(SELLER_STATS.totalRevenue / SELLER_STATS.soldItems / 1000) : 0}K
                  </p>
                  <p className="text-xs text-gray-500 mt-1">د.ع</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>توزيع منتجاتك حسب الفئة</CardTitle>
              </CardHeader>
              <CardContent>
                {sellerProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">أضف منتجات لعرض التوزيع حسب الفئات</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const categoryCount: Record<string, number> = {};
                      sellerProducts.forEach(p => {
                        categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
                      });
                      const total = sellerProducts.length;
                      const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-yellow-500", "bg-red-500"];
                      return Object.entries(categoryCount)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([category, count], index) => {
                          const percentage = Math.round((count / total) * 100);
                          return (
                            <div key={category} className="flex items-center justify-between">
                              <span className="min-w-[100px]">{category}</span>
                              <div className="flex-1 mx-4">
                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`h-full ${colors[index % colors.length]} rounded-full`} style={{ width: `${percentage}%` }}></div>
                                </div>
                              </div>
                              <span className="font-bold">{percentage}%</span>
                            </div>
                          );
                        });
                    })()}
                  </div>
                )}
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
            sellerName: user?.displayName || "البائع",
            sellerCity: "العراق",
            buyerName: selectedProduct.buyer.name,
            buyerPhone: selectedProduct.buyer.phone,
            deliveryAddress: selectedProduct.buyer.address || "",
            city: selectedProduct.buyer.city || "",
            district: selectedProduct.buyer.district || "",
            price: selectedProduct.finalPrice || selectedProduct.price,
            saleDate: new Date(selectedProduct.soldDate || Date.now()),
            paymentMethod: "الدفع عند الاستلام",
          }}
        />
      )}

      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              تعديل الكمية المتوفرة
            </DialogTitle>
            <DialogDescription>
              قم بتحديث عدد القطع المتوفرة لهذا المنتج. لا يمكن تقليل الكمية عن عدد المبيعات الحالية.
            </DialogDescription>
          </DialogHeader>
          
          {(() => {
            const product = sellerProducts.find(p => p.id === stockProductId);
            return product ? (
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium text-primary">{product.title}</p>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span>المبيعات: {product.quantitySold}</span>
                    <span>الحالي: {product.quantityAvailable}</span>
                    <span>المتبقي: {product.quantityAvailable - product.quantitySold}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newQuantity">الكمية الجديدة</Label>
                  <Input
                    id="newQuantity"
                    type="number"
                    min={product.quantitySold}
                    value={newStockQuantity}
                    onChange={(e) => setNewStockQuantity(e.target.value)}
                    placeholder={`الحد الأدنى: ${product.quantitySold}`}
                    data-testid="input-new-quantity"
                  />
                  <p className="text-xs text-muted-foreground">
                    يجب أن تكون الكمية {product.quantitySold} على الأقل (عدد المبيعات الحالية)
                  </p>
                </div>
              </div>
            ) : null;
          })()}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStockDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={submitStockUpdate}
              disabled={stockUpdateMutation.isPending}
              data-testid="button-confirm-stock-update"
            >
              {stockUpdateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ التغييرات"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
