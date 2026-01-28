import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, X } from "lucide-react";

interface MapLocation {
  lat: number;
  lng: number;
}

interface MapPickerProps {
  value: MapLocation | null;
  onChange: (location: MapLocation | null) => void;
}

export function MapPicker({ value, onChange }: MapPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lat, setLat] = useState(value?.lat?.toString() || "");
  const [lng, setLng] = useState(value?.lng?.toString() || "");

  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLat(newLocation.lat.toString());
          setLng(newLocation.lng.toString());
          onChange(newLocation);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  const handleClear = () => {
    setLat("");
    setLng("");
    onChange(null);
    setIsExpanded(false);
  };

  const handleConfirm = () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      onChange({ lat: latNum, lng: lngNum });
    }
    setIsExpanded(false);
  };

  if (value && !isExpanded) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <MapPin className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-700 flex-1">
          الموقع محدد: {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(true)}>
          تعديل
        </Button>
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={() => setIsExpanded(true)}
      >
        <MapPin className="h-4 w-4" />
        إضافة موقع على الخريطة
      </Button>
    );
  }

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleGetCurrentLocation}
          className="flex-1"
        >
          <MapPin className="h-4 w-4 ml-1" />
          استخدم موقعي الحالي
        </Button>
      </div>
      
      <div className="text-xs text-muted-foreground text-center">أو أدخل الإحداثيات يدوياً</div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">خط العرض (Lat)</label>
          <Input
            type="number"
            step="any"
            placeholder="33.3152"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="text-left"
            dir="ltr"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">خط الطول (Lng)</label>
          <Input
            type="number"
            step="any"
            placeholder="44.3661"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="text-left"
            dir="ltr"
          />
        </div>
      </div>
      
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          size="sm"
          onClick={handleConfirm}
          disabled={!lat || !lng}
          className="flex-1"
        >
          تأكيد الموقع
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
        >
          إلغاء
        </Button>
      </div>
    </div>
  );
}
