import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { SellWizard, ImageUploadSection } from "@/components/sell";
import { 
  DollarSign,
  Gavel,
  ShoppingBag,
  Plus,
  X,
  CheckCircle2,
  Clock,
  Lock,
  Loader2,
  Globe,
  Package
} from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: hour, label: `${hour}:00` };
});

const INTERNATIONAL_COUNTRIES = [
  { id: "jordan", label: "🇯🇴 الأردن", value: "الأردن" },
  { id: "uae", label: "🇦🇪 الإمارات", value: "الإمارات" },
  { id: "saudi", label: "🇸🇦 السعودية", value: "السعودية" },
  { id: "kuwait", label: "🇰🇼 الكويت", value: "الكويت" },
  { id: "turkey", label: "🇹🇷 تركيا", value: "تركيا" },
  { id: "germany", label: "🇩🇪 ألمانيا", value: "ألمانيا" },
];

export default function SellWizardPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [saleType, setSaleType] = useState<"auction" | "fixed">("auction");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    condition: "",
    brand: "",
    price: "",
    buyNowPrice: "",
    reservePrice: "",
    endDate: "",
    endHour: "23",
    city: "",
    area: "",
    deliveryWindow: "3-5 أيام",
    shippingType: "seller_pays",
    shippingCost: "",
    returnPolicy: "لا يوجد إرجاع",
    quantityAvailable: "1",
  });

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    
    setIsUploadingImages(true);
    
    try {
      const uploadPromises = Array.from(files).slice(0, 8 - images.length).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        return data.url;
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...uploadedUrls.filter(Boolean)]);
      
      toast({
        title: language === "ar" ? "تم الرفع" : "بارکرا",
        description: language === "ar" ? "تم رفع الصور بنجاح" : "وێنەکان بە سەرکەوتوویی بارکران",
      });
    } catch (error) {
      toast({
        title: language === "ar" ? "خطأ" : "هەڵە",
        description: language === "ar" ? "فشل رفع الصور" : "بارکردنی وێنەکان سەرکەوتوو نەبوو",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const stepValidation = [
    images.length > 0,
    formData.title.trim().length >= 5 && formData.description.trim().length >= 10 && !!formData.category && !!formData.condition,
    !!formData.price && parseInt(formData.price) >= 1000 && (saleType === "fixed" || (!!formData.endDate && !!formData.endHour)),
    !!formData.city && !!formData.deliveryWindow,
    true,
  ];

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: language === "ar" ? "خطأ" : "هەڵە",
        description: language === "ar" ? "يجب تسجيل الدخول أولاً" : "پێویستە یەکەم جار بچیتە ژوورەوە",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const authToken = localStorage.getItem("authToken");
      
      let auctionEndTime: string | null = null;
      if (saleType === "auction" && formData.endDate) {
        const endDateTime = new Date(`${formData.endDate}T${formData.endHour}:00:00`);
        auctionEndTime = endDateTime.toISOString();
      }
      
      const listingData = {
        title: formData.title,
        description: formData.description,
        price: parseInt(formData.price),
        category: formData.category,
        condition: formData.condition,
        brand: formData.brand || "بدون ماركة",
        images,
        saleType,
        auctionStartTime: saleType === "auction" ? new Date().toISOString() : null,
        auctionEndTime,
        buyNowPrice: formData.buyNowPrice ? parseInt(formData.buyNowPrice) : null,
        reservePrice: formData.reservePrice ? parseInt(formData.reservePrice) : null,
        city: formData.city,
        area: formData.area || null,
        deliveryWindow: formData.deliveryWindow,
        shippingType: formData.shippingType,
        shippingCost: formData.shippingType === "buyer_pays" ? parseInt(formData.shippingCost) || 0 : 0,
        internationalShipping: selectedCountries.length > 0,
        internationalCountries: selectedCountries,
        returnPolicy: formData.returnPolicy,
        tags,
        quantityAvailable: parseInt(formData.quantityAvailable) || 1,
        isNegotiable: false,
      };
      
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(listingData),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create listing");
      }
      
      const newListing = await res.json();
      
      toast({
        title: language === "ar" ? "تم بنجاح!" : "سەرکەوتوو بوو!",
        description: language === "ar" ? "تم نشر منتجك بنجاح" : "بەرهەمەکەت بە سەرکەوتوویی بڵاوکرایەوە",
      });
      
      setLocation(`/product/${newListing.id}`);
    } catch (error: any) {
      toast({
        title: language === "ar" ? "خطأ" : "هەڵە",
        description: error.message || (language === "ar" ? "فشل نشر المنتج" : "بڵاوکردنەوەی بەرهەم سەرکەوتوو نەبوو"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <Lock className="h-12 w-12 mx-auto text-gray-400" />
              <h2 className="text-xl font-bold">
                {language === "ar" ? "تسجيل الدخول مطلوب" : "پێویستە بچیتە ژوورەوە"}
              </h2>
              <p className="text-muted-foreground">
                {language === "ar" ? "يجب تسجيل الدخول لإضافة منتج" : "پێویستە بچیتە ژوورەوە بۆ زیادکردنی بەرهەم"}
              </p>
              <Link href="/signin">
                <Button className="w-full">{t("signIn")}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <SellWizard
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          stepValidation={stepValidation}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        >
          {/* Step 1: Photos */}
          <div className="space-y-4">
            <ImageUploadSection
              images={images}
              isUploadingImages={isUploadingImages}
              validationErrors={{}}
              language={language}
              onImageUpload={handleImageUpload}
              onRemoveImage={removeImage}
            />
            {images.length === 0 && (
              <p className="text-center text-amber-600 text-sm">
                {language === "ar" ? "أضف صورة واحدة على الأقل للمتابعة" : "لانیکەم یەک وێنە زیاد بکە بۆ بەردەوامبوون"}
              </p>
            )}
          </div>

          {/* Step 2: Product Info */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{t("productTitle")} *</Label>
              <Input 
                placeholder={language === "ar" ? "مثال: ساعة رولكس فينتاج 1970" : "نموونە: کاتژمێری ڕۆلێکس ١٩٧٠"}
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                data-testid="input-title"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t("productDescription")} *</Label>
              <Textarea 
                placeholder={language === "ar" ? "اكتب وصفاً تفصيلياً للمنتج..." : "وەسفی ورد بۆ بەرهەم بنووسە..."}
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                data-testid="input-description"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("category")} *</Label>
                <Select value={formData.category} onValueChange={(v) => handleInputChange("category", v)}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ساعات">{t("watches")}</SelectItem>
                    <SelectItem value="إلكترونيات">{t("electronics")}</SelectItem>
                    <SelectItem value="ملابس">{t("clothing")}</SelectItem>
                    <SelectItem value="مجوهرات">{t("jewelry")}</SelectItem>
                    <SelectItem value="تحف وأثاث">{t("furniture")}</SelectItem>
                    <SelectItem value="مقتنيات">{t("collectibles")}</SelectItem>
                    <SelectItem value="أخرى">{t("other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>{t("condition")} *</Label>
                <Select value={formData.condition} onValueChange={(v) => handleInputChange("condition", v)}>
                  <SelectTrigger data-testid="select-condition">
                    <SelectValue placeholder={t("selectCondition")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">{t("new")}</SelectItem>
                    <SelectItem value="Used - Like New">{t("likeNew")}</SelectItem>
                    <SelectItem value="Used - Good">{t("usedGood")}</SelectItem>
                    <SelectItem value="Vintage">{t("vintage")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{language === "ar" ? "الماركة" : "براند"}</Label>
              <Select value={formData.brand} onValueChange={(v) => handleInputChange("brand", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={language === "ar" ? "اختياري" : "ئارەزوومەندانە"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rolex">Rolex</SelectItem>
                  <SelectItem value="Omega">Omega</SelectItem>
                  <SelectItem value="Seiko">Seiko</SelectItem>
                  <SelectItem value="Apple">Apple</SelectItem>
                  <SelectItem value="Samsung">Samsung</SelectItem>
                  <SelectItem value="بدون ماركة">{language === "ar" ? "بدون ماركة" : "بێ براند"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>{language === "ar" ? "الكلمات المفتاحية" : "وشەی سەرەکییەکان"}</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim() && tags.length < 5) {
                      e.preventDefault();
                      setTags([...tags, tagInput.trim()]);
                      setTagInput("");
                    }
                  }}
                  placeholder={language === "ar" ? "اكتب واضغط Enter" : "بنووسە و Enter دابگرە"}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (tagInput.trim() && tags.length < 5) {
                      setTags([...tags, tagInput.trim()]);
                      setTagInput("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => setTags(tags.filter((_, i) => i !== idx))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Pricing */}
          <div className="space-y-6">
            <RadioGroup 
              value={saleType} 
              onValueChange={(v) => setSaleType(v as "auction" | "fixed")}
              className="grid grid-cols-2 gap-4"
            >
              <Label 
                htmlFor="auction"
                className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer ${
                  saleType === "auction" ? "border-primary bg-primary/5" : "border-gray-200"
                }`}
              >
                <RadioGroupItem value="auction" id="auction" />
                <div>
                  <div className="flex items-center gap-2 font-bold">
                    <Gavel className="h-4 w-4" />
                    {t("auction")}
                  </div>
                </div>
              </Label>
              
              <Label 
                htmlFor="fixed"
                className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer ${
                  saleType === "fixed" ? "border-primary bg-primary/5" : "border-gray-200"
                }`}
              >
                <RadioGroupItem value="fixed" id="fixed" />
                <div>
                  <div className="flex items-center gap-2 font-bold">
                    <ShoppingBag className="h-4 w-4" />
                    {t("fixedPrice")}
                  </div>
                </div>
              </Label>
            </RadioGroup>
            
            <div className="space-y-2">
              <Label>
                {saleType === "auction" 
                  ? (language === "ar" ? "سعر البداية" : "نرخی دەستپێک") 
                  : (language === "ar" ? "السعر" : "نرخ")} ({t("iqd")}) *
              </Label>
              <Input 
                type="number"
                placeholder="50000"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                data-testid="input-price"
              />
              <p className="text-xs text-muted-foreground">
                {language === "ar" ? "الحد الأدنى: 1,000 دينار" : "کەمترین: ١,٠٠٠ دینار"}
              </p>
            </div>
            
            {saleType === "auction" && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === "ar" ? "تاريخ الانتهاء" : "ڕێکەوتی کۆتایی"} *</Label>
                    <Input 
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange("endDate", e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      data-testid="input-end-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === "ar" ? "الساعة" : "کاتژمێر"} *</Label>
                    <Select value={formData.endHour} onValueChange={(v) => handleInputChange("endHour", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>{language === "ar" ? "سعر الشراء الفوري (اختياري)" : "نرخی کڕینی ڕاستەوخۆ"}</Label>
                  <Input 
                    type="number"
                    placeholder={language === "ar" ? "اتركه فارغاً إذا لم ترغب" : "بەتاڵی جێبهێڵە ئەگەر نەتەوێت"}
                    value={formData.buyNowPrice}
                    onChange={(e) => handleInputChange("buyNowPrice", e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Step 4: Shipping */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "المدينة" : "شار"} *</Label>
                <Select value={formData.city} onValueChange={(v) => handleInputChange("city", v)}>
                  <SelectTrigger data-testid="select-city">
                    <SelectValue placeholder={language === "ar" ? "اختر المدينة" : "شار هەڵبژێرە"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="بغداد">بغداد</SelectItem>
                    <SelectItem value="البصرة">البصرة</SelectItem>
                    <SelectItem value="أربيل">أربيل</SelectItem>
                    <SelectItem value="السليمانية">السليمانية</SelectItem>
                    <SelectItem value="الموصل">الموصل</SelectItem>
                    <SelectItem value="كركوك">كركوك</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "المنطقة" : "ناوچە"}</Label>
                <Input 
                  placeholder={language === "ar" ? "اختياري" : "ئارەزوومەندانە"}
                  value={formData.area}
                  onChange={(e) => handleInputChange("area", e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{language === "ar" ? "مدة التوصيل" : "ماوەی گەیاندن"} *</Label>
              <Select value={formData.deliveryWindow} onValueChange={(v) => handleInputChange("deliveryWindow", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2 أيام">1-2 {language === "ar" ? "أيام" : "ڕۆژ"}</SelectItem>
                  <SelectItem value="3-5 أيام">3-5 {language === "ar" ? "أيام" : "ڕۆژ"}</SelectItem>
                  <SelectItem value="5-7 أيام">5-7 {language === "ar" ? "أيام" : "ڕۆژ"}</SelectItem>
                  <SelectItem value="1-2 أسبوع">1-2 {language === "ar" ? "أسبوع" : "هەفتە"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <Label>{language === "ar" ? "تكلفة الشحن" : "تێچووی گواستنەوە"}</Label>
              <RadioGroup 
                value={formData.shippingType} 
                onValueChange={(v) => handleInputChange("shippingType", v)}
                className="space-y-2"
              >
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="seller_pays" id="ship-free" />
                  <Label htmlFor="ship-free" className="flex-1 cursor-pointer">
                    {language === "ar" ? "شحن مجاني" : "گواستنەوەی بەخۆڕایی"}
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="buyer_pays" id="ship-buyer" />
                  <Label htmlFor="ship-buyer" className="flex-1 cursor-pointer">
                    {language === "ar" ? "على حساب المشتري" : "بە تێچووی کڕیار"}
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="pickup" id="ship-pickup" />
                  <Label htmlFor="ship-pickup" className="flex-1 cursor-pointer">
                    {language === "ar" ? "استلام شخصي" : "وەرگرتنی کەسی"}
                  </Label>
                </div>
              </RadioGroup>
              
              {formData.shippingType === "buyer_pays" && (
                <Input
                  type="number"
                  placeholder={language === "ar" ? "تكلفة الشحن بالدينار" : "تێچووی گواستنەوە بە دینار"}
                  value={formData.shippingCost}
                  onChange={(e) => handleInputChange("shippingCost", e.target.value)}
                />
              )}
            </div>

            <div className="p-4 bg-blue-50 rounded-lg space-y-3">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {language === "ar" ? "شحن دولي" : "گواستنەوەی نێودەوڵەتی"}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {INTERNATIONAL_COUNTRIES.map((country) => (
                  <div key={country.id} className="flex items-center gap-2">
                    <Checkbox 
                      id={`ship-${country.id}`}
                      checked={selectedCountries.includes(country.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCountries(prev => [...prev, country.value]);
                        } else {
                          setSelectedCountries(prev => prev.filter(c => c !== country.value));
                        }
                      }}
                    />
                    <Label htmlFor={`ship-${country.id}`} className="text-sm cursor-pointer">
                      {country.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 5: Review */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, idx) => (
                    <img 
                      key={idx} 
                      src={img} 
                      alt={`Preview ${idx + 1}`} 
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  ))}
                </div>
              )}
              
              <div>
                <h3 className="font-bold text-lg">{formData.title}</h3>
                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{formData.description}</p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {saleType === "auction" ? (
                    <Gavel className="h-4 w-4 text-primary" />
                  ) : (
                    <ShoppingBag className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-sm">
                    {saleType === "auction" ? t("auction") : t("fixedPrice")}
                  </span>
                </div>
                <span className="font-bold text-lg text-primary">
                  {parseInt(formData.price || "0").toLocaleString()} {t("iqd")}
                </span>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("category")}:</span>
                  <span className="mr-2 font-medium">{formData.category}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("condition")}:</span>
                  <span className="mr-2 font-medium">{formData.condition}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{language === "ar" ? "المدينة" : "شار"}:</span>
                  <span className="mr-2 font-medium">{formData.city}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{language === "ar" ? "الشحن" : "گواستنەوە"}:</span>
                  <span className="mr-2 font-medium">
                    {formData.shippingType === "seller_pays" 
                      ? (language === "ar" ? "مجاني" : "بەخۆڕایی")
                      : formData.shippingType === "pickup"
                        ? (language === "ar" ? "استلام شخصي" : "وەرگرتنی کەسی")
                        : `${parseInt(formData.shippingCost || "0").toLocaleString()} ${t("iqd")}`
                    }
                  </span>
                </div>
              </div>
              
              {selectedCountries.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span>{language === "ar" ? "شحن دولي:" : "گواستنەوەی نێودەوڵەتی:"}</span>
                  <span className="font-medium">{selectedCountries.join("، ")}</span>
                </div>
              )}
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">
                    {language === "ar" ? "جاهز للنشر!" : "ئامادەیە بۆ بڵاوکردنەوە!"}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    {language === "ar" 
                      ? "راجع البيانات أعلاه ثم اضغط على زر النشر"
                      : "زانیاریەکان لە سەرەوە بپشکنە پاشان دوگمەی بڵاوکردنەوە دابگرە"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SellWizard>
      </div>
    </Layout>
  );
}
