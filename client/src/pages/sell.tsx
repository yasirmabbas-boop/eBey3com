import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, 
  Upload, 
  DollarSign, 
  Clock, 
  Package, 
  MapPin, 
  Tag, 
  Info,
  Gavel,
  ShoppingBag,
  Calendar,
  Plus,
  X,
  CheckCircle2
} from "lucide-react";

export default function SellPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [saleType, setSaleType] = useState<"auction" | "fixed">("auction");
  const [hasBuyNow, setHasBuyNow] = useState(false);
  const [hasReservePrice, setHasReservePrice] = useState(false);
  const [allowOffers, setAllowOffers] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    deliveryWindow: "",
    returnPolicy: "",
    returnDetails: "",
    sellerName: "",
    sellerPhone: "",
    city: "",
    auctionDuration: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImages(prev => [...prev, event.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let auctionEndTime = null;
      if (saleType === "auction" && formData.auctionDuration) {
        const durationMap: Record<string, number> = {
          "1_day": 24 * 60 * 60 * 1000,
          "3_days": 3 * 24 * 60 * 60 * 1000,
          "5_days": 5 * 24 * 60 * 60 * 1000,
          "7_days": 7 * 24 * 60 * 60 * 1000,
          "10_days": 10 * 24 * 60 * 60 * 1000,
          "14_days": 14 * 24 * 60 * 60 * 1000,
        };
        const durationMs = durationMap[formData.auctionDuration] || 7 * 24 * 60 * 60 * 1000;
        auctionEndTime = new Date(Date.now() + durationMs).toISOString();
      }
      
      const listingData = {
        title: formData.title,
        description: formData.description,
        price: parseInt(formData.price) || 0,
        category: formData.category,
        condition: formData.condition,
        images: images,
        saleType: saleType,
        timeLeft: saleType === "auction" ? formData.auctionDuration : null,
        auctionEndTime: auctionEndTime,
        deliveryWindow: formData.deliveryWindow,
        returnPolicy: formData.returnPolicy,
        returnDetails: formData.returnDetails || null,
        sellerName: formData.sellerName,
        sellerPhone: formData.sellerPhone || null,
        city: formData.city,
      };

      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listingData),
      });

      if (!response.ok) {
        throw new Error("Failed to create listing");
      }

      toast({
        title: "تم نشر المنتج بنجاح!",
        description: "يمكنك رؤية منتجك في الصفحة الرئيسية.",
      });
      
      setLocation("/");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "حدث خطأ",
        description: "تعذر نشر المنتج. حاول مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">بيع منتج جديد</h1>
          <p className="text-muted-foreground">أضف منتجك للبيع على منصة اي-بيع</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Image Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                صور المنتج
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-gray-100">
                    <img src={img} alt={`صورة ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {index === 0 && (
                      <Badge className="absolute bottom-2 right-2 bg-primary">الرئيسية</Badge>
                    )}
                  </div>
                ))}
                
                {images.length < 8 && (
                  <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      data-testid="input-images"
                    />
                    <Plus className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">إضافة صورة</span>
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                يمكنك إضافة حتى 8 صور. الصورة الأولى ستكون الصورة الرئيسية.
              </p>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                معلومات المنتج
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">عنوان المنتج *</Label>
                <Input 
                  id="title" 
                  placeholder="مثال: ساعة رولكس سابماريينر فينتاج 1970" 
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  data-testid="input-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">وصف المنتج *</Label>
                <Textarea 
                  id="description" 
                  placeholder="اكتب وصفاً تفصيلياً للمنتج، الحالة، التاريخ، أي عيوب..."
                  rows={5}
                  required
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  data-testid="input-description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="category">الفئة *</Label>
                  <Select value={formData.category} onValueChange={(v) => handleInputChange("category", v)}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ساعات">ساعات</SelectItem>
                      <SelectItem value="ملابس">ملابس</SelectItem>
                      <SelectItem value="تحف وأثاث">تحف وأثاث</SelectItem>
                      <SelectItem value="إلكترونيات">إلكترونيات</SelectItem>
                      <SelectItem value="مجوهرات">مجوهرات</SelectItem>
                      <SelectItem value="آلات موسيقية">آلات موسيقية</SelectItem>
                      <SelectItem value="مقتنيات">مقتنيات</SelectItem>
                      <SelectItem value="أخرى">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition">الحالة *</Label>
                  <Select value={formData.condition} onValueChange={(v) => handleInputChange("condition", v)}>
                    <SelectTrigger data-testid="select-condition">
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">جديد (لم يُستخدم)</SelectItem>
                      <SelectItem value="Used - Like New">شبه جديد</SelectItem>
                      <SelectItem value="Used - Good">جيد</SelectItem>
                      <SelectItem value="Used - Fair">مقبول</SelectItem>
                      <SelectItem value="Vintage">فينتاج / انتيك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="brand">الماركة / العلامة التجارية</Label>
                  <Input 
                    id="brand" 
                    placeholder="مثال: Rolex, Omega, Seiko..."
                    data-testid="input-brand"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">الموديل / الإصدار</Label>
                  <Input 
                    id="model" 
                    placeholder="مثال: Submariner 5513"
                    data-testid="input-model"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sale Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                نوع البيع والسعر
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>اختر طريقة البيع *</Label>
                <RadioGroup 
                  value={saleType} 
                  onValueChange={(v) => setSaleType(v as "auction" | "fixed")}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <Label 
                    htmlFor="auction"
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      saleType === "auction" ? "border-primary bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <RadioGroupItem value="auction" id="auction" className="mt-1" />
                    <div>
                      <div className="flex items-center gap-2 font-bold text-lg">
                        <Gavel className="h-5 w-5 text-primary" />
                        مزاد
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        دع المشترين يتنافسون على منتجك للحصول على أفضل سعر
                      </p>
                    </div>
                  </Label>

                  <Label 
                    htmlFor="fixed"
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      saleType === "fixed" ? "border-primary bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <RadioGroupItem value="fixed" id="fixed" className="mt-1" />
                    <div>
                      <div className="flex items-center gap-2 font-bold text-lg">
                        <ShoppingBag className="h-5 w-5 text-green-600" />
                        سعر ثابت
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        حدد سعراً ثابتاً والمشتري يشتري مباشرة
                      </p>
                    </div>
                  </Label>
                </RadioGroup>
              </div>

              <Separator />

              {saleType === "auction" ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="startPrice">سعر البداية *</Label>
                      <div className="relative">
                        <Input 
                          id="startPrice" 
                          type="number" 
                          placeholder="0"
                          className="pl-16"
                          required
                          value={formData.price}
                          onChange={(e) => handleInputChange("price", e.target.value)}
                          data-testid="input-start-price"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">د.ع</span>
                      </div>
                      <p className="text-xs text-muted-foreground">السعر الذي يبدأ منه المزاد</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bidIncrement">الحد الأدنى للزيادة</Label>
                      <div className="relative">
                        <Input 
                          id="bidIncrement" 
                          type="number" 
                          placeholder="5000"
                          className="pl-16"
                          data-testid="input-bid-increment"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">د.ع</span>
                      </div>
                      <p className="text-xs text-muted-foreground">أقل مبلغ يمكن زيادته في المزايدة</p>
                    </div>
                  </div>

                  {/* Reserve Price Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="reserveToggle" className="font-bold">سعر احتياطي</Label>
                      <p className="text-xs text-muted-foreground">
                        حدد سعراً أدنى يجب الوصول إليه لإتمام البيع
                      </p>
                    </div>
                    <Switch 
                      id="reserveToggle" 
                      checked={hasReservePrice}
                      onCheckedChange={setHasReservePrice}
                      data-testid="switch-reserve-price"
                    />
                  </div>

                  {hasReservePrice && (
                    <div className="space-y-2">
                      <Label htmlFor="reservePrice">السعر الاحتياطي</Label>
                      <div className="relative">
                        <Input 
                          id="reservePrice" 
                          type="number" 
                          placeholder="0"
                          className="pl-16"
                          data-testid="input-reserve-price"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">د.ع</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        لن يتم بيع المنتج إذا لم يصل المزاد لهذا السعر
                      </p>
                    </div>
                  )}

                  {/* Buy Now Toggle */}
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="buyNowToggle" className="font-bold flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-green-600" />
                        خيار الشراء الفوري
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        السماح للمشتري بشراء المنتج فوراً بسعر محدد
                      </p>
                    </div>
                    <Switch 
                      id="buyNowToggle" 
                      checked={hasBuyNow}
                      onCheckedChange={setHasBuyNow}
                      data-testid="switch-buy-now"
                    />
                  </div>

                  {hasBuyNow && (
                    <div className="space-y-2">
                      <Label htmlFor="buyNowPrice">سعر الشراء الفوري</Label>
                      <div className="relative">
                        <Input 
                          id="buyNowPrice" 
                          type="number" 
                          placeholder="0"
                          className="pl-16"
                          data-testid="input-buy-now-price"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">د.ع</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        السعر الذي يمكن للمشتري الشراء به فوراً دون انتظار نهاية المزاد
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fixedPrice">سعر البيع *</Label>
                    <div className="relative">
                      <Input 
                        id="fixedPrice" 
                        type="number" 
                        placeholder="0"
                        className="pl-16"
                        required
                        value={formData.price}
                        onChange={(e) => handleInputChange("price", e.target.value)}
                        data-testid="input-fixed-price"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">د.ع</span>
                    </div>
                  </div>

                  {/* Allow Offers Toggle */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="offersToggle" className="font-bold">السماح بالعروض</Label>
                      <p className="text-xs text-muted-foreground">
                        السماح للمشترين بتقديم عروض أقل من السعر المحدد
                      </p>
                    </div>
                    <Switch 
                      id="offersToggle" 
                      checked={allowOffers}
                      onCheckedChange={setAllowOffers}
                      data-testid="switch-allow-offers"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Duration & Scheduling */}
          {saleType === "auction" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  مدة المزاد والتوقيت
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="duration">مدة المزاد *</Label>
                    <Select value={formData.auctionDuration} onValueChange={(v) => handleInputChange("auctionDuration", v)}>
                      <SelectTrigger data-testid="select-duration">
                        <SelectValue placeholder="اختر المدة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="يوم واحد">يوم واحد</SelectItem>
                        <SelectItem value="3 أيام">3 أيام</SelectItem>
                        <SelectItem value="5 أيام">5 أيام</SelectItem>
                        <SelectItem value="أسبوع">أسبوع</SelectItem>
                        <SelectItem value="10 أيام">10 أيام</SelectItem>
                        <SelectItem value="أسبوعين">أسبوعين</SelectItem>
                        <SelectItem value="شهر">شهر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startTime">موعد بدء المزاد</Label>
                    <Select>
                      <SelectTrigger data-testid="select-start-time">
                        <SelectValue placeholder="ابدأ فوراً" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="now">ابدأ فوراً</SelectItem>
                        <SelectItem value="schedule">جدولة موعد محدد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">تاريخ البدء</Label>
                    <Input 
                      id="startDate" 
                      type="date"
                      data-testid="input-start-date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startHour">وقت البدء</Label>
                    <Input 
                      id="startHour" 
                      type="time"
                      data-testid="input-start-hour"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quantity & Stock */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                الكمية والمخزون
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="quantity">عدد القطع المتوفرة *</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    placeholder="1"
                    min="1"
                    defaultValue="1"
                    required
                    data-testid="input-quantity"
                  />
                  <p className="text-xs text-muted-foreground">
                    إذا كان لديك أكثر من قطعة متشابهة
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">رمز المنتج (SKU)</Label>
                  <Input 
                    id="sku" 
                    placeholder="اختياري - للتتبع الداخلي"
                    data-testid="input-sku"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location & Shipping */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                الموقع والشحن
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sellerName">اسم البائع *</Label>
                  <Input 
                    id="sellerName" 
                    placeholder="مثال: أحمد العراقي"
                    required
                    value={formData.sellerName}
                    onChange={(e) => handleInputChange("sellerName", e.target.value)}
                    data-testid="input-seller-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sellerPhone">رقم الهاتف</Label>
                  <Input 
                    id="sellerPhone" 
                    placeholder="07xxxxxxxxx"
                    value={formData.sellerPhone}
                    onChange={(e) => handleInputChange("sellerPhone", e.target.value)}
                    data-testid="input-seller-phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="city">المدينة *</Label>
                  <Select value={formData.city} onValueChange={(v) => handleInputChange("city", v)}>
                    <SelectTrigger data-testid="select-city">
                      <SelectValue placeholder="اختر المدينة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="بغداد">بغداد</SelectItem>
                      <SelectItem value="البصرة">البصرة</SelectItem>
                      <SelectItem value="أربيل">أربيل</SelectItem>
                      <SelectItem value="السليمانية">السليمانية</SelectItem>
                      <SelectItem value="الموصل">الموصل</SelectItem>
                      <SelectItem value="النجف">النجف</SelectItem>
                      <SelectItem value="كربلاء">كربلاء</SelectItem>
                      <SelectItem value="كركوك">كركوك</SelectItem>
                      <SelectItem value="دهوك">دهوك</SelectItem>
                      <SelectItem value="مدينة أخرى">مدينة أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">المنطقة / الحي</Label>
                  <Input 
                    id="area" 
                    placeholder="مثال: الكرادة، المنصور..."
                    data-testid="input-area"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>خيارات الشحن والتوصيل</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <input type="checkbox" id="localPickup" className="h-4 w-4" defaultChecked data-testid="checkbox-local-pickup" />
                    <Label htmlFor="localPickup" className="cursor-pointer">
                      <span className="font-medium">استلام شخصي</span>
                      <p className="text-xs text-muted-foreground">المشتري يستلم من موقعك</p>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <input type="checkbox" id="delivery" className="h-4 w-4" data-testid="checkbox-delivery" />
                    <Label htmlFor="delivery" className="cursor-pointer">
                      <span className="font-medium">توصيل داخل المدينة</span>
                      <p className="text-xs text-muted-foreground">أنت توصل للمشتري</p>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <input type="checkbox" id="shipping" className="h-4 w-4" data-testid="checkbox-shipping" />
                    <Label htmlFor="shipping" className="cursor-pointer">
                      <span className="font-medium">شحن لجميع المحافظات</span>
                      <p className="text-xs text-muted-foreground">عبر شركات الشحن</p>
                    </Label>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Delivery Time */}
              <div className="space-y-2">
                <Label htmlFor="deliveryWindow">مدة التوصيل المتوقعة *</Label>
                <Select value={formData.deliveryWindow} onValueChange={(v) => handleInputChange("deliveryWindow", v)}>
                  <SelectTrigger data-testid="select-delivery-window">
                    <SelectValue placeholder="اختر المدة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-2 أيام">1-2 أيام</SelectItem>
                    <SelectItem value="3-5 أيام">3-5 أيام</SelectItem>
                    <SelectItem value="5-7 أيام">5-7 أيام</SelectItem>
                    <SelectItem value="1-2 أسبوع">1-2 أسبوع</SelectItem>
                    <SelectItem value="2-3 أسابيع">2-3 أسابيع</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Return Policy */}
              <div className="space-y-2">
                <Label htmlFor="returnPolicy">سياسة الإرجاع *</Label>
                <Select value={formData.returnPolicy} onValueChange={(v) => handleInputChange("returnPolicy", v)}>
                  <SelectTrigger data-testid="select-return-policy">
                    <SelectValue placeholder="اختر السياسة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="لا يوجد إرجاع">لا يوجد إرجاع</SelectItem>
                    <SelectItem value="3 أيام">3 أيام</SelectItem>
                    <SelectItem value="7 أيام">7 أيام</SelectItem>
                    <SelectItem value="14 يوم">14 يوم</SelectItem>
                    <SelectItem value="30 يوم">30 يوم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="returnDetails">تفاصيل الإرجاع (اختياري)</Label>
                <Textarea 
                  id="returnDetails" 
                  placeholder="مثال: يقبل الإرجاع إذا كان المنتج بحالته الأصلية..."
                  rows={2}
                  value={formData.returnDetails}
                  onChange={(e) => handleInputChange("returnDetails", e.target.value)}
                  data-testid="input-return-details"
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                خيارات إضافية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="space-y-1">
                  <Label className="font-bold">إظهار رقم الهاتف</Label>
                  <p className="text-xs text-muted-foreground">
                    السماح للمشترين بالتواصل معك مباشرة
                  </p>
                </div>
                <Switch data-testid="switch-show-phone" />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="space-y-1">
                  <Label className="font-bold">قابل للتفاوض</Label>
                  <p className="text-xs text-muted-foreground">
                    إظهار أن السعر قابل للتفاوض
                  </p>
                </div>
                <Switch data-testid="switch-negotiable" />
              </div>

              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                <div className="space-y-1">
                  <Label className="font-bold flex items-center gap-2">
                    ⭐ تمييز الإعلان
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    اجعل إعلانك يظهر في المقدمة (رسوم إضافية)
                  </p>
                </div>
                <Switch data-testid="switch-featured" />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex flex-col gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">ملاحظة مهمة</p>
                <p className="text-blue-700">
                  سيتم مراجعة إعلانك قبل نشره للتأكد من مطابقته لسياسات المنصة.
                  عادةً ما يستغرق ذلك أقل من 24 ساعة.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                type="submit" 
                size="lg" 
                className="flex-1 h-14 text-lg font-bold"
                disabled={isSubmitting}
                data-testid="button-submit-listing"
              >
                {isSubmitting ? (
                  <>جاري النشر...</>
                ) : (
                  <>
                    <Upload className="h-5 w-5 ml-2" />
                    نشر الإعلان
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="lg"
                className="h-14"
                data-testid="button-save-draft"
              >
                حفظ كمسودة
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
