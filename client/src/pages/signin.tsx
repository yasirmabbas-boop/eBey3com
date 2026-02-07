import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Phone, Lock, LogIn, Loader2, Shield, Eye, EyeOff, MessageSquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, AUTH_QUERY_KEY } from "@/hooks/use-auth";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useLanguage } from "@/lib/i18n";
import { FormError } from "@/components/form-error";
import { validatePhone, validatePassword } from "@/lib/form-validation";
import { isDespia } from "@/lib/despia";
import { isNative } from "@/lib/capacitor";

declare global {
  interface Window {
    FB: {
      login: (callback: (response: { authResponse?: { accessToken: string; userID: string } }) => void, options?: { scope: string }) => void;
      getLoginStatus: (callback: (response: { status: string; authResponse?: { accessToken: string; userID: string } }) => void) => void;
    };
  }
}

type Step = "credentials" | "2fa" | "otp" | "otp-verify";

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
  const [showPassword, setShowPassword] = useState(false);
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [fbTermsAccepted, setFbTermsAccepted] = useState(false);

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
      
      // Track login event in GTM
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'event': 'login',
        'method': 'email'
      });
      
      toast({
        title: tr("تم تسجيل الدخول بنجاح", "بە سەرکەوتوویی چوویتە ژوورەوە", "Signed in successfully"),
        description: `${t("welcome")} ${data.displayName}`,
      });

      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });

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
      
      // Track login event in GTM (2FA successful)
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'event': 'login',
        'method': 'email'
      });
      
      toast({
        title: tr("تم تسجيل الدخول بنجاح", "بە سەرکەوتوویی چوویتە ژوورەوە", "Signed in successfully"),
        description: `${t("welcome")} ${data.displayName}`,
      });

      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });

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

  const handleSendOtp = async () => {
    if (!otpPhone) {
      toast({
        title: t("error"),
        description: tr(
          "يرجى إدخال رقم الهاتف",
          "تکایە ژمارەی مۆبایل بنووسە",
          "Please enter your phone number"
        ),
        variant: "destructive",
      });
      return;
    }

    setIsSendingOtp(true);

    try {
      const response = await fetch("/api/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: otpPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || tr(
          "فشل في إرسال رمز التحقق",
          "ناردنی کۆدی پشتڕاستکردنەوە سەرکەوتوو نەبوو",
          "Failed to send verification code"
        ));
      }

      setStep("otp-verify");
      toast({
        title: tr("تم إرسال الرمز", "کۆد نێردرا", "Code sent"),
        description: tr(
          "تم إرسال رمز التحقق إلى واتساب الخاص بك",
          "کۆدی پشتڕاستکردنەوە بۆ واتسئاپەکەت نێردرا",
          "Verification code sent to your WhatsApp"
        ),
      });
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otpCode.length !== 6) {
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
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: otpPhone, code: otpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || tr(
          "رمز التحقق غير صحيح",
          "کۆدی پشتڕاستکردنەوە هەڵەیە",
          "Invalid verification code"
        ));
      }

      if (data.token) {
        localStorage.setItem("authToken", data.token);
      }

      toast({
        title: tr("تم تسجيل الدخول بنجاح", "بە سەرکەوتوویی چوویتە ژوورەوە", "Signed in successfully"),
        description: tr(
          "مرحباً بك في إي-بيع",
          "بەخێربێیت بۆ ئی-بێع",
          "Welcome to E-Bay Iraq"
        ),
      });

      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });

      navigate("/");
    } catch (error: any) {
      toast({
        title: t("error"),
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
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border">
                    <Checkbox
                      id="fb-terms"
                      checked={fbTermsAccepted}
                      onCheckedChange={(checked) => setFbTermsAccepted(checked === true)}
                      data-testid="checkbox-fb-terms"
                    />
                    <label
                      htmlFor="fb-terms"
                      className="text-sm leading-relaxed cursor-pointer"
                    >
                      {tr(
                        "عند التسجيل عبر فيسبوك، أوافق على ",
                        "کاتێک لە ڕێگەی فەیسبووکەوە تۆمار دەکەم، ڕازیم بە ",
                        "By signing up via Facebook, I agree to the "
                      )}
                      <Link href="/terms" className="text-primary hover:underline" target="_blank">
                        {tr("شروط الاستخدام", "مەرجەکانی بەکارهێنان", "Terms of Use")}
                      </Link>
                      {tr(" و", " و ", " and ")}
                      <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                        {tr("سياسة الخصوصية", "سیاسەتی تایبەتمەندی", "Privacy Policy")}
                      </Link>
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={!fbTermsAccepted}
                    onClick={async () => {
                      if (!fbTermsAccepted) {
                        toast({
                          title: t("error"),
                          description: tr(
                            "يجب الموافقة على شروط الاستخدام وسياسة الخصوصية",
                            "دەبێت ڕازیبیت بە مەرجەکانی بەکارهێنان و سیاسەتی تایبەتمەندی",
                            "You must agree to the Terms of Use and Privacy Policy"
                          ),
                          variant: "destructive",
                        });
                        return;
                      }

                      // For native apps (Despia or Capacitor): Use Facebook JS SDK (in-app login)
                      if ((isDespia() || isNative) && window.FB) {
                        console.log("[Facebook Login] Using FB SDK for native app");
                        setIsLoading(true);
                        
                        window.FB.login(async (response) => {
                          if (response.authResponse) {
                            const { accessToken, userID } = response.authResponse;
                            console.log("[Facebook Login] Got FB access token, validating with server...");
                            
                            try {
                              const res = await fetch("/api/auth/facebook/token", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({ accessToken, userID }),
                              });
                              
                              const data = await res.json();
                              
                              if (res.ok && data.success) {
                                console.log("[Facebook Login] Server validation successful");
                                if (data.authToken) {
                                  localStorage.setItem("authToken", data.authToken);
                                }
                                queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                                queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
                                navigate(data.needsOnboarding ? "/onboarding" : "/");
                              } else {
                                throw new Error(data.error || "Login failed");
                              }
                            } catch (error) {
                              console.error("[Facebook Login] Error:", error);
                              toast({
                                title: t("error"),
                                description: tr(
                                  "فشل تسجيل الدخول بفيسبوك",
                                  "چوونە ژوورەوە لەگەڵ فەیسبووک سەرکەوتوو نەبوو",
                                  "Facebook login failed"
                                ),
                                variant: "destructive",
                              });
                            } finally {
                              setIsLoading(false);
                            }
                          } else {
                            console.log("[Facebook Login] User cancelled or error");
                            setIsLoading(false);
                          }
                        }, { scope: "public_profile,email" });
                        return;
                      }

                      // For web browsers: Use popup-based redirect flow
                      const width = 600, height = 700;
                      const left = window.screen.width / 2 - width / 2;
                      const top = window.screen.height / 2 - height / 2;

                      const popup = window.open(
                        "/auth/facebook",
                        "facebook_login",
                        `width=${width},height=${height},left=${left},top=${top}`
                      );

                      const handleMessage = (event: MessageEvent) => {
                        if (event.origin !== window.location.origin) return;
                        if (event.data.type === "FACEBOOK_LOGIN_SUCCESS") {
                          window.removeEventListener("message", handleMessage);
                          popup?.close();
                          
                          // Store auth token
                          if (event.data.authToken) {
                            localStorage.setItem("authToken", event.data.authToken);
                          }
                          
                          // Invalidate auth cache and redirect
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                          queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
                          
                          // Navigate to appropriate page
                          navigate(event.data.needsOnboarding ? "/onboarding" : "/");
                        }
                      };
                      window.addEventListener("message", handleMessage);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-white bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                    </svg>
                    {tr("تسجيل الدخول مع فيسبوك", "چوونە ژوورەوە لەگەڵ فەیسبووک", "Connect with Facebook")}
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      {tr("أو", "یان", "or")}
                    </span>
                  </div>
                </div>

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
                      type={showPassword ? "text" : "password"}
                      placeholder={t("enterPassword")}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                      className={`pr-10 pl-10 ${!passwordValidation.valid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
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

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      {tr("أو", "یان", "or")}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep("otp")}
                  data-testid="button-otp-login"
                >
                  <MessageSquare className="h-4 w-4 ml-2" />
                  {tr("تسجيل الدخول بواتساب", "چوونە ژوورەوە بە واتسئاپ", "Sign in with WhatsApp")}
                </Button>
              </form>
            ) : step === "otp" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp-phone">{t("phone")}</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp-phone"
                      type="tel"
                      placeholder="07xxxxxxxxx"
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value)}
                      className="pr-10"
                      dir="ltr"
                      data-testid="input-otp-phone"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full elev-1"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  data-testid="button-send-otp"
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      {tr("جاري الإرسال...", "ناردن...", "Sending...")}
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 ml-2" />
                      {tr("إرسال رمز التحقق عبر واتساب", "ناردنی کۆد بە واتسئاپ", "Send code via WhatsApp")}
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("credentials");
                    setOtpPhone("");
                  }}
                  data-testid="button-back-to-credentials"
                >
                  {tr("العودة لتسجيل الدخول", "گەڕانەوە بۆ چوونە ژوورەوە", "Back to sign in")}
                </Button>
              </div>
            ) : step === "otp-verify" ? (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label>{tr("رمز التحقق", "کۆدی پشتڕاستکردنەوە", "Verification code")}</Label>
                  <div className="flex justify-center" dir="ltr">
                    <InputOTP
                      maxLength={6}
                      value={otpCode}
                      onChange={(value) => setOtpCode(value)}
                      data-testid="input-otp-code"
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
                    {tr(
                      `أدخل رمز التحقق المرسل إلى ${otpPhone}`,
                      `کۆدی پشتڕاستکردنەوە بۆ ${otpPhone} نێردرا`,
                      `Enter the code sent to ${otpPhone}`
                    )}
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full elev-1"
                  disabled={isLoading || otpCode.length !== 6}
                  data-testid="button-verify-otp"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      {tr("جاري التحقق...", "پشتڕاستکردنەوە...", "Verifying...")}
                    </>
                  ) : (
                    tr("تأكيد", "دڵنیاکردنەوە", "Confirm")
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("otp");
                    setOtpCode("");
                  }}
                  data-testid="button-resend-otp"
                >
                  {tr("إعادة إرسال الرمز", "دووبارە ناردنی کۆد", "Resend code")}
                </Button>
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
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">{t("dontHaveAccount")} </span>
                <Link href="/register" className="text-primary hover:underline font-medium">
                  {t("createAccount")}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
