import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, MapPin, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { FormError } from "@/components/form-error";
import { validatePhone } from "@/lib/form-validation";

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const tr = (ar: string, ku: string, en: string) => (language === "ar" ? ar : language === "ku" ? ku : en);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [formData, setFormData] = useState({
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "",
  });

  const [touched, setTouched] = useState({
    phone: false,
    addressLine1: false,
  });

  const phoneValidation = touched.phone ? validatePhone(formData.phone, language) : { valid: true };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/signin");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Fetch existing user data
    const fetchUserData = async () => {
      try {
        const authToken = localStorage.getItem("authToken");
        const headers: HeadersInit = {};
        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`;
        }
        
        const response = await fetch("/api/onboarding", {
          credentials: "include",
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          setFormData({
            phone: data.phone || "",
            addressLine1: data.addressLine1 || "",
            addressLine2: data.addressLine2 || "",
            city: data.city || "",
            district: data.district || "",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsFetching(false);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phone || !formData.addressLine1) {
      toast({
        title: t("error"),
        description: tr(
          "يرجى إدخال رقم الهاتف والعنوان",
          "تکایە ژمارەی مۆبایل و ناونیشان بنووسە",
          "Please enter your phone number and address"
        ),
        variant: "destructive",
      });
      return;
    }

    if (!phoneValidation.valid) {
      toast({
        title: t("error"),
        description: phoneValidation.message || tr(
          "رقم الهاتف غير صحيح",
          "ژمارەی مۆبایل هەڵەیە",
          "Invalid phone number"
        ),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const authToken = localStorage.getItem("authToken");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || tr("فشل حفظ البيانات", "هەڵە لە پاشەکەوتکردنی داتا", "Failed to save data"));
      }

      toast({
        title: tr("تم الحفظ بنجاح", "بە سەرکەوتوویی پاشەکەوت کرا", "Saved successfully"),
        description: tr(
          "تم حفظ معلوماتك بنجاح",
          "زانیارییەکانت بە سەرکەوتوویی پاشەکەوت کرا",
          "Your information has been saved successfully"
        ),
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: tr("خطأ", "هەڵە", "Error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isFetching) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-md">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-px w-8 bg-border/70" />
            {tr("إكمال الملف الشخصي", "تەواوکردنی پرۆفایل", "Complete Profile")}
            <span className="h-px w-8 bg-border/70" />
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {tr("مرحباً بك", "بەخێربێیت", "Welcome")}
          </h1>
        </div>
        <Card className="soft-border elev-2">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">
              {tr("أكمل ملفك الشخصي", "پرۆفایلت تەواو بکە", "Complete Your Profile")}
            </CardTitle>
            <CardDescription>
              {tr(
                "يرجى إدخال رقم هاتفك وعنوانك للمتابعة",
                "تکایە ژمارەی مۆبایل و ناونیشانت بنووسە بۆ بەردەوامبوون",
                "Please enter your phone number and address to continue"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t("phone")} *</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="07xxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                    className={`pr-10 ${!phoneValidation.valid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    dir="ltr"
                    required
                  />
                </div>
                <FormError message={phoneValidation.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine1">{tr("العنوان", "ناونیشان", "Address")} *</Label>
                <div className="relative">
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="addressLine1"
                    type="text"
                    placeholder={tr("أدخل عنوانك الكامل", "ناونیشانی تەواوت بنووسە", "Enter your full address")}
                    value={formData.addressLine1}
                    onChange={(e) => setFormData(prev => ({ ...prev, addressLine1: e.target.value }))}
                    onBlur={() => setTouched(prev => ({ ...prev, addressLine1: true }))}
                    className="pr-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">{tr("عنوان إضافي (اختياري)", "ناونیشانی زیادە (دڵخواز)", "Additional Address (Optional)")}</Label>
                <Input
                  id="addressLine2"
                  type="text"
                  placeholder={tr("مبنى، شقة، إلخ", "بینا، ژوور، هتد", "Building, Apartment, etc.")}
                  value={formData.addressLine2}
                  onChange={(e) => setFormData(prev => ({ ...prev, addressLine2: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">{tr("المدينة (اختياري)", "شار (دڵخواز)", "City (Optional)")}</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder={tr("المدينة", "شار", "City")}
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">{tr("المنطقة (اختياري)", "ناوچە (دڵخواز)", "District (Optional)")}</Label>
                <Input
                  id="district"
                  type="text"
                  placeholder={tr("المنطقة", "ناوچە", "District")}
                  value={formData.district}
                  onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full elev-1" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    {tr("جاري الحفظ...", "پاشەکەوتکردن...", "Saving...")}
                  </>
                ) : (
                  tr("حفظ والمتابعة", "پاشەکەوت و بەردەوامبوون", "Save & Continue")
                )}
              </Button>

              <Link href="/">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full"
                >
                  {tr("تخطي الآن", "ئێستا تێپەڕ", "Skip for Now")}
                </Button>
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
