import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, User, Phone, Home, Save, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const IRAQI_PROVINCES = [
  "بغداد", "البصرة", "أربيل", "السليمانية", "دهوك", "الموصل",
  "كركوك", "الأنبار", "بابل", "ديالى", "كربلاء", "النجف",
  "واسط", "ذي قار", "ميسان", "المثنى", "القادسية", "صلاح الدين"
];

interface ProfileData {
  id: string;
  phone: string;
  displayName: string;
  avatar: string | null;
  phoneVerified: boolean;
  city: string | null;
  district: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  locationLat: number | null;
  locationLng: number | null;
  mapUrl: string | null;
  phoneVerified: boolean | null;
}

export default function Settings() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [locationLat, setLocationLat] = useState<string>("");
  const [locationLng, setLocationLng] = useState<string>("");
  const [mapUrl, setMapUrl] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ["/api/account/profile"],
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setPhone(profile.phone || "");
      setCity(profile.city || "");
      setDistrict(profile.district || "");
      setAddressLine1(profile.addressLine1 || "");
      setAddressLine2(profile.addressLine2 || "");
      setLocationLat(profile.locationLat?.toString() || "");
      setLocationLng(profile.locationLng?.toString() || "");
      setMapUrl(profile.mapUrl || "");
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileData>) => {
      const response = await apiRequest("PUT", "/api/account/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "تم الحفظ",
        description: "تم حفظ بياناتك بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حفظ البيانات",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const updates: Record<string, any> = {
      displayName,
      city,
      district,
      addressLine1,
      addressLine2,
      mapUrl,
    };

    if (locationLat) {
      updates.locationLat = parseFloat(locationLat);
    }
    if (locationLng) {
      updates.locationLng = parseFloat(locationLng);
    }

    updateProfileMutation.mutate(updates);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "غير مدعوم",
        description: "المتصفح لا يدعم تحديد الموقع",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationLat(position.coords.latitude.toFixed(6));
        setLocationLng(position.coords.longitude.toFixed(6));
        toast({
          title: "تم تحديد الموقع",
          description: "تم الحصول على إحداثيات موقعك الحالي",
        });
      },
      (error) => {
        toast({
          title: "خطأ",
          description: "فشل في الحصول على الموقع. يرجى التحقق من صلاحيات الموقع.",
          variant: "destructive",
        });
      }
    );
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">يجب تسجيل الدخول للوصول إلى الإعدادات</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 max-w-2xl" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">الإعدادات</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              المعلومات الشخصية
            </CardTitle>
            <CardDescription>اسمك ورقم هاتفك</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="displayName">الاسم</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="أدخل اسمك"
                data-testid="input-display-name"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label htmlFor="phone">رقم الهاتف</Label>
                {profile?.phoneVerified && (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle className="h-3 w-3" />
                    موثق
                  </span>
                )}
              </div>
              <Input
                id="phone"
                value={phone}
                disabled
                className="bg-muted"
                data-testid="input-phone"
              />
              {profile?.phoneVerified ? (
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  تم التحقق من رقم هاتفك - يمكنك البيع على المنصة
                </p>
              ) : (
                <p className="text-sm text-amber-600 mt-1">
                  لم يتم التحقق من رقم هاتفك بعد. توجه لصفحة البيع للتحقق.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              عنوان التوصيل
            </CardTitle>
            <CardDescription>عنوانك الكامل للتوصيل</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="city">المحافظة</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger id="city" data-testid="select-city">
                  <SelectValue placeholder="اختر المحافظة" />
                </SelectTrigger>
                <SelectContent>
                  {IRAQI_PROVINCES.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="district">المنطقة / الحي</Label>
              <Input
                id="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="مثال: الكرادة، المنصور، الزبير"
                data-testid="input-district"
              />
            </div>

            <div>
              <Label htmlFor="addressLine1">العنوان التفصيلي</Label>
              <Input
                id="addressLine1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="اسم الشارع، رقم المبنى أو المنزل"
                data-testid="input-address-line1"
              />
            </div>

            <div>
              <Label htmlFor="addressLine2">تفاصيل إضافية (اختياري)</Label>
              <Input
                id="addressLine2"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="رقم الشقة، معلم قريب، توجيهات للسائق"
                data-testid="input-address-line2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              الموقع الجغرافي (GPS)
            </CardTitle>
            <CardDescription>إحداثيات موقعك لتسهيل التوصيل</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleGetCurrentLocation}
              className="w-full"
              data-testid="button-get-location"
            >
              <MapPin className="h-4 w-4 ml-2" />
              تحديد موقعي الحالي
            </Button>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="locationLat">خط العرض (Latitude)</Label>
                <Input
                  id="locationLat"
                  value={locationLat}
                  onChange={(e) => setLocationLat(e.target.value)}
                  placeholder="33.3152"
                  type="text"
                  data-testid="input-latitude"
                />
              </div>
              <div>
                <Label htmlFor="locationLng">خط الطول (Longitude)</Label>
                <Input
                  id="locationLng"
                  value={locationLng}
                  onChange={(e) => setLocationLng(e.target.value)}
                  placeholder="44.3661"
                  type="text"
                  data-testid="input-longitude"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="mapUrl">رابط خرائط Google (اختياري)</Label>
              <Input
                id="mapUrl"
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                data-testid="input-map-url"
              />
              <p className="text-sm text-muted-foreground mt-1">
                يمكنك نسخ رابط موقعك من تطبيق خرائط Google
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          className="w-full"
          disabled={updateProfileMutation.isPending}
          data-testid="button-save-settings"
        >
          {updateProfileMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin ml-2" />
          ) : (
            <Save className="h-4 w-4 ml-2" />
          )}
          حفظ التغييرات
        </Button>

        {updateProfileMutation.isSuccess && (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>تم حفظ البيانات بنجاح</span>
          </div>
        )}

      </div>
    </div>
  );
}
