import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, AlertTriangle, CheckCircle, Users, MessageSquare, CreditCard } from "lucide-react";

export default function Security() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Shield className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">الأمان والحماية</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            نلتزم بأعلى معايير الأمان لحماية بياناتك ومعاملاتك على منصة إي-بيع
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                حماية البيانات الشخصية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                تشفير جميع البيانات الشخصية بأحدث تقنيات التشفير
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                لا يتم مشاركة أرقام الهواتف بين المستخدمين
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                التحقق الثنائي لحماية حسابك
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                مراجعة دورية لسياسات الأمان
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                التواصل الآمن
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                نظام مراسلة داخلي آمن بين المشتري والبائع
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                فلترة تلقائية لأرقام الهواتف والمعلومات الحساسة
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                حظر الروابط المشبوهة والمحتوى الضار
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                إمكانية الإبلاغ عن المحادثات المخالفة
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                التحقق من البائعين
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                التحقق من هوية جميع البائعين
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                نظام تقييم شفاف للبائعين
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                علامة التوثيق للبائعين الموثوقين
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                مراجعة دورية لحسابات البائعين
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                أمان المعاملات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                نظام الدفع عند الاستلام للمعاملات الآمنة
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                توثيق جميع المعاملات برقم مرجعي فريد
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                سياسة إرجاع واضحة لحماية المشتري
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                فريق دعم مختص لحل النزاعات
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              نصائح أمان للمستخدمين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-primary">للمشترين:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    تحقق من تقييمات البائع قبل الشراء
                  </li>
                  <li className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    اطلب صور إضافية للمنتج إذا لزم الأمر
                  </li>
                  <li className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    استخدم نظام المراسلة الداخلي فقط
                  </li>
                  <li className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    افحص المنتج عند الاستلام قبل الدفع
                  </li>
                  <li className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    لا تشارك معلوماتك الشخصية خارج المنصة
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-primary">للبائعين:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    أضف صور واضحة وحقيقية للمنتجات
                  </li>
                  <li className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    اكتب وصفاً دقيقاً وصادقاً
                  </li>
                  <li className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    رد على استفسارات المشترين بسرعة
                  </li>
                  <li className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    احتفظ بإثبات التسليم
                  </li>
                  <li className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    أبلغ عن أي سلوك مشبوه
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              للمشرفين والإدارة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="bg-primary/5 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">بروتوكولات الأمان الإدارية:</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• مراجعة يومية للحسابات الجديدة والنشاط المشبوه</li>
                <li>• التحقق من وثائق الهوية للبائعين خلال 24 ساعة</li>
                <li>• مراقبة المحادثات للكشف عن محاولات الاحتيال</li>
                <li>• تحديث دوري لقوائم الحظر والفلترة</li>
                <li>• نسخ احتياطي يومي لجميع البيانات</li>
                <li>• تدريب دوري للفريق على أحدث أساليب الاحتيال</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
