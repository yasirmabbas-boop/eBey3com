import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, Mail, Phone, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { language, t } = useLanguage();

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
                ? "تواصل مع خدمة العملاء لإعادة تعيين كلمة المرور" 
                : "پەیوەندی بە خزمەتگوزاری کڕیاران بکە بۆ ڕێکخستنەوەی وشەی نهێنی"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">
                    {language === "ar" ? "أرسل بريداً إلكترونياً إلى:" : "ئیمەیڵ بنێرە بۆ:"}
                  </p>
                  <a 
                    href="mailto:support@ebey3.com" 
                    className="text-blue-700 hover:underline font-bold text-lg"
                  >
                    support@ebey3.com
                  </a>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">
                    {language === "ar" ? "أرفق رقم هاتفك المسجل في الحساب:" : "ژمارەی مۆبایلی تۆمارکراوت لەگەڵ بنێرە:"}
                  </p>
                  <p className="text-sm text-blue-700">
                    {language === "ar" 
                      ? "سيقوم فريق الدعم بإعادة تعيين كلمة المرور وإرسالها إلى هاتفك" 
                      : "تیمی پاڵپشتی وشەی نهێنی نوێ دادەنێت و بۆ مۆبایلەکەت دەینێرێت"}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                {language === "ar" 
                  ? "مثال على محتوى الرسالة:" 
                  : "نموونەی ناوەڕۆکی نامە:"}
              </p>
              <div className="bg-gray-100 rounded-lg p-3 mt-2 text-right" dir="rtl">
                <p className="text-gray-700">
                  {language === "ar" 
                    ? "مرحباً، أريد إعادة تعيين كلمة المرور. رقم هاتفي: 07XXXXXXXXX" 
                    : "سڵاو، دەمەوێت وشەی نهێنیم ڕێکبخەمەوە. ژمارەی مۆبایلم: 07XXXXXXXXX"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <a 
                href="mailto:support@ebey3.com?subject=طلب إعادة تعيين كلمة المرور&body=مرحباً، أريد إعادة تعيين كلمة المرور. رقم هاتفي: "
                className="block"
              >
                <Button className="w-full" data-testid="button-email-support">
                  <Mail className="h-4 w-4 ml-2" />
                  {language === "ar" ? "إرسال بريد إلكتروني" : "ئیمەیڵ بنێرە"}
                </Button>
              </a>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate("/signin")}
                data-testid="button-back-signin"
              >
                <ArrowLeft className="h-4 w-4 ml-2" />
                {language === "ar" ? "العودة لتسجيل الدخول" : "گەڕانەوە بۆ چوونەژوورەوە"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
