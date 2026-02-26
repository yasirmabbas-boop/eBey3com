import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "ar" | "ku" | "en";

interface Translations {
  [key: string]: {
    ar: string;
    ku: string;
    en?: string;
  };
}

export const translations: Translations = {
  // Navigation
  home: { ar: "الرئيسية", ku: "سەرەکی", en: "Home" },
  auctions: { ar: "المزادات", ku: "مزایدەکان", en: "Auctions" },
  buyNow: { ar: "شراء الآن", ku: "ئێستا بیکڕە", en: "Buy Now" },
  viewAll: { ar: "عرض الكل", ku: "هەموو ببینە", en: "View All" },
  search: { ar: "البحث", ku: "گەڕان", en: "Search" },
  myAccount: { ar: "حسابي", ku: "هەژمارەکەم", en: "My Account" },
  myShop: { ar: "دكاني", ku: "دوکانەکەم", en: "My Shop" },
  myPurchases: { ar: "مشترياتي", ku: "کڕینەکانم", en: "My Purchases" },
  logout: { ar: "خروج", ku: "چوونە دەرەوە", en: "Log Out" },
  login: { ar: "تسجيل الدخول", ku: "چوونە ژوورەوە", en: "Log In" },
  addProduct: { ar: "أضف منتج", ku: "بەرهەم زیاد بکە", en: "Add Product" },
  shareSite: { ar: "شارك الموقع", ku: "ماڵپەڕەکە هاوبەش بکە", en: "Share Site" },
  browse: { ar: "تصفح", ku: "گەڕان", en: "Browse" },
  
  // Product details
  currentPrice: { ar: "السعر الحالي", ku: "نرخی ئێستا", en: "Current Price" },
  startingPrice: { ar: "السعر الابتدائي", ku: "نرخی دەستپێکردن", en: "Starting Price" },
  price: { ar: "السعر", ku: "نرخ", en: "Price" },
  bidNow: { ar: "مزايدة", ku: "مزایدە بکە", en: "Bid Now" },
  buyNowButton: { ar: "شراء الآن", ku: "ئێستا بیکڕە", en: "Buy Now" },
  makeOffer: { ar: "قدم عرض", ku: "پێشنیار بکە", en: "Make Offer" },
  addToCart: { ar: "إضافة للسلة", ku: "زیادکردن بۆ سەبەتە", en: "Add to Cart" },
  seller: { ar: "البائع", ku: "فرۆشیار", en: "Seller" },
  condition: { ar: "الحالة", ku: "دۆخ", en: "Condition" },
  category: { ar: "الفئة", ku: "پۆل", en: "Category" },
  location: { ar: "الموقع", ku: "شوێن", en: "Location" },
  description: { ar: "الوصف", ku: "ڕوونکردنەوە", en: "Description" },
  timeLeft: { ar: "الوقت المتبقي", ku: "کاتی ماوە", en: "Time Left" },
  auctionEnded: { ar: "انتهى المزاد", ku: "مزایدە تەواو بوو", en: "Auction Ended" },
  sold: { ar: "تم البيع", ku: "فرۆشرا", en: "Sold" },
  productDetails: { ar: "تفاصيل المنتج", ku: "وردەکاری بەرهەم", en: "Product Details" },
  productCode: { ar: "رمز المنتج", ku: "کۆدی بەرهەم", en: "Product Code" },
  views: { ar: "مشاهدات", ku: "بینینەکان", en: "Views" },
  quantity: { ar: "الكمية", ku: "بڕ", en: "Quantity" },
  available: { ar: "متوفر", ku: "بەردەستە", en: "Available" },
  outOfStock: { ar: "نفذت الكمية", ku: "نەماوە", en: "Out of Stock" },
  delivery: { ar: "التوصيل", ku: "گەیاندن", en: "Delivery" },
  returnPolicy: { ar: "سياسة الإرجاع", ku: "سیاسەتی گەڕاندنەوە", en: "Return Policy" },
  contactSeller: { ar: "تواصل مع البائع", ku: "پەیوەندی بە فرۆشیار", en: "Contact Seller" },
  sendMessage: { ar: "إرسال رسالة", ku: "نامە بنێرە", en: "Send Message" },
  share: { ar: "مشاركة", ku: "هاوبەشکردن", en: "Share" },
  report: { ar: "إبلاغ", ku: "ڕاپۆرتکردن", en: "Report" },
  auction: { ar: "مزاد", ku: "مزایدە", en: "Auction" },
  fixedPrice: { ar: "سعر ثابت", ku: "نرخی جێگیر", en: "Fixed Price" },
  currentBid: { ar: "المزايدة الحالية", ku: "مزایدەی ئێستا", en: "Current Bid" },
  yourBid: { ar: "مزايدتك", ku: "مزایدەکەت", en: "Your Bid" },
  minimumBid: { ar: "الحد الأدنى للمزايدة", ku: "کەمترین مزایدە", en: "Minimum Bid" },
  placeBid: { ar: "قدم مزايدة", ku: "مزایدە بکە", en: "Place Bid" },
  bidPlaced: { ar: "تم تقديم المزايدة", ku: "مزایدە نێردرا", en: "Bid Placed" },
  bidHistory: { ar: "سجل المزايدات", ku: "مێژووی مزایدەکان", en: "Bid History" },
  noBids: { ar: "لا توجد مزايدات", ku: "هیچ مزایدەیەک نییە", en: "No Bids" },
  highestBidder: { ar: "أعلى مزايد", ku: "بەرزترین مزایدەکار", en: "Highest Bidder" },
  
  // Conditions - full names
  new: { ar: "جديد", ku: "نوێ", en: "New" },
  likeNew: { ar: "كالجديد", ku: "وەک نوێ", en: "Like New" },
  usedLikeNew: { ar: "مستعمل - كالجديد", ku: "بەکارهاتوو - وەک نوێ", en: "Used - Like New" },
  usedGood: { ar: "مستعمل - جيد", ku: "بەکارهاتوو - باش", en: "Used - Good" },
  usedFair: { ar: "مستعمل - مقبول", ku: "بەکارهاتوو - قبوڵ", en: "Used - Fair" },
  vintage: { ar: "فنتج", ku: "کۆن", en: "Vintage" },
  forPartsOrNotWorking: { ar: "لا يعمل / لأجزاء", ku: "نایەوە کار / بۆ پارچەکان", en: "For Parts or Not Working" },
  good: { ar: "جيد", ku: "باش", en: "Good" },
  fair: { ar: "مقبول", ku: "قبوڵ", en: "Fair" },
  
  // Actions
  submit: { ar: "إرسال", ku: "ناردن", en: "Submit" },
  cancel: { ar: "إلغاء", ku: "هەڵوەشاندنەوە", en: "Cancel" },
  confirm: { ar: "تأكيد", ku: "دڵنیاکردنەوە", en: "Confirm" },
  save: { ar: "حفظ", ku: "پاشەکەوتکردن", en: "Save" },
  edit: { ar: "تعديل", ku: "دەستکاری", en: "Edit" },
  delete: { ar: "حذف", ku: "سڕینەوە", en: "Delete" },
  back: { ar: "رجوع", ku: "گەڕانەوە", en: "Back" },
  next: { ar: "التالي", ku: "دواتر", en: "Next" },
  previous: { ar: "السابق", ku: "پێشتر", en: "Previous" },
  close: { ar: "إغلاق", ku: "داخستن", en: "Close" },
  continue: { ar: "متابعة", ku: "بەردەوام بە", en: "Continue" },
  addToFavorites: { ar: "إضافة للمفضلة", ku: "زیادکردن بۆ دڵخوازەکان", en: "Add to Favorites" },
  removeFromFavorites: { ar: "إزالة من المفضلة", ku: "لابردن لە دڵخوازەکان", en: "Remove from Favorites" },
  
  // Messages
  welcome: { ar: "مرحباً", ku: "بەخێربێیت", en: "Welcome" },
  loading: { ar: "جاري التحميل...", ku: "بارکردن...", en: "Loading..." },
  noResults: { ar: "لا توجد نتائج", ku: "هیچ ئەنجامێک نییە", en: "No results" },
  error: { ar: "حدث خطأ", ku: "هەڵە ڕوویدا", en: "Something went wrong" },
  success: { ar: "تم بنجاح", ku: "سەرکەوتوو بوو", en: "Success" },
  noProducts: { ar: "لا توجد منتجات", ku: "هیچ بەرهەمێک نییە", en: "No products" },
  noMatchingProducts: { ar: "لا توجد منتجات مطابقة للفلاتر", ku: "هیچ بەرهەمێک لە فلتەرەکاندا نییە", en: "No products match the filters" },
  resetFilters: { ar: "إعادة تعيين الفلاتر", ku: "ڕیسێتکردنی فلتەرەکان", en: "Reset filters" },
  tryAgain: { ar: "حاول مرة أخرى", ku: "دووبارە هەوڵ بدە", en: "Try again" },
  
  // Toast messages
  bidSuccess: { ar: "تم تقديم المزايدة بنجاح!", ku: "مزایدەکە بە سەرکەوتوویی نێردرا!", en: "Bid placed successfully!" },
  bidError: { ar: "فشل في تقديم المزايدة", ku: "مزایدە شکستی هێنا", en: "Failed to place bid" },
  offerSent: { ar: "تم إرسال العرض بنجاح!", ku: "پێشنیارەکە بە سەرکەوتوویی نێردرا!", en: "Offer sent successfully!" },
  offerError: { ar: "فشل في إرسال العرض", ku: "پێشنیار شکستی هێنا", en: "Failed to send offer" },
  addedToFavorites: { ar: "تمت الإضافة للمفضلة", ku: "زیادکرا بۆ دڵخوازەکان", en: "Added to favorites" },
  removedFromFavorites: { ar: "تمت الإزالة من المفضلة", ku: "لابرا لە دڵخوازەکان", en: "Removed from favorites" },
  messageSent: { ar: "تم إرسال الرسالة", ku: "نامەکە نێردرا", en: "Message sent" },
  loginRequired: { ar: "يجب تسجيل الدخول أولاً", ku: "پێویستە سەرەتا بچیتە ژوورەوە", en: "Please log in first" },
  verificationRequired: { ar: "يجب توثيق حسابك أولاً", ku: "پێویستە سەرەتا هەژمارەکەت بسەلمێنیت", en: "Please verify your account first" },
  
  // Categories
  electronics: { ar: "إلكترونيات", ku: "ئەلیکترۆنیات", en: "Electronics" },
  vehicles: { ar: "سيارات", ku: "ئۆتۆمبێلەکان", en: "Vehicles" },
  realEstate: { ar: "عقارات", ku: "خانوبەرە", en: "Real Estate" },
  fashion: { ar: "أزياء", ku: "جلوبەرگ", en: "Fashion" },
  homeCategory: { ar: "منزل", ku: "ماڵەوە", en: "Home" },
  sports: { ar: "رياضة", ku: "وەرزش", en: "Sports" },
  books: { ar: "كتب", ku: "کتێبەکان", en: "Books" },
  other: { ar: "أخرى", ku: "تر", en: "Other" },
  watches: { ar: "ساعات", ku: "کاتژمێر", en: "Watches" },
  clothing: { ar: "ملابس", ku: "جلوبەرگ", en: "Clothing" },
  shoes: { ar: "أحذية", ku: "پێڵاو", en: "Shoes" },
  furniture: { ar: "أثاث", ku: "کەلوپەل", en: "Furniture" },
  jewelry: { ar: "مجوهرات", ku: "خشڵ", en: "Jewelry" },
  makeup: { ar: "مكياج", ku: "مەیکئەپ", en: "Makeup" },
  collectibles: { ar: "مقتنيات", ku: "کۆکراوەکان", en: "Collectibles" },
  music: { ar: "آلات موسيقية", ku: "ئامێری موسیقا", en: "Musical Instruments" },
  
  // Swipe page
  swipeUp: { ar: "اسحب للأعلى", ku: "بۆ سەرەوە ڕابکێشە", en: "Swipe up" },
  swipeForMore: { ar: "اسحب لمنتج آخر", ku: "بۆ بەرهەمی تر ڕابکێشە", en: "Swipe for another product" },
  all: { ar: "الكل", ku: "هەموو", en: "All" },
  newArrivals: { ar: "وصل حديثاً", ku: "تازە گەیشتوو", en: "New Arrivals" },
  comments: { ar: "التعليقات", ku: "سەرنجەکان", en: "Comments" },
  writeComment: { ar: "اكتب تعليقاً...", ku: "سەرنجێک بنووسە...", en: "Write a comment..." },
  noComments: { ar: "لا توجد تعليقات بعد", ku: "هێشتا هیچ سەرنجێک نییە", en: "No comments yet" },
  beFirstToComment: { ar: "كن أول من يعلق", ku: "یەکەم کەس بە بۆ سەرنج بنووسە", en: "Be the first to comment" },
  
  // Auth
  phone: { ar: "رقم الهاتف", ku: "ژمارەی مۆبایل", en: "Phone" },
  password: { ar: "كلمة المرور", ku: "وشەی نهێنی", en: "Password" },
  confirmPassword: { ar: "تأكيد كلمة المرور", ku: "دڵنیاکردنەوەی وشەی نهێنی", en: "Confirm Password" },
  register: { ar: "تسجيل", ku: "تۆمارکردن", en: "Register" },
  forgotPassword: { ar: "نسيت كلمة المرور؟", ku: "وشەی نهێنیت لەبیر چوو؟", en: "Forgot password?" },
  signIn: { ar: "تسجيل الدخول", ku: "چوونە ژوورەوە", en: "Sign In" },
  signUp: { ar: "إنشاء حساب", ku: "دروستکردنی هەژمار", en: "Sign Up" },
  createAccount: { ar: "إنشاء حساب جديد", ku: "هەژمارێکی نوێ دروست بکە", en: "Create a new account" },
  alreadyHaveAccount: { ar: "لديك حساب بالفعل؟", ku: "هەژمارت هەیە؟", en: "Already have an account?" },
  dontHaveAccount: { ar: "ليس لديك حساب؟", ku: "هەژمارت نییە؟", en: "Don't have an account?" },
  name: { ar: "الاسم", ku: "ناو", en: "Name" },
  fullName: { ar: "الاسم الكامل", ku: "ناوی تەواو", en: "Full Name" },
  email: { ar: "البريد الإلكتروني", ku: "ئیمەیل", en: "Email" },
  enterPhone: { ar: "أدخل رقم الهاتف", ku: "ژمارەی مۆبایل بنووسە", en: "Enter your phone" },
  enterPassword: { ar: "أدخل كلمة المرور", ku: "وشەی نهێنی بنووسە", en: "Enter your password" },
  enterName: { ar: "أدخل اسمك", ku: "ناوت بنووسە", en: "Enter your name" },
  
  // Favorites
  favorites: { ar: "المفضلة", ku: "دڵخوازەکان", en: "Favorites" },
  noFavorites: { ar: "لا توجد منتجات في المفضلة", ku: "هیچ بەرهەمێک لە دڵخوازەکان نییە", en: "No favorites yet" },
  
  // Cart
  cart: { ar: "سلة التسوق", ku: "سەبەتەی کڕین", en: "Cart" },
  emptyCart: { ar: "السلة فارغة", ku: "سەبەتە بەتاڵە", en: "Cart is empty" },
  total: { ar: "المجموع", ku: "کۆی گشتی", en: "Total" },
  checkout: { ar: "إتمام الشراء", ku: "تەواوکردنی کڕین", en: "Checkout" },
  
  // Seller
  sellerDashboard: { ar: "لوحة البائع", ku: "داشبۆردی فرۆشیار", en: "Seller Dashboard" },
  myListings: { ar: "منتجاتي", ku: "بەرهەمەکانم", en: "My Listings" },
  salesHistory: { ar: "تاريخ المبيعات", ku: "مێژووی فرۆشتن", en: "Sales History" },
  becomeSeller: { ar: "كن بائعاً", ku: "ببە بە فرۆشیار", en: "Become a Seller" },
  sellerInfo: { ar: "معلومات البائع", ku: "زانیاری فرۆشیار", en: "Seller Info" },
  verified: { ar: "موثق", ku: "پشتڕاستکراوە", en: "Verified" },
  notVerified: { ar: "غير موثق", ku: "پشتڕاست نەکراوە", en: "Not Verified" },
  sellerRating: { ar: "تقييم البائع", ku: "هەڵسەنگاندنی فرۆشیار", en: "Seller Rating" },
  totalSales: { ar: "إجمالي المبيعات", ku: "کۆی فرۆشتنەکان", en: "Total Sales" },
  memberSince: { ar: "عضو منذ", ku: "ئەندامە لە", en: "Member since" },
  
  // Notifications
  notifications: { ar: "الإشعارات", ku: "ئاگادارکردنەوەکان", en: "Notifications" },
  noNotifications: { ar: "لا توجد إشعارات", ku: "هیچ ئاگادارکردنەوەیەک نییە", en: "No notifications" },
  markAllRead: { ar: "تحديد الكل كمقروء", ku: "هەموو وەک خوێندراو نیشان بکە", en: "Mark all as read" },
  
  // Currency
  iqd: { ar: "د.ع", ku: "د.ع", en: "IQD" },
  
  // Footer/General
  accountCode: { ar: "رمز الحساب", ku: "کۆدی هەژمار", en: "Account Code" },
  settings: { ar: "الإعدادات", ku: "ڕێکخستنەکان", en: "Settings" },
  language: { ar: "اللغة", ku: "زمان", en: "Language" },
  arabic: { ar: "العربية", ku: "عەرەبی", en: "Arabic" },
  kurdish: { ar: "الكردية", ku: "کوردی", en: "Kurdish" },
  english: { ar: "الإنجليزية", ku: "ئینگلیزی", en: "English" },
  
  // Time
  now: { ar: "الآن", ku: "ئێستا", en: "Now" },
  minutesAgo: { ar: "منذ دقائق", ku: "چەند خولەکێک لەمەوپێش", en: "Minutes ago" },
  hoursAgo: { ar: "منذ ساعات", ku: "چەند کاتژمێرێک لەمەوپێش", en: "Hours ago" },
  daysAgo: { ar: "منذ أيام", ku: "چەند ڕۆژێک لەمەوپێش", en: "Days ago" },
  days: { ar: "يوم", ku: "ڕۆژ", en: "Day" },
  hours: { ar: "ساعة", ku: "کاتژمێر", en: "Hour" },
  minutes: { ar: "دقيقة", ku: "خولەک", en: "Minute" },
  seconds: { ar: "ثانية", ku: "چرکە", en: "Second" },
  
  // Cities
  baghdad: { ar: "بغداد", ku: "بەغدا", en: "Baghdad" },
  erbil: { ar: "أربيل", ku: "هەولێر", en: "Erbil" },
  sulaymaniyah: { ar: "السليمانية", ku: "سلێمانی", en: "Sulaymaniyah" },
  duhok: { ar: "دهوك", ku: "دهۆک", en: "Duhok" },
  basra: { ar: "البصرة", ku: "بەسرە", en: "Basra" },
  mosul: { ar: "الموصل", ku: "مووسڵ", en: "Mosul" },
  kirkuk: { ar: "كركوك", ku: "کەرکوک", en: "Kirkuk" },
  najaf: { ar: "النجف", ku: "نەجەف", en: "Najaf" },
  karbala: { ar: "كربلاء", ku: "کەربەلا", en: "Karbala" },
  
  // Sell form
  sellProduct: { ar: "بيع منتج", ku: "بەرهەم بفرۆشە", en: "Sell a Product" },
  productTitle: { ar: "عنوان المنتج", ku: "ناونیشانی بەرهەم", en: "Product Title" },
  productDescription: { ar: "وصف المنتج", ku: "وەسفی بەرهەم", en: "Product Description" },
  selectCategory: { ar: "اختر الفئة", ku: "پۆل هەڵبژێرە", en: "Select category" },
  selectCondition: { ar: "اختر الحالة", ku: "دۆخ هەڵبژێرە", en: "Select condition" },
  selectCity: { ar: "اختر المدينة", ku: "شار هەڵبژێرە", en: "Select city" },
  uploadImages: { ar: "رفع الصور", ku: "وێنە باربکە", en: "Upload images" },
  saleType: { ar: "نوع البيع", ku: "جۆری فرۆشتن", en: "Sale type" },
  auctionDuration: { ar: "مدة المزاد", ku: "ماوەی مزایدە", en: "Auction duration" },
  publishListing: { ar: "نشر الإعلان", ku: "بڵاوکردنەوەی ڕێکلام", en: "Publish listing" },
  saveDraft: { ar: "حفظ كمسودة", ku: "وەک ڕەشنووس پاشەکەوت بکە", en: "Save draft" },
  
  // Offer
  yourOffer: { ar: "عرضك", ku: "پێشنیارەکەت", en: "Your Offer" },
  enterOfferAmount: { ar: "أدخل قيمة العرض", ku: "بڕی پێشنیار بنووسە", en: "Enter offer amount" },
  sendOffer: { ar: "إرسال العرض", ku: "پێشنیار بنێرە", en: "Send offer" },
  
  // Messages
  messages: { ar: "الرسائل", ku: "نامەکان", en: "Messages" },
  noMessages: { ar: "لا توجد رسائل", ku: "هیچ نامەیەک نییە", en: "No messages" },
  typeMessage: { ar: "اكتب رسالتك...", ku: "نامەکەت بنووسە...", en: "Type your message..." },
  
  // Account
  accountSettings: { ar: "إعدادات الحساب", ku: "ڕێکخستنەکانی هەژمار", en: "Account Settings" },
  editProfile: { ar: "تعديل الملف الشخصي", ku: "پڕۆفایل دەستکاری بکە", en: "Edit Profile" },
  changePassword: { ar: "تغيير كلمة المرور", ku: "وشەی نهێنی بگۆڕە", en: "Change Password" },
  deleteAccount: { ar: "حذف الحساب", ku: "هەژمار بسڕەوە", en: "Delete Account" },
  
  // Search
  searchPlaceholder: { ar: "ابحث عن منتجات...", ku: "بگەڕێ بۆ بەرهەمەکان...", en: "Search for products..." },
  searchResults: { ar: "نتائج البحث", ku: "ئەنجامەکانی گەڕان", en: "Search results" },
  filters: { ar: "الفلاتر", ku: "فلتەرەکان", en: "Filters" },
  sortBy: { ar: "ترتيب حسب", ku: "ڕیزکردن بەپێی", en: "Sort by" },
  priceRange: { ar: "نطاق السعر", ku: "مەودای نرخ", en: "Price range" },
  minPrice: { ar: "الحد الأدنى", ku: "کەمترین", en: "Min price" },
  maxPrice: { ar: "الحد الأقصى", ku: "زۆرترین", en: "Max price" },
  applyFilters: { ar: "تطبيق الفلاتر", ku: "فلتەرەکان جێبەجێ بکە", en: "Apply filters" },
  clearFilters: { ar: "مسح الفلاتر", ku: "سڕینەوەی فلتەرەکان", en: "Clear filters" },
  clearAllFilters: { ar: "مسح جميع الفلاتر", ku: "سڕینەوەی هەموو فلتەرەکان", en: "Clear all filters" },
  clearAll: { ar: "مسح الكل", ku: "سڕینەوەی هەموو", en: "Clear all" },
  quickFilter: { ar: "تصفية سريعة:", ku: "فلتەری خێرا:", en: "Quick filter:" },
  allProducts: { ar: "جميع المنتجات", ku: "هەموو بەرهەمەکان", en: "All products" },
  allCategories: { ar: "جميع الفئات", ku: "هەموو پۆلەکان", en: "All categories" },
  productAvailable: { ar: "منتج متاح", ku: "بەرهەم بەردەستە", en: "Products available" },
  moreFilters: { ar: "المزيد", ku: "زیاتر", en: "More filters" },
  browseMode: { ar: "وضع التصفح", ku: "دۆخی گەڕان", en: "Browse mode" },
  showSold: { ar: "عرض المباع", ku: "فرۆشراوەکان پیشان بدە", en: "Show sold" },
  from: { ar: "من", ku: "لە", en: "From" },
  to: { ar: "إلى", ku: "بۆ", en: "To" },
  inIraqiDinar: { ar: "بالدينار العراقي", ku: "بە دیناری عێراقی", en: "in Iraqi dinar" },
  product: { ar: "منتج", ku: "بەرهەم", en: "Product" },
  anotherProduct: { ar: "منتج آخر", ku: "بەرهەمی تر", en: "Another product" },
  showMore: { ar: "عرض المزيد", ku: "زیاتر پیشان بدە", en: "Show more" },
  tryChangingFilters: { ar: "جرب تغيير الفلاتر أو البحث بكلمات أخرى", ku: "هەوڵبدە فلتەرەکان یان وشەکان بگۆڕیت", en: "Try changing filters or search terms" },
  store: { ar: "متجر", ku: "دوکان", en: "Store" },
  salesCount: { ar: "عملية بيع", ku: "فرۆشتنەکان", en: "Sales" },
  positiveRating: { ar: "تقييم إيجابي", ku: "هەڵسەنگاندنی باش", en: "Positive rating" },
  mostRelevant: { ar: "الأكثر صلة", ku: "پەیوەندیدارترین", en: "Most relevant" },
  newest: { ar: "الأحدث", ku: "نوێترین", en: "Newest" },
  priceLowToHigh: { ar: "السعر: من الأقل للأعلى", ku: "نرخ: لە کەمەوە بۆ زۆر", en: "Price: Low to High" },
  priceHighToLow: { ar: "السعر: من الأعلى للأقل", ku: "نرخ: لە زۆرەوە بۆ کەم", en: "Price: High to Low" },
  endingSoon: { ar: "ينتهي قريباً", ku: "بە زووی تەواو دەبێت", en: "Ending soon" },
  mostBids: { ar: "الأكثر مزايدة", ku: "زۆرترین مزایدە", en: "Most bids" },
  saleTypeLabel: { ar: "نوع البيع", ku: "جۆری فرۆشتن", en: "Sale type" },
  cityLabel: { ar: "المدينة", ku: "شار", en: "City" },
  conditionLabel: { ar: "الحالة", ku: "دۆخ", en: "Condition" },
  categoriesLabel: { ar: "الفئات", ku: "پۆلەکان", en: "Categories" },
  priceLabel: { ar: "السعر:", ku: "نرخ:", en: "Price:" },
  currency: { ar: "د.ع", ku: "د.ع", en: "IQD" },
  shipping: { ar: "شحن", ku: "گەیاندن", en: "Shipping" },
  lastItem: { ar: "آخر قطعة", ku: "دوایین دانە", en: "Last item" },
  hotItem: { ar: "منتج رائج", ku: "بەرهەمی باو", en: "Hot item" },
  freeShipping: { ar: "شحن مجاني", ku: "گەیاندنی بەخۆڕایی", en: "Free shipping" },
  vintageAntique: { ar: "فينتاج / أنتيك", ku: "ڤینتەیج / کۆن", en: "Vintage / Antique" },
  almostNew: { ar: "شبه جديد", ku: "وەک نوێ", en: "Almost new" },
  anbar: { ar: "الأنبار", ku: "ئەنبار" },
  babel: { ar: "بابل", ku: "بابل" },
  diyala: { ar: "ديالى", ku: "دیالە" },
  dhiQar: { ar: "ذي قار", ku: "زیقار" },
  qadisiyah: { ar: "القادسية", ku: "قادسیە" },
  muthanna: { ar: "المثنى", ku: "موسەننا" },
  maysan: { ar: "ميسان", ku: "مەیسان" },
  salahAlDin: { ar: "صلاح الدين", ku: "سەلاحەددین" },
  wasit: { ar: "واسط", ku: "واسط" },
  nineveh: { ar: "نينوى", ku: "نەینەوا" },
  
  // Recommended
  recommended: { ar: "منتجات مقترحة", ku: "بەرهەمە پێشنیارکراوەکان", en: "Recommended" },
  browseCategories: { ar: "تصفح الأقسام", ku: "بەشەکان ببینە", en: "Browse categories" },
  viewMore: { ar: "عرض المزيد", ku: "زیاتر ببینە", en: "View more" },
  browseProducts: { ar: "تصفح المنتجات", ku: "بەرهەمەکان ببینە", en: "Browse products" },
  startSelling: { ar: "ابدأ البيع", ku: "دەست بە فرۆشتن بکە", en: "Start selling" },
  
  // Dashboard tabs and labels
  products: { ar: "المنتجات", ku: "بەرهەمەکان", en: "Products" },
  offers: { ar: "العروض", ku: "پێشنیارەکان", en: "Offers" },
  sales: { ar: "المبيعات", ku: "فرۆشتنەکان", en: "Sales" },
  
  // My Account page
  addNewProduct: { ar: "أضف منتج جديد", ku: "بەرهەمێکی نوێ زیاد بکە", en: "Add New Product" },
  startSellingNow: { ar: "ابدأ ببيع منتجاتك الآن", ku: "ئێستا دەست بە فرۆشتنی بەرهەمەکانت بکە", en: "Start selling your products now" },
  shopping: { ar: "التسوق", ku: "کڕین", en: "Shopping" },
  buyerCenter: { ar: "مركز المشتري", ku: "ناوەندی کڕیار", en: "Buyer Center" },
  yourPurchasesBidsOffers: { ar: "مشترياتك ومزايداتك وعروضك", ku: "کڕینەکانت و مزایدەکانت و پێشنیارەکانت", en: "Your purchases, bids, and offers" },
  address: { ar: "العنوان", ku: "ناونیشان", en: "Address" },
  manageDeliveryAddress: { ar: "إدارة عنوان التوصيل", ku: "بەڕێوەبردنی ناونیشانی گەیاندن", en: "Manage delivery address" },
  manageAccountSecurityHelp: { ar: "إدارة حسابك والأمان والمساعدة", ku: "بەڕێوەبردنی هەژمار و ئاسایش و یارمەتی", en: "Manage your account, security, and help" },
  selling: { ar: "البيع", ku: "فرۆشتن", en: "Selling" },
  manageProductsSales: { ar: "إدارة منتجاتك ومبيعاتك", ku: "بەڕێوەبردنی بەرهەم و فرۆشتنەکانت", en: "Manage your products and sales" },
  myProfile: { ar: "ملفي الشخصي", ku: "پڕۆفایلەکەم", en: "My Profile" },
  editNamePhotoAddress: { ar: "تعديل الاسم والصورة والعنوان", ku: "گۆڕینی ناو و وێنە و ناونیشان", en: "Edit name, photo, and address" },
  securitySettings: { ar: "إعدادات الأمان", ku: "ڕێکخستنەکانی ئاسایش", en: "Security Settings" },
  twoFactorAndPassword: { ar: "المصادقة الثنائية وكلمة المرور", ku: "پشتڕاستکردنەوەی دوو هەنگاو و وشەی نهێنی", en: "Two-factor authentication and password" },
  help: { ar: "المساعدة", ku: "یارمەتی", en: "Help" },
  faqAndSupport: { ar: "الأسئلة الشائعة والدعم", ku: "پرسیارە باوەکان و پشتگیری", en: "FAQ and support" },
  aboutApp: { ar: "حول التطبيق", ku: "دەربارەی ئەپ", en: "About the App" },
  aboutAppDescription: { ar: "معلومات عن اي بيع", ku: "زانیاری دەربارەی اي بیع", en: "Information about اي بيع" },
  newSeller: { ar: "جديد", ku: "نوێ", en: "New" },
  positiveRatingPercent: { ar: "تقييم إيجابي", ku: "هەڵسەنگاندنی ئەرێنی", en: "positive rating" },
  saleOperation: { ar: "عملية بيع", ku: "فرۆشتن", en: "sale" },
  fileTooLarge: { ar: "الملف كبير جداً", ku: "فایلەکە زۆر گەورەیە", en: "File too large" },
  maxFileSize: { ar: "الحد الأقصى 5 ميغابايت", ku: "زۆرترین قەبارە ٥ مێگابایت", en: "Maximum 5MB" },
  photoUpdated: { ar: "تم تحديث الصورة بنجاح", ku: "وێنە بە سەرکەوتوویی نوێکرایەوە", en: "Photo updated successfully" },
  failedToSavePhoto: { ar: "فشل في حفظ الصورة", ku: "پاشەکەوتکردنی وێنە سەرکەوتوو نەبوو", en: "Failed to save photo" },
  failedToUploadPhoto: { ar: "فشل في رفع أو حفظ الصورة", ku: "بارکردن یان پاشەکەوتکردنی وێنە سەرکەوتوو نەبوو", en: "Failed to upload or save photo" },
  storeLinkCopied: { ar: "تم نسخ رابط المتجر", ku: "لینکی دوکان کۆپی کرا", en: "Store link copied" },
  failedToCopyLink: { ar: "فشل نسخ الرابط", ku: "کۆپیکردنی لینک سەرکەوتوو نەبوو", en: "Failed to copy link" },
  mustLogin: { ar: "يجب تسجيل الدخول", ku: "دەبێت بچیتە ژوورەوە", en: "Must log in" },
  loginToAccessAccount: { ar: "يرجى تسجيل الدخول للوصول إلى حسابك", ku: "تکایە بچۆ ژوورەوە بۆ دەستگەیشتن بە هەژمارەکەت", en: "Please log in to access your account" },
  loggedOut: { ar: "تم تسجيل الخروج", ku: "چوویتە دەرەوە", en: "Logged out" },
  seeYouSoon: { ar: "نراك قريباً!", ku: "بەزووی دەتبینینەوە!", en: "See you soon!" },
  logoutFailed: { ar: "فشل تسجيل الخروج", ku: "چوونە دەرەوە سەرکەوتوو نەبوو", en: "Logout failed" },
  shareStore: { ar: "مشاركة المتجر", ku: "هاوبەشکردنی دوکان", en: "Share store" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const supportedLanguages = ["ar", "ku", "en"] as const;
type SupportedLanguage = (typeof supportedLanguages)[number];
const normalizeLanguage = (value: string | null): SupportedLanguage =>
  supportedLanguages.includes(value as SupportedLanguage) ? (value as SupportedLanguage) : "ar";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return normalizeLanguage(localStorage.getItem("language"));
    }
    return "ar";
  });

  const setLanguage = (lang: Language) => {
    const nextLanguage = normalizeLanguage(lang);
    setLanguageState(nextLanguage);
    localStorage.setItem("language", nextLanguage);
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    const value = translation[language] ?? translation.ar ?? key;
    return value;
  };

  useEffect(() => {
    // Language state effect
  }, [language]);

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
