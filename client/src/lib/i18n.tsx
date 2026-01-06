import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "ar" | "ku";

interface Translations {
  [key: string]: {
    ar: string;
    ku: string;
  };
}

export const translations: Translations = {
  // Navigation
  home: { ar: "الرئيسية", ku: "سەرەکی" },
  auctions: { ar: "المزادات", ku: "مزایدەکان" },
  buyNow: { ar: "شراء الآن", ku: "ئێستا بیکڕە" },
  viewAll: { ar: "عرض الكل", ku: "هەموو ببینە" },
  search: { ar: "البحث", ku: "گەڕان" },
  myAccount: { ar: "حسابي", ku: "هەژمارەکەم" },
  myShop: { ar: "دكاني", ku: "دوکانەکەم" },
  myPurchases: { ar: "مشترياتي", ku: "کڕینەکانم" },
  logout: { ar: "خروج", ku: "چوونە دەرەوە" },
  login: { ar: "تسجيل الدخول", ku: "چوونە ژوورەوە" },
  addProduct: { ar: "أضف منتج", ku: "بەرهەم زیاد بکە" },
  shareSite: { ar: "شارك الموقع", ku: "ماڵپەڕەکە هاوبەش بکە" },
  
  // Product details
  currentPrice: { ar: "السعر الحالي", ku: "نرخی ئێستا" },
  startingPrice: { ar: "السعر الابتدائي", ku: "نرخی دەستپێکردن" },
  price: { ar: "السعر", ku: "نرخ" },
  bidNow: { ar: "مزايدة", ku: "مزایدە بکە" },
  buyNowButton: { ar: "شراء الآن", ku: "ئێستا بیکڕە" },
  makeOffer: { ar: "قدم عرض", ku: "پێشنیار بکە" },
  addToCart: { ar: "إضافة للسلة", ku: "زیادکردن بۆ سەبەتە" },
  seller: { ar: "البائع", ku: "فرۆشیار" },
  condition: { ar: "الحالة", ku: "دۆخ" },
  category: { ar: "الفئة", ku: "پۆل" },
  location: { ar: "الموقع", ku: "شوێن" },
  description: { ar: "الوصف", ku: "وەسف" },
  timeLeft: { ar: "الوقت المتبقي", ku: "کاتی ماوە" },
  auctionEnded: { ar: "انتهى المزاد", ku: "مزایدە تەواو بوو" },
  sold: { ar: "تم البيع", ku: "فرۆشرا" },
  
  // Conditions
  new: { ar: "جديد", ku: "نوێ" },
  likeNew: { ar: "كالجديد", ku: "وەک نوێ" },
  good: { ar: "جيد", ku: "باش" },
  fair: { ar: "مقبول", ku: "قبوڵ" },
  
  // Actions
  submit: { ar: "إرسال", ku: "ناردن" },
  cancel: { ar: "إلغاء", ku: "هەڵوەشاندنەوە" },
  confirm: { ar: "تأكيد", ku: "دڵنیاکردنەوە" },
  save: { ar: "حفظ", ku: "پاشەکەوتکردن" },
  edit: { ar: "تعديل", ku: "دەستکاری" },
  delete: { ar: "حذف", ku: "سڕینەوە" },
  back: { ar: "رجوع", ku: "گەڕانەوە" },
  next: { ar: "التالي", ku: "دواتر" },
  previous: { ar: "السابق", ku: "پێشتر" },
  
  // Messages
  welcome: { ar: "مرحباً", ku: "بەخێربێیت" },
  loading: { ar: "جاري التحميل...", ku: "بارکردن..." },
  noResults: { ar: "لا توجد نتائج", ku: "هیچ ئەنجامێک نییە" },
  error: { ar: "حدث خطأ", ku: "هەڵە ڕوویدا" },
  success: { ar: "تم بنجاح", ku: "سەرکەوتوو بوو" },
  
  // Categories
  electronics: { ar: "إلكترونيات", ku: "ئەلیکترۆنیات" },
  vehicles: { ar: "سيارات", ku: "ئۆتۆمبێلەکان" },
  realEstate: { ar: "عقارات", ku: "خانوبەرە" },
  fashion: { ar: "أزياء", ku: "جلوبەرگ" },
  homeCategory: { ar: "منزل", ku: "ماڵەوە" },
  sports: { ar: "رياضة", ku: "وەرزش" },
  books: { ar: "كتب", ku: "کتێبەکان" },
  other: { ar: "أخرى", ku: "تر" },
  
  // Swipe page
  swipeUp: { ar: "اسحب للأعلى", ku: "بۆ سەرەوە ڕابکێشە" },
  swipeForMore: { ar: "اسحب لمنتج آخر", ku: "بۆ بەرهەمی تر ڕابکێشە" },
  all: { ar: "الكل", ku: "هەموو" },
  newArrivals: { ar: "وصل حديثاً", ku: "تازە گەیشتوو" },
  comments: { ar: "التعليقات", ku: "سەرنجەکان" },
  writeComment: { ar: "اكتب تعليقاً...", ku: "سەرنجێک بنووسە..." },
  
  // Auth
  phone: { ar: "رقم الهاتف", ku: "ژمارەی مۆبایل" },
  password: { ar: "كلمة المرور", ku: "وشەی نهێنی" },
  confirmPassword: { ar: "تأكيد كلمة المرور", ku: "دڵنیاکردنەوەی وشەی نهێنی" },
  register: { ar: "تسجيل", ku: "تۆمارکردن" },
  forgotPassword: { ar: "نسيت كلمة المرور؟", ku: "وشەی نهێنیت لەبیر چوو؟" },
  
  // Favorites
  favorites: { ar: "المفضلة", ku: "دڵخوازەکان" },
  
  // Cart
  cart: { ar: "سلة التسوق", ku: "سەبەتەی کڕین" },
  emptyCart: { ar: "السلة فارغة", ku: "سەبەتە بەتاڵە" },
  total: { ar: "المجموع", ku: "کۆی گشتی" },
  checkout: { ar: "إتمام الشراء", ku: "تەواوکردنی کڕین" },
  
  // Seller
  sellerDashboard: { ar: "لوحة البائع", ku: "داشبۆردی فرۆشیار" },
  myListings: { ar: "منتجاتي", ku: "بەرهەمەکانم" },
  salesHistory: { ar: "تاريخ المبيعات", ku: "مێژووی فرۆشتن" },
  
  // Notifications
  notifications: { ar: "الإشعارات", ku: "ئاگادارکردنەوەکان" },
  noNotifications: { ar: "لا توجد إشعارات", ku: "هیچ ئاگادارکردنەوەیەک نییە" },
  
  // Currency
  iqd: { ar: "د.ع", ku: "د.ع" },
  
  // Footer/General
  accountCode: { ar: "رمز الحساب", ku: "کۆدی هەژمار" },
  settings: { ar: "الإعدادات", ku: "ڕێکخستنەکان" },
  language: { ar: "اللغة", ku: "زمان" },
  arabic: { ar: "العربية", ku: "عەرەبی" },
  kurdish: { ar: "الكردية", ku: "کوردی" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("language") as Language) || "ar";
    }
    return "ar";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
