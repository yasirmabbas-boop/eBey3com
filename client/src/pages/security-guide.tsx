import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Shield, Smartphone, Lock, Eye, AlertTriangle, CheckCircle } from "lucide-react";

export default function SecurityGuide() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-primary mb-4">دليل أمان الحساب</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            دليلك الشامل لحماية حسابك ومعلوماتك الشخصية على منصة E-بيع.
            اتبع هذه الخطوات لضمان تجربة آمنة وموثوقة.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Step 1 */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-xl shrink-0">
                1
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">كلمة المرور القوية</h3>
                <p className="text-gray-600 mb-4">
                  استخدم كلمة مرور تتكون من 8 أحرف على الأقل، وتحتوي على أرقام ورموز.
                </p>
                <div className="bg-gray-100 p-4 rounded-lg text-center text-sm text-gray-500">
                  [صورة توضيحية لواجهة تغيير كلمة المرور]
                </div>
              </div>
            </div>
          </Card>

          {/* Step 2 */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-xl shrink-0">
                2
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">تفعيل المصادقة الثنائية (2FA)</h3>
                <p className="text-gray-600 mb-4">
                  اربط حسابك برقم هاتفك لتلقي رمز التحقق عند كل عملية تسجيل دخول.
                </p>
                <div className="bg-gray-100 p-4 rounded-lg text-center text-sm text-gray-500">
                  [صورة توضيحية لرمز الـ SMS]
                </div>
              </div>
            </div>
          </Card>

          {/* Step 3 */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-xl shrink-0">
                3
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">تنبيهات تسجيل الدخول</h3>
                <p className="text-gray-600 mb-4">
                  سنقوم بإرسال تنبيه عبر الواتساب أو الرسائل القصيرة عند محاولة الدخول من جهاز جديد.
                </p>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                    <span className="font-bold text-green-800 text-sm">تنبيه أمني جديد</span>
                  </div>
                  <p className="text-xs text-green-700">
                    "تم تسجيل الدخول لحسابك من جهاز جديد (iPhone 13) في بغداد."
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Step 4 */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-xl shrink-0">
                4
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">التحقق من الروابط</h3>
                <p className="text-gray-600 mb-4">
                  تأكد دائماً من أنك تتصفح الموقع الرسمي <strong>eby3.iq</strong> ولا تضغط على روابط مشبوهة.
                </p>
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm font-semibold">https://eby3.iq</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-12 max-w-4xl mx-auto">
          <Card className="p-8 bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-8 w-8 text-yellow-600 shrink-0" />
              <div>
                <h3 className="font-bold text-xl text-yellow-800 mb-2">تحذير هام</h3>
                <p className="text-yellow-700">
                  فريق E-بيع لن يطلب منك أبداً كلمة المرور الخاصة بك أو رمز التحقق (OTP) عبر الهاتف أو البريد الإلكتروني.
                  لا تشارك هذه المعلومات مع أي شخص.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button size="lg" className="h-12 text-lg px-8">
            تفعيل إعدادات الأمان الآن
          </Button>
        </div>
      </div>
    </Layout>
  );
}
