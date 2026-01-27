import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { LocationPicker } from "@/components/location-picker";
import { authFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Loader2, MapPin, Shield, User, ChevronLeft, Phone, Home } from "lucide-react";

const IRAQI_CITIES = [
  "بغداد", "البصرة", "أربيل", "السليمانية", "دهوك", "الموصل",
  "كركوك", "الأنبار", "بابل", "ديالى", "كربلاء", "النجف",
  "واسط", "ذي قار", "ميسان", "المثنى", "القادسية", "صلاح الدين"
];

export default function Settings() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language, t } = useLanguage();
  const tr = (ar: string, ku: string, en: string) => 
    language === "ar" ? ar : language === "ku" ? ku : en;

  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [city, setCity] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [addressLine1, setAddressLine1] = useState<string>("");
  const [addressLine2, setAddressLine2] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/signin");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (user) {
      setLocationLat(user.locationLat ?? null);
      setLocationLng(user.locationLng ?? null);
      setCity(user.city ?? "");
      setDistrict(user.district ?? "");
      setAddressLine1(user.addressLine1 ?? "");
      setAddressLine2(user.addressLine2 ?? "");
      setContactPhone(user.phone ?? "");
    }
  }, [user]);

  const handleLocationChange = (lat: number, lng: number) => {
    if (lat === 0 && lng === 0) {
      setLocationLat(null);
      setLocationLng(null);
    } else {
      setLocationLat(lat);
      setLocationLng(lng);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const mapUrl = locationLat && locationLng 
        ? `https://www.google.com/maps?q=${locationLat},${locationLng}`
        : null;

      const response = await authFetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationLat,
          locationLng,
          mapUrl,
          city,
          district,
          addressLine1,
          addressLine2,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });

      toast({
        title: tr("تم الحفظ", "پاشەکەوتکرا", "Saved"),
        description: tr(
          "تم حفظ إعداداتك بنجاح",
          "ڕێکخستنەکانت بە سەرکەوتوویی پاشەکەوتکران",
          "Your settings have been saved successfully"
        ),
      });
    } catch (error) {
      toast({
        title: tr("خطأ", "هەڵە", "Error"),
        description: tr(
          "فشل في حفظ الإعدادات",
          "پاشەکەوتکردنی ڕێکخستنەکان سەرکەوتوو نەبوو",
          "Failed to save settings"
        ),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = () => {
    const userLat = user?.locationLat ?? null;
    const userLng = user?.locationLng ?? null;
    const userCity = user?.city ?? "";
    const userDistrict = user?.district ?? "";
    const userAddress1 = user?.addressLine1 ?? "";
    const userAddress2 = user?.addressLine2 ?? "";
    
    return locationLat !== userLat || 
           locationLng !== userLng ||
           city !== userCity ||
           district !== userDistrict ||
           addressLine1 !== userAddress1 ||
           addressLine2 !== userAddress2;
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/my-account")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {tr("الإعدادات", "ڕێکخستنەکان", "Settings")}
          </h1>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">
                  {tr("عنوان التسليم/الاستلام", "ناونیشانی گەیاندن/وەرگرتن", "Delivery/Pickup Address")}
                </CardTitle>
              </div>
              <CardDescription>
                {user?.isVerified 
                  ? tr(
                      "عنوان استلام الطلبات للمشترين وعنوان التوصيل لمشترياتك",
                      "ناونیشانی وەرگرتنی داواکاری بۆ کڕیاران و ناونیشانی گەیاندن بۆ کڕینەکانت",
                      "Pickup address for buyers and delivery address for your purchases"
                    )
                  : tr(
                      "عنوانك الافتراضي لتوصيل الطلبات",
                      "ناونیشانی بنەڕەتیت بۆ گەیاندنی داواکارییەکان",
                      "Your default address for order deliveries"
                    )
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    {tr("المحافظة", "پارێزگا", "Province")} <span className="text-red-500">*</span>
                  </Label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger id="city" data-testid="select-city">
                      <SelectValue placeholder={tr("اختر المحافظة", "پارێزگا هەڵبژێرە", "Select province")} />
                    </SelectTrigger>
                    <SelectContent>
                      {IRAQI_CITIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="district">
                    {tr("المنطقة / الحي", "ناوچە / گەڕەک", "District / Area")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder={tr("مثال: الكرادة، المنصور", "نموونە: کەڕادە، مەنسوور", "e.g., Karrada, Mansour")}
                    data-testid="input-district"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine1">
                    {tr("العنوان التفصيلي", "ناونیشانی ورد", "Detailed Address")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="addressLine1"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder={tr("الشارع، رقم البناية، الطابق", "شەقام، ژمارەی بینا، نهۆم", "Street, building number, floor")}
                    data-testid="input-address1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine2">
                    {tr("تفاصيل إضافية (اختياري)", "زانیاری زیادە (ئارەزوومەندانە)", "Additional details (optional)")}
                  </Label>
                  <Input
                    id="addressLine2"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder={tr("قرب مسجد، مقابل مدرسة...", "نزیک مزگەوت، بەرامبەر قوتابخانە...", "Near mosque, opposite school...")}
                    data-testid="input-address2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {tr("رقم هاتف التواصل", "ژمارەی تەلەفۆنی پەیوەندی", "Contact Phone")}
                    </div>
                  </Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    disabled
                    dir="ltr"
                    className="text-left bg-muted"
                    data-testid="input-contact-phone"
                  />
                  <p className="text-xs text-muted-foreground">
                    {tr("رقم الهاتف المسجل في حسابك", "ژمارەی تەلەفۆنی تۆمارکراو لە هەژمارەکەت", "Phone number registered in your account")}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <Label>{tr("حدد الموقع على الخريطة", "شوێن لەسەر نەخشە دیاری بکە", "Mark location on map")}</Label>
                </div>
                <LocationPicker
                  latitude={locationLat}
                  longitude={locationLng}
                  onLocationChange={handleLocationChange}
                  description={tr(
                    "سيستخدم هذا الموقع لتحديد نقطة التوصيل بدقة",
                    "ئەم شوێنە بەکاردێت بۆ دیاریکردنی خاڵی گەیاندن بە وردی",
                    "This location will be used to pinpoint the exact delivery spot"
                  )}
                />
              </div>

              {hasChanges() && (
                <Button 
                  onClick={saveSettings} 
                  disabled={isSaving}
                  className="w-full"
                  data-testid="button-save-settings"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      {tr("جاري الحفظ...", "پاشەکەوتکردن...", "Saving...")}
                    </>
                  ) : (
                    tr("حفظ الإعدادات", "پاشەکەوتکردنی ڕێکخستنەکان", "Save Settings")
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          <Link href="/security-settings">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold">
                      {tr("إعدادات الأمان", "ڕێکخستنەکانی ئاسایش", "Security Settings")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {tr(
                        "إدارة كلمة المرور والتحقق بخطوتين",
                        "بەڕێوەبردنی وشەی نهێنی و پشتڕاستکردنەوەی دوو هەنگاو",
                        "Manage password and two-factor authentication"
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/my-account">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold">
                      {tr("حسابي", "هەژمارەکەم", "My Account")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {tr(
                        "إدارة معلومات الحساب",
                        "بەڕێوەبردنی زانیارییەکانی هەژمار",
                        "Manage account information"
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
