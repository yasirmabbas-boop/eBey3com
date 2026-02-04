import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BookOpen, Camera, Eye, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { isNative } from "@/lib/capacitor";

interface ImageUploadSectionProps {
  images: string[];
  originalImages?: (string | null)[];
  isUploadingImages: boolean;
  isAnalyzingImage?: boolean;
  validationErrors: Record<string, string>;
  language: string;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onCameraClick?: () => void;
  onAIAnalyze?: () => void;
  onCleanBackground?: (index: number) => void;
  cleaningIndex?: number | null;
  cleanErrorByIndex?: Record<number, string | undefined>;
}

export function ImageUploadSection({
  images,
  originalImages,
  isUploadingImages,
  isAnalyzingImage,
  validationErrors,
  language,
  onImageUpload,
  onRemoveImage,
  onCameraClick,
  onAIAnalyze,
  onCleanBackground,
  cleaningIndex,
  cleanErrorByIndex,
}: ImageUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showingOriginal, setShowingOriginal] = useState<Record<number, boolean>>({});
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const copy =
    language === "ar"
      ? {
          title: "صور المنتج",
          quickTipsTitle: "نصائح سريعة لصور تجذب المشترين",
          guideCta: "دليل الصور",
          guideTitle: "كيف تلتقط صوراً تبيع",
          guideSubtitle: "اتبع هذه الخطوات لزيادة الثقة وجذب المشترين.",
          tips: [
            "استخدم ضوء طبيعي (قرب نافذة) وتجنب فلاش قوي يسبب لمعان.",
            "الصورة الأولى هي الرئيسية: اجعلها واضحة وخلفية نظيفة (جرّب ✨ Clean Background).",
            "صوّر من زوايا متعددة + لقطة قريبة للتفاصيل (شعار/موديل/رقم تسلسلي).",
            "أظهر العيوب بوضوح (خدوش/كسور) لتقليل الاسترجاع وزيادة الثقة.",
            "التقط على الأقل صورتين للمتابعة، والأفضل 5–8 صور.",
          ],
          shotListTitle: "قائمة اللقطات المقترحة (بالترتيب)",
          shotList: [
            "الصورة الرئيسية: المنتج وحده، واضح، بدون فوضى بالخلفية.",
            "زاوية 45° تُظهر الشكل العام.",
            "الجهة الخلفية/الجوانب.",
            "لقطات قريبة للتفاصيل المهمة (ماركة، موديل، منافذ، نقش…).",
            "العيوب: خدوش/كسور/بقع (صور قريبة).",
            "المرفقات: علبة، شاحن، أوراق، قطع إضافية.",
            "حجم/مقياس (اختياري): بجانب عملة/مسطرة دون تغطية المنتج.",
          ],
          doDontTitle: "افعل / لا تفعل",
          doItems: [
            "امسح العدسة قبل التصوير.",
            "اجعل المنتج في منتصف الإطار وباستقامة.",
            "استخدم خلفية بسيطة (حائط أبيض/قماش).",
          ],
          dontItems: [
            "لا تستخدم فلاتر قوية تغيّر لون المنتج الحقيقي.",
            "لا تضع نصوص/ملصقات/شعارات على الصورة.",
            "لا تقص أجزاء مهمة من المنتج.",
          ],
          coverTip: "معلومة: الصورة الأولى ستكون الصورة الرئيسية في الإعلان.",
        }
      : {
          title: "وێنەکانی بەرهەم",
          quickTipsTitle: "ڕاوێژە خێراکان بۆ وێنەی سەرنجڕاکێش",
          guideCta: "ڕێبەری وێنە",
          guideTitle: "چۆن وێنە بگرێت کە دەفرۆشێت",
          guideSubtitle: "ئەم هەنگاوەکانە بەکاربهێنە بۆ زیادکردنی متمانە و کڕیار.",
          tips: [
            "ڕۆشنایی سروشتی بەکاربهێنە (نزیک پەنجەرە) و فلاشێکی توند مەکە.",
            "وێنەی یەکەم سەرەکییە: ڕوون و پشتەوە پاک بێت (✨ Clean Background تاقی بکەوە).",
            "چەند زاویە و وێنەی نزیک بگرە بۆ وردەکاری (براند/مۆدێل/ژمارەی زنجیرە).",
            "کەم و کورتی پیشان بدە (خش/شکست) بۆ زیادکردنی متمانە.",
            "بۆ بەردەوامبوون لانیکەم ٢ وێنە پێویستە، باشترە ٥–٨ وێنە.",
          ],
          shotListTitle: "لیستی وێنە پێشنیارکراو (بە ڕیز)",
          shotList: [
            "وێنەی سەرەکی: بەرهەم تەنها، ڕوون، پشتەوە بێ فوضا.",
            "زاویەی ٤٥° بۆ پیشاندانی شێوەی گشتی.",
            "پشتەوە/لەناو/لا.",
            "وێنەی نزیک بۆ وردەکاری گرنگ (نیشان، پۆرت، نووسین…).",
            "کەم و کورتی: خش/شکست/ڵەکە (وێنەی نزیک).",
            "هاوپێچ و پێداویستییەکان: قاپ، شارژەر، کاغەزەکان…",
            "قەبارە/پیمانە (ئارەزوومەندانە): لە تەنیشت مەتر/سکە بەبێ داپۆشینی بەرهەم.",
          ],
          doDontTitle: "بکە / مەکە",
          doItems: [
            "لێنز پاک بکە پێش وێنەگرتن.",
            "بەرهەم لە ناوەڕاستی فریم دابنێ و ڕاست بگرە.",
            "پشتەوەی سادە بەکاربهێنە (دیوار سپی/قماش).",
          ],
          dontItems: [
            "فلتەری توند مەکە کە ڕەنگی ڕاستەقینە دەگۆڕێت.",
            "دەق/لوگۆ/سێتی وێنەدا مەنووسە.",
            "بەشە گرنگەکان مەبڕە لە وێنەدا.",
          ],
          coverTip: "تێبینی: وێنەی یەکەم دەبێتە وێنەی سەرەکیی ڕیکلام.",
        };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {copy.title}
          </CardTitle>

          <Sheet open={isGuideOpen} onOpenChange={setIsGuideOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 gap-2"
                data-testid="photo-guide-open"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">{copy.guideCta}</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:w-[420px] p-0 flex flex-col"
              dir="rtl"
            >
              <SheetHeader className="p-4 border-b border-border/60 bg-muted/60">
                <SheetTitle className="flex items-center gap-2 text-xl">
                  <Camera className="h-5 w-5 text-primary" />
                  {copy.guideTitle}
                </SheetTitle>
                <p className="text-sm text-muted-foreground">{copy.guideSubtitle}</p>
              </SheetHeader>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  <div className="rounded-lg border bg-card p-4">
                    <p className="text-sm text-muted-foreground">{copy.coverTip}</p>
                  </div>

                  <section className="space-y-3">
                    <h3 className="font-bold">{copy.shotListTitle}</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      {copy.shotList.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  </section>

                  <section className="space-y-3">
                    <h3 className="font-bold">{copy.doDontTitle}</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                        <p className="font-semibold text-green-800 mb-2">
                          {language === "ar" ? "افعل" : "بکە"}
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-green-900/80">
                          {copy.doItems.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="font-semibold text-red-800 mb-2">
                          {language === "ar" ? "لا تفعل" : "مەکە"}
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-red-900/80">
                          {copy.dontItems.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem
              value="photo-tips"
              className="border-b-0 border border-border/60 rounded-lg px-3 bg-blue-50/40"
            >
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="font-semibold">{copy.quickTipsTitle}</span>
              </AccordionTrigger>
              <AccordionContent className="pt-0">
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {copy.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {language === "ar" ? "الحد الأقصى: 8 صور" : "زۆرترین: ٨ وێنە"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {language === "ar" ? "الحد الأدنى: صورتان" : "کەمترین: ٢ وێنە"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {language === "ar" ? "الصورة الأولى = الرئيسية" : "یەکەم وێنە = سەرەکی"}
                  </Badge>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img, index) => {
            const hasOriginal = originalImages?.[index] && originalImages[index] !== img;
            const displayUrl = hasOriginal && showingOriginal[index] ? originalImages[index]! : img;
            
            return (
            <div key={index} className="space-y-2">
              <div className="relative aspect-square rounded-lg overflow-hidden border bg-gray-100">
                <img src={displayUrl} alt={`صورة ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
                {hasOriginal && (
                  <button
                    type="button"
                    onClick={() => setShowingOriginal(prev => ({ ...prev, [index]: !prev[index] }))}
                    className="absolute top-2 left-2 bg-black/70 text-white rounded-full px-2 py-1 text-xs hover:bg-black/90 flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    {showingOriginal[index] 
                      ? (language === "ar" ? "المحسّنة" : "باشتر") 
                      : (language === "ar" ? "الأصلية" : "ئەسڵی")}
                  </button>
                )}
                {index === 0 && (
                  <Badge className="absolute bottom-2 right-2 bg-primary">
                    {language === "ar" ? "الرئيسية" : "سەرەکی"}
                  </Badge>
                )}
              </div>

              {onCleanBackground && (
                <div className="space-y-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => onCleanBackground(index)}
                    disabled={isUploadingImages || cleaningIndex === index}
                  >
                    {cleaningIndex === index ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        Cleaning…
                      </>
                    ) : (
                      <>✨ Clean Background</>
                    )}
                  </Button>
                  {cleanErrorByIndex?.[index] && (
                    <p className="text-xs text-red-600">{cleanErrorByIndex[index]}</p>
                  )}
                </div>
              )}
            </div>
          );
          })}
          
          {images.length < 8 && (
            <label className={`aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center transition-colors ${isUploadingImages ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:border-primary hover:bg-blue-50'}`}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onImageUpload}
                className="hidden"
                data-testid="input-images"
                disabled={isUploadingImages}
              />
              {isUploadingImages ? (
                <>
                  <Loader2 className="h-8 w-8 text-primary mb-2 animate-spin" />
                  <span className="text-sm text-primary">{language === "ar" ? "جاري الرفع..." : "بارکردن..."}</span>
                </>
              ) : (
                <>
                  <Plus className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">{language === "ar" ? "إضافة صورة" : "وێنە زیاد بکە"}</span>
                </>
              )}
            </label>
          )}
        </div>
        
        {/* Native camera button - only show on mobile apps */}
        {isNative && onCameraClick && images.length < 8 && (
          <div className="mt-4">
            <Button
              type="button"
              onClick={onCameraClick}
              disabled={isUploadingImages}
              className="w-full"
              variant="outline"
            >
              <Camera className="ml-2 h-4 w-4" />
              {language === "ar" ? "التقط صورة بالكاميرا" : "وێنە بگرە بە کامێرا"}
            </Button>
          </div>
        )}

        {/* AI Smart Fill button - show after first image */}
        {images.length > 0 && onAIAnalyze && (
          <div className="mt-4">
            <Button
              type="button"
              onClick={onAIAnalyze}
              disabled={isUploadingImages || isAnalyzingImage}
              className="w-full"
              variant="default"
            >
              {isAnalyzingImage ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  {language === "ar" ? "جاري التحليل..." : "شیکردنەوە..."}
                </>
              ) : (
                <>
                  <ImagePlus className="ml-2 h-4 w-4" />
                  {language === "ar" ? "🤖 ملء تلقائي ذكي" : "🤖 پڕکردنەوەی زیرەکانە"}
                </>
              )}
            </Button>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mt-3">
          {language === "ar" 
            ? "يمكنك إضافة حتى 8 صور. الصورة الأولى ستكون الصورة الرئيسية."
            : "دەتوانیت هەتا ٨ وێنە زیاد بکەیت. وێنەی یەکەم دەبێتە وێنەی سەرەکی."}
        </p>
        {validationErrors.images && (
          <p className="text-xs text-red-500 mt-2">{validationErrors.images}</p>
        )}
      </CardContent>
    </Card>
  );
}
