import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, X } from "lucide-react";

interface AIAssistantProps {
  productTitle: string;
  productDescription: string;
}

export function AIAssistant({ productTitle, productDescription }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ type: "user" | "ai"; text: string }>>([
    {
      type: "ai",
      text: `أهلاً! أنا مساعد ذكي E-بيع. يمكنني مساعدتك بمعلومات عن "${productTitle}". اسأل أي سؤال عن جودة المنتج أو حالته أو أي شيء آخر!`,
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages([...messages, { type: "user", text: input }]);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "هذا المنتج بحالة ممتازة جداً ولم يُستخدم كثيراً. جودة المواد عالية جداً.",
        "السعر المعروض حالياً تنافسي جداً بناءً على حالة المنتج والطلب عليه في السوق.",
        "يمكنك مقارنة هذا المنتج بمنتجات مشابهة على المنصة للتأكد من أفضل سعر.",
        "المنتج نادر وقد لا تجد مثيله بسهولة. أنصحك بعدم تفويت هذه الفرصة.",
        "هذا المنتج مشهور والطلب عليه كبير جداً. قد ترتفع الأسعار قريباً.",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setMessages((prev) => [...prev, { type: "ai", text: randomResponse }]);
    }, 500);

    setInput("");
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90 text-white flex items-center justify-center z-40"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-80 shadow-2xl z-40 overflow-hidden">
      <div className="bg-primary text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <h3 className="font-bold">مساعد ذكي</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-white/20 p-1 rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="h-64 overflow-y-auto p-4 bg-white space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.type === "user"
                  ? "bg-primary text-white rounded-br-none"
                  : "bg-gray-100 text-gray-900 rounded-bl-none"
              }`}
            >
              <p className="text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t bg-gray-50 flex gap-2">
        <Input
          placeholder="اسأل سؤالاً..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          className="text-right"
        />
        <Button
          onClick={handleSend}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white px-3"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
