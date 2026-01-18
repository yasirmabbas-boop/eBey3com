import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Mail, Phone, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const tr = (ar: string, ku: string, en: string) => (language === "ar" ? ar : language === "ku" ? ku : en);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (data: { phone: string; email?: string }) => {
      const res = await fetch("/api/password-reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit request");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: tr("تم إرسال الطلب", "داواکارییەکە نێردرا", "Request sent"),
        description: tr(
          "سيتواصل معك فريق الدعم قريباً",
          "تیمی پاڵپشتی زوو پەیوەندیت پێوە دەکات",
          "Support will contact you soon"
        ),
      });
    },
    onError: (error: Error) => {
      toast({
        title: tr("خطأ", "هەڵە", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast({
        title: tr("خطأ", "هەڵە", "Error"),
        description: tr("رقم الهاتف مطلوب", "ژمارەی مۆبایل پێویستە", "Phone number is required"),
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate({ 
      phone: phone.trim(), 
      email: email.trim() || undefined 
    });
  };

  if (submitted) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-md">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold">
                {tr(
                  "تم إرسال طلبك بنجاح",
                  "داواکارییەکەت بە سەرکەوتوویی نێردرا",
                  "Your request was sent successfully"
                )}
              </h2>
              <p className="text-muted-foreground">
                {language === "ar" 
                  ? "سيقوم فريق الدعم بمراجعة طلبك والتواصل معك خلال 24 ساعة" 
                  : "تیمی پاڵپشتی داواکارییەکەت پێداچوونەوە دەکات و لە ماوەی ٢٤ کاتژمێردا پەیوەندیت پێوە دەکات"}
              </p>
              <Button 
                className="w-full mt-4" 
                onClick={() => navigate("/signin")}
                data-testid="button-back-signin-success"
              >
                <ArrowLeft className="h-4 w-4 ml-2" />
                {tr("العودة لتسجيل الدخول", "گەڕانەوە بۆ چوونەژوورەوە", "Back to sign in")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {tr("استعادة كلمة المرور", "گەڕانەوەی وشەی نهێنی", "Reset password")}
            </CardTitle>
            <CardDescription>
              {tr(
                "أدخل معلوماتك وسيتواصل معك فريق الدعم",
                "زانیارییەکانت بنووسە و تیمی پاڵپشتی پەیوەندیت پێوە دەکات",
                "Enter your details and support will contact you"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {tr("رقم الهاتف", "ژمارەی مۆبایل", "Phone number")}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={tr("07XXXXXXXXX", "07XXXXXXXXX", "07XXXXXXXXX")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  dir="ltr"
                  className="text-left"
                  data-testid="input-phone"
                />
                <p className="text-xs text-muted-foreground">
                  {tr(
                    "أدخل رقم الهاتف المسجل في حسابك",
                    "ژمارەی مۆبایلی تۆمارکراو لە هەژمارەکەت بنووسە",
                    "Enter the phone number registered to your account"
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {tr("البريد الإلكتروني (اختياري)", "ئیمەیڵ (ئارەزوومەندانە)", "Email (optional)")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={tr("example@email.com", "example@email.com", "example@email.com")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  className="text-left"
                  data-testid="input-email"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={submitMutation.isPending}
                data-testid="button-submit-request"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    {tr("جاري الإرسال...", "دەنێردرێت...", "Sending...")}
                  </>
                ) : (
                  tr("إرسال الطلب", "داواکارییەکە بنێرە", "Send request")
                )}
              </Button>
              
              <Button 
                type="button"
                variant="outline" 
                className="w-full" 
                onClick={() => navigate("/signin")}
                data-testid="button-back-signin"
              >
                <ArrowLeft className="h-4 w-4 ml-2" />
                {tr("العودة لتسجيل الدخول", "گەڕانەوە بۆ چوونەژوورەوە", "Back to sign in")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
