import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, Lock, LogIn, Loader2, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useLanguage } from "@/lib/i18n";
import { FormError } from "@/components/form-error";
import { validatePhone, validatePassword } from "@/lib/form-validation";

type Step = "credentials" | "2fa";

export default function SignIn() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("credentials");
  const [pendingToken, setPendingToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);
  
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
  });
  const [touched, setTouched] = useState({
    phone: false,
    password: false,
  });
  
  const phoneValidation = touched.phone ? validatePhone(formData.phone, language) : { valid: true };
  const passwordValidation = touched.password ? validatePassword(formData.password, language) : { valid: true };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.phone || !formData.password) {
      toast({
        title: t("error"),
        description: language === "ar" ? "يرجى إدخال رقم الهاتف وكلمة المرور" : "تکایە ژمارەی مۆبایل و وشەی نهێنی بنووسە",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (language === "ar" ? "فشل تسجيل الدخول" : "چوونە ژوورەوە سەرکەوتوو نەبوو"));
      }

      if (data.requires2FA) {
        setPendingToken(data.pendingToken);
        setStep("2fa");
        toast({
          title: language === "ar" ? "المصادقة الثنائية" : "دووچەشنە پشتڕاستکردنەوە",
          description: language === "ar" ? "يرجى إدخال رمز التحقق من تطبيق المصادقة" : "تکایە کۆدی پشتڕاستکردنەوە لە ئەپی پشتڕاستکردنەوە بنووسە",
        });
        return;
      }

      if (data.authToken) {
        localStorage.setItem("authToken", data.authToken);
      }
      
      toast({
        title: language === "ar" ? "تم تسجيل الدخول بنجاح" : "بە سەرکەوتوویی چوویتە ژوورەوە",
        description: `${t("welcome")} ${data.displayName}`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      navigate("/");
    } catch (error: any) {
      toast({
        title: language === "ar" ? "خطأ في تسجيل الدخول" : "هەڵە لە چوونە ژوورەوە",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (twoFactorCode.length !== 6) {
      toast({
        title: t("error"),
        description: language === "ar" ? "يرجى إدخال رمز التحقق المكون من 6 أرقام" : "تکایە کۆدی پشتڕاستکردنەوەی ٦ ژمارە بنووسە",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: formData.phone,
          code: twoFactorCode,
          pendingToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (language === "ar" ? "رمز التحقق غير صحيح" : "کۆدی پشتڕاستکردنەوە هەڵەیە"));
      }

      if (data.authToken) {
        localStorage.setItem("authToken", data.authToken);
      }
      
      toast({
        title: language === "ar" ? "تم تسجيل الدخول بنجاح" : "بە سەرکەوتوویی چوویتە ژوورەوە",
        description: `${t("welcome")} ${data.displayName}`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      navigate("/");
    } catch (error: any) {
      toast({
        title: language === "ar" ? "خطأ في التحقق" : "هەڵە لە پشتڕاستکردنەوە",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {step === "credentials" ? (
                <LogIn className="h-8 w-8 text-primary" />
              ) : (
                <Shield className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {step === "credentials" ? t("signIn") : (language === "ar" ? "المصادقة الثنائية" : "دووچەشنە پشتڕاستکردنەوە")}
            </CardTitle>
            <CardDescription>
              {step === "credentials" 
                ? (language === "ar" ? "أدخل رقم هاتفك وكلمة المرور للمتابعة" : "ژمارەی مۆبایل و وشەی نهێنیت بنووسە بۆ بەردەوامبوون")
                : (language === "ar" ? "أدخل رمز التحقق من تطبيق المصادقة" : "کۆدی پشتڕاستکردنەوە لە ئەپی پشتڕاستکردنەوە بنووسە")
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "credentials" ? (
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
                      onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                      className={`pr-10 ${!phoneValidation.valid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      dir="ltr"
                      data-testid="input-phone"
                    />
                  </div>
                  <FormError message={phoneValidation.message} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("password")}</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={t("enterPassword")}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                      className={`pr-10 ${!passwordValidation.valid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      data-testid="input-password"
                    />
                  </div>
                  <FormError message={passwordValidation.message} />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  data-testid="button-signin"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      {language === "ar" ? "جاري تسجيل الدخول..." : "چوونە ژوورەوە..."}
                    </>
                  ) : (
                    t("signIn")
                  )}
                </Button>

                <div className="text-left">
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                    {t("forgotPassword")}
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div className="space-y-2">
                  <Label>{language === "ar" ? "رمز التحقق" : "کۆدی پشتڕاستکردنەوە"}</Label>
                  <div className="flex justify-center" dir="ltr">
                    <InputOTP
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(value) => setTwoFactorCode(value)}
                      data-testid="input-2fa-code"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    {language === "ar" 
                      ? "افتح تطبيق Google Authenticator وأدخل الرمز المعروض"
                      : "ئەپی Google Authenticator بکەوە و کۆدەکە بنووسە"
                    }
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || twoFactorCode.length !== 6}
                  data-testid="button-verify-2fa"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      {language === "ar" ? "جاري التحقق..." : "پشتڕاستکردنەوە..."}
                    </>
                  ) : (
                    t("confirm")
                  )}
                </Button>

                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setStep("credentials");
                    setTwoFactorCode("");
                    setPendingToken("");
                  }}
                  data-testid="button-back-to-login"
                >
                  {language === "ar" ? "العودة لتسجيل الدخول" : "گەڕانەوە بۆ چوونە ژوورەوە"}
                </Button>
              </form>
            )}

            {step === "credentials" && (
              <>
                <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground">{t("dontHaveAccount")} </span>
                  <Link href="/register" className="text-primary hover:underline font-medium">
                    {t("createAccount")}
                  </Link>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {language === "ar" ? "أو" : "یان"}
                    </span>
                  </div>
                </div>

                <a 
                  href="/api/login" 
                  className="flex items-center justify-center gap-2 w-full border rounded-lg py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {language === "ar" ? "تسجيل الدخول عبر Google / Apple" : "چوونەژوورەوە لە ڕێگەی Google / Apple"}
                  </span>
                </a>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
