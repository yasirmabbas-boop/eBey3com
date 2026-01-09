import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Plus, X, Loader2 } from "lucide-react";

interface ImageUploadSectionProps {
  images: string[];
  isUploadingImages: boolean;
  validationErrors: Record<string, string>;
  language: string;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
}

export function ImageUploadSection({
  images,
  isUploadingImages,
  validationErrors,
  language,
  onImageUpload,
  onRemoveImage,
}: ImageUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          {images.map((img, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-gray-100">
              <img src={img} alt={`صورة ${index + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemoveImage(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
              {index === 0 && (
                <Badge className="absolute bottom-2 right-2 bg-primary">
                  {language === "ar" ? "الرئيسية" : "سەرەکی"}
                </Badge>
              )}
            </div>
          ))}
          
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
