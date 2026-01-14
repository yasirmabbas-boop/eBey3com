import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, HelpCircle, Phone, Mail, MapPin } from "lucide-react";

export default function ContactUs() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        throw new Error("Failed to send message");
      }
      
      toast({
        title: "تم إرسال رسالتك بنجاح ✅",
        description: "سيقوم فريقنا بالرد عليك في أقرب وقت ممكن.",
      });
      
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إرسال الرسالة. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChatSend = () => {
    if (!chatMessage.trim()) return;
    toast({
      title: "تم إرسال الرسالة",
      description: "مرحباً بك في المحادثة المباشرة! سيتحدث معك أحد ممثلينا حالاً.",
    });
    setChatMessage("");
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">اتصل بنا</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            نحن هنا لمساعدتك. إذا كان لديك أي استفسار أو اقتراح، لا تتردد في التواصل معنا.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Mail className="h-6 w-6 text-primary" />
                أرسل لنا رسالة
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">الاسم الكامل</label>
                    <Input 
                      placeholder="أدخل اسمك الكامل" 
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required 
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">البريد الإلكتروني</label>
                    <Input 
                      type="email" 
                      placeholder="example@domain.com" 
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required 
                      data-testid="input-contact-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">سبب التواصل</label>
                  <Select 
                    value={formData.subject}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                  >
                    <SelectTrigger data-testid="select-contact-subject">
                      <SelectValue placeholder="اختر سبب التواصل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="دعم فني">دعم فني</SelectItem>
                      <SelectItem value="استفسار عن مبيعات">استفسار عن مبيعات</SelectItem>
                      <SelectItem value="مشكلة في المزاد">مشكلة في المزاد</SelectItem>
                      <SelectItem value="شكوى">شكوى</SelectItem>
                      <SelectItem value="اقتراح">اقتراح</SelectItem>
                      <SelectItem value="أخرى">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">الرسالة</label>
                  <Textarea 
                    placeholder="اكتب تفاصيل استفسارك هنا..." 
                    className="min-h-[150px]"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    required 
                    data-testid="input-contact-message"
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-lg" disabled={loading} data-testid="button-contact-submit">
                  {loading ? "جاري الإرسال..." : "إرسال الرسالة"}
                </Button>
              </form>
            </Card>

            {/* Message Board / FAQ Section */}
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4">الأسئلة الشائعة</h3>
              <div className="grid gap-4">
                {[
                  {
                    q: "كيف يمكنني المشاركة في المزاد؟",
                    a: "يمكنك المشاركة في المزاد عن طريق إنشاء حساب وتوثيق رقم هاتفك، ثم الدخول لصفحة المزاد ووضع سومتك."
                  },
                  {
                    q: "ما هي طرق الدفع المتاحة؟",
                    a: "حالياً نقبل الدفع النقدي عند الاستلام فقط (Cash on Delivery). سنقوم بتوفير الدفع الإلكتروني قريباً."
                  },
                  {
                    q: "كيف أضمن حقي كمشتري؟",
                    a: "نقوم بفحص وتوثيق جميع البائعين قبل السماح لهم بالبيع. من مسؤولية المشتري الإبلاغ عن أي مشكلة خلال 3 أيام لضمان التواصل المبكر مع البائع. يجب فحص المنتج قبل الاستلام والتأكد من سياسة الإرجاع الخاصة بالبائع."
                  }
                ].map((faq, idx) => (
                  <Card key={idx} className="p-4 bg-muted/30">
                    <h4 className="font-bold flex items-center gap-2 mb-2">
                      <HelpCircle className="h-4 w-4 text-primary" />
                      {faq.q}
                    </h4>
                    <p className="text-sm text-gray-600 mr-6">{faq.a}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Info & Live Chat */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                معلومات التواصل
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">الاستفسارات العامة</p>
                    <a 
                      href="mailto:info@ebey3.com" 
                      className="text-primary hover:underline text-sm"
                      data-testid="link-email-info"
                    >
                      info@ebey3.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">الدعم الفني</p>
                    <a 
                      href="mailto:support@ebey3.com" 
                      className="text-primary hover:underline text-sm"
                      data-testid="link-email-support"
                    >
                      support@ebey3.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">الموقع</p>
                    <p className="text-sm text-gray-600">العراق</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Live Chat Widget - Hidden for now, activate later by setting SHOW_LIVE_CHAT to true */}
            {false && <Card className="p-6 border-2 border-primary/20">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-bold text-lg">المحادثة المباشرة</h3>
                <p className="text-sm text-gray-600 mt-1">
                  تحدث مباشرة مع فريق الدعم الفني
                </p>
                <div className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                  متاح الآن
                </div>
              </div>

              {!showLiveChat ? (
                <Button 
                  onClick={() => setShowLiveChat(true)} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  بدء المحادثة
                </Button>
              ) : (
                <div className="bg-gray-50 rounded-lg border p-3">
                  <div className="h-48 overflow-y-auto mb-3 space-y-2 text-sm">
                    <div className="bg-white p-2 rounded shadow-sm max-w-[85%] mr-auto">
                      مرحباً بك! كيف يمكنني مساعدتك اليوم؟
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="اكتب رسالتك..." 
                      className="h-9 text-sm"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                    />
                    <Button size="icon" className="h-9 w-9" onClick={handleChatSend}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
