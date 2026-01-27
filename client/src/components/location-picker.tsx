import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Navigation, ExternalLink } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  label?: string;
  description?: string;
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  label,
  description,
}: LocationPickerProps) {
  const { language } = useLanguage();
  const tr = (ar: string, ku: string, en: string) => 
    language === "ar" ? ar : language === "ku" ? ku : en;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLocation = latitude && longitude;

  const generateMapsUrl = (lat: number, lng: number) => 
    `https://www.google.com/maps?q=${lat},${lng}`;

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError(tr(
        "المتصفح لا يدعم تحديد الموقع",
        "وێبگەڕەکە پشتگیری شوێن ناکات",
        "Browser doesn't support geolocation"
      ));
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onLocationChange(lat, lng);
        setIsLoading(false);
      },
      (err) => {
        setIsLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError(tr(
              "تم رفض إذن الموقع. يرجى السماح بالوصول للموقع من إعدادات المتصفح",
              "ڕێگەپێدان بۆ شوێن ڕەتکرایەوە. تکایە لە ڕێکخستنەکانی وێبگەڕ ڕێگە بدە",
              "Location permission denied. Please allow location access in browser settings"
            ));
            break;
          case err.POSITION_UNAVAILABLE:
            setError(tr(
              "غير قادر على تحديد موقعك",
              "نەتوانرا شوێنەکەت دیاری بکرێت",
              "Unable to determine your location"
            ));
            break;
          case err.TIMEOUT:
            setError(tr(
              "انتهت مهلة طلب الموقع",
              "کاتی داواکاری شوێن تەواو بوو",
              "Location request timed out"
            ));
            break;
          default:
            setError(tr(
              "حدث خطأ في تحديد الموقع",
              "هەڵە ڕوویدا لە دیاریکردنی شوێن",
              "Error getting location"
            ));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const clearLocation = () => {
    onLocationChange(0, 0);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base font-medium">
          {label || tr("الموقع", "شوێن", "Location")}
        </Label>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {hasLocation ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg">
            <MapPin className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-400">
              {tr("تم تحديد الموقع", "شوێن دیاریکرا", "Location set")}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(generateMapsUrl(latitude!, longitude!), "_blank")}
            >
              <ExternalLink className="h-4 w-4 ml-2" />
              {tr("عرض على الخريطة", "پیشاندان لە نەخشە", "View on Map")}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={requestLocation}
              disabled={isLoading}
            >
              <Navigation className="h-4 w-4 ml-2" />
              {tr("تحديث الموقع", "نوێکردنەوەی شوێن", "Update Location")}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearLocation}
              className="text-destructive hover:text-destructive"
            >
              {tr("إزالة", "سڕینەوە", "Remove")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            onClick={requestLocation}
            disabled={isLoading}
            className="w-full justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                {tr("جاري تحديد الموقع...", "دیاریکردنی شوێن...", "Getting location...")}
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4 ml-2" />
                {tr("تحديد موقعي الحالي", "دیاریکردنی شوێنی ئێستام", "Use my current location")}
              </>
            )}
          </Button>
          
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
