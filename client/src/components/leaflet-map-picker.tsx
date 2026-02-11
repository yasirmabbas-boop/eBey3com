import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { LatLng, Icon } from "leaflet";
import { Button } from "@/components/ui/button";
import { MapPin, Crosshair, Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in react-leaflet
const customIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface ReverseGeocodeResult {
  displayName?: string;
  city?: string;      // Iraqi governorate (from Nominatim state/city/province)
  district?: string;  // Suburb or neighbourhood
  street?: string;    // Road name
}

interface LeafletMapPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number, addressInfo?: ReverseGeocodeResult) => void;
  language?: string;
}

// Component to handle map click events
function MapClickHandler({ onMapClick }: { onMapClick: (latlng: LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Component to center map on location
function MapCenterUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  
  return null;
}

export function LeafletMapPicker({
  latitude,
  longitude,
  onLocationSelect,
  language = "ar",
}: LeafletMapPickerProps) {
  // Default center: Iraq (Baghdad)
  const defaultCenter: [number, number] = [33.3152, 44.3661];
  
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  // Update marker position if props change
  useEffect(() => {
    if (latitude && longitude) {
      setMarkerPosition([latitude, longitude]);
      setMapCenter([latitude, longitude]);
    }
  }, [latitude, longitude]);

  const handleMapClick = (latlng: LatLng) => {
    const newPosition: [number, number] = [latlng.lat, latlng.lng];
    setMarkerPosition(newPosition);
    
    // Reverse geocode to get address (optional)
    reverseGeocode(latlng.lat, latlng.lng);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${language === "ar" ? "ar" : "en"}&addressdetails=1`
      );
      const data = await response.json();

      const addr = data.address || {};
      const addressInfo: ReverseGeocodeResult = {
        displayName: data.display_name || undefined,
        city: addr.state || addr.city || addr.province || addr.governorate || undefined,
        district: addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || undefined,
        street: addr.road || addr.pedestrian || undefined,
      };
      onLocationSelect(lat, lng, addressInfo);
    } catch (error) {
      // If reverse geocoding fails, just use coordinates
      onLocationSelect(lat, lng);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        language === "ar" 
          ? "الموقع الجغرافي غير مدعوم في هذا المتصفح" 
          : "ئەم وێبگەڕە پشتگیری شوێن ناکات"
      );
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const newPosition: [number, number] = [lat, lng];
        setMarkerPosition(newPosition);
        setMapCenter(newPosition);
        reverseGeocode(lat, lng);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError(
              language === "ar"
                ? "تم رفض إذن الموقع"
                : "مۆڵەتی شوێن ڕەتکرایەوە"
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError(
              language === "ar"
                ? "معلومات الموقع غير متوفرة"
                : "زانیاری شوێن بەردەست نییە"
            );
            break;
          case error.TIMEOUT:
            setLocationError(
              language === "ar"
                ? "انتهت مهلة طلب الموقع"
                : "کاتی داواکردنی شوێن تەواو بوو"
            );
            break;
          default:
            setLocationError(
              language === "ar"
                ? "حدث خطأ غير معروف"
                : "هەڵەیەکی نەزانراو ڕوویدا"
            );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {language === "ar" ? "حدد الموقع على الخريطة" : "شوێنەکە لەسەر نەخشە دیاری بکە"}
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseMyLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Crosshair className="h-4 w-4 mr-2" />
          )}
          {language === "ar" ? "موقعي الحالي" : "شوێنی ئێستام"}
        </Button>
      </div>

      {locationError && (
        <p className="text-sm text-red-500">{locationError}</p>
      )}

      <div className="rounded-lg overflow-hidden border" style={{ height: "300px" }}>
        <MapContainer
          center={markerPosition || defaultCenter}
          zoom={markerPosition ? 15 : 6}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onMapClick={handleMapClick} />
          {mapCenter && <MapCenterUpdater center={mapCenter} />}
          {markerPosition && (
            <Marker
              position={markerPosition}
              icon={customIcon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const position = marker.getLatLng();
                  setMarkerPosition([position.lat, position.lng]);
                  reverseGeocode(position.lat, position.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {markerPosition && (
        <p className="text-xs text-muted-foreground">
          {language === "ar" ? "الإحداثيات:" : "کۆئۆردینات:"}{" "}
          {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {language === "ar"
          ? "انقر على الخريطة أو اسحب العلامة لتحديد الموقع"
          : "کلیک لەسەر نەخشە بکە یان نیشانەکە بکێشە بۆ دیاریکردنی شوێن"}
      </p>
    </div>
  );
}
