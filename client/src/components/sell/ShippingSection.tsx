import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MapPin } from "lucide-react";

const INTERNATIONAL_COUNTRIES = [
  { id: "jordan", label: "🇯🇴 الأردن", value: "الأردن" },
  { id: "uae", label: "🇦🇪 الإمارات", value: "الإمارات" },
  { id: "saudi", label: "🇸🇦 السعودية", value: "السعودية" },
  { id: "kuwait", label: "🇰🇼 الكويت", value: "الكويت" },
  { id: "qatar", label: "🇶🇦 قطر", value: "قطر" },
  { id: "bahrain", label: "🇧🇭 البحرين", value: "البحرين" },
  { id: "oman", label: "🇴🇲 عمان", value: "عمان" },
  { id: "lebanon", label: "🇱🇧 لبنان", value: "لبنان" },
  { id: "egypt", label: "🇪🇬 مصر", value: "مصر" },
  { id: "turkey", label: "🇹🇷 تركيا", value: "تركيا" },
  { id: "usa", label: "🇺🇸 أمريكا", value: "أمريكا" },
  { id: "uk", label: "🇬🇧 بريطانيا", value: "بريطانيا" },
  { id: "germany", label: "🇩🇪 ألمانيا", value: "ألمانيا" },
  { id: "sweden", label: "🇸🇪 السويد", value: "السويد" },
  { id: "australia", label: "🇦🇺 أستراليا", value: "أستراليا" },
];

interface FormData {
  sellerName: string;
  city: string;
  area: string;
  sku: string;
  deliveryWindow: string;
  shippingType: string;
  shippingCost: string;
  returnPolicy: string;
  returnDetails: string;
}

interface ShippingSectionProps {
  formData: FormData;
  internationalShipping: boolean;
  selectedCountries: string[];
  validationErrors: Record<string, string>;
  language: string;
  onInputChange: (field: string, value: string) => void;
  onInternationalShippingChange: (checked: boolean) => void;
  onCountryChange: (country: string, checked: boolean) => void;
}

export function ShippingSection({
  formData,
  internationalShipping,
  selectedCountries,
  validationErrors,
  language,
  onInputChange,
  onInternationalShippingChange,
  onCountryChange,
}: ShippingSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          {language === "ar" ? "الموقع والشحن" : "شوێن و گواستنەوە"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="sellerName">{language === "ar" ? "اسم البائع" : "ناوی فرۆشیار"} *</Label>
            <Input 
              id="sellerName" 
              placeholder="مثال: أحمد العراقي"
              required
              value={formData.sellerName}
              readOnly
              className="bg-gray-100 cursor-not-allowed"
              data-testid="input-seller-name"
            />
            <p className="text-xs text-muted-foreground">
              {language === "ar" ? "يتم تعبئة هذا الحقل تلقائياً من حسابك" : "ئەم خانەیە خۆکارانە پڕدەکرێتەوە لە هەژمارەکەت"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">{language === "ar" ? "المدينة" : "شار"} *</Label>
            <Select value={formData.city} onValueChange={(v) => onInputChange("city", v)}>
              <SelectTrigger data-testid="select-city" className={validationErrors.city ? "border-red-500" : ""}>
                <SelectValue placeholder={language === "ar" ? "اختر المدينة" : "شارەکە هەڵبژێرە"} />
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
                <SelectItem value="مدينة أخرى">{language === "ar" ? "مدينة أخرى" : "شاری تر"}</SelectItem>
              </SelectContent>
            </Select>
            {validationErrors.city && (
              <p className="text-xs text-red-500">{validationErrors.city}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="area">{language === "ar" ? "المنطقة / الحي" : "ناوچە / گەڕەک"}</Label>
            <Input 
              id="area" 
              value={formData.area}
              onChange={(e) => onInputChange("area", e.target.value)}
              placeholder="مثال: الكرادة، المنصور..."
              data-testid="input-area"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">{language === "ar" ? "رمز المنتج (SKU)" : "کۆدی بەرهەم (SKU)"}</Label>
            <Input 
              id="sku" 
              value={formData.sku}
              onChange={(e) => onInputChange("sku", e.target.value)}
              placeholder={language === "ar" ? "رمز فريد للمنتج (اختياري)" : "کۆدێکی تایبەت بۆ بەرهەم (ئارەزوومەندانە)"}
              data-testid="input-sku"
            />
          </div>
        </div>

        <div className="space-y-4">
          <Label>{language === "ar" ? "خيارات الشحن والتوصيل" : "هەڵبژاردنەکانی گواستنەوە"}</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Checkbox id="localPickup" defaultChecked data-testid="checkbox-local-pickup" />
              <Label htmlFor="localPickup" className="cursor-pointer">
                <span className="font-medium">{language === "ar" ? "استلام شخصي" : "وەرگرتنی کەسی"}</span>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "المشتري يستلم من موقعك" : "کڕیار لە شوێنی تۆ وەری دەگرێت"}
                </p>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Checkbox id="delivery" data-testid="checkbox-delivery" />
              <Label htmlFor="delivery" className="cursor-pointer">
                <span className="font-medium">{language === "ar" ? "توصيل داخل المدينة" : "گەیاندن لە ناو شار"}</span>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "أنت توصل للمشتري" : "تۆ دەیگەیەنیت بۆ کڕیار"}
                </p>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Checkbox id="shipping" data-testid="checkbox-shipping" />
              <Label htmlFor="shipping" className="cursor-pointer">
                <span className="font-medium">{language === "ar" ? "شحن لجميع المحافظات" : "گواستنەوە بۆ هەموو پارێزگاکان"}</span>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "عبر شركات الشحن" : "لەڕێگەی کۆمپانیاکانی گواستنەوە"}
                </p>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg border-blue-200 bg-blue-50">
              <Checkbox 
                id="internationalShipping" 
                data-testid="checkbox-international-shipping"
                checked={internationalShipping}
                onCheckedChange={(checked) => onInternationalShippingChange(checked === true)}
              />
              <Label htmlFor="internationalShipping" className="cursor-pointer">
                <span className="font-medium">🌍 {language === "ar" ? "شحن دولي" : "گواستنەوەی نێودەوڵەتی"}</span>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "الشحن لدول محددة" : "گواستنەوە بۆ وڵاتانی دیاریکراو"}
                </p>
              </Label>
            </div>
          </div>

          <div className="p-4 border border-blue-200 bg-blue-50/50 rounded-lg space-y-3">
            <Label className="font-medium">
              {language === "ar" ? "الدول المتاحة للشحن الدولي" : "وڵاتانی بەردەست بۆ گواستنەوەی نێودەوڵەتی"}
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {INTERNATIONAL_COUNTRIES.map((country) => (
                <div key={country.id} className="flex items-center gap-2">
                  <Checkbox 
                    id={`ship-${country.id}`} 
                    data-testid={`checkbox-ship-${country.id}`}
                    checked={selectedCountries.includes(country.value)}
                    onCheckedChange={(checked) => onCountryChange(country.value, checked === true)}
                  />
                  <Label htmlFor={`ship-${country.id}`} className="cursor-pointer text-sm">{country.label}</Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {language === "ar" 
                ? "* تكاليف الشحن الدولي يتم الاتفاق عليها مع المشتري" 
                : "* تێچووەکانی گواستنەوەی نێودەوڵەتی لەگەڵ کڕیار ڕێککەوتن دەکرێت"}
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <Label htmlFor="deliveryWindow">{language === "ar" ? "مدة التوصيل المتوقعة" : "ماوەی گەیاندنی چاوەڕواندراو"} *</Label>
          <Select value={formData.deliveryWindow} onValueChange={(v) => onInputChange("deliveryWindow", v)}>
            <SelectTrigger data-testid="select-delivery-window" className={validationErrors.deliveryWindow ? "border-red-500" : ""}>
              <SelectValue placeholder={language === "ar" ? "اختر المدة" : "ماوە هەڵبژێرە"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-2 أيام">1-2 {language === "ar" ? "أيام" : "ڕۆژ"}</SelectItem>
              <SelectItem value="3-5 أيام">3-5 {language === "ar" ? "أيام" : "ڕۆژ"}</SelectItem>
              <SelectItem value="5-7 أيام">5-7 {language === "ar" ? "أيام" : "ڕۆژ"}</SelectItem>
              <SelectItem value="1-2 أسبوع">1-2 {language === "ar" ? "أسبوع" : "هەفتە"}</SelectItem>
              <SelectItem value="2-3 أسابيع">2-3 {language === "ar" ? "أسابيع" : "هەفتە"}</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.deliveryWindow && (
            <p className="text-xs text-red-500">{validationErrors.deliveryWindow}</p>
          )}
        </div>

        <div className="space-y-3">
          <Label>{language === "ar" ? "تكلفة الشحن" : "تێچووی گواستنەوە"}</Label>
          <RadioGroup 
            value={formData.shippingType} 
            onValueChange={(v) => onInputChange("shippingType", v)}
            className="space-y-2"
          >
            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="seller_pays" id="ship-free" data-testid="radio-ship-free" />
              <Label htmlFor="ship-free" className="flex-1 cursor-pointer">
                <span className="font-medium">{language === "ar" ? "شحن مجاني" : "گواستنەوەی بەخۆڕایی"}</span>
                <p className="text-xs text-gray-500">
                  {language === "ar" ? "على حساب البائع" : "بە تێچووی فرۆشیار"}
                </p>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="buyer_pays" id="ship-buyer" data-testid="radio-ship-buyer" />
              <Label htmlFor="ship-buyer" className="flex-1 cursor-pointer">
                <span className="font-medium">{language === "ar" ? "على حساب المشتري" : "بە تێچووی کڕیار"}</span>
                <p className="text-xs text-gray-500">
                  {language === "ar" ? "حدد تكلفة الشحن" : "تێچووی گواستنەوە دیاری بکە"}
                </p>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="pickup" id="ship-pickup" data-testid="radio-ship-pickup" />
              <Label htmlFor="ship-pickup" className="flex-1 cursor-pointer">
                <span className="font-medium">{language === "ar" ? "استلام شخصي" : "وەرگرتنی کەسی"}</span>
                <p className="text-xs text-gray-500">
                  {language === "ar" ? "بدون شحن - التسليم باليد" : "بێ گواستنەوە - ڕادەستکردن بە دەست"}
                </p>
              </Label>
            </div>
          </RadioGroup>
          
          {formData.shippingType === "buyer_pays" && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="shippingCost">
                {language === "ar" ? "تكلفة الشحن (دينار عراقي)" : "تێچووی گواستنەوە (دینار)"} *
              </Label>
              <Input
                id="shippingCost"
                type="number"
                min="0"
                placeholder="مثال: 5000"
                value={formData.shippingCost}
                onChange={(e) => onInputChange("shippingCost", e.target.value)}
                data-testid="input-shipping-cost"
              />
              <p className="text-xs text-gray-500">
                {language === "ar" ? "سيتم إضافة هذا المبلغ للسعر النهائي" : "ئەم بڕە زیاد دەکرێت بۆ نرخی کۆتایی"}
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 mt-2">
                <p className="text-xs text-orange-700">
                  {language === "ar"
                    ? "ملاحظة: سيتم إضافة 2,000 د.ع تلقائياً على المشتري إذا كان في محافظة مختلفة عن محافظتك."
                    : "تێبینی: 2,000 دینار زیادە دەکرێت بۆ کڕیار ئەگەر لە پارێزگایەکی جیاواز بێت."}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="returnPolicy">{language === "ar" ? "سياسة الإرجاع" : "سیاسەتی گەڕاندنەوە"} *</Label>
          <Select value={formData.returnPolicy} onValueChange={(v) => onInputChange("returnPolicy", v)}>
            <SelectTrigger data-testid="select-return-policy" className={validationErrors.returnPolicy ? "border-red-500" : ""}>
              <SelectValue placeholder={language === "ar" ? "اختر السياسة" : "سیاسەت هەڵبژێرە"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="لا يوجد إرجاع">{language === "ar" ? "لا يوجد إرجاع - البيع نهائي" : "گەڕاندنەوە نییە - فرۆشتن کۆتاییە"}</SelectItem>
              <SelectItem value="يوم واحد">{language === "ar" ? "إرجاع خلال يوم واحد" : "گەڕاندنەوە لە یەک ڕۆژدا"}</SelectItem>
              <SelectItem value="3 أيام">{language === "ar" ? "إرجاع خلال 3 أيام" : "گەڕاندنەوە لە ٣ ڕۆژدا"}</SelectItem>
              <SelectItem value="7 أيام">{language === "ar" ? "إرجاع خلال 7 أيام" : "گەڕاندنەوە لە ٧ ڕۆژدا"}</SelectItem>
              <SelectItem value="14 يوم">{language === "ar" ? "إرجاع خلال 14 يوم" : "گەڕاندنەوە لە ١٤ ڕۆژدا"}</SelectItem>
              <SelectItem value="30 يوم">{language === "ar" ? "إرجاع خلال 30 يوم" : "گەڕاندنەوە لە ٣٠ ڕۆژدا"}</SelectItem>
              <SelectItem value="استبدال فقط">{language === "ar" ? "استبدال فقط - لا إرجاع نقدي" : "گۆڕینەوە تەنها - گەڕاندنەوەی پارە نییە"}</SelectItem>
              <SelectItem value="ضمان المنتج">{language === "ar" ? "ضمان المنتج من الشركة المصنعة" : "گەرەنتی بەرهەم لە کۆمپانیای دروستکەر"}</SelectItem>
              <SelectItem value="أخرى">{language === "ar" ? "أخرى - أحدد في التفاصيل" : "تر - لە وردەکاریدا دیاری دەکەم"}</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.returnPolicy && (
            <p className="text-xs text-red-500">{validationErrors.returnPolicy}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="returnDetails">{language === "ar" ? "تفاصيل الإرجاع (اختياري)" : "وردەکاری گەڕاندنەوە (ئارەزوومەندانە)"}</Label>
          <Textarea 
            id="returnDetails" 
            placeholder={language === "ar" ? "مثال: يقبل الإرجاع إذا كان المنتج بحالته الأصلية..." : "نموونە: گەڕاندنەوە قبوڵ دەکرێت ئەگەر بەرهەم لە حاڵەتی ڕەسەنی بێت..."}
            rows={2}
            value={formData.returnDetails}
            onChange={(e) => onInputChange("returnDetails", e.target.value)}
            data-testid="input-return-details"
          />
        </div>
      </CardContent>
    </Card>
  );
}
