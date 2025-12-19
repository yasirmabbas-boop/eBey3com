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
  ArrowLeft,
  Ban,
  DollarSign,
  BarChart3,
  Brain,
  Heart,
  Zap,
  AlertOctagon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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

const overpayingSignals = [
  {
    icon: Heart,
    title: "التعلق العاطفي",
    description: "عندما تشعر أنك \"يجب\" أن تفوز بالمزاد مهما كان السعر",
    danger: 90,
    solution: "خذ استراحة ٥ دقائق قبل أي مزايدة تتجاوز ميزانيتك"
  },
  {
    icon: Zap,
    title: "حمى المزايدة",
    description: "الاستمرار في المزايدة لمجرد أن شخصاً آخر زايد ضدك",
    danger: 85,
    solution: "حدد سعرك الأقصى مسبقاً ولا تتجاوزه أبداً"
  },
  {
    icon: Clock,
    title: "ضغط الوقت",
    description: "اتخاذ قرارات متسرعة في الثواني الأخيرة من المزاد",
    danger: 75,
    solution: "زايد مبكراً بسعرك الأقصى واترك النظام يعمل تلقائياً"
  },
  {
    icon: Brain,
    title: "تجاهل البحث",
    description: "عدم مقارنة الأسعار قبل المزايدة",
    danger: 70,
    solution: "ابحث عن سعر المنتج في ٣ مصادر على الأقل"
  }
];

const priceComparison = [
  { label: "سعر السوق العادي", value: 1000000, color: "bg-green-500" },
  { label: "سعر مقبول في مزاد", value: 850000, color: "bg-blue-500" },
  { label: "صفقة ممتازة", value: 650000, color: "bg-emerald-500" },
  { label: "دفع زائد!", value: 1200000, color: "bg-red-500" }
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

        {/* Overpaying Prevention Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-red-600 text-white">
              <AlertOctagon className="h-3 w-3 ml-1" />
              تحذير مهم
            </Badge>
            <h2 className="text-3xl font-bold text-red-700 mb-3">
              علامات تدل على أنك تدفع أكثر مما يجب
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              تعرف على هذه العلامات التحذيرية لتجنب الدفع الزائد في المزادات
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {overpayingSignals.map((signal, index) => (
              <Card key={index} className="overflow-hidden border-l-4 border-l-red-500" data-testid={`overpaying-signal-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-red-100 p-3 rounded-xl">
                      <signal.icon className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">{signal.title}</h3>
                      <p className="text-gray-600 text-sm mb-3">{signal.description}</p>
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">مستوى الخطورة</span>
                          <span className="text-red-600 font-bold">{signal.danger}%</span>
                        </div>
                        <Progress value={signal.danger} className="h-2 bg-gray-200" />
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <p className="text-sm text-green-800 flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span><strong>الحل:</strong> {signal.solution}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Price Comparison Infographic */}
          <Card className="overflow-hidden bg-gradient-to-bl from-blue-50 to-white border-blue-200">
            <CardHeader className="border-b bg-blue-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                مقارنة الأسعار: متى تعرف أنك تدفع زيادة؟
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-6 text-center">
                مثال: ساعة بسعر سوقي <strong className="text-blue-600">1,000,000 د.ع</strong>
              </p>
              <div className="space-y-4">
                {priceComparison.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-left">{item.label}</div>
                    <div className="flex-1 h-10 bg-gray-100 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full ${item.color} rounded-full flex items-center justify-end px-4 transition-all duration-500`}
                        style={{ width: `${(item.value / 1200000) * 100}%` }}
                      >
                        <span className="text-white text-sm font-bold whitespace-nowrap">
                          {new Intl.NumberFormat("ar-IQ").format(item.value)} د.ع
                        </span>
                      </div>
                    </div>
                    {item.value > 1000000 && (
                      <Ban className="h-5 w-5 text-red-500" />
                    )}
                    {item.value <= 700000 && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-amber-800 text-sm flex items-start gap-2">
                  <DollarSign className="h-5 w-5 flex-shrink-0" />
                  <span>
                    <strong>القاعدة الذهبية:</strong> لا تدفع أكثر من ٨٥٪ من سعر السوق في المزادات. 
                    إذا وصل السعر لأكثر من ذلك، ابحث عن منتج آخر أو اشترِ من متجر عادي.
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
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
