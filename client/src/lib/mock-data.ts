import omegaConstellationImg from "@assets/generated_images/omega_constellation_half_gold_watch.png";
import omegaSeamasterImg from "@assets/generated_images/omega_seamaster_black_dial_watch.png";
import iranianCarpetImg from "@assets/generated_images/1910_iranian_handmade_carpet.png";
import seikoPandaImg from "@assets/generated_images/seiko_panda_1973_vintage_watch.png";
import longinesImg from "@assets/generated_images/longines_vintage_handwatch.png";
import casioImg from "@assets/generated_images/casio_vintage_digital_watch.png";

export interface Seller {
  name: string;
  salesCount: number;
  rating: number;
}

export interface Product {
  id: string;
  productCode: string;
  title: string;
  price: number;
  currentBid?: number;
  totalBids?: number;
  image: string;
  category: string;
  timeLeft?: string;
  auctionEndTime?: string | Date | null;
  saleType?: "auction" | "fixed";
  condition: "New" | "Used - Like New" | "Used - Good" | "Vintage";
  description?: string;
  seller: Seller;
  sellerName?: string;
  sellerTotalSales?: number;
  sellerRating?: number;
  deliveryWindow: string;
  returnPolicy: string;
  returnDetails?: string;
  city?: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "1",
    productCode: "P-100001",
    title: "ساعة أوميغا كونستليشن - نصف ذهب باي بان",
    price: 3500000,
    currentBid: 3200000,
    totalBids: 67,
    image: omegaConstellationImg,
    category: "ساعات",
    timeLeft: "6 ساعات",
    saleType: "auction",
    auctionEndTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    condition: "Vintage",
    description: "ساعة أوميغا كونستليشن الأيقونية من الستينيات. تصميم نصف ذهب وستيل مع قرص باي بان الشهير. الحركة الأوتوماتيكية تعمل بكفاءة تامة. قطعة نادرة لهواة الساعات الكلاسيكية.",
    seller: { name: "ساعات التراث", salesCount: 1250, rating: 99 },
    deliveryWindow: "1-2 أيام",
    returnPolicy: "14 يوم",
    returnDetails: "ضمان أصالة مع شهادة",
    city: "بغداد",
  },
  {
    id: "2",
    productCode: "P-100002",
    title: "ساعة أوميغا سيماستر - قرص أسود",
    price: 2800000,
    currentBid: 2500000,
    totalBids: 45,
    image: omegaSeamasterImg,
    category: "ساعات",
    timeLeft: "12 ساعة",
    saleType: "auction",
    auctionEndTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    condition: "Vintage",
    description: "ساعة أوميغا سيماستر فينتج مع قرص أسود أنيق. من الستينيات. حالة ممتازة للعمر. الحركة الأوتوماتيكية تعمل بدقة. قطعة كلاسيكية للرجل الأنيق.",
    seller: { name: "متجر الأناقة", salesCount: 890, rating: 98 },
    deliveryWindow: "1-2 أيام",
    returnPolicy: "14 يوم",
    returnDetails: "فحص مجاني قبل الشراء",
    city: "بغداد",
  },
  {
    id: "3",
    productCode: "P-100003",
    title: "سجادة إيرانية أصلية 1910 - صناعة يدوية",
    price: 4500000,
    currentBid: 4000000,
    totalBids: 32,
    image: iranianCarpetImg,
    category: "تحف وأثاث",
    timeLeft: "2 يوم",
    saleType: "auction",
    auctionEndTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    condition: "Vintage",
    description: "سجادة إيرانية نادرة من عام 1910. صناعة يدوية 100% من الحرير والصوف الطبيعي. ألوان طبيعية ثابتة. مقاس 3x4 متر. قطعة فنية تاريخية نادرة جداً. شهادة أصالة متوفرة.",
    seller: { name: "حاج كريم الأنتيك", salesCount: 2400, rating: 99 },
    deliveryWindow: "3-5 أيام",
    returnPolicy: "14 يوم",
    returnDetails: "ضمان الأصالة التاريخية",
    city: "البصرة",
  },
  {
    id: "4",
    productCode: "P-100004",
    title: "ساعة سيكو باندا فينتج 1973",
    price: 1200000,
    currentBid: 980000,
    totalBids: 28,
    image: seikoPandaImg,
    category: "ساعات",
    timeLeft: "8 ساعات",
    saleType: "auction",
    auctionEndTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    condition: "Vintage",
    description: "ساعة سيكو كرونوغراف باندا الأيقونية من 1973. القرص الأبيض مع العدادات السوداء. تصميم سباقات السيارات الكلاسيكي. حالة ممتازة. قطعة مطلوبة جداً من هواة الساعات.",
    seller: { name: "ساعات الزمن الجميل", salesCount: 567, rating: 97 },
    deliveryWindow: "1-2 أيام",
    returnPolicy: "7 أيام",
    returnDetails: "فحص تقني مع ضمان",
    city: "أربيل",
  },
  {
    id: "5",
    productCode: "P-100005",
    title: "ساعة لونجين كلاسيكية",
    price: 1800000,
    currentBid: 1550000,
    totalBids: 41,
    image: longinesImg,
    category: "ساعات",
    timeLeft: "4 ساعات",
    saleType: "auction",
    auctionEndTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    condition: "Vintage",
    description: "ساعة لونجين فينتج أنيقة من الخمسينيات. قرص أبيض كلاسيكي مع علبة ذهبية. حركة يدوية سويسرية دقيقة. مثالية للمناسبات الرسمية. قطعة راقية للذواقة.",
    seller: { name: "تجارة الساعات الفاخرة", salesCount: 1100, rating: 98 },
    deliveryWindow: "1-2 أيام",
    returnPolicy: "14 يوم",
    returnDetails: "شهادة أصالة سويسرية",
    city: "بغداد",
  },
  {
    id: "6",
    productCode: "P-100006",
    title: "ساعة كاسيو كلاسيكية",
    price: 85000,
    totalBids: 15,
    image: casioImg,
    category: "ساعات",
    saleType: "fixed",
    condition: "Vintage",
    description: "ساعة كاسيو رقمية كلاسيكية من الثمانينيات. التصميم الأيقوني المحبوب. شاشة LCD واضحة. حالة ممتازة للعمر. قطعة ريترو للمحبين.",
    seller: { name: "متجر النوستالجيا", salesCount: 234, rating: 95 },
    deliveryWindow: "1-3 أيام",
    returnPolicy: "3 أيام",
    city: "الموصل",
  },
];
