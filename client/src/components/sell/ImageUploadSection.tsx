import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, Plus, X, Loader2, ImagePlus, Eye } from "lucide-react";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          {language === "ar" ? "صور المنتج" : "وێنەکانی بەرهەم"}
        </CardTitle>
      </CardHeader>
      <CardContent>
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

              {onCleanBackground && index === 0 && (
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
