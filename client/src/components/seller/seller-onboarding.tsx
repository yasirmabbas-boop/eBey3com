/**
 * Seller Onboarding Component
 * 
 * Displayed when a seller has no products, sales, or revenue yet.
 * Provides helpful guidance on getting started.
 */

import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  TrendingUp, 
  Users, 
  CheckCircle2,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";

interface SellerOnboardingProps {
  /** Callback to navigate to add product page */
  onAddProduct: () => void;
}

export function SellerOnboarding({ onAddProduct }: SellerOnboardingProps) {
  const { language } = useLanguage();

  const steps = [
    {
      icon: Package,
      title: language === "ar" 
        ? "أضف منتجك الأول" 
        : language === "ku"
        ? "یەکەمین بەرهەمت زیاد بکە"
        : "Add Your First Product",
      description: language === "ar"
        ? "التقط صوراً واضحة، أضف وصفاً تفصيلياً، وحدد سعراً منافساً"
        : language === "ku"
        ? "وێنەی ڕوون بگرە، وەسفێکی ورد زیاد بکە، نرخێکی کێبەرکێ دیاری بکە"
        : "Take clear photos, add detailed description, set competitive price",
    },
    {
      icon: Users,
      title: language === "ar"
        ? "ابدأ في البيع"
        : language === "ku"
        ? "دەست بە فرۆشتن بکە"
        : "Start Selling",
      description: language === "ar"
        ? "سيظهر منتجك للآلاف من المشترين المحتملين في منطقتك"
        : language === "ku"
        ? "بەرهەمەکەت بۆ هەزاران کڕیاری ئەگەری لە ناوچەکەت دەردەکەوێت"
        : "Your product will be visible to thousands of potential buyers",
    },
    {
      icon: TrendingUp,
      title: language === "ar"
        ? "تتبع أداءك"
        : language === "ku"
        ? "کارایی خۆت بەدوا بکە"
        : "Track Your Performance",
      description: language === "ar"
        ? "راقب مبيعاتك وإيراداتك وتقييماتك من هذه اللوحة"
        : language === "ku"
        ? "فرۆشتن و داهات و هەڵسەنگاندنەکانت لەم پانێڵە بەدوا بکە"
        : "Monitor your sales, revenue, and ratings from this dashboard",
    },
  ];

  return (
    <div className="space-y-6" data-testid="seller-onboarding">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border-primary/20">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {language === "ar"
              ? "مرحباً بك في متجرك!"
              : language === "ku"
              ? "بەخێربێی بۆ فرۆشگاکەت!"
              : "Welcome to Your Store!"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {language === "ar"
              ? "أنت على بعد خطوة واحدة من بدء رحلتك في البيع. دعنا نساعدك على البدء!"
              : language === "ku"
              ? "تەنها یەک هەنگاو دوور دەیت لە دەستپێکردنی گەشتی فرۆشتن. با یارمەتیت بدەین بۆ دەستپێکردن!"
              : "You're one step away from starting your selling journey. Let's get you started!"}
          </p>
          
          <Button 
            size="lg" 
            className="gap-2 text-lg px-8 py-6" 
            onClick={onAddProduct}
            data-testid="button-onboarding-add-product"
          >
            <Package className="h-5 w-5" />
            {language === "ar"
              ? "أضف منتجك الأول"
              : language === "ku"
              ? "یەکەمین بەرهەمت زیاد بکە"
              : "Add Your First Product"}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      {/* Getting Started Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step, index) => (
          <Card 
            key={index} 
            className="relative overflow-hidden hover:shadow-md transition-shadow"
            data-testid={`onboarding-step-${index}`}
          >
            <CardContent className="pt-6">
              {/* Step Number Badge */}
              <div className="absolute top-3 left-3 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{index + 1}</span>
              </div>

              {/* Icon */}
              <div className="mb-4 mt-2 flex justify-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
              </div>

              {/* Content */}
              <h3 className="font-semibold text-center mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground text-center">
                {step.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tips Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {language === "ar"
              ? "نصائح للنجاح"
              : language === "ku"
              ? "ئامۆژگاریەکان بۆ سەرکەوتن"
              : "Tips for Success"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {[
              {
                ar: "استخدم صوراً عالية الجودة من زوايا متعددة",
                ku: "وێنەی کوالیتی بەرز لە گۆشەی جیاواز بەکاربهێنە",
                en: "Use high-quality photos from multiple angles",
              },
              {
                ar: "اكتب وصفاً تفصيلياً يتضمن الحجم والحالة والميزات",
                ku: "وەسفێکی ورد بنووسە کە قەبارە و دۆخ و تایبەتمەندیەکان لەخۆبگرێت",
                en: "Write detailed descriptions including size, condition, and features",
              },
              {
                ar: "حدد أسعاراً تنافسية بناءً على حالة المنتج",
                ku: "نرخی کێبەرکێ دیاری بکە بەپێی دۆخی بەرهەم",
                en: "Set competitive prices based on product condition",
              },
              {
                ar: "رد على الرسائل والعروض بسرعة لبناء سمعة جيدة",
                ku: "بە خێرایی وەڵامی نامە و پێشنیارەکان بدەوە بۆ درووستکردنی ناوبانگی باش",
                en: "Respond to messages and offers quickly to build a good reputation",
              },
            ].map((tip, index) => (
              <li key={index} className="flex items-start gap-3" data-testid={`tip-${index}`}>
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <span className="text-sm">
                  {language === "ar" ? tip.ar : language === "ku" ? tip.ku : tip.en}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Help Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {language === "ar"
            ? "تحتاج مساعدة؟"
            : language === "ku"
            ? "یارمەتیت پێویستە؟"
            : "Need help?"}{" "}
          <Link href="/help/selling">
            <a className="text-primary hover:underline font-medium">
              {language === "ar"
                ? "دليل البائع"
                : language === "ku"
                ? "ڕێنمایی فرۆشیار"
                : "Seller Guide"}
            </a>
          </Link>
        </p>
      </div>
    </div>
  );
}
