import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Clock, 
  Search, 
  Bell, 
  Target, 
  Shield, 
  TrendingUp, 
  Users,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";

const tips = [
  {
    icon: Search,
    title: "١. ابحث قبل المزايدة",
    content: "قبل أن تزايد على أي منتج، ابحث عن سعره الحقيقي في السوق. قارن الأسعار في المتاجر المحلية والمواقع الأخرى. هذا يساعدك على تحديد الحد الأقصى الذي يجب أن تدفعه.",
    tip: "استخدم خاصية البحث في الموقع لمقارنة أسعار المنتجات المشابهة"
  },
  {
    icon: Clock,
    title: "٢. راقب توقيت المزاد",
    content: "المزادات التي تنتهي في أوقات غير شائعة (مثل الصباح الباكر أو منتصف الأسبوع) غالباً ما تحظى بمنافسة أقل. استغل هذه الأوقات للحصول على صفقات أفضل.",
    tip: "أضف المنتجات لقائمة المتابعة وراقب أوقات انتهائها"
  },
  {
    icon: Target,
    title: "٣. حدد سقف سعرك مسبقاً",
    content: "قبل الدخول في أي مزاد، حدد الحد الأقصى الذي ستدفعه والتزم به. لا تدع حماس المزايدة يدفعك لتجاوز ميزانيتك. الانضباط هو مفتاح النجاح.",
    tip: "اكتب السعر الأقصى على ورقة قبل البدء بالمزايدة"
  },
  {
    icon: Bell,
    title: "٤. استخدم التنبيهات الذكية",
    content: "فعّل إشعارات المنتجات التي تهتم بها. ستصلك تنبيهات عند إضافة منتجات جديدة في الفئات المفضلة لديك أو عند اقتراب انتهاء المزادات.",
    tip: "أضف الفئات المفضلة لقائمة المتابعة للحصول على تنبيهات فورية"
  },
  {
    icon: Users,
    title: "٥. تعرف على البائعين الموثوقين",
    content: "راجع تقييمات البائع وعدد المبيعات السابقة قبل الشراء. البائعون ذوو التقييم العالي (٩٥٪+) يوفرون تجربة شراء أكثر أماناً وموثوقية.",
    tip: "ابحث عن شارة \"بائع موثوق\" باللون الأزرق"
  },
  {
    icon: TrendingUp,
    title: "٦. راقب تاريخ المزايدات",
    content: "تابع كيف تتطور الأسعار خلال المزاد. إذا ارتفع السعر بسرعة كبيرة في البداية، قد يكون من الأفضل البحث عن منتج مشابه آخر.",
    tip: "المزادات الجديدة غالباً ما تكون فرصة أفضل من المزادات النشطة جداً"
  },
  {
    icon: Shield,
    title: "٧. اقرأ الوصف والشروط بعناية",
    content: "تأكد من قراءة وصف المنتج كاملاً، بما في ذلك الحالة، الملحقات، وسياسة الإرجاع. اسأل البائع عن أي تفاصيل غير واضحة قبل المزايدة.",
    tip: "اطلب صوراً إضافية إذا لم تكن الصور الموجودة كافية"
  }
];

const warnings = [
  "لا تزايد على منتج لم تفهم مواصفاته جيداً",
  "تجنب المزايدة في اللحظات الأخيرة دون تفكير",
  "لا تثق بالعروض التي تبدو جيدة جداً لتكون حقيقية",
  "تحقق دائماً من هوية البائع وتقييماته"
];

const quickLinks = [
  { title: "تصفح الساعات", link: "/search?category=ساعات", category: "ساعات فاخرة" },
  { title: "تصفح الإلكترونيات", link: "/search?category=إلكترونيات", category: "أجهزة وتقنية" },
  { title: "تصفح التحف", link: "/search?category=تحف وأثاث", category: "مقتنيات نادرة" },
  { title: "جميع المنتجات", link: "/search", category: "كل الفئات" },
];

export default function DealsGuide() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            العودة للرئيسية
          </Button>
        </Link>

        <div className="text-center mb-12">
          <Badge className="mb-4 bg-green-600 text-white">دليل المشتري الذكي</Badge>
          <h1 className="text-4xl font-bold text-primary mb-4">
            كيف تجد أفضل الصفقات في المزادات؟
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            ٧ نصائح ذهبية تساعدك على الفوز بالمزادات والحصول على أفضل الأسعار
          </p>
        </div>

        <div className="space-y-6 mb-12">
          {tips.map((tip, index) => (
            <Card key={index} className="overflow-hidden" data-testid={`tip-card-${index}`}>
              <CardHeader className="bg-gradient-to-l from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="bg-primary text-white p-2 rounded-lg">
                    <tip.icon className="h-5 w-5" />
                  </div>
                  {tip.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-gray-700 mb-4 leading-relaxed">{tip.content}</p>
                <div className="flex items-start gap-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <Lightbulb className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">{tip.tip}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-12 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              تحذيرات مهمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2 text-red-700">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 mt-1" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-primary mb-6 text-center">ابدأ التسوق الآن</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map((item, index) => (
              <Link key={index} href={item.link}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full" data-testid={`quick-link-${index}`}>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{item.category}</p>
                    <p className="font-bold text-primary">{item.title}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <Card className="bg-primary text-white">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">هل أنت مستعد للبدء؟</h2>
            <p className="mb-6 opacity-90">
              طبق هذه النصائح واحصل على أفضل الصفقات في مزاداتنا
            </p>
            <Link href="/search">
              <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
                تصفح المزادات الآن
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
