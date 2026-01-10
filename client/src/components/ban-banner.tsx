import { AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { useState } from "react";

export function BanBanner() {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  if (!user?.isBanned || dismissed) {
    return null;
  }

  const messages = {
    ar: {
      title: "تم حظر حسابك",
      message: "حسابك محظور من المنصة. لا يمكنك المزايدة أو الشراء أو البيع أو إرسال الرسائل.",
      logout: "تسجيل الخروج",
    },
    ku: {
      title: "ئەژمارەکەت قەدەغەکراوە",
      message: "ئەژمارەکەت لە سەکۆکە قەدەغەکراوە. ناتوانیت مزایدە بکەیت یان بکڕیت یان بفرۆشیت یان پەیام بنێریت.",
      logout: "دەرچوون",
    }
  };

  const t = messages[language] || messages.ar;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] bg-red-600 text-white shadow-lg" dir="rtl">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className="h-6 w-6 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-lg">{t.title}</h3>
              <p className="text-sm text-red-100">{t.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => logout()}
              className="bg-white text-red-600 px-4 py-1.5 rounded-lg font-medium text-sm hover:bg-red-50 transition-colors"
              data-testid="ban-logout-btn"
            >
              {t.logout}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 hover:bg-red-700 rounded-full transition-colors"
              data-testid="ban-dismiss-btn"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
