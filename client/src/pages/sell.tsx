import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
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
import { useAuth } from "@/hooks/use-auth";
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
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  Loader2
} from "lucide-react";
import { 
  WATCH_BRANDS, 
  WATCH_MOVEMENTS, 
  WATCH_CASE_MATERIALS, 
  WATCH_BAND_MATERIALS,
  WATCH_DIAL_COLORS,
  WATCH_FEATURES,
  WATCH_CASE_SIZES,
  WATCH_SHAPES,
  DEPARTMENT_OPTIONS
} from "@/lib/search-data";

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: hour, label: `${hour}:00` };
});

export default function SellPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  
  const [saleType, setSaleType] = useState<"auction" | "fixed">("auction");
  const [hasBuyNow, setHasBuyNow] = useState(false);
  const [hasReservePrice, setHasReservePrice] = useState(false);
  const [allowOffers, setAllowOffers] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTimeOption, setStartTimeOption] = useState("now");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    deliveryWindow: "",
    returnPolicy: "",
    returnDetails: "",
    sellerName: user?.username || "",
    city: "",
    auctionDuration: "",
    startDate: "",
    startHour: "",
  });

  useEffect(() => {
    if (user?.username && !formData.sellerName) {
      setFormData(prev => ({ ...prev, sellerName: user.username || "" }));
    }
  }, [user]);

  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [watchSpecs, setWatchSpecs] = useState({
    referenceNumber: "",
    brand: "",
    model: "",
    movement: "",
    caseMaterial: "",
    caseSize: "",
    caseColor: "",
    dialColor: "",
    bandMaterial: "",
    bandColor: "",
    features: [] as string[],
    watchShape: "",
    department: "",
    countryOfOrigin: "",
    display: "Analog",
    indices: "",
    handedness: "Right",
    customized: false,
  });

  const handleAutoFillWatch = async () => {
    if (!watchSpecs.referenceNumber && !watchSpecs.model) {
      toast({
        title: "أدخل رقم المرجع أو الموديل",
        description: "أدخل رقم المرجع أو اسم الموديل للبحث التلقائي",
        variant: "destructive",
      });
      return;
    }

    setIsAutoFilling(true);

    setTimeout(() => {
      if (watchSpecs.referenceNumber.includes("6138") || watchSpecs.model.toLowerCase().includes("seiko")) {
        setWatchSpecs(prev => ({
          ...prev,
          brand: "Seiko",
          model: prev.model || "Seiko Reverse Baby Panda Chronograph",
          movement: "Automatic (Self-Winding)",
          caseMaterial: "Stainless Steel",
          caseSize: "40mm",
          caseColor: "Silver",
          dialColor: "Reverse Panda",
          bandMaterial: "Stainless Steel",
          bandColor: "Silver",
          features: ["Chronograph", "Day/Date"],
          watchShape: "Round",
          department: "men",
          countryOfOrigin: "Japan",
          display: "Analog",
          indices: "Arabic Numerals, 12-Hour Dial",
        }));
        toast({
          title: "تم العثور على المواصفات! ✨",
          description: "تم ملء المواصفات تلقائياً من قاعدة البيانات",
        });
      } else if (watchSpecs.referenceNumber.toLowerCase().includes("116610") || watchSpecs.model.toLowerCase().includes("rolex")) {
        setWatchSpecs(prev => ({
          ...prev,
          brand: "Rolex",
          model: prev.model || "Rolex Submariner Date",
          movement: "Automatic (Self-Winding)",
          caseMaterial: "Stainless Steel",
          caseSize: "41mm",
          caseColor: "Silver",
          dialColor: "Black",
          bandMaterial: "Stainless Steel",
          bandColor: "Silver",
          features: ["Date", "Water Resistant"],
          watchShape: "Round",
          department: "men",
          countryOfOrigin: "Switzerland",
          display: "Analog",
          indices: "Luminous Markers",
        }));
        toast({
          title: "تم العثور على المواصفات! ✨",
          description: "تم ملء المواصفات تلقائياً من قاعدة البيانات",
        });
      } else {
        toast({
          title: "لم يتم العثور على بيانات",
          description: "يرجى إدخال المواصفات يدوياً",
          variant: "destructive",
        });
      }
      setIsAutoFilling(false);
    }, 1500);
  };

  const toggleWatchFeature = (feature: string) => {
    setWatchSpecs(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const isUserVerified = user?.isVerified === true;

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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.title.trim()) errors.title = "عنوان المنتج مطلوب";
    if (!formData.description.trim()) errors.description = "وصف المنتج مطلوب";
    if (!formData.price || parseInt(formData.price) <= 0) errors.price = "السعر مطلوب";
    if (!formData.category) errors.category = "الفئة مطلوبة";
    if (!formData.condition) errors.condition = "الحالة مطلوبة";
    if (!formData.city) errors.city = "المدينة مطلوبة";
    if (!formData.sellerName.trim()) errors.sellerName = "اسم البائع مطلوب";
    if (!formData.deliveryWindow) errors.deliveryWindow = "مدة التوصيل مطلوبة";
    if (!formData.returnPolicy) errors.returnPolicy = "سياسة الإرجاع مطلوبة";
    if (images.length === 0) errors.images = "يجب إضافة صورة واحدة على الأقل";
    
    if (saleType === "auction") {
      if (!formData.auctionDuration) errors.auctionDuration = "مدة المزاد مطلوبة";
      if (startTimeOption === "schedule") {
        if (!formData.startDate) errors.startDate = "تاريخ البدء مطلوب";
        if (!formData.startHour) errors.startHour = "وقت البدء مطلوب";
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "يرجى إكمال جميع الحقول المطلوبة",
        description: "تحقق من الحقول المميزة بالأحمر",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let auctionEndTime = null;
      if (saleType === "auction" && formData.auctionDuration) {
        const durationMap: Record<string, number> = {
          "يوم واحد": 24 * 60 * 60 * 1000,
          "3 أيام": 3 * 24 * 60 * 60 * 1000,
          "5 أيام": 5 * 24 * 60 * 60 * 1000,
          "أسبوع": 7 * 24 * 60 * 60 * 1000,
          "10 أيام": 10 * 24 * 60 * 60 * 1000,
          "أسبوعين": 14 * 24 * 60 * 60 * 1000,
          "شهر": 30 * 24 * 60 * 60 * 1000,
        };
        const durationMs = durationMap[formData.auctionDuration] || 7 * 24 * 60 * 60 * 1000;
        
        if (startTimeOption === "schedule" && formData.startDate && formData.startHour) {
          const startDateTime = new Date(`${formData.startDate}T${formData.startHour}:00`);
          auctionEndTime = new Date(startDateTime.getTime() + durationMs).toISOString();
        } else {
          auctionEndTime = new Date(Date.now() + durationMs).toISOString();
        }
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
        sellerId: user?.id || null,
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
              {validationErrors.images && (
                <p className="text-xs text-red-500 mt-2">{validationErrors.images}</p>
              )}
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

              {/* Watch Specifications - Only show when category is watches */}
              {formData.category === "ساعات" && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      مواصفات الساعة التفصيلية
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoFillWatch}
                      disabled={isAutoFilling}
                      className="gap-2"
                      data-testid="button-auto-fill-watch"
                    >
                      {isAutoFilling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      بحث تلقائي
                    </Button>
                  </div>

                  <div className="bg-white border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                    <p>💡 <strong>نصيحة:</strong> أدخل رقم المرجع (Reference Number) أو اسم الموديل واضغط "بحث تلقائي" لملء المواصفات تلقائياً</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم المرجع (Reference Number)</Label>
                      <Input
                        value={watchSpecs.referenceNumber}
                        onChange={(e) => setWatchSpecs(prev => ({ ...prev, referenceNumber: e.target.value }))}
                        placeholder="مثال: 6138-8000"
                        className="text-left bg-white"
                        dir="ltr"
                        data-testid="input-reference-number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>العلامة التجارية (Brand)</Label>
                      <Select 
                        value={watchSpecs.brand} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, brand: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-watch-brand">
                          <SelectValue placeholder="اختر العلامة التجارية" />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCH_BRANDS.map(brand => (
                            <SelectItem key={brand.en} value={brand.en}>
                              {brand.ar} ({brand.en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>الموديل (Model)</Label>
                      <Input
                        value={watchSpecs.model}
                        onChange={(e) => setWatchSpecs(prev => ({ ...prev, model: e.target.value }))}
                        placeholder="مثال: Seiko Reverse Baby Panda Chronograph"
                        className="bg-white"
                        data-testid="input-watch-model"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>نوع الحركة (Movement)</Label>
                      <Select 
                        value={watchSpecs.movement} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, movement: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-movement">
                          <SelectValue placeholder="اختر نوع الحركة" />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCH_MOVEMENTS.map(m => (
                            <SelectItem key={m.en} value={m.en}>
                              {m.ar} ({m.en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>مادة العلبة (Case Material)</Label>
                      <Select 
                        value={watchSpecs.caseMaterial} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, caseMaterial: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-case-material">
                          <SelectValue placeholder="اختر مادة العلبة" />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCH_CASE_MATERIALS.map(m => (
                            <SelectItem key={m.en} value={m.en}>
                              {m.ar} ({m.en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>حجم العلبة (Case Size)</Label>
                      <Select 
                        value={watchSpecs.caseSize} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, caseSize: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-case-size">
                          <SelectValue placeholder="اختر حجم العلبة" />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCH_CASE_SIZES.map(size => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>شكل الساعة (Watch Shape)</Label>
                      <Select 
                        value={watchSpecs.watchShape} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, watchShape: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-watch-shape">
                          <SelectValue placeholder="اختر شكل الساعة" />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCH_SHAPES.map(s => (
                            <SelectItem key={s.en} value={s.en}>
                              {s.ar} ({s.en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>لون القرص (Dial Color)</Label>
                      <Select 
                        value={watchSpecs.dialColor} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, dialColor: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-dial-color">
                          <SelectValue placeholder="اختر لون القرص" />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCH_DIAL_COLORS.map(c => (
                            <SelectItem key={c.en} value={c.en}>
                              {c.ar} ({c.en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>مادة السوار (Band Material)</Label>
                      <Select 
                        value={watchSpecs.bandMaterial} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, bandMaterial: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-band-material">
                          <SelectValue placeholder="اختر مادة السوار" />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCH_BAND_MATERIALS.map(m => (
                            <SelectItem key={m.en} value={m.en}>
                              {m.ar} ({m.en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>القسم (Department)</Label>
                      <Select 
                        value={watchSpecs.department} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, department: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-department">
                          <SelectValue placeholder="اختر القسم" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENT_OPTIONS.map(d => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.ar} ({d.en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>بلد المنشأ (Country of Origin)</Label>
                      <Input
                        value={watchSpecs.countryOfOrigin}
                        onChange={(e) => setWatchSpecs(prev => ({ ...prev, countryOfOrigin: e.target.value }))}
                        placeholder="مثال: Japan, Switzerland"
                        className="bg-white"
                        data-testid="input-country-origin"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>المميزات (Features)</Label>
                      <div className="flex flex-wrap gap-2">
                        {WATCH_FEATURES.map(f => (
                          <Badge
                            key={f.en}
                            variant={watchSpecs.features.includes(f.en) ? "default" : "outline"}
                            className="cursor-pointer hover:bg-primary/80 transition-colors"
                            onClick={() => toggleWatchFeature(f.en)}
                            data-testid={`feature-${f.en}`}
                          >
                            {f.ar}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                      <SelectTrigger data-testid="select-duration" className={validationErrors.auctionDuration ? "border-red-500" : ""}>
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
                    {validationErrors.auctionDuration && (
                      <p className="text-xs text-red-500">{validationErrors.auctionDuration}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startTime">موعد بدء المزاد *</Label>
                    <Select value={startTimeOption} onValueChange={setStartTimeOption}>
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

                {startTimeOption === "schedule" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">تاريخ البدء *</Label>
                      <Input 
                        id="startDate" 
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange("startDate", e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={validationErrors.startDate ? "border-red-500" : ""}
                        data-testid="input-start-date"
                      />
                      {validationErrors.startDate && (
                        <p className="text-xs text-red-500">{validationErrors.startDate}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startHour">وقت البدء *</Label>
                      <Select value={formData.startHour} onValueChange={(v) => handleInputChange("startHour", v)}>
                        <SelectTrigger data-testid="select-start-hour" className={validationErrors.startHour ? "border-red-500" : ""}>
                          <SelectValue placeholder="اختر الساعة" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOURS.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.startHour && (
                        <p className="text-xs text-red-500">{validationErrors.startHour}</p>
                      )}
                    </div>
                  </div>
                )}
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
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                    data-testid="input-seller-name"
                  />
                  <p className="text-xs text-muted-foreground">يتم تعبئة هذا الحقل تلقائياً من حسابك</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">المدينة *</Label>
                  <Select value={formData.city} onValueChange={(v) => handleInputChange("city", v)}>
                    <SelectTrigger data-testid="select-city" className={validationErrors.city ? "border-red-500" : ""}>
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
                  {validationErrors.city && (
                    <p className="text-xs text-red-500">{validationErrors.city}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <SelectTrigger data-testid="select-delivery-window" className={validationErrors.deliveryWindow ? "border-red-500" : ""}>
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
                {validationErrors.deliveryWindow && (
                  <p className="text-xs text-red-500">{validationErrors.deliveryWindow}</p>
                )}
              </div>

              {/* Return Policy */}
              <div className="space-y-2">
                <Label htmlFor="returnPolicy">سياسة الإرجاع *</Label>
                <Select value={formData.returnPolicy} onValueChange={(v) => handleInputChange("returnPolicy", v)}>
                  <SelectTrigger data-testid="select-return-policy" className={validationErrors.returnPolicy ? "border-red-500" : ""}>
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
                {validationErrors.returnPolicy && (
                  <p className="text-xs text-red-500">{validationErrors.returnPolicy}</p>
                )}
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
