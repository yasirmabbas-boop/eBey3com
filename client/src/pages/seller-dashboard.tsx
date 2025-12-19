import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";

const SELLER_STATS = {
  totalProducts: 12,
  activeListings: 8,
  soldItems: 15,
  totalRevenue: 4250000,
  pendingShipments: 3,
  totalViews: 1247,
  averageRating: 4.8,
  totalReviews: 23,
};

const SELLER_PRODUCTS = [
  {
    id: "1",
    title: "ساعة سيكو فينتاج 1970",
    price: 280000,
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&h=500&fit=crop",
    status: "active",
    type: "auction",
    views: 156,
    bids: 8,
    currentBid: 320000,
    endDate: "2025-12-25",
    category: "ساعات",
    productCode: "P-SW-001",
  },
  {
    id: "2",
    title: "ساعة كاسيو جي شوك",
    price: 75000,
    image: "https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=500&h=500&fit=crop",
    status: "sold",
    type: "fixed",
    views: 89,
    soldDate: "2025-12-18",
    category: "ساعات",
    productCode: "P-SW-002",
    buyer: {
      name: "فاطمة أحمد",
      phone: "07701234567",
      address: "البصرة، حي الجزائر",
      district: "البصرة",
    },
  },
  {
    id: "3",
    title: "لابتوب ماك بوك برو 2020",
    price: 850000,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop",
    status: "active",
    type: "fixed",
    views: 234,
    category: "إلكترونيات",
    productCode: "P-EL-003",
  },
  {
    id: "4",
    title: "ساعة أوميغا سيماستر",
    price: 450000,
    image: "https://images.unsplash.com/photo-1523170335684-f42f53bba104?w=500&h=500&fit=crop",
    status: "pending_shipment",
    type: "auction",
    views: 312,
    soldDate: "2025-12-15",
    finalPrice: 520000,
    category: "ساعات",
    productCode: "P-SW-004",
    buyer: {
      name: "علي محمد",
      phone: "07801234567",
      address: "بغداد، حي المنصور، شارع 14 رمضان",
      district: "بغداد - الكرخ",
    },
  },
  {
    id: "5",
    title: "آيفون 14 برو ماكس",
    price: 1200000,
    image: "https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=500&h=500&fit=crop",
    status: "draft",
    type: "fixed",
    views: 0,
    category: "إلكترونيات",
    productCode: "P-EL-005",
  },
  {
    id: "6",
    title: "سجادة فارسية أصلية",
    price: 350000,
    image: "https://images.unsplash.com/photo-1600166898405-da9535204843?w=500&h=500&fit=crop",
    status: "shipped",
    type: "fixed",
    views: 78,
    soldDate: "2025-12-10",
    category: "تحف وأثاث",
    productCode: "P-AN-006",
    buyer: {
      name: "سارة العبيدي",
      phone: "07901234567",
      address: "أربيل، عينكاوا",
      district: "أربيل",
    },
  },
];

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
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showShippingLabel, setShowShippingLabel] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof SELLER_PRODUCTS[0] | null>(null);

  const filteredProducts = SELLER_PRODUCTS.filter(product => {
    const matchesSearch = product.title.includes(searchQuery) || 
                          product.productCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteProduct = (productId: string) => {
    toast({
      title: "تم حذف المنتج",
      description: "تم حذف المنتج بنجاح من قائمتك",
    });
  };

  const handlePrintLabel = (product: typeof SELLER_PRODUCTS[0]) => {
    setSelectedProduct(product);
    setShowShippingLabel(true);
  };

  const activeProducts = SELLER_PRODUCTS.filter(p => p.status === "active");
  const soldProducts = SELLER_PRODUCTS.filter(p => ["sold", "pending_shipment", "shipped"].includes(p.status));
  const pendingShipments = SELLER_PRODUCTS.filter(p => p.status === "pending_shipment" || p.status === "sold");

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
                    <div className="relative">
                      <img 
                        src={product.image} 
                        alt={product.title} 
                        className="w-full md:w-40 h-40 object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        {getTypeBadge(product.type)}
                      </div>
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-lg">{product.title}</h3>
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
                              <Button size="sm" variant="outline" className="gap-1" data-testid={`button-edit-${product.id}`}>
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
