import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, AlertTriangle, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PHONE_PATTERNS = [
  /07\d{8,9}/g,
  /\+964\d{10}/g,
  /٠٧[٠-٩]{8,9}/g,
  /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g,
  /\d{4}[-.\s]?\d{4}[-.\s]?\d{3}/g,
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const SOCIAL_PATTERNS = [
  /@[\w]+/g,
  /facebook\.com/gi,
  /fb\.com/gi,
  /instagram\.com/gi,
  /twitter\.com/gi,
  /whatsapp/gi,
  /واتساب/gi,
  /واتس/gi,
  /تلكرام/gi,
  /telegram/gi,
  /viber/gi,
  /snapchat/gi,
  /سناب/gi,
];

function filterMessage(message: string): { filtered: string; hasBlocked: boolean } {
  let filtered = message;
  let hasBlocked = false;

  PHONE_PATTERNS.forEach(pattern => {
    if (pattern.test(filtered)) {
      hasBlocked = true;
      filtered = filtered.replace(pattern, "[رقم محظور]");
    }
  });

  if (EMAIL_PATTERN.test(filtered)) {
    hasBlocked = true;
    filtered = filtered.replace(EMAIL_PATTERN, "[بريد محظور]");
  }

  SOCIAL_PATTERNS.forEach(pattern => {
    if (pattern.test(filtered)) {
      hasBlocked = true;
      filtered = filtered.replace(pattern, "[محتوى محظور]");
    }
  });

  return { filtered, hasBlocked };
}

interface ContactSellerProps {
  sellerName: string;
  productTitle: string;
  productCode: string;
}

export function ContactSeller({ sellerName, productTitle, productCode }: ContactSellerProps) {
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim()) {
      toast({
        title: "الرسالة فارغة",
        description: "يرجى كتابة رسالتك قبل الإرسال",
        variant: "destructive",
      });
      return;
    }

    const { filtered, hasBlocked } = filterMessage(message);

    if (hasBlocked) {
      toast({
        title: "تنبيه أمني",
        description: "تم حذف معلومات الاتصال الشخصية من رسالتك لحمايتك. استخدم نظام المراسلة الداخلي فقط.",
        variant: "destructive",
      });
    }

    setIsSending(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: "تم إرسال الرسالة",
      description: `تم إرسال رسالتك إلى ${sellerName} بنجاح`,
    });

    setMessage("");
    setIsSending(false);
    setIsOpen(false);
  };

  const predefinedMessages = [
    "هل المنتج لا يزال متوفراً؟",
    "هل يمكن التفاوض على السعر؟",
    "هل يمكن رؤية المنتج قبل الشراء؟",
    "ما هي حالة المنتج بالتفصيل؟",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2" data-testid="button-contact-seller">
          <MessageSquare className="h-4 w-4" />
          تواصل مع البائع
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            مراسلة البائع
          </DialogTitle>
          <DialogDescription>
            أرسل رسالة إلى <span className="font-semibold">{sellerName}</span> بخصوص المنتج
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="font-medium text-primary">{productTitle}</p>
            <p className="text-xs text-muted-foreground">رقم المنتج: {productCode}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-2 text-xs">
            <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">تواصل آمن</p>
              <p className="text-amber-700">لحمايتك، يتم حظر أرقام الهواتف والروابط الخارجية تلقائياً. استخدم نظام المراسلة الداخلي فقط.</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">رسائل سريعة:</p>
            <div className="flex flex-wrap gap-2">
              {predefinedMessages.map((msg, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setMessage(msg)}
                  data-testid={`button-quick-message-${i}`}
                >
                  {msg}
                </Button>
              ))}
            </div>
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            className="min-h-[100px] text-right"
            data-testid="textarea-message"
          />

          <Button 
            onClick={handleSend} 
            className="w-full gap-2"
            disabled={isSending || !message.trim()}
            data-testid="button-send-message"
          >
            {isSending ? (
              "جاري الإرسال..."
            ) : (
              <>
                <Send className="h-4 w-4" />
                إرسال الرسالة
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
