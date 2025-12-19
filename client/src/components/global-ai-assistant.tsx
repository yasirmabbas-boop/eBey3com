import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, X, HelpCircle } from "lucide-react";

export function GlobalAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ type: "user" | "ai"; text: string }>>([
    {
      type: "ai",
      text: `مرحباً! أنا مساعدك الذكي في E-بيع. كيف يمكنني مساعدتك اليوم؟`,
    },
  ]);
  const [input, setInput] = useState("");

  const commonQuestions = [
    "كيف أشارك في المزاد؟",
    "ما هي طرق الدفع؟",
    "كيف أتأكد من جودة المنتج؟",
    "هل يمكنني استرجاع المنتج؟",
  ];

  const handleSend = (text: string = input) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { type: "user", text: text }]);
    setInput("");

    // Simulate AI response logic
    setTimeout(() => {
      let response = "شكراً لسؤالك! سأقوم بتوجيهك للقسم المختص.";
      
      if (text.includes("المزاد")) {
        response = "للمشاركة في المزاد، يجب عليك أولاً إنشاء حساب وتوثيقه برقم هاتف عراقي. بعد ذلك يمكنك الدخول لصفحة أي منتج ووضع سومتك.";
      } else if (text.includes("الدفع")) {
        response = "حالياً نقبل الدفع النقدي عند الاستلام (Cash on Delivery) لضمان حقك. قريباً سنضيف الدفع الإلكتروني.";
      } else if (text.includes("جودة")) {
        response = "نحن نقوم بفحص جميع المنتجات المعروضة من قبل خبراء مختصين، ونمنح شارة 'موثوق' للبائعين المعتمدين.";
      } else if (text.includes("استرجاع")) {
        response = "نعم، يمكنك استرجاع المنتج في حال كان مخالفاً للمواصفات المذكورة في العرض خلال 24 ساعة من الاستلام.";
      }

      setMessages((prev) => [...prev, { type: "ai", text: response }]);
    }, 800);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center z-50 animate-bounce"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-80 sm:w-96 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[500px]">
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <div>
            <h3 className="font-bold">مساعد E-بيع الذكي</h3>
            <p className="text-xs text-blue-100">متواجد للمساعدة 24/7</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-white/20 p-1 rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                msg.type === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-white text-gray-800 border rounded-bl-none shadow-sm"
              }`}
            >
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
        
        {messages.length === 1 && (
          <div className="grid grid-cols-1 gap-2 mt-4">
            <p className="text-xs text-gray-500 mb-2 font-semibold">أسئلة شائعة:</p>
            {commonQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="text-right text-xs bg-white border hover:bg-blue-50 hover:border-blue-200 p-2 rounded-lg transition-colors text-gray-700"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t bg-white flex gap-2">
        <Input
          placeholder="كيف يمكنني مساعدتك؟"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          className="text-right"
        />
        <Button
          onClick={() => handleSend()}
          size="icon"
          className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
