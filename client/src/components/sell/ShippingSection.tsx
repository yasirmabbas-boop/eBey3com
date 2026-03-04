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
  returnShippingPayer: string;
  returnShippingCost: string;
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
          {language === "ar" ? "الموقع والشحن" : language === "ku" ? "شوێن و گواستنەوە" : "الموقع والشحن"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="sellerName">{language === "ar" ? "اسم البائع" : language === "ku" ? "ناوی فرۆشیار" : "اسم البائع"} *</Label>
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
              {language === "ar" ? "يتم تعبئة هذا الحقل تلقائياً من حسابك" : language === "ku" ? "ئەم خانەیە خۆکارانە پڕدەکرێتەوە لە هەژمارەکەت" : "يتم تعبئة هذا الحقل تلقائياً من حسابك"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">{language === "ar" ? "المدينة" : language === "ku" ? "شار" : "المدينة"} *</Label>
            <Select value={formData.city} onValueChange={(v) => onInputChange("city", v)}>
              <SelectTrigger data-testid="select-city" className={validationErrors.city ? "border-red-500" : ""}>
                <SelectValue placeholder={language === "ar" ? "اختر المدينة" : language === "ku" ? "شارەکە هەڵبژێرە" : "اختر المدينة"} />
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
                <SelectItem value="مدينة أخرى">{language === "ar" ? "مدينة أخرى" : language === "ku" ? "شاری تر" : "مدينة أخرى"}</SelectItem>
              </SelectContent>
            </Select>
            {validationErrors.city && (
              <p className="text-xs text-red-500">{validationErrors.city}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="area">{language === "ar" ? "المنطقة / الحي" : language === "ku" ? "ناوچە / گەڕەک" : "المنطقة / الحي"}</Label>
            <Input 
              id="area" 
              value={formData.area}
              onChange={(e) => onInputChange("area", e.target.value)}
              placeholder="مثال: الكرادة، المنصور..."
              data-testid="input-area"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku" className="flex items-center gap-2">
              {language === "ar" ? "رمز المنتج (SKU)" : language === "ku" ? "کۆدی بەرهەم (SKU)" : "رمز المنتج (SKU)"}
              <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
                🔒 {language === "ar" ? "للبائع فقط" : language === "ku" ? "تەنها بۆ فرۆشیار" : "للبائع فقط"}
              </span>
            </Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => onInputChange("sku", e.target.value)}
              placeholder={language === "ar" ? "رمز فريد للمنتج (اختياري)" : language === "ku" ? "کۆدێکی تایبەت بۆ بەرهەم (ئارەزوومەندانە)" : "رمز فريد للمنتج (اختياري)"}
              data-testid="input-sku"
            />
            <p className="text-xs text-muted-foreground">
              {language === "ar" ? "هذا الرمز لن يظهر للمشترين - لتتبعك الداخلي فقط" : language === "ku" ? "ئەم کۆدە بۆ کڕیاران نیشان نادرێت - تەنها بۆ شوێنکەوتنی ناوخۆیی تۆ" : "هذا الرمز لن يظهر للمشترين - لتتبعك الداخلي فقط"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Label>{language === "ar" ? "خيارات الشحن والتوصيل" : language === "ku" ? "هەڵبژاردنەکانی گواستنەوە" : "خيارات الشحن والتوصيل"}</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Checkbox id="localPickup" defaultChecked data-testid="checkbox-local-pickup" />
              <Label htmlFor="localPickup" className="cursor-pointer">
                <span className="font-medium">{language === "ar" ? "استلام شخصي" : language === "ku" ? "وەرگرتنی کەسی" : "استلام شخصي"}</span>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "المشتري يستلم من موقعك" : language === "ku" ? "کڕیار لە شوێنی تۆ وەری دەگرێت" : "المشتري يستلم من موقعك"}
                </p>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Checkbox id="delivery" data-testid="checkbox-delivery" />
              <Label htmlFor="delivery" className="cursor-pointer">
                <span className="font-medium">{language === "ar" ? "توصيل داخل المدينة" : language === "ku" ? "گەیاندن لە ناو شار" : "توصيل داخل المدينة"}</span>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "أنت توصل للمشتري" : language === "ku" ? "تۆ دەیگەیەنیت بۆ کڕیار" : "أنت توصل للمشتري"}
                </p>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Checkbox id="shipping" data-testid="checkbox-shipping" />
              <Label htmlFor="shipping" className="cursor-pointer">
                <span className="font-medium">{language === "ar" ? "شحن لجميع المحافظات" : language === "ku" ? "گواستنەوە بۆ هەموو پارێزگاکان" : "شحن لجميع المحافظات"}</span>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "عبر شركات الشحن" : language === "ku" ? "لەڕێگەی کۆمپانیاکانی گواستنەوە" : "عبر شركات الشحن"}
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
                <span className="font-medium">🌍 {language === "ar" ? "شحن دولي" : language === "ku" ? "گواستنەوەی نێودەوڵەتی" : "شحن دولي"}</span>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "الشحن لدول محددة" : language === "ku" ? "گواستنەوە بۆ وڵاتانی دیاریکراو" : "الشحن لدول محددة"}
                </p>
              </Label>
            </div>
          </div>

          <div className="p-4 border border-blue-200 bg-blue-50/50 rounded-lg space-y-3">
            <Label className="font-medium">
              {language === "ar" ? "الدول المتاحة للشحن الدولي" : language === "ku" ? "وڵاتانی بەردەست بۆ گواستنەوەی نێودەوڵەتی" : "الدول المتاحة للشحن الدولي"}
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
              {language === "ar" ? "* تكاليف الشحن الدولي يتم الاتفاق عليها مع المشتري" : language === "ku" ? "* تێچووەکانی گواستنەوەی نێودەوڵەتی لەگەڵ کڕیار ڕێککەوتن دەکرێت" : "* تكاليف الشحن الدولي يتم الاتفاق عليها مع المشتري"}
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <Label htmlFor="deliveryWindow">{language === "ar" ? "مدة التوصيل المتوقعة" : language === "ku" ? "ماوەی گەیاندنی چاوەڕواندراو" : "مدة التوصيل المتوقعة"} *</Label>
          <Select value={formData.deliveryWindow} onValueChange={(v) => onInputChange("deliveryWindow", v)}>
            <SelectTrigger data-testid="select-delivery-window" className={validationErrors.deliveryWindow ? "border-red-500" : ""}>
              <SelectValue placeholder={language === "ar" ? "اختر المدة" : language === "ku" ? "ماوە هەڵبژێرە" : "اختر المدة"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-2 أيام">1-2 {language === "ar" ? "أيام" : language === "ku" ? "ڕۆژ" : "أيام"}</SelectItem>
              <SelectItem value="3-5 أيام">3-5 {language === "ar" ? "أيام" : language === "ku" ? "ڕۆژ" : "أيام"}</SelectItem>
              <SelectItem value="5-7 أيام">5-7 {language === "ar" ? "أيام" : language === "ku" ? "ڕۆژ" : "أيام"}</SelectItem>
              <SelectItem value="1-2 أسبوع">1-2 {language === "ar" ? "أسبوع" : language === "ku" ? "هەفتە" : "أسبوع"}</SelectItem>
              <SelectItem value="2-3 أسابيع">2-3 {language === "ar" ? "أسابيع" : language === "ku" ? "هەفتە" : "أسابيع"}</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.deliveryWindow && (
            <p className="text-xs text-red-500">{validationErrors.deliveryWindow}</p>
          )}
        </div>

        <div className="space-y-3">
          <Label>{language === "ar" ? "تكلفة الشحن" : language === "ku" ? "تێچووی گواستنەوە" : "تكلفة الشحن"}</Label>
          <RadioGroup 
            value={formData.shippingType} 
            onValueChange={(v) => onInputChange("shippingType", v)}
            className="space-y-2"
          >
            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="seller_pays" id="ship-free" data-testid="radio-ship-free" />
              <Label htmlFor="ship-free" className="flex-1 cursor-pointer">
                <span className="font-medium">{language === "ar" ? "شحن مجاني" : language === "ku" ? "گواستنەوەی بەخۆڕایی" : "شحن مجاني"}</span>
                <p className="text-xs text-gray-500">
                  {language === "ar" ? "على حساب البائع" : language === "ku" ? "بە تێچووی فرۆشیار" : "على حساب البائع"}
                </p>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="buyer_pays" id="ship-buyer" data-testid="radio-ship-buyer" />
              <Label htmlFor="ship-buyer" className="flex-1 cursor-pointer">
                <span className="font-medium">{language === "ar" ? "على حساب المشتري" : language === "ku" ? "بە تێچووی کڕیار" : "على حساب المشتري"}</span>
                <p className="text-xs text-gray-500">
                  {language === "ar" ? "حدد تكلفة الشحن" : language === "ku" ? "تێچووی گواستنەوە دیاری بکە" : "حدد تكلفة الشحن"}
                </p>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="pickup" id="ship-pickup" data-testid="radio-ship-pickup" />
              <Label htmlFor="ship-pickup" className="flex-1 cursor-pointer">
                <span className="font-medium">{language === "ar" ? "استلام شخصي" : language === "ku" ? "وەرگرتنی کەسی" : "استلام شخصي"}</span>
                <p className="text-xs text-gray-500">
                  {language === "ar" ? "بدون شحن - التسليم باليد" : language === "ku" ? "بێ گواستنەوە - ڕادەستکردن بە دەست" : "بدون شحن - التسليم باليد"}
                </p>
              </Label>
            </div>
          </RadioGroup>
          
          {formData.shippingType === "buyer_pays" && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="shippingCost">
                {language === "ar" ? "تكلفة الشحن (دينار عراقي)" : language === "ku" ? "تێچووی گواستنەوە (دینار)" : "تكلفة الشحن (دينار عراقي)"} *
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
                {language === "ar" ? "سيتم إضافة هذا المبلغ للسعر النهائي" : language === "ku" ? "ئەم بڕە زیاد دەکرێت بۆ نرخی کۆتایی" : "سيتم إضافة هذا المبلغ للسعر النهائي"}
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 mt-2">
                <p className="text-xs text-orange-700">
                  {language === "ar" ? "ملاحظة: سيتم إضافة 2,000 د.ع تلقائياً على المشتري إذا كان في محافظة مختلفة عن محافظتك." : language === "ku" ? "تێبینی: 2,000 دینار زیادە دەکرێت بۆ کڕیار ئەگەر لە پارێزگایەکی جیاواز بێت." : "ملاحظة: سيتم إضافة 2,000 د.ع تلقائياً على المشتري إذا كان في محافظة مختلفة عن محافظتك."}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="returnPolicy">{language === "ar" ? "سياسة الإرجاع" : language === "ku" ? "سیاسەتی گەڕاندنەوە" : "سياسة الإرجاع"} *</Label>
          <Select value={formData.returnPolicy} onValueChange={(v) => onInputChange("returnPolicy", v)}>
            <SelectTrigger data-testid="select-return-policy" className={validationErrors.returnPolicy ? "border-red-500" : ""}>
              <SelectValue placeholder={language === "ar" ? "اختر السياسة" : language === "ku" ? "سیاسەت هەڵبژێرە" : "اختر السياسة"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="لا يوجد إرجاع">{language === "ar" ? "لا يوجد إرجاع - البيع نهائي" : language === "ku" ? "گەڕاندنەوە نییە - فرۆشتن کۆتاییە" : "لا يوجد إرجاع - البيع نهائي"}</SelectItem>
              <SelectItem value="يوم واحد">{language === "ar" ? "إرجاع خلال يوم واحد" : language === "ku" ? "گەڕاندنەوە لە یەک ڕۆژدا" : "إرجاع خلال يوم واحد"}</SelectItem>
              <SelectItem value="3 أيام">{language === "ar" ? "إرجاع خلال 3 أيام" : language === "ku" ? "گەڕاندنەوە لە ٣ ڕۆژدا" : "إرجاع خلال 3 أيام"}</SelectItem>
              <SelectItem value="7 أيام">{language === "ar" ? "إرجاع خلال 7 أيام" : language === "ku" ? "گەڕاندنەوە لە ٧ ڕۆژدا" : "إرجاع خلال 7 أيام"}</SelectItem>
              <SelectItem value="14 يوم">{language === "ar" ? "إرجاع خلال 14 يوم" : language === "ku" ? "گەڕاندنەوە لە ١٤ ڕۆژدا" : "إرجاع خلال 14 يوم"}</SelectItem>
              <SelectItem value="30 يوم">{language === "ar" ? "إرجاع خلال 30 يوم" : language === "ku" ? "گەڕاندنەوە لە ٣٠ ڕۆژدا" : "إرجاع خلال 30 يوم"}</SelectItem>
              <SelectItem value="استبدال فقط">{language === "ar" ? "استبدال فقط - لا إرجاع نقدي" : language === "ku" ? "گۆڕینەوە تەنها - گەڕاندنەوەی پارە نییە" : "استبدال فقط - لا إرجاع نقدي"}</SelectItem>
              <SelectItem value="ضمان المنتج">{language === "ar" ? "ضمان المنتج من الشركة المصنعة" : language === "ku" ? "گەرەنتی بەرهەم لە کۆمپانیای دروستکەر" : "ضمان المنتج من الشركة المصنعة"}</SelectItem>
              <SelectItem value="أخرى">{language === "ar" ? "أخرى - أحدد في التفاصيل" : language === "ku" ? "تر - لە وردەکاریدا دیاری دەکەم" : "أخرى - أحدد في التفاصيل"}</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.returnPolicy && (
            <p className="text-xs text-red-500">{validationErrors.returnPolicy}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="returnDetails">{language === "ar" ? "تفاصيل الإرجاع (اختياري)" : language === "ku" ? "وردەکاری گەڕاندنەوە (ئارەزوومەندانە)" : "تفاصيل الإرجاع (اختياري)"}</Label>
          <Textarea
            id="returnDetails"
            placeholder={language === "ar" ? "مثال: يقبل الإرجاع إذا كان المنتج بحالته الأصلية..." : language === "ku" ? "نموونە: گەڕاندنەوە قبوڵ دەکرێت ئەگەر بەرهەم لە حاڵەتی ڕەسەنی بێت..." : "مثال: يقبل الإرجاع إذا كان المنتج بحالته الأصلية..."}
            rows={2}
            value={formData.returnDetails}
            onChange={(e) => onInputChange("returnDetails", e.target.value)}
            data-testid="input-return-details"
          />
        </div>

        {formData.returnPolicy && formData.returnPolicy !== "لا يوجد إرجاع" && (
          <div className="space-y-4 p-4 border border-blue-200 bg-blue-50/50 rounded-lg">
            <Label className="font-medium">
              {language === "ar" ? "شحن الإرجاع" : language === "ku" ? "گواستنەوەی گەڕاندنەوە" : "شحن الإرجاع"}
            </Label>

            <div className="space-y-2">
              <Label>{language === "ar" ? "من يدفع تكلفة شحن الإرجاع؟" : language === "ku" ? "کێ تێچووی گواستنەوەی گەڕاندنەوە دەدات؟" : "من يدفع تكلفة شحن الإرجاع؟"}</Label>
              <RadioGroup
                value={formData.returnShippingPayer}
                onValueChange={(v) => onInputChange("returnShippingPayer", v)}
                className="space-y-2"
              >
                <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-white">
                  <RadioGroupItem value="seller" id="return-ship-seller" data-testid="radio-return-ship-seller" />
                  <Label htmlFor="return-ship-seller" className="flex-1 cursor-pointer">
                    <span className="font-medium">{language === "ar" ? "البائع يدفع" : language === "ku" ? "فرۆشیار دەیدات" : "البائع يدفع"}</span>
                    <p className="text-xs text-gray-500">
                      {language === "ar" ? "تتحمل أنت تكلفة شحن الإرجاع" : language === "ku" ? "تۆ تێچووی گواستنەوەی گەڕاندنەوە دەدەیت" : "تتحمل أنت تكلفة شحن الإرجاع"}
                    </p>
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-white">
                  <RadioGroupItem value="buyer" id="return-ship-buyer" data-testid="radio-return-ship-buyer" />
                  <Label htmlFor="return-ship-buyer" className="flex-1 cursor-pointer">
                    <span className="font-medium">{language === "ar" ? "المشتري يدفع" : language === "ku" ? "کڕیار دەیدات" : "المشتري يدفع"}</span>
                    <p className="text-xs text-gray-500">
                      {language === "ar" ? "المشتري يتحمل تكلفة شحن الإرجاع" : language === "ku" ? "کڕیار تێچووی گواستنەوەی گەڕاندنەوە دەدات" : "المشتري يتحمل تكلفة شحن الإرجاع"}
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnShippingCost">
                {language === "ar" ? "تكلفة شحن الإرجاع (دينار عراقي)" : language === "ku" ? "تێچووی گواستنەوەی گەڕاندنەوە (دینار)" : "تكلفة شحن الإرجاع (دينار عراقي)"}
              </Label>
              <Input
                id="returnShippingCost"
                type="number"
                min="0"
                placeholder={language === "ar" ? "مثال: 5000" : language === "ku" ? "نموونە: 5000" : "مثال: 5000"}
                value={formData.returnShippingCost}
                onChange={(e) => onInputChange("returnShippingCost", e.target.value)}
                data-testid="input-return-shipping-cost"
              />
              <p className="text-xs text-gray-500">
                {language === "ar" ? "المبلغ المتوقع لشحن المنتج عند الإرجاع" : language === "ku" ? "بڕی چاوەڕوانکراو بۆ گواستنەوەی بەرهەم لە کاتی گەڕاندنەوە" : "المبلغ المتوقع لشحن المنتج عند الإرجاع"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
