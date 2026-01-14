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
        title: language === "ar" ? "تم إرسال الطلب" : "داواکارییەکە نێردرا",
        description: language === "ar" 
          ? "سيتواصل معك فريق الدعم قريباً" 
          : "تیمی پاڵپشتی زوو پەیوەندیت پێوە دەکات",
      });
    },
    onError: (error: Error) => {
      toast({
        title: language === "ar" ? "خطأ" : "هەڵە",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast({
        title: language === "ar" ? "خطأ" : "هەڵە",
        description: language === "ar" ? "رقم الهاتف مطلوب" : "ژمارەی مۆبایل پێویستە",
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
                {language === "ar" ? "تم إرسال طلبك بنجاح" : "داواکارییەکەت بە سەرکەوتوویی نێردرا"}
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
                {language === "ar" ? "العودة لتسجيل الدخول" : "گەڕانەوە بۆ چوونەژوورەوە"}
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
              {language === "ar" ? "استعادة كلمة المرور" : "گەڕانەوەی وشەی نهێنی"}
            </CardTitle>
            <CardDescription>
              {language === "ar" 
                ? "أدخل معلوماتك وسيتواصل معك فريق الدعم" 
                : "زانیارییەکانت بنووسە و تیمی پاڵپشتی پەیوەندیت پێوە دەکات"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {language === "ar" ? "رقم الهاتف" : "ژمارەی مۆبایل"}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={language === "ar" ? "07XXXXXXXXX" : "07XXXXXXXXX"}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  dir="ltr"
                  className="text-left"
                  data-testid="input-phone"
                />
                <p className="text-xs text-muted-foreground">
                  {language === "ar" 
                    ? "أدخل رقم الهاتف المسجل في حسابك" 
                    : "ژمارەی مۆبایلی تۆمارکراو لە هەژمارەکەت بنووسە"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {language === "ar" ? "البريد الإلكتروني (اختياري)" : "ئیمەیڵ (ئارەزوومەندانە)"}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={language === "ar" ? "example@email.com" : "example@email.com"}
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
                    {language === "ar" ? "جاري الإرسال..." : "دەنێردرێت..."}
                  </>
                ) : (
                  language === "ar" ? "إرسال الطلب" : "داواکارییەکە بنێرە"
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
                {language === "ar" ? "العودة لتسجيل الدخول" : "گەڕانەوە بۆ چوونەژوورەوە"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
