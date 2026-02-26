import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, FileText, Shield, Lock, HelpCircle, Store, Mail, Phone } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function About() {
  const { language } = useLanguage();
  
  const menuItems = [
    { href: "/terms", icon: FileText, label: language === "ar" ? "الشروط والأحكام" : language === "ku" ? "مەرج و ڕێسا" : "الشروط والأحكام" },
    { href: "/privacy", icon: Lock, label: language === "ar" ? "سياسة الخصوصية" : language === "ku" ? "سیاسەتی تایبەتمەندی" : "سياسة الخصوصية" },
    { href: "/security", icon: Shield, label: language === "ar" ? "الأمان" : language === "ku" ? "پاراستن" : "الأمان" },
    { href: "/security-guide", icon: Shield, label: language === "ar" ? "دليل الأمان" : language === "ku" ? "ڕێنمایی پاراستن" : "دليل الأمان" },
    { href: "/sell", icon: Store, label: language === "ar" ? "ابدأ كبائع" : language === "ku" ? "وەک فرۆشیار دەست پێ بکە" : "ابدأ كبائع" },
    { href: "/contact", icon: Mail, label: language === "ar" ? "اتصل بنا" : language === "ku" ? "پەیوەندیمان پێوە بکە" : "اتصل بنا" },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-lg" dir={language === "ar" ? "rtl" : "ltr"}>
        <h1 className="text-2xl font-bold mb-6 text-center">
          {language === "ar" ? "حول التطبيق" : language === "ku" ? "دەربارەی ئەپ" : "حول التطبيق"}
        </h1>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {language === "ar" ? "اي-بيع" : language === "ku" ? "ئی-بیع" : "اي-بيع"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {language === "ar" ? "منصتك الأولى للبيع والشراء في العراق. نوفر بيئة آمنة وموثوقة للتجارة الإلكترونية." : language === "ku" ? "یەکەم پلاتفۆرمی کڕین و فرۆشتن لە عێراق. ژینگەیەکی پارێزراو و متمانەپێکراو بۆ بازرگانی ئەلیکترۆنی دابین دەکەین." : "منصتك الأولى للبيع والشراء في العراق. نوفر بيئة آمنة وموثوقة للتجارة الإلكترونية."
              }
            </p>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5" />
              {language === "ar" ? "تواصل معنا" : language === "ku" ? "پەیوەندیمان پێوە بکە" : "تواصل معنا"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="mailto:info@ebey3.com" className="block text-sm text-primary hover:underline">
              info@ebey3.com
            </a>
            <a href="mailto:support@ebey3.com" className="block text-sm text-primary hover:underline">
              support@ebey3.com
            </a>
            <a href="mailto:security@ebey3.com" className="block text-sm text-red-500 font-medium hover:underline">
              security@ebey3.com
            </a>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          © 2025 {language === "ar" ? "اي بيع. جميع الحقوق محفوظة." : language === "ku" ? "ئی-بیع. هەموو مافەکان پارێزراون." : "اي بيع. جميع الحقوق محفوظة."}
        </p>
      </div>
    </Layout>
  );
}
