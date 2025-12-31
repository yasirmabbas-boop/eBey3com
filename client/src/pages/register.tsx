import { useState, useMemo } from "react";
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

const passwordRequirements = [
  { id: "length", label: "٨ أحرف على الأقل", test: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "حرف كبير واحد على الأقل (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "حرف صغير واحد على الأقل (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "رقم واحد على الأقل (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "رمز خاص واحد على الأقل (!@#$%^&*)", test: (p: string) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(p) },
];

function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = useMemo(() => {
    return passwordRequirements.filter(r => r.test(password)).length;
  }, [password]);

  const getStrengthLabel = () => {
    if (strength === 0) return { text: "", color: "bg-gray-200" };
    if (strength <= 2) return { text: "ضعيفة", color: "bg-red-500" };
    if (strength <= 3) return { text: "متوسطة", color: "bg-yellow-500" };
    if (strength <= 4) return { text: "جيدة", color: "bg-blue-500" };
    return { text: "قوية", color: "bg-green-500" };
  };

  const { text, color } = getStrengthLabel();

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength ? color : "bg-gray-200"}`}
          />
        ))}
      </div>
      {password && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">قوة كلمة المرور:</span>
          <span className={`text-xs font-medium ${
            strength <= 2 ? "text-red-600" : strength <= 3 ? "text-yellow-600" : strength <= 4 ? "text-blue-600" : "text-green-600"
          }`}>{text}</span>
        </div>
      )}
      <div className="space-y-1 mt-2">
        {passwordRequirements.map((req) => (
          <div key={req.id} className="flex items-center gap-2 text-xs">
            {req.test(password) ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <X className="h-3.5 w-3.5 text-gray-400" />
            )}
            <span className={req.test(password) ? "text-green-700" : "text-gray-500"}>
              {req.label}
            </span>
          </div>
        ))}
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

const AGE_BRACKETS = [
  { value: "18-24", label: "18-24 سنة" },
  { value: "25-34", label: "25-34 سنة" },
  { value: "35-44", label: "35-44 سنة" },
  { value: "45-54", label: "45-54 سنة" },
  { value: "55+", label: "55 سنة فأكثر" },
];

const INTEREST_OPTIONS = [
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

export default function Register() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get("redirect");
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    displayName: "",
    district: "",
    ageBracket: "",
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
      newErrors.phone = "رقم الهاتف مطلوب";
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = "رقم هاتف عراقي غير صالح (مثال: 07xxxxxxxxx)";
    }
    
    if (!formData.displayName.trim()) {
      newErrors.displayName = "الاسم الكامل مطلوب";
    }
    
    if (!formData.password) {
      newErrors.password = "كلمة المرور مطلوبة";
    } else {
      const passedReqs = passwordRequirements.filter(r => r.test(formData.password)).length;
      if (passedReqs < 5) {
        newErrors.password = "كلمة المرور لا تستوفي جميع المتطلبات";
      }
    }

    if (!formData.ageBracket) {
      newErrors.ageBracket = "الفئة العمرية مطلوبة";
    }

    if (!formData.district) {
      newErrors.district = "المحافظة مطلوبة";
    }
    
    if (!agreeTerms) {
      newErrors.terms = "يجب الموافقة على الشروط والأحكام";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى تصحيح الأخطاء المشار إليها",
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
          interests: formData.interests,
          city: formData.district,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل في إنشاء الحساب");
      }

      toast({
        title: "تم إنشاء الحساب بنجاح!",
        description: `مرحباً ${data.displayName}، يمكنك الآن استخدام المنصة`,
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
        title: "خطأ في التسجيل",
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
        <Card className="w-full max-w-md shadow-lg border-muted">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto mb-2 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">إنشاء حساب جديد</CardTitle>
            <CardDescription>
              انضم إلى مجتمع اي بيع للبيع والشراء الآمن
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
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
                <p className="text-xs text-muted-foreground">سيتم استخدام رقم الهاتف لتسجيل الدخول</p>
                {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">الاسم الكامل</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="مثال: علي محمد"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  data-testid="input-displayName"
                />
                {errors.displayName && <p className="text-red-500 text-xs">{errors.displayName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="أدخل كلمة مرور قوية"
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
                <PasswordStrengthIndicator password={formData.password} />
              </div>

              <div className="space-y-2">
                <Label>الفئة العمرية</Label>
                <Select
                  value={formData.ageBracket}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, ageBracket: v }))}
                >
                  <SelectTrigger data-testid="select-age-bracket">
                    <SelectValue placeholder="اختر الفئة العمرية" />
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
                <Label>المحافظة</Label>
                <Select
                  value={formData.district}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, district: v }))}
                >
                  <SelectTrigger data-testid="select-district">
                    <SelectValue placeholder="اختر المحافظة" />
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
                <Label>الاهتمامات (اختياري)</Label>
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
                  أوافق على{" "}
                  <Link href="/terms" className="text-primary hover:underline">الشروط والأحكام</Link>
                  {" "}و{" "}
                  <Link href="/privacy" className="text-primary hover:underline">سياسة الخصوصية</Link>
                </label>
              </div>
              {errors.terms && <p className="text-red-500 text-xs">{errors.terms}</p>}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-register"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    جاري إنشاء الحساب...
                  </>
                ) : (
                  "إنشاء حساب"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">لديك حساب بالفعل؟ </span>
              <Link href="/signin" className="text-primary hover:underline font-medium">
                تسجيل الدخول
              </Link>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">أو</span>
              </div>
            </div>

            <a
              href="/api/login"
              className="flex items-center justify-center gap-2 w-full border rounded-lg py-2.5 hover:bg-gray-50 transition-colors"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="h-4 w-4" />
              <span className="text-sm font-medium">التسجيل عبر Google / Apple</span>
            </a>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
