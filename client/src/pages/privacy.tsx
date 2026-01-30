import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Trash2, Clock, AlertTriangle, Mail } from "lucide-react";

export default function Privacy() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">Privacy & Security Policy</h1>
          <p className="text-lg text-muted-foreground mb-2">Ebey3 LLC (Wyoming, USA)</p>
          <p className="text-sm text-gray-500">Last Updated: January 25, 2026</p>
        </div>

        {/* Quick Nav */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <a href="#privacy" className="text-primary hover:underline font-semibold">📋 Privacy Policy</a>
              <a href="#retention" className="text-primary hover:underline font-semibold">⏰ Data Retention</a>
              <a href="#deletion" className="text-primary hover:underline font-semibold">🗑️ Data Deletion</a>
              <a href="#security" className="text-primary hover:underline font-semibold">🔒 Security</a>
            </div>
          </CardContent>
        </Card>

        {/* ENGLISH SECTION */}
        <div className="space-y-8 mb-16">
          
          {/* Privacy Policy */}
          <section id="privacy">
            <Card>
              <CardHeader className="bg-primary text-white">
                <CardTitle className="text-3xl flex items-center gap-3">
                  <Shield className="h-8 w-8" /> Privacy Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                
                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">Facebook Login Integration</h3>
                  <p className="text-gray-700 mb-3">
                    When you log in with Facebook, we collect your <strong>name</strong> and <strong>email address</strong> to create and manage your account. 
                    <strong> We do not sell your data.</strong> Your information is used solely for authentication and account management.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">Information We Collect</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li><strong>Personal Data:</strong> Name, email, phone, delivery address</li>
                    <li><strong>Facebook User ID</strong> and associated Meta Platform Data</li>
                    <li><strong>Verification Documents</strong> (for sellers): National ID, personal photo</li>
                    <li><strong>Financial Information:</strong> Payment accounts (e.g., Zain Cash)</li>
                    <li><strong>Communications:</strong> Messages between buyers/sellers</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">How We Use Your Data</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>Transaction processing and marketplace operations</li>
                    <li>Seller verification and fraud prevention</li>
                    <li>Legal compliance (Iraqi and US authorities)</li>
                    <li>Platform security and improvement</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">Data Security</h3>
                  <p className="text-gray-700">
                    We use SSL/TLS encryption for data transmission and AES-256 encryption for storage. Data is hosted on secure Replit servers 
                    (Google Cloud Platform, US-Central) with restricted access controls.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">Push Notifications</h3>
                  <p className="text-gray-700 mb-3">
                    We use push notifications to keep you informed about important updates to your auctions, 
                    orders, and messages. When you enable notifications, we collect:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li><strong>Device Tokens:</strong> Unique identifiers to send notifications to your device</li>
                    <li><strong>Device Information:</strong> Device type (iOS/Android), device name</li>
                    <li><strong>Notification Preferences:</strong> Your notification settings</li>
                    <li><strong>Delivery Status:</strong> Whether notifications were successfully delivered</li>
                  </ul>
                  
                  <p className="text-gray-700 mt-4 mb-3">
                    <strong>Notification Language:</strong> Notifications are sent in your selected app language 
                    (Arabic or Kurdish). You can change your language preference in app settings at any time.
                  </p>
                  
                  <p className="text-gray-700 mt-4 mb-3">
                    <strong>Notification Types:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>Auction updates (bids, wins, auction endings)</li>
                    <li>New messages from buyers/sellers</li>
                    <li>Order status updates (payment, shipping, delivery)</li>
                    <li>Offer notifications (received, accepted, rejected)</li>
                  </ul>
                  
                  <p className="text-gray-700 mt-4 mb-3">
                    <strong>Your Control:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>Enable/disable notifications anytime in your device settings</li>
                    <li><strong>iOS:</strong> Settings → E-بيع → Notifications</li>
                    <li><strong>Android:</strong> Settings → Apps → E-بيع → Notifications</li>
                    <li><strong>Web:</strong> Browser settings → Site settings → Notifications</li>
                  </ul>
                  
                  <p className="text-gray-700 mt-4 mb-3">
                    <strong>Data Retention:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>Device tokens are kept while your account is active</li>
                    <li>Tokens for inactive users (90+ days) are automatically deleted</li>
                    <li>Notification history is kept for 120 days</li>
                    <li>You can request immediate deletion by contacting support</li>
                  </ul>
                  
                  <p className="text-gray-700 mt-4">
                    <strong className="text-red-600">We do NOT:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>Share device tokens with third parties</li>
                    <li>Send marketing notifications without explicit consent</li>
                    <li>Track your location through notifications</li>
                    <li>Sell notification data</li>
                  </ul>
                  
                  <p className="text-gray-700 mt-4">
                    <strong>Third-Party Services:</strong> We use Firebase Cloud Messaging (Google) to deliver 
                    push notifications. Firebase's privacy policy applies: 
                    <a href="https://firebase.google.com/support/privacy" className="text-primary hover:underline" target="_blank" rel="noopener"> 
                      firebase.google.com/support/privacy
                    </a>
                  </p>
                </div>

              </CardContent>
            </Card>
          </section>

          {/* Data Retention */}
          <section id="retention">
            <Card>
              <CardHeader className="bg-emerald-600 text-white">
                <CardTitle className="text-3xl flex items-center gap-3">
                  <Clock className="h-8 w-8" /> Data Retention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                    <h4 className="font-bold text-gray-900 mb-2">Active Accounts</h4>
                    <p className="text-gray-700">Data kept <strong>while account is active</strong></p>
                  </div>

                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                    <h4 className="font-bold text-gray-900 mb-2">Inactive Accounts</h4>
                    <p className="text-gray-700">Auto-deleted after <strong>2 years</strong> (30-day notice)</p>
                  </div>

                  <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
                    <h4 className="font-bold text-gray-900 mb-2">Transaction Logs</h4>
                    <p className="text-gray-700">Kept for <strong>7 years</strong> (legal compliance)</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mt-4">
                  Transaction logs are retained for 7 years to comply with Iraqi law and US IRS regulations, even if account is deleted (anonymized).
                </p>

              </CardContent>
            </Card>
          </section>

          {/* Data Deletion */}
          <section id="deletion">
            <Card>
              <CardHeader className="bg-red-600 text-white">
                <CardTitle className="text-3xl flex items-center gap-3">
                  <Trash2 className="h-8 w-8" /> Data Deletion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-red-900 mb-3 flex items-center gap-2">
                    <Clock className="h-6 w-6" /> 30-Day Deletion Guarantee
                  </h3>
                  <p className="text-red-900 text-lg">
                    Once verified, we <strong>permanently delete all personal data from our production database and backups within 30 days</strong>. 
                    This includes hard deletion from Replit's PostgreSQL database and all replicated systems.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">How to Request Deletion</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-5 border-2 border-gray-300">
                      <h4 className="font-bold text-lg mb-3">Option 1: In-App</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                        <li>Log in to your account</li>
                        <li>Go to <strong>Settings</strong></li>
                        <li>Find <strong>"Delete Account"</strong></li>
                        <li>Confirm deletion</li>
                      </ol>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-5 border-2 border-gray-300">
                      <h4 className="font-bold text-lg mb-3">Option 2: Email</h4>
                      <p className="text-gray-700 mb-2">
                        Email: <a href="mailto:security@ebey3.com" className="text-primary font-bold underline">security@ebey3.com</a>
                      </p>
                      <p className="text-sm text-gray-600">Subject: "Data Deletion Request"</p>
                      <p className="text-sm text-gray-600 mt-2">Include: Name, email/phone, Facebook ID, confirmation</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">Facebook Data Deletion Callback</h3>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-5">
                    <p className="text-gray-700 font-semibold mb-2">
                      If you remove the Ebey3 app from your Facebook settings:
                    </p>
                    <p className="text-gray-700">
                      Meta automatically notifies us, and we immediately initiate data deletion. All Meta Platform Data 
                      (Facebook User ID, profile info, tokens) will be <strong>permanently deleted within 30 days</strong>.
                    </p>
                  </div>
                </div>

              </CardContent>
            </Card>
          </section>

          {/* Security Reporting */}
          <section id="security">
            <Card>
              <CardHeader className="bg-orange-600 text-white">
                <CardTitle className="text-3xl flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8" /> Security Vulnerability Reporting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                
                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-orange-900 mb-3 flex items-center gap-2">
                    <Clock className="h-6 w-6" /> 72-Hour Response Commitment
                  </h3>
                  <p className="text-orange-900 text-lg">
                    We investigate all security reports and respond within <strong>72 hours</strong>. 
                    Our team takes every vulnerability seriously.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-300 text-center">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Mail className="h-8 w-8 text-primary" />
                    <a href="mailto:security@ebey3.com" className="text-3xl font-bold text-primary hover:underline">
                      security@ebey3.com
                    </a>
                  </div>
                  <p className="text-gray-700">
                    Report security vulnerabilities here. Include detailed information, reproduction steps, and potential impact.
                  </p>
                </div>

              </CardContent>
            </Card>
          </section>

          {/* Contact */}
          <section>
            <Card className="bg-gray-50">
              <CardContent className="pt-6 text-center">
                <h3 className="text-2xl font-bold text-primary mb-4">Contact Information</h3>
                <p className="text-gray-700 mb-2"><strong>Company:</strong> Ebey3 LLC (Wyoming, USA)</p>
                <p className="text-gray-700 mb-2"><strong>Website:</strong> <a href="https://ebey3.com" className="text-primary underline">ebey3.com</a></p>
                <p className="text-gray-700 text-lg">
                  <strong>Privacy, Security & Data Deletion:</strong>{" "}
                  <a href="mailto:security@ebey3.com" className="text-primary font-bold underline">security@ebey3.com</a>
                </p>
              </CardContent>
            </Card>
          </section>

        </div>

        {/* ARABIC SECTION */}
        <div className="space-y-8 border-t-4 border-primary pt-12" dir="rtl">
          
          {/* Privacy - Arabic */}
          <section>
            <Card>
              <CardHeader className="bg-primary text-white">
                <CardTitle className="text-3xl flex items-center gap-3">
                  <Shield className="h-8 w-8" /> سياسة الخصوصية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                
                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">تسجيل الدخول عبر Facebook</h3>
                  <p className="text-gray-700">
                    عند تسجيل الدخول باستخدام Facebook، نجمع <strong>الاسم</strong> و<strong>البريد الإلكتروني</strong> لإنشاء وإدارة حسابك.
                    <strong> نحن لا نبيع بياناتك.</strong> تُستخدم معلوماتك فقط للمصادقة وإدارة الحساب.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">المعلومات التي نجمعها</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                    <li><strong>البيانات الشخصية:</strong> الاسم، البريد الإلكتروني، رقم الهاتف، عنوان التوصيل</li>
                    <li><strong>معرف مستخدم Facebook</strong> وبيانات Meta Platform المرتبطة</li>
                    <li><strong>وثائق التحقق</strong> (للبائعين): البطاقة الوطنية، صورة شخصية</li>
                    <li><strong>المعلومات المالية:</strong> حسابات الدفع (مثل زين كاش)</li>
                    <li><strong>الاتصالات:</strong> الرسائل بين المشترين/البائعين</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">أمن البيانات</h3>
                  <p className="text-gray-700">
                    نستخدم تشفير SSL/TLS لنقل البيانات وتشفير AES-256 للتخزين. يتم استضافة البيانات على خوادم Replit الآمنة 
                    (Google Cloud Platform، منطقة US-Central) مع ضوابط وصول محدودة.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">الإشعارات الفورية</h3>
                  <p className="text-gray-700 mb-3">
                    نستخدم الإشعارات الفورية لإبقائك على اطلاع بالتحديثات المهمة حول المزادات والطلبات والرسائل. 
                    عند تفعيل الإشعارات، نقوم بجمع:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                    <li><strong>رموز الجهاز:</strong> معرفات فريدة لإرسال الإشعارات إلى جهازك</li>
                    <li><strong>معلومات الجهاز:</strong> نوع الجهاز (iOS/Android)، اسم الجهاز</li>
                    <li><strong>تفضيلات الإشعارات:</strong> إعدادات الإشعارات الخاصة بك</li>
                    <li><strong>حالة التسليم:</strong> ما إذا تم تسليم الإشعارات بنجاح</li>
                  </ul>
                  
                  <p className="text-gray-700 mt-4 mb-3">
                    <strong>لغة الإشعارات:</strong> يتم إرسال الإشعارات باللغة المحددة في التطبيق 
                    (العربية أو الكردية). يمكنك تغيير تفضيلات اللغة في إعدادات التطبيق في أي وقت.
                  </p>
                  
                  <p className="text-gray-700 mt-4 mb-3">
                    <strong>أنواع الإشعارات:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                    <li>تحديثات المزادات (مزايدات، فوز، انتهاء المزاد)</li>
                    <li>رسائل جديدة من المشترين/البائعين</li>
                    <li>تحديثات حالة الطلب (دفع، شحن، تسليم)</li>
                    <li>إشعارات العروض (مستلمة، مقبولة، مرفوضة)</li>
                  </ul>
                  
                  <p className="text-gray-700 mt-4 mb-3">
                    <strong>التحكم الخاص بك:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                    <li>تفعيل/تعطيل الإشعارات في أي وقت من إعدادات الجهاز</li>
                    <li><strong>iOS:</strong> الإعدادات → E-بيع → الإشعارات</li>
                    <li><strong>Android:</strong> الإعدادات → التطبيقات → E-بيع → الإشعارات</li>
                    <li><strong>الويب:</strong> إعدادات المتصفح → إعدادات الموقع → الإشعارات</li>
                  </ul>
                  
                  <p className="text-gray-700 mt-4 mb-3">
                    <strong>الاحتفاظ بالبيانات:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                    <li>يتم الاحتفاظ برموز الجهاز طالما حسابك نشط</li>
                    <li>يتم حذف رموز المستخدمين غير النشطين (90+ يوم) تلقائياً</li>
                    <li>يتم الاحتفاظ بسجل الإشعارات لمدة 120 يوماً</li>
                    <li>يمكنك طلب الحذف الفوري بالاتصال بالدعم</li>
                  </ul>
                  
                  <p className="text-gray-700 mt-4">
                    <strong className="text-red-600">نحن لا نقوم بـ:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
                    <li>مشاركة رموز الجهاز مع أطراف ثالثة</li>
                    <li>إرسال إشعارات تسويقية دون موافقة صريحة</li>
                    <li>تتبع موقعك من خلال الإشعارات</li>
                    <li>بيع بيانات الإشعارات</li>
                  </ul>
                  
                  <p className="text-gray-700 mt-4">
                    <strong>خدمات الطرف الثالث:</strong> نستخدم Firebase Cloud Messaging (Google) لتوصيل 
                    الإشعارات الفورية. تطبق سياسة خصوصية Firebase: 
                    <a href="https://firebase.google.com/support/privacy" className="text-primary hover:underline" target="_blank" rel="noopener"> 
                      firebase.google.com/support/privacy
                    </a>
                  </p>
                </div>

              </CardContent>
            </Card>
          </section>

          {/* Retention - Arabic */}
          <section>
            <Card>
              <CardHeader className="bg-emerald-600 text-white">
                <CardTitle className="text-3xl flex items-center gap-3">
                  <Clock className="h-8 w-8" /> الاحتفاظ بالبيانات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 border-r-4 border-blue-500 p-4">
                    <h4 className="font-bold text-gray-900 mb-2">الحسابات النشطة</h4>
                    <p className="text-gray-700">الاحتفاظ <strong>طالما الحساب نشط</strong></p>
                  </div>

                  <div className="bg-amber-50 border-r-4 border-amber-500 p-4">
                    <h4 className="font-bold text-gray-900 mb-2">الحسابات غير النشطة</h4>
                    <p className="text-gray-700">حذف تلقائي بعد <strong>سنتين</strong> (إشعار 30 يوم)</p>
                  </div>

                  <div className="bg-purple-50 border-r-4 border-purple-500 p-4">
                    <h4 className="font-bold text-gray-900 mb-2">سجلات المعاملات</h4>
                    <p className="text-gray-700">الاحتفاظ لمدة <strong>7 سنوات</strong> (الامتثال القانوني)</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mt-4">
                  يتم الاحتفاظ بسجلات المعاملات لمدة 7 سنوات للامتثال للقانون العراقي ولوائح IRS الأمريكية، حتى لو تم حذف الحساب (مجهول الهوية).
                </p>

              </CardContent>
            </Card>
          </section>

          {/* Deletion - Arabic */}
          <section>
            <Card>
              <CardHeader className="bg-red-600 text-white">
                <CardTitle className="text-3xl flex items-center gap-3">
                  <Trash2 className="h-8 w-8" /> حذف البيانات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-red-900 mb-3 flex items-center gap-2">
                    <Clock className="h-6 w-6" /> ضمان الحذف خلال 30 يومًا
                  </h3>
                  <p className="text-red-900 text-lg">
                    بمجرد التحقق، <strong>نحذف نهائيًا جميع البيانات الشخصية من قاعدة البيانات والنسخ الاحتياطية خلال 30 يومًا</strong>. 
                    يشمل ذلك الحذف الكامل من قاعدة بيانات PostgreSQL وجميع الأنظمة المتماثلة.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">كيفية طلب الحذف</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-5 border-2 border-gray-300">
                      <h4 className="font-bold text-lg mb-3">الخيار 1: من التطبيق</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                        <li>تسجيل الدخول إلى حسابك</li>
                        <li>الانتقال إلى <strong>الإعدادات</strong></li>
                        <li>العثور على <strong>"حذف الحساب"</strong></li>
                        <li>تأكيد الحذف</li>
                      </ol>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-5 border-2 border-gray-300">
                      <h4 className="font-bold text-lg mb-3">الخيار 2: البريد الإلكتروني</h4>
                      <p className="text-gray-700 mb-2">
                        البريد: <a href="mailto:security@ebey3.com" className="text-primary font-bold underline">security@ebey3.com</a>
                      </p>
                      <p className="text-sm text-gray-600">الموضوع: "طلب حذف البيانات"</p>
                      <p className="text-sm text-gray-600 mt-2">تضمين: الاسم، البريد/الهاتف، معرف Facebook، التأكيد</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">إشعار حذف بيانات Facebook</h3>
                  <div className="bg-blue-50 border-r-4 border-blue-500 p-5">
                    <p className="text-gray-700 font-semibold mb-2">
                      إذا قمت بإزالة تطبيق Ebey3 من إعدادات Facebook:
                    </p>
                    <p className="text-gray-700">
                      يقوم Meta تلقائيًا بإخطارنا، ونبدأ فورًا حذف البيانات. سيتم <strong>حذف جميع بيانات Meta Platform نهائيًا خلال 30 يومًا</strong>.
                    </p>
                  </div>
                </div>

              </CardContent>
            </Card>
          </section>

          {/* Security - Arabic */}
          <section>
            <Card>
              <CardHeader className="bg-orange-600 text-white">
                <CardTitle className="text-3xl flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8" /> الإبلاغ عن الثغرات الأمنية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                
                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-orange-900 mb-3 flex items-center gap-2">
                    <Clock className="h-6 w-6" /> التزام بالرد خلال 72 ساعة
                  </h3>
                  <p className="text-orange-900 text-lg">
                    نحقق في جميع التقارير الأمنية ونستجيب خلال <strong>72 ساعة</strong>. 
                    يأخذ فريقنا كل ثغرة على محمل الجد.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-300 text-center">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Mail className="h-8 w-8 text-primary" />
                    <a href="mailto:security@ebey3.com" className="text-3xl font-bold text-primary hover:underline">
                      security@ebey3.com
                    </a>
                  </div>
                  <p className="text-gray-700">
                    للإبلاغ عن الثغرات الأمنية. قدم معلومات مفصلة وخطوات إعادة الإنتاج والتأثير المحتمل.
                  </p>
                </div>

              </CardContent>
            </Card>
          </section>

          {/* Contact - Arabic */}
          <section>
            <Card className="bg-gray-50">
              <CardContent className="pt-6 text-center">
                <h3 className="text-2xl font-bold text-primary mb-4">معلومات الاتصال</h3>
                <p className="text-gray-700 mb-2"><strong>الشركة:</strong> Ebey3 LLC (Wyoming, USA)</p>
                <p className="text-gray-700 mb-2"><strong>الموقع:</strong> <a href="https://ebey3.com" className="text-primary underline">ebey3.com</a></p>
                <p className="text-gray-700 text-lg">
                  <strong>الخصوصية والأمان وحذف البيانات:</strong>{" "}
                  <a href="mailto:security@ebey3.com" className="text-primary font-bold underline">security@ebey3.com</a>
                </p>
              </CardContent>
            </Card>
          </section>

        </div>

        {/* Acknowledgment */}
        <div className="mt-12 p-6 bg-primary text-white rounded-lg text-center">
          <p className="text-lg font-semibold mb-2">
            By using Ebey3, you agree to this Privacy & Security Policy.
          </p>
          <p className="text-lg font-semibold" dir="rtl">
            باستخدام Ebey3، فإنك توافق على سياسة الخصوصية والأمان هذه.
          </p>
        </div>

      </div>
    </Layout>
  );
}
