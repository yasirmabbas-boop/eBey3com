import { useState, useMemo, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Eye, EyeOff, Lock, UserPlus, Phone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";

function PasswordStrengthIndicator({ password, language }: { password: string; language: "ar" | "ku" }) {
  const isValid = password.length >= 6;

  const getStrengthLabel = () => {
    if (!password) return { text: "", color: "bg-gray-200" };
    if (!isValid) return { text: language === "ar" ? "قصيرة جداً" : "زۆر کورتە", color: "bg-red-500" };
    return { text: language === "ar" ? "مقبولة" : "قبوڵە", color: "bg-green-500" };
  };

  const { text, color } = getStrengthLabel();
  const passwordRequirementLabel = language === "ar" ? "٦ أحرف على الأقل" : "لانیکەم ٦ پیت";

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        <div className={`h-1.5 flex-1 rounded-full transition-colors ${isValid ? color : password ? "bg-red-500" : "bg-gray-200"}`} />
      </div>
      {password && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{language === "ar" ? "كلمة المرور:" : "وشەی نهێنی:"}</span>
          <span className={`text-xs font-medium ${isValid ? "text-green-600" : "text-red-600"}`}>{text}</span>
        </div>
      )}
      <div className="space-y-1 mt-2">
        <div className="flex items-center gap-2 text-xs">
          {password.length >= 6 ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <X className="h-3.5 w-3.5 text-gray-400" />
          )}
          <span className={password.length >= 6 ? "text-green-700" : "text-gray-500"}>
            {passwordRequirementLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

const IRAQI_DISTRICTS = [
  "بغداد - الكرخ", "بغداد - الرصافة", "البصرة", "نينوى", "أربيل",
  "النجف", "كربلاء", "الأنبار", "ديالى", "كركوك",
  "صلاح الدين", "السليمانية", "دهوك", "واسط", "ميسان",
  "ذي قار", "المثنى", "القادسية", "بابل",
];

const AGE_BRACKETS_AR = [
  { value: "18-24", label: "18-24 سنة" },
  { value: "25-34", label: "25-34 سنة" },
  { value: "35-44", label: "35-44 سنة" },
  { value: "45-54", label: "45-54 سنة" },
  { value: "55+", label: "55 سنة فأكثر" },
];

const AGE_BRACKETS_KU = [
  { value: "18-24", label: "18-24 ساڵ" },
  { value: "25-34", label: "25-34 ساڵ" },
  { value: "35-44", label: "35-44 ساڵ" },
  { value: "45-54", label: "45-54 ساڵ" },
  { value: "55+", label: "55 ساڵ یان زیاتر" },
];

const INTEREST_OPTIONS_AR = [
  { value: "electronics", label: "إلكترونيات" },
  { value: "phones", label: "هواتف ذكية" },
  { value: "cars", label: "سيارات" },
  { value: "clothing", label: "ملابس" },
  { value: "furniture", label: "أثاث" },
  { value: "antiques", label: "تحف وأنتيكات" },
  { value: "sports", label: "رياضة" },
  { value: "books", label: "كتب" },
  { value: "jewelry", label: "مجوهرات" },
  { value: "home", label: "منزل وحديقة" },
];

const INTEREST_OPTIONS_KU = [
  { value: "electronics", label: "ئەلیکترۆنیات" },
  { value: "phones", label: "مۆبایلی زیرەک" },
  { value: "cars", label: "ئۆتۆمبێلەکان" },
  { value: "clothing", label: "جلوبەرگ" },
  { value: "furniture", label: "کەلوپەل" },
  { value: "antiques", label: "شتە کۆنەکان" },
  { value: "sports", label: "وەرزش" },
  { value: "books", label: "کتێبەکان" },
  { value: "jewelry", label: "خشڵ" },
  { value: "home", label: "ماڵ و باخچە" },
];

export default function Register() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get("redirect");
  
  const [isLoading, setIsLoading] = useState(false);

  const AGE_BRACKETS = language === "ar" ? AGE_BRACKETS_AR : AGE_BRACKETS_KU;
  const INTEREST_OPTIONS = language === "ar" ? INTEREST_OPTIONS_AR : INTEREST_OPTIONS_KU;

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    displayName: "",
    district: "",
    ageBracket: "",
    gender: "",
    interests: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validatePhone = (phone: string) => {
    const iraqPhoneRegex = /^07[3-9]\d{8}$/;
    return iraqPhoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.phone.trim()) {
      newErrors.phone = language === "ar" ? "رقم الهاتف مطلوب" : "ژمارەی مۆبایل پێویستە";
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = language === "ar" ? "رقم هاتف عراقي غير صالح (مثال: 07xxxxxxxxx)" : "ژمارەی مۆبایلی عێراقی دروست نییە (نموونە: 07xxxxxxxxx)";
    }
    
    if (!formData.displayName.trim()) {
      newErrors.displayName = language === "ar" ? "الاسم الكامل مطلوب" : "ناوی تەواو پێویستە";
    }
    
    if (!formData.password) {
      newErrors.password = language === "ar" ? "كلمة المرور مطلوبة" : "وشەی نهێنی پێویستە";
    } else if (formData.password.length < 6) {
      newErrors.password = language === "ar" ? "كلمة المرور لا تستوفي جميع المتطلبات" : "وشەی نهێنی هەموو مەرجەکان پڕناکاتەوە";
    }

    if (!formData.ageBracket) {
      newErrors.ageBracket = language === "ar" ? "الفئة العمرية مطلوبة" : "گروپی تەمەن پێویستە";
    }

    if (!formData.district) {
      newErrors.district = language === "ar" ? "المحافظة مطلوبة" : "پارێزگا پێویستە";
    }
    
    if (!agreeTerms) {
      newErrors.terms = language === "ar" ? "يجب الموافقة على الشروط والأحكام" : "پێویستە ڕازی بیت بە مەرج و ڕێساکان";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: language === "ar" ? "خطأ في البيانات" : "هەڵە لە زانیاریەکان",
        description: language === "ar" ? "يرجى تصحيح الأخطاء المشار إليها" : "تکایە هەڵەکان چارەسەر بکە",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: formData.phone,
          password: formData.password,
          displayName: formData.displayName,
          ageBracket: formData.ageBracket,
          gender: formData.gender,
          interests: formData.interests,
          city: formData.district,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (language === "ar" ? "فشل في إنشاء الحساب" : "دروستکردنی هەژمار سەرکەوتوو نەبوو"));
      }

      toast({
        title: language === "ar" ? "تم إنشاء الحساب بنجاح!" : "هەژمار بە سەرکەوتوویی دروستکرا!",
        description: language === "ar" 
          ? `مرحباً ${data.displayName}، يمكنك الآن استخدام المنصة`
          : `بەخێربێیت ${data.displayName}، ئێستا دەتوانیت پلاتفۆرمەکە بەکاربهێنیت`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      if (redirectUrl) {
        navigate(redirectUrl);
      } else {
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: language === "ar" ? "خطأ في التسجيل" : "هەڵە لە تۆمارکردن",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[60vh]">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-px w-8 bg-border/70" />
              {language === "ar" ? "إنشاء حساب" : "هەژمار دروست بکە"}
              <span className="h-px w-8 bg-border/70" />
            </div>
            <h1 className="mt-2 text-2xl font-bold text-foreground">{t("createAccount")}</h1>
          </div>
          <Card className="soft-border elev-2">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto mb-2 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold text-foreground">{t("createAccount")}</CardTitle>
              <CardDescription>
                {language === "ar" 
                  ? "انضم إلى مجتمع اي بيع للبيع والشراء الآمن"
                  : "بەشداربە لە کۆمەڵگەی ئی بیع بۆ کڕین و فرۆشتنی سەلامەت"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="phone">{t("phone")}</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="07xxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="pr-10"
                    dir="ltr"
                    data-testid="input-phone"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "سيتم استخدام رقم الهاتف لتسجيل الدخول" : "ژمارەی مۆبایل بەکاردەهێنرێت بۆ چوونە ژوورەوە"}
                </p>
                {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">{t("fullName")}</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder={language === "ar" ? "مثال: علي محمد" : "نموونە: هۆشیار عەلی"}
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  data-testid="input-displayName"
                />
                {errors.displayName && <p className="text-red-500 text-xs">{errors.displayName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={language === "ar" ? "أدخل كلمة مرور قوية" : "وشەی نهێنیەکی بەهێز بنووسە"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="pr-10 pl-10"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
                <PasswordStrengthIndicator password={formData.password} language={language} />
              </div>

              <div className="space-y-2">
                <Label>{language === "ar" ? "الفئة العمرية" : "گروپی تەمەن"}</Label>
                <Select
                  value={formData.ageBracket}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, ageBracket: v }))}
                >
                  <SelectTrigger className="soft-border" data-testid="select-age-bracket">
                    <SelectValue placeholder={language === "ar" ? "اختر الفئة العمرية" : "گروپی تەمەن هەڵبژێرە"} />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_BRACKETS.map((bracket) => (
                      <SelectItem key={bracket.value} value={bracket.value}>{bracket.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.ageBracket && <p className="text-red-500 text-xs">{errors.ageBracket}</p>}
              </div>

              <div className="space-y-2">
                <Label>{language === "ar" ? "الجنس" : "ڕەگەز"}</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, gender: v }))}
                >
                  <SelectTrigger className="soft-border" data-testid="select-gender">
                    <SelectValue placeholder={language === "ar" ? "اختر الجنس" : "ڕەگەز هەڵبژێرە"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{language === "ar" ? "ذكر" : "نێر"}</SelectItem>
                    <SelectItem value="female">{language === "ar" ? "أنثى" : "مێ"}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-red-500 text-xs">{errors.gender}</p>}
              </div>

              <div className="space-y-2">
                <Label>{language === "ar" ? "المحافظة" : "پارێزگا"}</Label>
                <Select
                  value={formData.district}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, district: v }))}
                >
                  <SelectTrigger data-testid="select-district">
                    <SelectValue placeholder={language === "ar" ? "اختر المحافظة" : "پارێزگا هەڵبژێرە"} />
                  </SelectTrigger>
                  <SelectContent>
                    {IRAQI_DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.district && <p className="text-red-500 text-xs">{errors.district}</p>}
              </div>

              <div className="space-y-2">
                <Label>{language === "ar" ? "الاهتمامات (اختياري)" : "ئارەزووەکان (ئیختیاری)"}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <div key={interest.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`interest-${interest.value}`}
                        checked={formData.interests.includes(interest.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({ ...prev, interests: [...prev.interests, interest.value] }));
                          } else {
                            setFormData(prev => ({ ...prev, interests: prev.interests.filter(i => i !== interest.value) }));
                          }
                        }}
                        data-testid={`checkbox-interest-${interest.value}`}
                      />
                      <label htmlFor={`interest-${interest.value}`} className="text-sm cursor-pointer">
                        {interest.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="terms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => setAgreeTerms(checked === true)}
                  data-testid="checkbox-terms"
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground">
                  {language === "ar" ? "أوافق على" : "ڕازیم بە"}{" "}
                  <Link href="/terms" className="text-primary hover:underline">
                    {language === "ar" ? "الشروط والأحكام" : "مەرج و ڕێساکان"}
                  </Link>
                  {" "}{language === "ar" ? "و" : "و"}{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
                    {language === "ar" ? "سياسة الخصوصية" : "سیاسەتی تایبەتمەندی"}
                  </Link>
                </label>
              </div>
              {errors.terms && <p className="text-red-500 text-xs">{errors.terms}</p>}

                <Button
                  type="submit"
                  className="w-full elev-1"
                  disabled={isLoading}
                  data-testid="button-register"
                >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    {language === "ar" ? "جاري إنشاء الحساب..." : "دروستکردنی هەژمار..."}
                  </>
                ) : (
                  t("signUp")
                )}
              </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">{t("alreadyHaveAccount")} </span>
                <Link href="/signin" className="text-primary hover:underline font-medium">
                  {t("signIn")}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
