import { Layout } from "@/components/layout";

export default function Terms() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-primary mb-8">الشروط والأحكام</h1>
        <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
          
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">مقدمة</h2>
            <p>
              مرحباً بك في E-بيع (eby3)، منصة المزادات الإلكترونية للسلع المستعملة والنادرة في العراق. بقبولك هذه الشروط والأحكام، أنت توافق على الالتزام بجميع القواعد والسياسات المنصوص عليها هنا.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">1. شروط الاستخدام</h2>
            <p>بالاستخدام في منصتنا، فإنك توافق على:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>استخدام المنصة بشكل قانوني وأخلاقي فقط</li>
              <li>عدم نشر محتوى مسيء أو غير قانوني</li>
              <li>عدم انتحال هوية أشخاص آخرين</li>
              <li>عدم محاولة اختراق النظام أو التسبب في أضرار</li>
              <li>الالتزام بجميع القوانين والأنظمة العراقية</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">2. تسجيل الحساب</h2>
            <p>
              <strong>التحقق من الهوية:</strong> لاستخدام منصة E-بيع، يجب عليك التسجيل بمعلومات حقيقية. جميع المستخدمين يجب أن يكونوا في سن 18 سنة فأكثر.
            </p>
            <p className="mt-4">
              <strong>حسابات البائع:</strong> البائعون يجب عليهم تقديم صورة الهوية/البطاقة الموحدة وأرقام هواتفهم الحقيقية. جميع حسابات البائع تخضع للموافقة من قبل فريقنا.
            </p>
            <p className="mt-4">
              <strong>كلمة المرور:</strong> أنت مسؤول عن حفظ كلمة المرور الخاصة بك. نحن لا نتحمل مسؤولية أي استخدام غير مصرح به لحسابك.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">3. مبدأ المزاد</h2>
            <p>
              <strong>كيفية عمل المزاد:</strong> المزاد يبدأ بسعر أساسي والمشترون يضعون مزايدات متتالية. أعلى مزايدة عند انتهاء الوقت يفوز بالمنتج.
            </p>
            <p className="mt-4">
              <strong>الالتزام بالمزايدة:</strong> عند وضع مزايدة، فإنك توافق على شراء المنتج إذا فزت. الانسحاب من المزاد بعد الفوز قد يؤدي إلى إلغاء حسابك.
            </p>
            <p className="mt-4">
              <strong>الوصف الدقيق:</strong> البائعون مسؤولون عن وصف دقيق للمنتجات. إذا كان المنتج لا يطابق الوصف، يحق للمشتري طلب استرجاع الأموال.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">4. سياسة الدفع والتسليم</h2>
            <p>
              <strong>طرق الدفع:</strong> الدفع يتم مباشرة بين المشتري والبائع (التحويل البنكي، أو نقداً عند الاستلام).
            </p>
            <p className="mt-4">
              <strong>التسليم:</strong> يتم الاتفاق على طرق التسليم بين المشتري والبائع. E-بيع لا تتحمل مسؤولية فقدان أو تضرر البضاعة أثناء النقل.
            </p>
            <p className="mt-4">
              <strong>ضمان المشتري:</strong> إذا لم تستقبل البضاعة، يمكنك رفع شكوى إلى فريق الدعم خلال 7 أيام من نهاية المزاد.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">5. حماية المشتري والبائع</h2>
            <p>
              <strong>التحقق من الهوية:</strong> جميع المستخدمين يتم التحقق من هويتهم لضمان الأمان والموثوقية.
            </p>
            <p className="mt-4">
              <strong>نظام التقييم:</strong> المشترون والبائعون يمكنهم تقييم بعضهم البعض. التقييمات السلبية المتكررة قد تؤدي إلى حظر الحساب.
            </p>
            <p className="mt-4">
              <strong>حماية الحسابات المزيفة:</strong> الحسابات المشبوهة أو المزيفة سيتم حظرها فوراً.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">6. المنتجات المحظورة</h2>
            <p>لا يُسمح بمزاد المنتجات التالية:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>الأسلحة والذخيرة والمواد المتفجرة</li>
              <li>المواد المخدرة والكحوليات</li>
              <li>المنتجات المقلدة والمزيفة</li>
              <li>الحيوانات المهددة بالانقراض أو أجزاؤها</li>
              <li>أي منتج يخالف القوانين العراقية</li>
              <li>المنتجات المسروقة أو غير القانونية</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">7. المسؤولية القانونية</h2>
            <p>
              <strong>مسؤولية البائع:</strong> البائع يتحمل المسؤولية الكاملة عن شرعية وحالة المنتج المعروض.
            </p>
            <p className="mt-4">
              <strong>مسؤولية المنصة:</strong> E-بيع توفر المنصة فقط وليست طرفاً مباشراً في المعاملات. ومع ذلك، نحن ملتزمون بحل النزاعات بعدل.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">8. حل النزاعات</h2>
            <p>
              <strong>إجراء الشكوى:</strong> إذا كان لديك شكوى، يرجى التواصل مع فريق الدعم خلال 7 أيام من حدوث المشكلة.
            </p>
            <p className="mt-4">
              <strong>الوساطة:</strong> فريقنا سيحاول التوسط بين الطرفين للوصول لحل عادل.
            </p>
            <p className="mt-4">
              <strong>الحل النهائي:</strong> إذا فشلت الوساطة، قد يتم تحويل الأمر للسلطات المختصة أو المحاكم العراقية.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">9. حظر الحسابات</h2>
            <p>
              قد نقوم بحظر أو إغلاق حسابك إذا:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>انتهكت هذه الشروط</li>
              <li>قمت بنشاط احتيالي أو غير قانوني</li>
              <li>تلقيت تقييمات سلبية متكررة</li>
              <li>رفعت منتجات مقلدة أو محظورة</li>
              <li>قمت بالتحرش أو الإساءة لمستخدمين آخرين</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">10. تعديل الشروط</h2>
            <p>
              نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطارك بأي تغييرات جوهرية.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">11. التواصل والدعم</h2>
            <p>
              للأسئلة أو الشكاوى، يرجى استخدام نموذج الاتصال في صفحة "تواصل معنا".
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">12. القانون الحاكم</h2>
            <p>
              هذه الشروط والأحكام تخضع للقوانين العراقية وتُفسر وفقاً لها.
            </p>
          </section>

          <section>
            <p className="text-sm text-gray-500 mt-8">
              آخر تحديث: ديسمبر 2024
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
