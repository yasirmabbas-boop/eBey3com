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
  browse: { ar: "تصفح", ku: "گەڕان" },
  
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
  productDetails: { ar: "تفاصيل المنتج", ku: "وردەکاری بەرهەم" },
  productCode: { ar: "رمز المنتج", ku: "کۆدی بەرهەم" },
  views: { ar: "مشاهدات", ku: "بینینەکان" },
  quantity: { ar: "الكمية", ku: "بڕ" },
  available: { ar: "متوفر", ku: "بەردەستە" },
  outOfStock: { ar: "نفذت الكمية", ku: "نەماوە" },
  delivery: { ar: "التوصيل", ku: "گەیاندن" },
  returnPolicy: { ar: "سياسة الإرجاع", ku: "سیاسەتی گەڕاندنەوە" },
  contactSeller: { ar: "تواصل مع البائع", ku: "پەیوەندی بە فرۆشیار" },
  sendMessage: { ar: "إرسال رسالة", ku: "نامە بنێرە" },
  share: { ar: "مشاركة", ku: "هاوبەشکردن" },
  report: { ar: "إبلاغ", ku: "ڕاپۆرت" },
  auction: { ar: "مزاد", ku: "مزایدە" },
  fixedPrice: { ar: "سعر ثابت", ku: "نرخی جێگیر" },
  currentBid: { ar: "المزايدة الحالية", ku: "مزایدەی ئێستا" },
  yourBid: { ar: "مزايدتك", ku: "مزایدەکەت" },
  minimumBid: { ar: "الحد الأدنى للمزايدة", ku: "کەمترین مزایدە" },
  placeBid: { ar: "قدم مزايدة", ku: "مزایدە بکە" },
  bidPlaced: { ar: "تم تقديم المزايدة", ku: "مزایدە نێردرا" },
  bidHistory: { ar: "سجل المزايدات", ku: "مێژووی مزایدەکان" },
  noBids: { ar: "لا توجد مزايدات", ku: "هیچ مزایدەیەک نییە" },
  highestBidder: { ar: "أعلى مزايد", ku: "بەرزترین مزایدەکار" },
  
  // Conditions - full names
  new: { ar: "جديد", ku: "نوێ" },
  likeNew: { ar: "كالجديد", ku: "وەک نوێ" },
  usedLikeNew: { ar: "مستعمل - كالجديد", ku: "بەکارهاتوو - وەک نوێ" },
  usedGood: { ar: "مستعمل - جيد", ku: "بەکارهاتوو - باش" },
  usedFair: { ar: "مستعمل - مقبول", ku: "بەکارهاتوو - قبوڵ" },
  vintage: { ar: "أثري", ku: "کۆن" },
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
  close: { ar: "إغلاق", ku: "داخستن" },
  continue: { ar: "متابعة", ku: "بەردەوام بە" },
  addToFavorites: { ar: "إضافة للمفضلة", ku: "زیادکردن بۆ دڵخوازەکان" },
  removeFromFavorites: { ar: "إزالة من المفضلة", ku: "لابردن لە دڵخوازەکان" },
  
  // Messages
  welcome: { ar: "مرحباً", ku: "بەخێربێیت" },
  loading: { ar: "جاري التحميل...", ku: "بارکردن..." },
  noResults: { ar: "لا توجد نتائج", ku: "هیچ ئەنجامێک نییە" },
  error: { ar: "حدث خطأ", ku: "هەڵە ڕوویدا" },
  success: { ar: "تم بنجاح", ku: "سەرکەوتوو بوو" },
  noProducts: { ar: "لا توجد منتجات", ku: "هیچ بەرهەمێک نییە" },
  noMatchingProducts: { ar: "لا توجد منتجات مطابقة للفلاتر", ku: "هیچ بەرهەمێک بە فلتەرەکان نییە" },
  resetFilters: { ar: "إعادة تعيين الفلاتر", ku: "ڕیسێتکردنی فلتەرەکان" },
  tryAgain: { ar: "حاول مرة أخرى", ku: "دووبارە هەوڵ بدە" },
  
  // Toast messages
  bidSuccess: { ar: "تم تقديم المزايدة بنجاح!", ku: "مزایدەکە بە سەرکەوتوویی نێردرا!" },
  bidError: { ar: "فشل في تقديم المزايدة", ku: "مزایدە شکستی هێنا" },
  offerSent: { ar: "تم إرسال العرض بنجاح!", ku: "پێشنیارەکە بە سەرکەوتوویی نێردرا!" },
  offerError: { ar: "فشل في إرسال العرض", ku: "پێشنیار شکستی هێنا" },
  addedToFavorites: { ar: "تمت الإضافة للمفضلة", ku: "زیادکرا بۆ دڵخوازەکان" },
  removedFromFavorites: { ar: "تمت الإزالة من المفضلة", ku: "لابرا لە دڵخوازەکان" },
  messageSent: { ar: "تم إرسال الرسالة", ku: "نامەکە نێردرا" },
  loginRequired: { ar: "يجب تسجيل الدخول أولاً", ku: "پێویستە سەرەتا بچیتە ژوورەوە" },
  verificationRequired: { ar: "يجب توثيق حسابك أولاً", ku: "پێویستە سەرەتا هەژمارەکەت بسەلمێنیت" },
  
  // Categories
  electronics: { ar: "إلكترونيات", ku: "ئەلیکترۆنیات" },
  vehicles: { ar: "سيارات", ku: "ئۆتۆمبێلەکان" },
  realEstate: { ar: "عقارات", ku: "خانوبەرە" },
  fashion: { ar: "أزياء", ku: "جلوبەرگ" },
  homeCategory: { ar: "منزل", ku: "ماڵەوە" },
  sports: { ar: "رياضة", ku: "وەرزش" },
  books: { ar: "كتب", ku: "کتێبەکان" },
  other: { ar: "أخرى", ku: "تر" },
  watches: { ar: "ساعات", ku: "کاتژمێر" },
  clothing: { ar: "ملابس", ku: "جلوبەرگ" },
  furniture: { ar: "أثاث", ku: "کەلوپەل" },
  jewelry: { ar: "مجوهرات", ku: "خشڵ" },
  collectibles: { ar: "مقتنيات", ku: "کۆکراوەکان" },
  music: { ar: "آلات موسيقية", ku: "ئامێری موسیقا" },
  
  // Swipe page
  swipeUp: { ar: "اسحب للأعلى", ku: "بۆ سەرەوە ڕابکێشە" },
  swipeForMore: { ar: "اسحب لمنتج آخر", ku: "بۆ بەرهەمی تر ڕابکێشە" },
  all: { ar: "الكل", ku: "هەموو" },
  newArrivals: { ar: "وصل حديثاً", ku: "تازە گەیشتوو" },
  comments: { ar: "التعليقات", ku: "سەرنجەکان" },
  writeComment: { ar: "اكتب تعليقاً...", ku: "سەرنجێک بنووسە..." },
  noComments: { ar: "لا توجد تعليقات بعد", ku: "هێشتا هیچ سەرنجێک نییە" },
  beFirstToComment: { ar: "كن أول من يعلق", ku: "یەکەم کەس بە بۆ سەرنجدان" },
  
  // Auth
  phone: { ar: "رقم الهاتف", ku: "ژمارەی مۆبایل" },
  password: { ar: "كلمة المرور", ku: "وشەی نهێنی" },
  confirmPassword: { ar: "تأكيد كلمة المرور", ku: "دڵنیاکردنەوەی وشەی نهێنی" },
  register: { ar: "تسجيل", ku: "تۆمارکردن" },
  forgotPassword: { ar: "نسيت كلمة المرور؟", ku: "وشەی نهێنیت لەبیر چوو؟" },
  signIn: { ar: "تسجيل الدخول", ku: "چوونە ژوورەوە" },
  signUp: { ar: "إنشاء حساب", ku: "دروستکردنی هەژمار" },
  createAccount: { ar: "إنشاء حساب جديد", ku: "هەژمارێکی نوێ دروست بکە" },
  alreadyHaveAccount: { ar: "لديك حساب بالفعل؟", ku: "هەژمارت هەیە؟" },
  dontHaveAccount: { ar: "ليس لديك حساب؟", ku: "هەژمارت نییە؟" },
  name: { ar: "الاسم", ku: "ناو" },
  fullName: { ar: "الاسم الكامل", ku: "ناوی تەواو" },
  email: { ar: "البريد الإلكتروني", ku: "ئیمەیل" },
  enterPhone: { ar: "أدخل رقم الهاتف", ku: "ژمارەی مۆبایل بنووسە" },
  enterPassword: { ar: "أدخل كلمة المرور", ku: "وشەی نهێنی بنووسە" },
  enterName: { ar: "أدخل اسمك", ku: "ناوت بنووسە" },
  
  // Favorites
  favorites: { ar: "المفضلة", ku: "دڵخوازەکان" },
  noFavorites: { ar: "لا توجد منتجات في المفضلة", ku: "هیچ بەرهەمێک لە دڵخوازەکان نییە" },
  
  // Cart
  cart: { ar: "سلة التسوق", ku: "سەبەتەی کڕین" },
  emptyCart: { ar: "السلة فارغة", ku: "سەبەتە بەتاڵە" },
  total: { ar: "المجموع", ku: "کۆی گشتی" },
  checkout: { ar: "إتمام الشراء", ku: "تەواوکردنی کڕین" },
  
  // Seller
  sellerDashboard: { ar: "لوحة البائع", ku: "داشبۆردی فرۆشیار" },
  myListings: { ar: "منتجاتي", ku: "بەرهەمەکانم" },
  salesHistory: { ar: "تاريخ المبيعات", ku: "مێژووی فرۆشتن" },
  becomeSeller: { ar: "كن بائعاً", ku: "ببە بە فرۆشیار" },
  sellerInfo: { ar: "معلومات البائع", ku: "زانیاری فرۆشیار" },
  verified: { ar: "موثق", ku: "پشتڕاستکراوە" },
  notVerified: { ar: "غير موثق", ku: "پشتڕاست نەکراوە" },
  sellerRating: { ar: "تقييم البائع", ku: "هەڵسەنگاندنی فرۆشیار" },
  totalSales: { ar: "إجمالي المبيعات", ku: "کۆی فرۆشتنەکان" },
  memberSince: { ar: "عضو منذ", ku: "ئەندام لە" },
  
  // Notifications
  notifications: { ar: "الإشعارات", ku: "ئاگادارکردنەوەکان" },
  noNotifications: { ar: "لا توجد إشعارات", ku: "هیچ ئاگادارکردنەوەیەک نییە" },
  markAllRead: { ar: "تحديد الكل كمقروء", ku: "هەموو وەک خوێندراو نیشان بکە" },
  
  // Currency
  iqd: { ar: "د.ع", ku: "د.ع" },
  
  // Footer/General
  accountCode: { ar: "رمز الحساب", ku: "کۆدی هەژمار" },
  settings: { ar: "الإعدادات", ku: "ڕێکخستنەکان" },
  language: { ar: "اللغة", ku: "زمان" },
  arabic: { ar: "العربية", ku: "عەرەبی" },
  kurdish: { ar: "الكردية", ku: "کوردی" },
  
  // Time
  now: { ar: "الآن", ku: "ئێستا" },
  minutesAgo: { ar: "منذ دقائق", ku: "چەند خولەکێک لەمەوپێش" },
  hoursAgo: { ar: "منذ ساعات", ku: "چەند کاتژمێرێک لەمەوپێش" },
  daysAgo: { ar: "منذ أيام", ku: "چەند ڕۆژێک لەمەوپێش" },
  days: { ar: "يوم", ku: "ڕۆژ" },
  hours: { ar: "ساعة", ku: "کاتژمێر" },
  minutes: { ar: "دقيقة", ku: "خولەک" },
  seconds: { ar: "ثانية", ku: "چرکە" },
  
  // Cities
  baghdad: { ar: "بغداد", ku: "بەغدا" },
  erbil: { ar: "أربيل", ku: "هەولێر" },
  sulaymaniyah: { ar: "السليمانية", ku: "سلێمانی" },
  duhok: { ar: "دهوك", ku: "دهۆک" },
  basra: { ar: "البصرة", ku: "بەسرە" },
  mosul: { ar: "الموصل", ku: "مووسڵ" },
  kirkuk: { ar: "كركوك", ku: "کەرکوک" },
  najaf: { ar: "النجف", ku: "نەجەف" },
  karbala: { ar: "كربلاء", ku: "کەربەلا" },
  
  // Sell form
  sellProduct: { ar: "بيع منتج", ku: "بەرهەم بفرۆشە" },
  productTitle: { ar: "عنوان المنتج", ku: "ناونیشانی بەرهەم" },
  productDescription: { ar: "وصف المنتج", ku: "وەسفی بەرهەم" },
  selectCategory: { ar: "اختر الفئة", ku: "پۆل هەڵبژێرە" },
  selectCondition: { ar: "اختر الحالة", ku: "دۆخ هەڵبژێرە" },
  selectCity: { ar: "اختر المدينة", ku: "شار هەڵبژێرە" },
  uploadImages: { ar: "رفع الصور", ku: "وێنە باربکە" },
  saleType: { ar: "نوع البيع", ku: "جۆری فرۆشتن" },
  auctionDuration: { ar: "مدة المزاد", ku: "ماوەی مزایدە" },
  publishListing: { ar: "نشر الإعلان", ku: "بڵاوکردنەوەی ڕێکلام" },
  saveDraft: { ar: "حفظ كمسودة", ku: "وەک ڕەشنووس پاشەکەوت بکە" },
  
  // Offer
  yourOffer: { ar: "عرضك", ku: "پێشنیارەکەت" },
  enterOfferAmount: { ar: "أدخل قيمة العرض", ku: "بڕی پێشنیار بنووسە" },
  sendOffer: { ar: "إرسال العرض", ku: "پێشنیار بنێرە" },
  
  // Messages
  messages: { ar: "الرسائل", ku: "نامەکان" },
  noMessages: { ar: "لا توجد رسائل", ku: "هیچ نامەیەک نییە" },
  typeMessage: { ar: "اكتب رسالتك...", ku: "نامەکەت بنووسە..." },
  
  // Account
  accountSettings: { ar: "إعدادات الحساب", ku: "ڕێکخستنەکانی هەژمار" },
  editProfile: { ar: "تعديل الملف الشخصي", ku: "پڕۆفایل دەستکاری بکە" },
  changePassword: { ar: "تغيير كلمة المرور", ku: "وشەی نهێنی بگۆڕە" },
  deleteAccount: { ar: "حذف الحساب", ku: "هەژمار بسڕەوە" },
  
  // Search
  searchPlaceholder: { ar: "ابحث عن منتجات...", ku: "بگەڕێ بۆ بەرهەمەکان..." },
  searchResults: { ar: "نتائج البحث", ku: "ئەنجامەکانی گەڕان" },
  filters: { ar: "الفلاتر", ku: "فلتەرەکان" },
  sortBy: { ar: "ترتيب حسب", ku: "ڕیزکردن بەپێی" },
  priceRange: { ar: "نطاق السعر", ku: "مەودای نرخ" },
  minPrice: { ar: "الحد الأدنى", ku: "کەمترین" },
  maxPrice: { ar: "الحد الأقصى", ku: "زۆرترین" },
  
  // Recommended
  recommended: { ar: "منتجات مقترحة", ku: "بەرهەمە پێشنیارکراوەکان" },
  browseCategories: { ar: "تصفح الأقسام", ku: "بەشەکان ببینە" },
  viewMore: { ar: "عرض المزيد", ku: "زیاتر ببینە" },
  browseProducts: { ar: "تصفح المنتجات", ku: "بەرهەمەکان ببینە" },
  startSelling: { ar: "ابدأ البيع", ku: "دەست بە فرۆشتن بکە" },
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
