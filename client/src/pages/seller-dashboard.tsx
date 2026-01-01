import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Copy } from "lucide-react";
import type { Listing, Offer, Message } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Truck,
  ExternalLink,
  LayoutGrid,
  Wallet,
  ClipboardList,
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

type TabType = "overview" | "products" | "orders" | "messages" | "finances";

const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('ar-IQ')} د.ع`;
};

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

const getDeliveryBadge = (status: string) => {
  switch (status) {
    case "pending":
    case "processing":
      return <Badge className="bg-yellow-100 text-yellow-800 border-0">بانتظار الشحن</Badge>;
    case "shipped":
      return <Badge className="bg-blue-100 text-blue-800 border-0">تم الشحن</Badge>;
    case "delivered":
    case "completed":
      return <Badge className="bg-green-100 text-green-800 border-0">تم التسليم</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800 border-0">{status}</Badge>;
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

const NAV_ITEMS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "نظرة عامة", icon: <LayoutGrid className="h-5 w-5" /> },
  { id: "products", label: "منتجاتي", icon: <Package className="h-5 w-5" /> },
  { id: "orders", label: "الطلبات", icon: <ClipboardList className="h-5 w-5" /> },
  { id: "messages", label: "الرسائل", icon: <MessageSquare className="h-5 w-5" /> },
  { id: "finances", label: "المالية", icon: <Wallet className="h-5 w-5" /> },
];

export default function SellerDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [salesFilter, setSalesFilter] = useState("all");
  const [showShippingLabel, setShowShippingLabel] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProductId, setStockProductId] = useState<string | null>(null);
  const [newStockQuantity, setNewStockQuantity] = useState("");

  const getAuthHeaders = (): Record<string, string> => {
    const authToken = localStorage.getItem("authToken");
    return authToken ? { "Authorization": `Bearer ${authToken}` } : {};
  };

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["/api/listings", user?.id],
    queryFn: async () => {
      if (!user?.id) return { listings: [], pagination: null };
      const res = await fetch(`/api/listings?sellerId=${encodeURIComponent(user.id)}&limit=100`, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 0,
  });
  
  const listings: Listing[] = Array.isArray(listingsData) 
    ? listingsData 
    : (listingsData?.listings || []);

  const { data: receivedOffers = [], isLoading: offersLoading } = useQuery<(Offer & { listing?: Listing; buyerName?: string })[]>({
    queryKey: ["/api/received-offers"],
    queryFn: async () => {
      const res = await fetch("/api/received-offers", {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch offers");
      return res.json();
    },
    enabled: !!user?.id && (user as any)?.sellerApproved,
  });

  const { data: sellerSummary } = useQuery<{
    totalListings: number;
    activeListings: number;
    totalSales: number;
    totalRevenue: number;
    pendingShipments: number;
    averageRating: number;
    ratingCount: number;
  }>({
    queryKey: ["/api/account/seller-summary"],
    queryFn: async () => {
      const res = await fetch("/api/account/seller-summary", {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch seller summary");
      return res.json();
    },
    enabled: !!user?.id && (user as any)?.sellerApproved,
    staleTime: 0,
  });

  const { data: sellerOrders = [], isLoading: ordersLoading } = useQuery<SellerOrder[]>({
    queryKey: ["/api/account/seller-orders"],
    queryFn: async () => {
      const res = await fetch("/api/account/seller-orders", {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: !!user?.id && (user as any)?.sellerApproved,
    staleTime: 0,
  });

  const { data: sellerMessages = [], isLoading: messagesLoading } = useQuery<SellerMessage[]>({
    queryKey: ["/api/seller-messages"],
    queryFn: async () => {
      const res = await fetch("/api/seller-messages", {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!user?.id && (user as any)?.sellerApproved,
  });

  const sellerProducts: SellerProduct[] = listings.map(l => {
    const quantityAvailable = l.quantityAvailable || 1;
    const quantitySold = l.quantitySold || 0;
    const remainingStock = quantityAvailable - quantitySold;
    
    const productOrders = sellerOrders.filter(o => o.listingId === l.id);
    const hasPendingShipment = productOrders.some(o => 
      o.status === "pending" || o.status === "processing"
    );
    const hasShippedInTransit = productOrders.some(o => o.status === "shipped");
    const hasDeliveredOrCompleted = productOrders.some(o => 
      o.status === "delivered" || o.status === "completed"
    );
    
    let status = "draft";
    if (!l.isActive) {
      status = "draft";
    } else if (hasPendingShipment) {
      status = "pending_shipment";
    } else if (hasShippedInTransit) {
      status = "shipped";
    } else if (quantitySold > 0 && remainingStock <= 0) {
      status = "sold";
    } else if (quantitySold > 0 && hasDeliveredOrCompleted && remainingStock > 0) {
      status = "active";
    } else if (remainingStock > 0) {
      status = "active";
    } else {
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
      quantityAvailable,
      quantitySold,
    };
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/listings/${productId}`, { 
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });
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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "include",
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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "include",
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

  const markAsShippedMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/transactions/${orderId}/ship`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل في تحديث حالة الشحن");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تأكيد الشحن! 📦", description: "تم إرسال إشعار للمشتري" });
      queryClient.invalidateQueries({ queryKey: ["/api/account/seller-orders"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تحديث حالة الشحن", variant: "destructive" });
    },
  });

  const markAsDeliveredMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/transactions/${orderId}/deliver`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل في تحديث حالة التسليم");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم التسليم! ✅", description: "تم إكمال الطلب بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/account/seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/seller-summary"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تحديث حالة التسليم", variant: "destructive" });
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: "تم نسخ رقم الطلب" });
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول للوصول إلى لوحة تحكم البائع",
        variant: "destructive",
      });
      navigate("/signin?redirect=/seller-dashboard");
    } else if (!authLoading && isAuthenticated && !(user as any)?.sellerApproved) {
      toast({
        title: "غير مصرح",
        description: "يجب الحصول على موافقة المشرف للبيع",
        variant: "destructive",
      });
      navigate("/sell");
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
  const pendingOrders = sellerOrders.filter(o => o.status === "pending" || o.status === "processing");
  const totalViews = sellerProducts.reduce((sum, p) => sum + p.views, 0);

  const SELLER_STATS = {
    totalProducts: sellerSummary?.totalListings ?? sellerProducts.length,
    activeListings: sellerSummary?.activeListings ?? activeProducts.length,
    soldItems: sellerSummary?.totalSales ?? 0,
    totalRevenue: sellerSummary?.totalRevenue ?? 0,
    pendingShipments: sellerSummary?.pendingShipments ?? pendingOrders.length,
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

  if (!isAuthenticated || !(user as any)?.sellerApproved) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-md text-center">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">للبائعين المعتمدين فقط</h2>
              <p className="text-muted-foreground mb-6">يجب الحصول على موافقة المشرف للوصول لهذه الصفحة</p>
              <Link href="/sell">
                <Button className="w-full">تقديم طلب للبيع</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-medium mb-1">المبيعات</p>
                <p className="text-2xl font-bold text-emerald-800">{SELLER_STATS.soldItems}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">المنتجات النشطة</p>
                <p className="text-2xl font-bold text-blue-800">{SELLER_STATS.activeListings}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200/50 col-span-2 lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-violet-600 font-medium mb-1">الإيرادات</p>
                <p className="text-2xl font-bold text-violet-800">{formatCurrency(SELLER_STATS.totalRevenue)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-amber-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              طلبات تحتاج شحن
              {pendingOrders.length > 0 && (
                <Badge className="bg-amber-500 text-white mr-auto">{pendingOrders.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">لا توجد طلبات معلقة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingOrders.slice(0, 4).map(order => (
                  <div 
                    key={order.id} 
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
                    data-testid={`order-pending-${order.id}`}
                  >
                    <img 
                      src={order.listing?.images?.[0] || "https://via.placeholder.com/48"} 
                      alt={order.listing?.title || "منتج"} 
                      className="w-12 h-12 object-cover rounded-lg shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{order.listing?.title || "منتج"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{order.buyer?.name || "مشتري"}</span>
                        {order.listing?.productCode && (
                          <>
                            <span>•</span>
                            <button 
                              onClick={() => copyToClipboard(order.listing?.productCode || "")}
                              className="flex items-center gap-1 hover:text-primary transition-colors"
                              data-testid={`button-copy-code-${order.id}`}
                            >
                              <span>{order.listing.productCode}</span>
                              <Copy className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => markAsShippedMutation.mutate(order.id)}
                      disabled={markAsShippedMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 shrink-0"
                      data-testid={`button-ship-quick-${order.id}`}
                    >
                      <Truck className="h-4 w-4 ml-1" />
                      شحن
                    </Button>
                  </div>
                ))}
                {pendingOrders.length > 4 && (
                  <Button 
                    variant="ghost" 
                    className="w-full text-sm" 
                    onClick={() => setActiveTab("orders")}
                  >
                    عرض الكل ({pendingOrders.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              الأداء
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-muted-foreground">التقييم</span>
              </div>
              <div className="text-left">
                <p className="text-lg font-bold">
                  {SELLER_STATS.averageRating > 0 ? SELLER_STATS.averageRating.toFixed(1) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {SELLER_STATS.totalReviews > 0 ? `${SELLER_STATS.totalReviews} تقييم` : "لا توجد تقييمات"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">المشاهدات</span>
              </div>
              <p className="text-lg font-bold">{totalViews.toLocaleString('ar-IQ')}</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50/50">
              <div className="flex items-center gap-2">
                <HandCoins className="h-5 w-5 text-violet-500" />
                <span className="text-sm text-muted-foreground">عروض معلقة</span>
              </div>
              <p className="text-lg font-bold">{SELLER_STATS.pendingOffers}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الكود..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
            data-testid="input-search-products"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36" data-testid="select-status-filter">
              <Filter className="h-4 w-4 ml-2" />
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="pending_shipment">بانتظار الشحن</SelectItem>
              <SelectItem value="shipped">تم الشحن</SelectItem>
              <SelectItem value="sold">مباع</SelectItem>
              <SelectItem value="draft">مسودة</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/sell">
            <Button className="gap-2" data-testid="button-add-product">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">إضافة منتج</span>
            </Button>
          </Link>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">لا توجد منتجات</h3>
          <p className="text-muted-foreground text-sm mb-4">ابدأ ببيع منتجاتك الآن</p>
          <Link href="/sell">
            <Button>
              <Plus className="h-4 w-4 ml-2" />
              إضافة منتج جديد
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProducts.map(product => (
            <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow" data-testid={`product-card-${product.id}`}>
              <div className="flex flex-col sm:flex-row">
                <Link href={`/product/${product.id}`} className="relative group shrink-0">
                  <img 
                    src={product.image || "https://via.placeholder.com/120"} 
                    alt={product.title} 
                    className="w-full sm:w-32 h-32 object-cover group-hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <ExternalLink className="h-5 w-5 text-white" />
                  </div>
                </Link>
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <Link href={`/product/${product.id}`}>
                        <h3 className="font-semibold truncate hover:text-primary transition-colors">{product.title}</h3>
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{product.productCode}</span>
                        <span>•</span>
                        <span>{product.views} مشاهدة</span>
                        {product.type === "auction" && product.bids && (
                          <>
                            <span>•</span>
                            <span>{product.bids} مزايدة</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getTypeBadge(product.type)}
                      {getStatusBadge(product.status)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-lg font-bold text-primary">
                        {product.type === "auction" && product.currentBid 
                          ? formatCurrency(product.currentBid)
                          : formatCurrency(product.price)
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        المخزون: {product.quantityAvailable - product.quantitySold} / {product.quantityAvailable}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditProduct(product.id)}
                        data-testid={`button-edit-${product.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleUpdateStock(product)}
                        data-testid={`button-stock-${product.id}`}
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-${product.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>هل أنت متأكد من حذف هذا المنتج؟</AlertDialogTitle>
                            <AlertDialogDescription>
                              لا يمكن التراجع عن هذا الإجراء. سيتم حذف "{product.title}" نهائياً.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteProduct(product.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderOrders = () => {
    const filteredOrders = sellerOrders.filter(order => {
      if (salesFilter === "all") return true;
      if (salesFilter === "pending") return order.status === "pending" || order.status === "processing";
      if (salesFilter === "shipped") return order.status === "shipped";
      if (salesFilter === "delivered") return order.status === "delivered" || order.status === "completed";
      return true;
    });

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <h2 className="text-lg font-semibold">إدارة الطلبات والشحن</h2>
          <Select value={salesFilter} onValueChange={setSalesFilter}>
            <SelectTrigger className="w-40" data-testid="select-sales-filter">
              <Filter className="h-4 w-4 ml-2" />
              <SelectValue placeholder="حالة الشحن" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="pending">بانتظار الشحن</SelectItem>
              <SelectItem value="shipped">تم الشحن</SelectItem>
              <SelectItem value="delivered">تم التسليم</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {ordersLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardList className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد طلبات</h3>
            <p className="text-muted-foreground text-sm">
              {salesFilter !== "all" ? "لا توجد طلبات تطابق الفلتر المحدد" : "عندما يشتري العملاء منتجاتك، ستظهر الطلبات هنا"}
            </p>
            {salesFilter !== "all" && (
              <Button variant="outline" className="mt-4" onClick={() => setSalesFilter("all")}>
                عرض جميع الطلبات
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map(order => (
              <Card 
                key={order.id} 
                className="overflow-hidden hover:shadow-md transition-shadow" 
                data-testid={`order-card-${order.id}`}
              >
                <div className="flex flex-col sm:flex-row">
                  <Link href={`/product/${order.listingId}`} className="relative group shrink-0">
                    {order.listing?.images?.[0] && (
                      <img 
                        src={order.listing.images[0]} 
                        alt={order.listing?.title || "منتج"} 
                        className="w-full sm:w-32 h-32 object-cover group-hover:opacity-80 transition-opacity"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                      <ExternalLink className="h-5 w-5 text-white" />
                    </div>
                  </Link>
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <Link href={`/product/${order.listingId}`}>
                          <h3 className="font-semibold truncate hover:text-primary transition-colors">
                            {order.listing?.title || "منتج"}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span>{new Date(order.createdAt).toLocaleDateString("ar-IQ")}</span>
                          {order.listing?.productCode && (
                            <>
                              <span>•</span>
                              <button 
                                onClick={() => copyToClipboard(order.listing?.productCode || "")}
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                                data-testid={`button-copy-order-${order.id}`}
                              >
                                <span>{order.listing.productCode}</span>
                                <Copy className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge 
                        className={
                          order.status === "completed" || order.status === "delivered" 
                            ? "bg-emerald-100 text-emerald-800 border-0" 
                            : order.status === "shipped" 
                            ? "bg-blue-100 text-blue-800 border-0" 
                            : "bg-amber-100 text-amber-800 border-0"
                        }
                      >
                        {order.status === "pending" ? "بانتظار الشحن" :
                         order.status === "shipped" ? "تم الشحن" :
                         order.status === "completed" || order.status === "delivered" ? "تم التسليم" :
                         order.status === "processing" ? "قيد المعالجة" :
                         order.status}
                      </Badge>
                    </div>

                    {order.buyer && (
                      <div className="bg-muted/50 p-3 rounded-lg mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          المشتري
                        </p>
                        <p className="text-sm font-medium">{order.buyer.name || "مشتري"}</p>
                        {order.buyer.phone && (
                          <p className="text-xs text-muted-foreground">{order.buyer.phone}</p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-lg font-bold text-emerald-600">
                        {formatCurrency(order.amount)}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {order.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => markAsShippedMutation.mutate(order.id)}
                            disabled={markAsShippedMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 gap-1"
                            data-testid={`button-ship-${order.id}`}
                          >
                            <Truck className="h-4 w-4" />
                            تأكيد الشحن
                          </Button>
                        )}
                        {order.status === "shipped" && (
                          <Button
                            size="sm"
                            onClick={() => markAsDeliveredMutation.mutate(order.id)}
                            disabled={markAsDeliveredMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                            data-testid={`button-deliver-${order.id}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                            تأكيد التسليم
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/messages/${order.buyer?.id}`)}
                          className="gap-1"
                          data-testid={`button-message-buyer-${order.id}`}
                        >
                          <MessageSquare className="h-4 w-4" />
                          مراسلة
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMessages = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">الرسائل</h2>
      {messagesLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sellerMessages.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">لا توجد رسائل</h3>
          <p className="text-muted-foreground text-sm">عندما يرسل المشترون رسائل، ستظهر هنا</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sellerMessages.map(message => (
            <Card key={message.id} className="p-4 hover:shadow-md transition-shadow" data-testid={`message-card-${message.id}`}>
              <div className="flex items-start gap-3">
                {message.listingImage && (
                  <img 
                    src={message.listingImage} 
                    alt={message.listingTitle || "منتج"} 
                    className="w-12 h-12 object-cover rounded-lg shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-medium text-sm">{message.senderName}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.createdAt).toLocaleDateString("ar-IQ")}
                    </span>
                  </div>
                  {message.listingTitle && (
                    <p className="text-xs text-muted-foreground mb-1">بخصوص: {message.listingTitle}</p>
                  )}
                  <p className="text-sm text-muted-foreground truncate">{message.content}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(`/messages/${message.senderId}`)}
                  data-testid={`button-reply-${message.id}`}
                >
                  رد
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderFinances = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">المالية</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-sm text-emerald-600 font-medium mb-1">إجمالي الإيرادات</p>
            <p className="text-2xl font-bold text-emerald-800">{formatCurrency(SELLER_STATS.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-blue-600 font-medium mb-1">إجمالي المبيعات</p>
            <p className="text-2xl font-bold text-blue-800">{SELLER_STATS.soldItems}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <HandCoins className="h-6 w-6 text-violet-600" />
              </div>
            </div>
            <p className="text-sm text-violet-600 font-medium mb-1">متوسط قيمة الطلب</p>
            <p className="text-2xl font-bold text-violet-800">
              {SELLER_STATS.soldItems > 0 
                ? formatCurrency(Math.round(SELLER_STATS.totalRevenue / SELLER_STATS.soldItems))
                : "—"
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">آخر المعاملات</CardTitle>
        </CardHeader>
        <CardContent>
          {sellerOrders.filter(o => o.status === "completed" || o.status === "delivered").length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">لا توجد معاملات مكتملة بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sellerOrders
                .filter(o => o.status === "completed" || o.status === "delivered")
                .slice(0, 5)
                .map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{order.listing?.title || "منتج"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.completedAt || order.createdAt).toLocaleDateString("ar-IQ")}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-emerald-600">{formatCurrency(order.amount)}</p>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "overview": return renderOverview();
      case "products": return renderProducts();
      case "orders": return renderOrders();
      case "messages": return renderMessages();
      case "finances": return renderFinances();
      default: return renderOverview();
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-muted/30" style={{ fontFamily: "'IBM Plex Sans Arabic', 'Noto Sans Arabic', sans-serif" }}>
        <div className="flex">
          <aside className="hidden lg:flex fixed right-0 top-16 bottom-0 w-64 border-l bg-card flex-col z-40">
            <div className="p-6 border-b">
              <h1 className="text-xl font-bold text-primary">لوحة التحكم</h1>
              <p className="text-sm text-muted-foreground mt-1">{user?.displayName || "البائع"}</p>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === item.id 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.id}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="p-4 border-t">
              <Link href="/sell">
                <Button className="w-full gap-2" data-testid="button-add-product-sidebar">
                  <Plus className="h-4 w-4" />
                  إضافة منتج
                </Button>
              </Link>
            </div>
          </aside>

          <main className="flex-1 lg:mr-64 pb-20 lg:pb-8">
            <div className="lg:hidden sticky top-16 z-30 bg-card border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold text-primary">لوحة التحكم</h1>
                <Link href="/sell">
                  <Button size="sm" className="gap-1" data-testid="button-add-product-mobile">
                    <Plus className="h-4 w-4" />
                    إضافة
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-4 lg:p-8">
              {renderContent()}
            </div>
          </main>

          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 safe-area-inset-bottom">
            <div className="flex items-center justify-around h-16">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                    activeTab === item.id 
                      ? "text-primary" 
                      : "text-muted-foreground"
                  }`}
                  data-testid={`nav-mobile-${item.id}`}
                >
                  {item.icon}
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
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
