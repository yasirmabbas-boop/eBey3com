import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

export type Language = 'ar' | 'ku' | 'en';

// Translation dictionary — ported from client/src/lib/i18n.tsx
// Using the same key structure so translations stay in sync
const translations: Record<string, Record<Language, string>> = {
  // Navigation
  home: { ar: 'الرئيسية', ku: 'سەرەکی', en: 'Home' },
  auctions: { ar: 'المزادات', ku: 'مزایدەکان', en: 'Auctions' },
  buyNow: { ar: 'شراء الآن', ku: 'ئێستا بیکڕە', en: 'Buy Now' },
  viewAll: { ar: 'عرض الكل', ku: 'هەموو ببینە', en: 'View All' },
  search: { ar: 'البحث', ku: 'گەڕان', en: 'Search' },
  myAccount: { ar: 'حسابي', ku: 'هەژمارەکەم', en: 'My Account' },
  favorites: { ar: 'المفضلة', ku: 'دڵخوازەکان', en: 'Favorites' },
  notifications: { ar: 'الإشعارات', ku: 'ئاگادارییەکان', en: 'Notifications' },
  browse: { ar: 'تصفح', ku: 'گەڕان', en: 'Browse' },
  login: { ar: 'تسجيل الدخول', ku: 'چوونە ژوورەوە', en: 'Log In' },
  logout: { ar: 'خروج', ku: 'چوونە دەرەوە', en: 'Log Out' },
  addProduct: { ar: 'أضف منتج', ku: 'بەرهەم زیاد بکە', en: 'Add Product' },

  // Product details
  currentPrice: { ar: 'السعر الحالي', ku: 'نرخی ئێستا', en: 'Current Price' },
  startingPrice: { ar: 'السعر الابتدائي', ku: 'نرخی دەستپێکردن', en: 'Starting Price' },
  price: { ar: 'السعر', ku: 'نرخ', en: 'Price' },
  bidNow: { ar: 'مزايدة', ku: 'مزایدە بکە', en: 'Bid Now' },
  buyNowButton: { ar: 'شراء الآن', ku: 'ئێستا بیکڕە', en: 'Buy Now' },
  makeOffer: { ar: 'قدم عرض', ku: 'پێشنیار بکە', en: 'Make Offer' },
  addToCart: { ar: 'إضافة للسلة', ku: 'زیادکردن بۆ سەبەتە', en: 'Add to Cart' },
  seller: { ar: 'البائع', ku: 'فرۆشیار', en: 'Seller' },
  condition: { ar: 'الحالة', ku: 'دۆخ', en: 'Condition' },
  category: { ar: 'الفئة', ku: 'پۆل', en: 'Category' },
  location: { ar: 'الموقع', ku: 'شوێن', en: 'Location' },
  description: { ar: 'الوصف', ku: 'ڕوونکردنەوە', en: 'Description' },
  timeLeft: { ar: 'الوقت المتبقي', ku: 'کاتی ماوە', en: 'Time Left' },
  auctionEnded: { ar: 'انتهى المزاد', ku: 'مزایدە تەواو بوو', en: 'Auction Ended' },
  sold: { ar: 'تم البيع', ku: 'فرۆشرا', en: 'Sold' },
  share: { ar: 'مشاركة', ku: 'هاوبەشکردن', en: 'Share' },
  contactSeller: { ar: 'تواصل مع البائع', ku: 'پەیوەندی بە فرۆشیار', en: 'Contact Seller' },

  // Common
  loading: { ar: 'جاري التحميل...', ku: 'چاوەڕوانبە...', en: 'Loading...' },
  error: { ar: 'حدث خطأ', ku: 'هەڵەیەک ڕوویدا', en: 'An error occurred' },
  retry: { ar: 'إعادة المحاولة', ku: 'دووبارە هەوڵبدەرەوە', en: 'Retry' },
  cancel: { ar: 'إلغاء', ku: 'پاشگەزبوونەوە', en: 'Cancel' },
  confirm: { ar: 'تأكيد', ku: 'دڵنیابوونەوە', en: 'Confirm' },
  save: { ar: 'حفظ', ku: 'پاشەکەوتکردن', en: 'Save' },
  delete: { ar: 'حذف', ku: 'سڕینەوە', en: 'Delete' },
  edit: { ar: 'تعديل', ku: 'دەستکاری', en: 'Edit' },
};

// Convert { key: { ar, ku, en } } → { ar: { translation: { key: val } }, ... }
function buildResources() {
  const langs: Language[] = ['ar', 'ku', 'en'];
  const resources: Record<string, { translation: Record<string, string> }> = {};

  for (const lang of langs) {
    resources[lang] = { translation: {} };
    for (const [key, values] of Object.entries(translations)) {
      resources[lang].translation[key] = values[lang];
    }
  }

  return resources;
}

export async function getStoredLanguage(): Promise<Language> {
  try {
    const stored = await AsyncStorage.getItem('language');
    if (stored === 'ar' || stored === 'ku' || stored === 'en') return stored;
  } catch {}
  return 'ar'; // Default to Arabic
}

export async function setLanguage(lang: Language) {
  const isRTL = lang === 'ar' || lang === 'ku';
  I18nManager.forceRTL(isRTL);
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem('language', lang);
}

export function initI18n() {
  i18n.use(initReactI18next).init({
    resources: buildResources(),
    lng: 'ar',
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
  });

  // Load stored language preference
  getStoredLanguage().then((lang) => {
    i18n.changeLanguage(lang);
  });
}

export default i18n;
