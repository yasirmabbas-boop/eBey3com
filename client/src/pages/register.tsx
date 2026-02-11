import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Phone, Lock, User, UserPlus, Loader2, Eye, EyeOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, AUTH_QUERY_KEY } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { FormError } from "@/components/form-error";
import { validatePhone, validatePassword } from "@/lib/form-validation";
import { PhoneVerificationModal } from "@/components/phone-verification-modal";
import { isDespia } from "@/lib/despia";
import { isNative, isPluginAvailable } from "@/lib/capacitor";
import { FacebookLogin } from "@capacitor-community/facebook-login";

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const tr = (ar: string, ku: string, en: string) => (language === "ar" ? ar : language === "ku" ? ku : en);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [registeredPhone, setRegisteredPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);
  
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });
  const [touched, setTouched] = useState({
    phone: false,
    password: false,
    confirmPassword: false,
  });
  
  const phoneValidation = touched.phone ? validatePhone(formData.phone, language) : { valid: true };
  const passwordValidation = touched.password ? validatePassword(formData.password, language) : { valid: true };
  const confirmPasswordValidation = touched.confirmPassword && formData.password !== formData.confirmPassword
    ? { valid: false, message: tr("كلمتا المرور غير متطابقتين", "وشە نهێنییەکان یەکناگرنەوە", "Passwords don't match") }
    : { valid: true };

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

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: t("error"),
        description: tr(
          "كلمتا المرور غير متطابقتين",
          "وشە نهێنییەکان یەکناگرنەوە",
          "Passwords don't match"
        ),
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: t("error"),
        description: tr(
          "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
          "وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت",
          "Password must be at least 6 characters"
        ),
        variant: "destructive",
      });
      return;
    }

    if (!termsAccepted) {
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

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: formData.phone,
          password: formData.password,
          displayName: formData.displayName || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || tr("فشل إنشاء الحساب", "دروستکردنی هەژمار سەرکەوتوو نەبوو", "Account creation failed"));
      }

      if (data.authToken) {
        localStorage.setItem("authToken", data.authToken);
      }
      
      // Check if phone verification is required
      if (data.requiresPhoneVerification) {
        setRegisteredPhone(formData.phone);
        setShowVerificationModal(true);
        toast({
          title: tr("تم إنشاء الحساب", "هەژمار دروستکرا", "Account created"),
          description: tr("يرجى التحقق من رقم هاتفك لإكمال التسجيل", "تکایە ژمارەی مۆبایلەکەت پشتڕاست بکەوە", "Please verify your phone number to complete registration"),
        });
        // Don't navigate yet - wait for verification
      } else {
        toast({
          title: tr("تم إنشاء الحساب بنجاح", "هەژمار بە سەرکەوتوویی دروستکرا", "Account created successfully"),
          description: tr("مرحباً بك في E-بيع!", "بەخێربێیت بۆ E-بیع!", "Welcome to E-Bay Iraq!"),
        });
        queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: tr("خطأ في إنشاء الحساب", "هەڵە لە دروستکردنی هەژمار", "Account creation error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-md flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <span className="h-px w-8 bg-border/70" />
            {tr("إنشاء حساب جديد", "دروستکردنی هەژماری نوێ", "Create New Account")}
            <span className="h-px w-8 bg-border/70" />
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {t("createAccount")}
          </h1>
        </div>
        <Card className="soft-border elev-2">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">
              {t("createAccount")}
            </CardTitle>
            <CardDescription>
              {tr(
                "أدخل بياناتك لإنشاء حساب جديد",
                "زانیارییەکانت بنووسە بۆ دروستکردنی هەژماری نوێ",
                "Enter your details to create a new account"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border">
              <Checkbox
                id="terms-top"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                data-testid="checkbox-terms"
              />
              <label
                htmlFor="terms-top"
                className="text-sm leading-relaxed cursor-pointer"
              >
                {tr(
                  "أوافق على ",
                  "ڕازیم بە ",
                  "I agree to the "
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                disabled={!termsAccepted}
                onClick={async () => {
                  if (!termsAccepted) {
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

                  // For native apps (Capacitor): Use native Facebook Login plugin
                  if (isNative && isPluginAvailable('FacebookLogin')) {
                    console.log("[Facebook Register] Using Capacitor native plugin");
                    setIsLoading(true);
                    
                    try {
                      const result = await FacebookLogin.login({ permissions: ['public_profile', 'email'] }) as any;
                      
                      const fbToken = result.accessToken?.token || result.authenticationToken?.token;
                      const fbUserID = result.accessToken?.userId || result.authenticationToken?.userId;
                      
                      if (fbToken && fbUserID) {
                        const accessToken = fbToken;
                        const userID = fbUserID;
                        console.log("[Facebook Register] Got FB token, validating with server...", result.authenticationToken ? "(Limited Login JWT)" : "(classic access token)");
                        
                        const res = await fetch("/api/auth/facebook/token", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ accessToken, userID }),
                        });
                        
                        const data = await res.json();
                        
                        if (res.ok && data.success) {
                          console.log("[Facebook Register] Server validation successful");
                          if (data.authToken) {
                            localStorage.setItem("authToken", data.authToken);
                          }
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                          queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
                          navigate(data.needsOnboarding ? "/onboarding" : "/");
                        } else {
                          throw new Error(data.error || "Registration failed");
                        }
                      } else {
                        console.log("[Facebook Register] User cancelled or no token");
                      }
                    } catch (error) {
                      console.error("[Facebook Register] Error:", error);
                      toast({
                        title: t("error"),
                        description: tr(
                          "فشل التسجيل بفيسبوك",
                          "تۆمارکردن لەگەڵ فەیسبووک سەرکەوتوو نەبوو",
                          "Facebook registration failed"
                        ),
                        variant: "destructive",
                      });
                    } finally {
                      setIsLoading(false);
                    }
                    return;
                  }
                  
                  // For native apps without plugin or Despia: Use Facebook JS SDK (in-app login)
                  if ((isDespia() || isNative) && window.FB) {
                    console.log("[Facebook Register] Using FB SDK (in-app)");
                    setIsLoading(true);
                    
                    window.FB.login((response) => {
                      if (response.authResponse) {
                        const { accessToken, userID } = response.authResponse;
                        console.log("[Facebook Register] Got FB access token, validating with server...");
                        
                        (async () => {
                          try {
                            const res = await fetch("/api/auth/facebook/token", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              credentials: "include",
                              body: JSON.stringify({ accessToken, userID }),
                            });
                            
                            const data = await res.json();
                            
                            if (res.ok && data.success) {
                              console.log("[Facebook Register] Server validation successful");
                              if (data.authToken) {
                                localStorage.setItem("authToken", data.authToken);
                              }
                              queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                              queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
                              navigate(data.needsOnboarding ? "/onboarding" : "/");
                            } else {
                              throw new Error(data.error || "Registration failed");
                            }
                          } catch (error) {
                            console.error("[Facebook Register] Error:", error);
                            toast({
                              title: t("error"),
                              description: tr(
                                "فشل التسجيل بفيسبوك",
                                "تۆمارکردن لەگەڵ فەیسبووک سەرکەوتوو نەبوو",
                                "Facebook registration failed"
                              ),
                              variant: "destructive",
                            });
                          } finally {
                            setIsLoading(false);
                          }
                        })();
                      } else {
                        console.log("[Facebook Register] User cancelled or error");
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
                      
                      if (event.data.authToken) {
                        localStorage.setItem("authToken", event.data.authToken);
                      }
                      
                      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
                      
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
                {tr("التسجيل مع فيسبوك", "تۆمارکردن لەگەڵ فەیسبووک", "Sign up with Facebook")}
              </button>

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
                <Label htmlFor="displayName">{tr("الاسم (اختياري)", "ناو (بەدڵخوازی)", "Name (optional)")}</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder={tr("اسمك", "ناوی تۆ", "Your name")}
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="pr-10"
                    data-testid="input-display-name"
                  />
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
                    placeholder={tr("كلمة المرور (6 أحرف على الأقل)", "وشەی نهێنی (٦ پیت بەلایەنی کەم)", "Password (at least 6 characters)")}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{tr("تأكيد كلمة المرور", "دڵنیابوونەوە لە وشەی نهێنی", "Confirm password")}</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={tr("أعد إدخال كلمة المرور", "وشەی نهێنی دووبارە بنووسەوە", "Re-enter password")}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    onBlur={() => setTouched(prev => ({ ...prev, confirmPassword: true }))}
                    className={`pr-10 pl-10 ${!confirmPasswordValidation.valid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FormError message={confirmPasswordValidation.message} />
              </div>

              <Button 
                type="submit" 
                className="w-full elev-1" 
                disabled={isLoading || !termsAccepted}
                data-testid="button-register"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    {tr("جاري إنشاء الحساب...", "دروستکردنی هەژمار...", "Creating account...")}
                  </>
                ) : (
                  t("createAccount")
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{tr("لديك حساب بالفعل؟", "هەژمارت هەیە؟", "Already have an account?")} </span>
              <Link href="/signin" className="text-primary hover:underline font-medium">
                {t("signIn")}
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Phone Verification Modal */}
        {registeredPhone && (
          <PhoneVerificationModal
            open={showVerificationModal}
            onOpenChange={setShowVerificationModal}
            phone={registeredPhone}
            phoneVerified={false}
            onVerified={() => {
              setShowVerificationModal(false);
              queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
              toast({
                title: tr("تم التحقق بنجاح", "پشتڕاستکرایەوە", "Verified successfully"),
                description: tr("مرحباً بك في E-بيع!", "بەخێربێیت بۆ E-بیع!", "Welcome to E-Bay Iraq!"),
              });
              navigate("/");
            }}
          />
        )}
      </div>
    </Layout>
  );
}
