
import watchImg from "@assets/generated_images/vintage_gold_watch.png";
import jacketImg from "@assets/generated_images/vintage_leather_jacket.png";

export interface Seller {
  name: string;
  salesCount: number;
  rating: number;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  currentBid?: number;
  totalBids?: number;
  image: string;
  category: string;
  timeLeft?: string;
  condition: "New" | "Used - Like New" | "Used - Good" | "Vintage";
  description?: string;
  seller: Seller;
  deliveryWindow: string;
  returnPolicy: string;
  returnDetails?: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "1",
    title: "سايكو الساعة الكرونوغراف - نادرة مع بيزل أزرق/أحمر",
    price: 280000,
    currentBid: 240000,
    totalBids: 34,
    image: watchImg,
    category: "ساعات",
    timeLeft: "1 يوم",
    condition: "Vintage",
    description: "ساعة سايكو كرونوغراف فينتاج نادرة جداً بحالة ممتازة. الحزام الأصلي من الفولاذ المقاوم للصدأ مع بيزل ملون أزرق وأحمر مميز. الكرونوغراف يعمل بكفاءة عالية. شهادة الأصالة متوفرة. هذه الساعة من أندر موديلات سايكو في السوق.",
    seller: { name: "أحمد العراقي", salesCount: 1250, rating: 98 },
    deliveryWindow: "3-5 أيام",
    returnPolicy: "7 أيام",
    returnDetails: "يقبل الإرجاع خلال 7 أيام إذا كان المنتج بحالته الأصلية",
  },
  {
    id: "2",
    title: "تيسو PRX - الساعة السويسرية الأنيقة بقرص أخضر",
    price: 350000,
    currentBid: 320000,
    totalBids: 28,
    image: watchImg,
    category: "ساعات",
    timeLeft: "18 ساعة",
    condition: "Used - Like New",
    description: "ساعة تيسو PRX السويسرية الفاخرة بتصميم عصري مميز. القرص الأخضر الديناميكي مع مؤشر التاريخ. حركة ميكانيكية ذاتية التعبئة Vibrmatic 80. الساعة بحالة شبه جديدة وتعمل بكفاءة مثالية. مرفوقة بالعلبة الأصلية والورقات.",
    seller: { name: "محمد البصري", salesCount: 540, rating: 96 },
    deliveryWindow: "1-3 أيام",
    returnPolicy: "14 يوم",
    returnDetails: "ضمان استرجاع كامل خلال 14 يوم",
  },
  {
    id: "3",
    title: "أوميغا سيماستر - الساعة الفاخرة بقرص أسود وتاريخ",
    price: 520000,
    currentBid: 460000,
    totalBids: 52,
    image: watchImg,
    category: "ساعات",
    timeLeft: "12 ساعة",
    condition: "Vintage",
    description: "ساعة أوميغا سيماستر كلاسيكية من أجمل الموديلات. الساعة بقرص أسود مخملي مع تاريخ وتصميم أنيق. الحزام من الفولاذ الأصلي. شهادة الأصالة والضمان الدوري من أوميغا. حالة المحرك ممتازة والساعة تحافظ على الوقت بدقة عالية.",
    seller: { name: "علي الكردي", salesCount: 2100, rating: 99 },
    deliveryWindow: "1-2 أيام",
    returnPolicy: "30 يوم",
    returnDetails: "ضمان شامل مع إرجاع مجاني",
  },
  {
    id: "4",
    title: "جاكيت جلد طبيعي - موديل الثمانينات",
    price: 85000,
    totalBids: 8,
    image: jacketImg,
    category: "ملابس",
    condition: "Used - Good",
    description: "جاكيت جلد طبيعي أصلي من الثمانينات. بحالة جيدة جداً مع بعض علامات الاستخدام الطبيعية.",
    seller: { name: "فاطمة الموصلية", salesCount: 85, rating: 92 },
    deliveryWindow: "5-7 أيام",
    returnPolicy: "3 أيام",
    returnDetails: "الإرجاع متاح فقط إذا كان هناك عيب في المنتج",
  },
  {
    id: "5",
    title: "رولكس سابماريينر - ساعة غوص فينتاج",
    price: 680000,
    currentBid: 600000,
    totalBids: 67,
    image: watchImg,
    category: "ساعات",
    timeLeft: "3 ساعات",
    condition: "Vintage",
    description: "ساعة رولكس سابماريينر الفاخرة من السبعينات. ساعة غوص مقاومة للماء حتى 300 متر. القرص الأسود الأصلي بعلامات لومينوس. الحزام الفولاذي الأصلي. حالة الساعة ممتازة جداً والحركة تعمل بكفاءة عالية.",
    seller: { name: "حسين النجفي", salesCount: 3200, rating: 100 },
    deliveryWindow: "1-2 أيام",
    returnPolicy: "30 يوم",
    returnDetails: "ضمان أصالة مع إرجاع كامل المبلغ",
  },
  {
    id: "6",
    title: "لونجين كلاسيك - ساعة يد سويسرية أنيقة",
    price: 220000,
    currentBid: 190000,
    totalBids: 19,
    image: watchImg,
    category: "ساعات",
    timeLeft: "2 يوم",
    condition: "Used - Like New",
    description: "ساعة لونجين السويسرية الكلاسيكية برقم شهادة أصالة. التصميم الأنيق والبسيط يناسب جميع المناسبات. الساعة بحالة شبه جديدة وتعمل بدقة عالية. المرفقات الأصلية موجودة.",
    seller: { name: "سارة البغدادية", salesCount: 120, rating: 94 },
    deliveryWindow: "3-5 أيام",
    returnPolicy: "7 أيام",
  },
  {
    id: "7",
    title: "ستوبا ساعة رياضية - معادن فاخرة",
    price: 150000,
    totalBids: 14,
    image: watchImg,
    category: "ساعات",
    condition: "Used - Good",
    description: "ساعة ستوبا الرياضية من الألمانيا بتصميم عملي وقوي. مرات المعادن فاخرة والساعة مقاومة للماء. حزام جلدي أسود أصلي. الساعة بحالة جيدة جداً.",
    seller: { name: "كريم الأربيلي", salesCount: 45, rating: 88 },
    deliveryWindow: "5-7 أيام",
    returnPolicy: "لا يوجد إرجاع",
  },
  {
    id: "8",
    title: "هوبلو - ساعة كوارتز كلاسيكية",
    price: 95000,
    totalBids: 7,
    image: watchImg,
    category: "ساعات",
    condition: "New",
    description: "ساعة هوبلو النمساوية الحديثة بتصميم كلاسيكي. كوارتز دقيق وحزام معادن. لم تُستخدم من قبل وتأتي بالعلبة الأصلية والشهادة.",
    seller: { name: "عمر الكركوكي", salesCount: 15, rating: 90 },
    deliveryWindow: "3-5 أيام",
    returnPolicy: "14 يوم",
    returnDetails: "إرجاع كامل للمنتجات الجديدة",
  },
  {
    id: "9",
    title: "تاغ هوير فورميولا 1 - ساعة رياضية",
    price: 420000,
    currentBid: 380000,
    totalBids: 38,
    image: watchImg,
    category: "ساعات",
    timeLeft: "6 ساعات",
    condition: "Used - Like New",
    description: "ساعة تاغ هوير فورميولا 1 الرياضية المشهورة. التصميم الديناميكي والحزام المعادن الفاخر. الساعة بحالة شبه جديدة وتعمل بكفاءة مثالية. مرفوقة بالعلبة والشهادة.",
    seller: { name: "أحمد العراقي", salesCount: 1250, rating: 98 },
    deliveryWindow: "1-3 أيام",
    returnPolicy: "7 أيام",
  },
  {
    id: "10",
    title: "سيتيزن إيكو-درايف - ساعة صديقة للبيئة",
    price: 185000,
    totalBids: 15,
    image: watchImg,
    category: "ساعات",
    condition: "Used - Good",
    description: "ساعة سيتيزن الحديثة بتقنية إيكو-درايف تعمل بالطاقة الشمسية. قرص أزرق مميز وحزام معادن. الساعة بحالة جيدة جداً وتحافظ على الطاقة بكفاءة.",
    seller: { name: "نور السليمانية", salesCount: 78, rating: 91 },
    deliveryWindow: "5-7 أيام",
    returnPolicy: "3 أيام",
  },
  {
    id: "11",
    title: "بوليفا - ساعة ميكانيكية فينتاج",
    price: 135000,
    currentBid: 115000,
    totalBids: 22,
    image: watchImg,
    category: "ساعات",
    timeLeft: "1 يوم",
    condition: "Vintage",
    description: "ساعة بوليفا الروسية الفينتاج بحركة ميكانيكية. الساعة بحالة ممتازة مع كل أجزائها الأصلية. قرص أبيض كلاسيكي وحزام أسود جلدي. تعمل بدقة عالية.",
    seller: { name: "محمد البصري", salesCount: 540, rating: 96 },
    deliveryWindow: "3-5 أيام",
    returnPolicy: "7 أيام",
  },
  {
    id: "12",
    title: "زينث - ساعة كرونوغراف فاخرة",
    price: 550000,
    currentBid: 490000,
    totalBids: 45,
    image: watchImg,
    category: "ساعات",
    timeLeft: "8 ساعات",
    condition: "Vintage",
    description: "ساعة زينث السويسرية الكرونوغراف الفاخرة من الستينات. حركة ميكانيكية متقدمة وتصميم أنيق جداً. الساعة نادرة جداً وبحالة ممتازة. شهادة الأصالة متوفرة.",
    seller: { name: "حسين النجفي", salesCount: 3200, rating: 100 },
    deliveryWindow: "1-2 أيام",
    returnPolicy: "30 يوم",
    returnDetails: "ضمان شامل للساعات الفاخرة",
  },
];
