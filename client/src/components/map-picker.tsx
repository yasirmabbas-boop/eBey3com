import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Loader2, AlertCircle } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  className?: string;
}

function LocationMarker({ position, setPosition }: { position: { lat: number; lng: number } | null; setPosition: (p: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return position ? <Marker position={[position.lat, position.lng]} /> : null;
}

function MapController({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  
  useEffect(() => {
    map.flyTo([center.lat, center.lng], 15, { duration: 1 });
  }, [center, map]);
  
  return null;
}

export function MapPicker({ value, onChange, className }: MapPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 33.3152, lng: 44.3661 });
  const mapRef = useRef<L.Map | null>(null);

  const handleGetLocation = () => {
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError("المتصفح لا يدعم خدمة الموقع");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        onChange(coords);
        setMapCenter(coords);
        setIsLocating(false);
        setLocationError(null);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("تم رفض صلاحية الوصول للموقع. يرجى السماح بالوصول من إعدادات الجهاز.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError("موقعك غير متاح حالياً. يرجى اختيار الموقع يدوياً على الخريطة.");
        } else if (error.code === error.TIMEOUT) {
          setLocationError("انتهت مهلة تحديد الموقع. يرجى المحاولة مرة أخرى.");
        } else {
          setLocationError("تعذر تحديد الموقع. يرجى اختيار الموقع يدوياً على الخريطة.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>اضغط على الخريطة لتحديد موقعك</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetLocation}
          disabled={isLocating}
          className="gap-2"
          data-testid="button-get-location"
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          استخدم موقعي
        </Button>
      </div>
      
      <div className="rounded-lg overflow-hidden border border-gray-200 h-[250px]">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={12}
          style={{ height: "100%", width: "100%", touchAction: 'manipulation' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={value} setPosition={onChange} />
          {value && <MapController center={value} />}
        </MapContainer>
      </div>
      
      {locationError && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{locationError}</span>
        </div>
      )}
      
      {value && !locationError && (
        <p className="text-xs text-muted-foreground mt-2 text-center" data-testid="text-coordinates">
          الإحداثيات: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}
