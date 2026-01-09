import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DollarSign, Gavel, ShoppingBag } from "lucide-react";

interface SaleTypeSectionProps {
  saleType: "auction" | "fixed";
  price: string;
  buyNowPrice: string;
  reservePrice: string;
  hasBuyNow: boolean;
  hasReservePrice: boolean;
  allowOffers: boolean;
  allowExchange: boolean;
  language: string;
  t: (key: string) => string;
  enableExchangeFeature: boolean;
  onSaleTypeChange: (type: "auction" | "fixed") => void;
  onPriceChange: (value: string) => void;
  onBuyNowPriceChange: (value: string) => void;
  onReservePriceChange: (value: string) => void;
  onHasBuyNowChange: (checked: boolean) => void;
  onHasReservePriceChange: (checked: boolean) => void;
  onAllowOffersChange: (checked: boolean) => void;
  onAllowExchangeChange: (checked: boolean) => void;
}

export function SaleTypeSection({
  saleType,
  price,
  buyNowPrice,
  reservePrice,
  hasBuyNow,
  hasReservePrice,
  allowOffers,
  allowExchange,
  language,
  t,
  enableExchangeFeature,
  onSaleTypeChange,
  onPriceChange,
  onBuyNowPriceChange,
  onReservePriceChange,
  onHasBuyNowChange,
  onHasReservePriceChange,
  onAllowOffersChange,
  onAllowExchangeChange,
}: SaleTypeSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          {t("saleType")} {language === "ar" ? "والسعر" : "و نرخ"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>{language === "ar" ? "اختر طريقة البيع" : "شێوازی فرۆشتن هەڵبژێرە"} *</Label>
          <RadioGroup 
            value={saleType} 
            onValueChange={(v) => onSaleTypeChange(v as "auction" | "fixed")}
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
                  {t("auction")}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === "ar" 
                    ? "دع المشترين يتنافسون على منتجك للحصول على أفضل سعر" 
                    : "وەرە کڕیاران بەرکەوتوو بن بۆ بەرهەمەکەت بۆ بەدەستهێنانی باشترین نرخ"}
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
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  {t("fixedPrice")}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === "ar" 
                    ? "حدد سعراً ثابتاً والمشتري الأول يفوز" 
                    : "نرخێکی جێگیر دیاری بکە و یەکەم کڕیار بردنەوە دەبات"}
                </p>
              </div>
            </Label>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">
            {saleType === "auction" 
              ? (language === "ar" ? "سعر البداية" : "نرخی دەستپێک") 
              : (language === "ar" ? "السعر" : "نرخ")} ({t("iqd")}) *
          </Label>
          <div className="relative">
            <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
              id="price" 
              type="number"
              placeholder="50000"
              min="1000"
              required
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              className="pl-4 pr-10"
              data-testid="input-price"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {language === "ar" ? "الحد الأدنى: 1,000 دينار" : "کەمترین: ١,٠٠٠ دینار"}
          </p>
        </div>

        {saleType === "auction" && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg">
              <Checkbox 
                id="reservePrice" 
                checked={hasReservePrice}
                onCheckedChange={(checked) => onHasReservePriceChange(checked === true)}
                className="h-5 w-5 border-2"
                data-testid="checkbox-reserve-price"
              />
              <div className="space-y-1 flex-1">
                <Label htmlFor="reservePrice" className="font-bold cursor-pointer">
                  {language === "ar" ? "سعر احتياطي" : "نرخی پاشەکەوت"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" 
                    ? "الحد الأدنى المقبول للبيع. لن يُباع المنتج بأقل من هذا السعر" 
                    : "کەمترین نرخی پەسەندکراو بۆ فرۆشتن. بەرهەم بە کەمتر لەم نرخە نافرۆشرێت"}
                </p>
              </div>
            </div>
            
            {hasReservePrice && (
              <div className="space-y-2 pr-8">
                <Label htmlFor="reservePriceValue">
                  {language === "ar" ? "السعر الاحتياطي" : "نرخی پاشەکەوت"} ({t("iqd")}) *
                </Label>
                <Input 
                  id="reservePriceValue" 
                  type="number"
                  placeholder="100000"
                  min="1000"
                  value={reservePrice}
                  onChange={(e) => onReservePriceChange(e.target.value)}
                  data-testid="input-reserve-price"
                />
              </div>
            )}

            <div className="flex items-center gap-3 p-4 bg-white rounded-lg">
              <Checkbox 
                id="buyNowToggle" 
                checked={hasBuyNow}
                onCheckedChange={(checked) => onHasBuyNowChange(checked === true)}
                className="h-5 w-5 border-2"
                data-testid="checkbox-buy-now"
              />
              <div className="space-y-1 flex-1">
                <Label htmlFor="buyNowToggle" className="font-bold cursor-pointer">
                  {language === "ar" ? "سعر الشراء الفوري" : "نرخی کڕینی ڕاستەوخۆ"} (Buy Now)
                </Label>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" 
                    ? "السماح للمشتري بشراء المنتج فوراً بسعر محدد دون انتظار انتهاء المزاد" 
                    : "ڕێگەدان بە کڕیار کە بەرهەمەکە ڕاستەوخۆ بکڕێت بە نرخێکی دیاریکراو بەبێ چاوەڕوانی کۆتایی مزایدە"}
                </p>
              </div>
            </div>
            
            {hasBuyNow && (
              <div className="space-y-2 pr-8">
                <Label htmlFor="buyNowPrice">
                  {language === "ar" ? "سعر الشراء الفوري" : "نرخی کڕینی ڕاستەوخۆ"} ({t("iqd")}) *
                </Label>
                <Input 
                  id="buyNowPrice" 
                  type="number"
                  placeholder="150000"
                  min="1000"
                  value={buyNowPrice}
                  onChange={(e) => onBuyNowPriceChange(e.target.value)}
                  data-testid="input-buy-now-price"
                />
                <p className="text-xs text-muted-foreground">
                  {language === "ar" 
                    ? "يجب أن يكون أعلى من سعر البداية" 
                    : "دەبێت زیاتر بێت لە نرخی دەستپێک"}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 p-4 bg-white rounded-lg">
              <Checkbox 
                id="allowOffersAuction" 
                checked={allowOffers}
                onCheckedChange={(checked) => onAllowOffersChange(checked === true)}
                className="h-5 w-5 border-2"
                data-testid="checkbox-allow-offers"
              />
              <div className="space-y-1 flex-1">
                <Label htmlFor="allowOffersAuction" className="font-bold cursor-pointer">
                  {language === "ar" ? "قابل للتفاوض" : "شیاوی دانوستان"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" 
                    ? "السماح للمشترين بتقديم عروض سعر مختلفة بالإضافة للمزايدات" 
                    : "ڕێگەدان بە کڕیاران بۆ پێشکەشکردنی نرخی جیاواز لەگەڵ مزایدەکان"}
                </p>
              </div>
            </div>

            {enableExchangeFeature && (
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <Checkbox 
                  id="exchangeToggle" 
                  checked={allowExchange}
                  onCheckedChange={(checked) => onAllowExchangeChange(checked === true)}
                  className="h-5 w-5 border-2"
                  data-testid="checkbox-allow-exchange"
                />
                <div className="space-y-1 flex-1">
                  <Label htmlFor="exchangeToggle" className="font-bold cursor-pointer">
                    {language === "ar" ? "قابل للمراوس" : "شیاوی گۆڕینەوە"}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {language === "ar" 
                      ? "السماح للمشترين بتقديم عروض تبادل مع منتجاتهم المعروضة" 
                      : "ڕێگەدان بە کڕیاران بۆ پێشکەشکردنی پێشنیاری گۆڕینەوە لەگەڵ بەرهەمەکانیان"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
