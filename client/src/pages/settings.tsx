import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LocationPicker } from "@/components/location-picker";
import { authFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Loader2, MapPin, Shield, User, ChevronLeft } from "lucide-react";

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

  const saveLocation = async () => {
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
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save location");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });

      toast({
        title: tr("تم الحفظ", "پاشەکەوتکرا", "Saved"),
        description: tr(
          "تم حفظ موقعك بنجاح",
          "شوێنەکەت بە سەرکەوتوویی پاشەکەوتکرا",
          "Your location has been saved successfully"
        ),
      });
    } catch (error) {
      toast({
        title: tr("خطأ", "هەڵە", "Error"),
        description: tr(
          "فشل في حفظ الموقع",
          "پاشەکەوتکردنی شوێن سەرکەوتوو نەبوو",
          "Failed to save location"
        ),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasLocationChanged = () => {
    const userLat = user?.locationLat ?? null;
    const userLng = user?.locationLng ?? null;
    return locationLat !== userLat || locationLng !== userLng;
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
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">
                  {tr("موقع التسليم/الاستلام", "شوێنی گەیاندن/وەرگرتن", "Delivery/Pickup Location")}
                </CardTitle>
              </div>
              <CardDescription>
                {user?.sellerApproved 
                  ? tr(
                      "موقع استلام الطلبات للمشترين وموقع التوصيل للطلبات",
                      "شوێنی وەرگرتنی داواکاری بۆ کڕیاران و شوێنی گەیاندن بۆ داواکارییەکان",
                      "Pickup location for buyers and delivery location for orders"
                    )
                  : tr(
                      "موقعك الافتراضي لتوصيل الطلبات",
                      "شوێنی بنەڕەتیت بۆ گەیاندنی داواکارییەکان",
                      "Your default location for order deliveries"
                    )
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LocationPicker
                latitude={locationLat}
                longitude={locationLng}
                onLocationChange={handleLocationChange}
                description={tr(
                  "سيستخدم هذا الموقع تلقائياً لجميع معاملاتك",
                  "ئەم شوێنە بە ئۆتۆماتیکی بەکاردێت بۆ هەموو مامەڵەکانت",
                  "This location will be used automatically for all your transactions"
                )}
              />

              {hasLocationChanged() && (
                <Button 
                  onClick={saveLocation} 
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      {tr("جاري الحفظ...", "پاشەکەوتکردن...", "Saving...")}
                    </>
                  ) : (
                    tr("حفظ الموقع", "پاشەکەوتکردنی شوێن", "Save Location")
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
