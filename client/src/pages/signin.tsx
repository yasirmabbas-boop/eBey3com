import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, Lock, LogIn, Loader2, Shield, MessageCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useLanguage } from "@/lib/i18n";
import { FormError } from "@/components/form-error";
import { validatePhone, validatePassword } from "@/lib/form-validation";

declare global {
  interface Window {
    wauthCallback: (user: { mobile: string; name?: string }) => void;
  }
}

type Step = "credentials" | "2fa";

export default function SignIn() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const tr = (ar: string, ku: string, en: string) => (language === "ar" ? ar : language === "ku" ? ku : en);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("credentials");
  const [pendingToken, setPendingToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  // WhatsApp authentication callback handler
  const handleWhatsAppAuth = useCallback(async (wauthUser: { mobile: string; name?: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(wauthUser),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            tr(
              "فشل تسجيل الدخول عبر واتساب",
              "چوونە ژوورەوە لە ڕێگەی واتسئاپ سەرکەوتوو نەبوو",
              "WhatsApp sign-in failed"
            )
        );
      }

      if (data.authToken) {
        localStorage.setItem("authToken", data.authToken);
      }

      toast({
        title: data.isNewUser
          ? tr("تم إنشاء حسابك بنجاح!", "هەژمارەکەت دروستکرا!", "Account created successfully!")
          : tr("تم تسجيل الدخول بنجاح", "بە سەرکەوتوویی چوویتە ژوورەوە", "Signed in successfully"),
        description: `${t("welcome")} ${data.displayName}`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      navigate("/");
    } catch (error: any) {
      toast({
        title: tr("خطأ في تسجيل الدخول", "هەڵە لە چوونە ژوورەوە", "Sign-in error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [language, navigate, queryClient, t, toast]);

  // Register the global callback for WAuth SDK
  useEffect(() => {
    window.wauthCallback = handleWhatsAppAuth;
    return () => {
      delete (window as any).wauthCallback;
    };
  }, [handleWhatsAppAuth]);
  
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
        description: tr(
          "يرجى إدخال رقم الهاتف وكلمة المرور",
          "تکایە ژمارەی مۆبایل و وشەی نهێنی بنووسە",
          "Please enter your phone number and password"
        ),
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
        throw new Error(data.error || tr("فشل تسجيل الدخول", "چوونە ژوورەوە سەرکەوتوو نەبوو", "Sign-in failed"));
      }

      if (data.requires2FA) {
        setPendingToken(data.pendingToken);
        setStep("2fa");
        toast({
          title: tr("المصادقة الثنائية", "دووچەشنە پشتڕاستکردنەوە", "Two-factor authentication"),
          description: tr(
            "يرجى إدخال رمز التحقق من تطبيق المصادقة",
            "تکایە کۆدی پشتڕاستکردنەوە لە ئەپی پشتڕاستکردنەوە بنووسە",
            "Enter the verification code from your authenticator app"
          ),
        });
        return;
      }

      if (data.authToken) {
        localStorage.setItem("authToken", data.authToken);
      }
      
      toast({
        title: tr("تم تسجيل الدخول بنجاح", "بە سەرکەوتوویی چوویتە ژوورەوە", "Signed in successfully"),
        description: `${t("welcome")} ${data.displayName}`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      navigate("/");
    } catch (error: any) {
      toast({
        title: tr("خطأ في تسجيل الدخول", "هەڵە لە چوونە ژوورەوە", "Sign-in error"),
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
        description: tr(
          "يرجى إدخال رمز التحقق المكون من 6 أرقام",
          "تکایە کۆدی پشتڕاستکردنەوەی ٦ ژمارە بنووسە",
          "Please enter the 6-digit verification code"
        ),
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
        throw new Error(data.error || tr("رمز التحقق غير صحيح", "کۆدی پشتڕاستکردنەوە هەڵەیە", "Invalid verification code"));
      }

      if (data.authToken) {
        localStorage.setItem("authToken", data.authToken);
      }
      
      toast({
        title: tr("تم تسجيل الدخول بنجاح", "بە سەرکەوتوویی چوویتە ژوورەوە", "Signed in successfully"),
        description: `${t("welcome")} ${data.displayName}`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      navigate("/");
    } catch (error: any) {
      toast({
        title: tr("خطأ في التحقق", "هەڵە لە پشتڕاستکردنەوە", "Verification error"),
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
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-px w-8 bg-border/70" />
            {tr("تسجيل الدخول", "چوونە ژوورەوە", "Sign In")}
            <span className="h-px w-8 bg-border/70" />
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {step === "credentials" ? t("signIn") : tr("المصادقة الثنائية", "دووچەشنە پشتڕاستکردنەوە", "Two-factor authentication")}
          </h1>
        </div>
        <Card className="soft-border elev-2">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {step === "credentials" ? (
                <LogIn className="h-8 w-8 text-primary" />
              ) : (
                <Shield className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-xl">
              {step === "credentials" ? t("signIn") : tr("المصادقة الثنائية", "دووچەشنە پشتڕاستکردنەوە", "Two-factor authentication")}
            </CardTitle>
            <CardDescription>
              {step === "credentials" 
                ? tr(
                    "أدخل رقم هاتفك وكلمة المرور للمتابعة",
                    "ژمارەی مۆبایل و وشەی نهێنیت بنووسە بۆ بەردەوامبوون",
                    "Enter your phone number and password to continue"
                  )
                : tr(
                    "أدخل رمز التحقق من تطبيق المصادقة",
                    "کۆدی پشتڕاستکردنەوە لە ئەپی پشتڕاستکردنەوە بنووسە",
                    "Enter the verification code from your authenticator app"
                  )
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  className="w-full elev-1" 
                  disabled={isLoading}
                  data-testid="button-signin"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      {tr("جاري تسجيل الدخول...", "چوونە ژوورەوە...", "Signing in...")}
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
                  <Label>{tr("رمز التحقق", "کۆدی پشتڕاستکردنەوە", "Verification code")}</Label>
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
                  className="w-full elev-1" 
                  disabled={isLoading || twoFactorCode.length !== 6}
                  data-testid="button-verify-2fa"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      {tr("جاري التحقق...", "پشتڕاستکردنەوە...", "Verifying...")}
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
                  {tr("العودة لتسجيل الدخول", "گەڕانەوە بۆ چوونە ژوورەوە", "Back to sign in")}
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
                      {tr("أو", "یان", "or")}
                    </span>
                  </div>
                </div>

                {/* WhatsApp Login Button - WAuth Container */}
                <div className="space-y-3">
                  <div 
                    id="wauth-login-container"
                    className="flex justify-center"
                    data-testid="whatsapp-login-container"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
