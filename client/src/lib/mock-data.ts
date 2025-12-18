
import watchImg from "@assets/generated_images/vintage_gold_watch.png";
import jacketImg from "@assets/generated_images/vintage_leather_jacket.png";

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
}

export const PRODUCTS: Product[] = [
  {
    id: "1",
    title: "ساعة ذهبية كلاسيكية - فينتاج",
    price: 150000,
    currentBid: 120000,
    totalBids: 23,
    image: watchImg,
    category: "ساعات",
    timeLeft: "2 يوم",
    condition: "Vintage",
    description: "ساعة فينتاج كلاسيكية بحالة ممتازة مع صندوق أصلي. تعمل بشكل مثالي وتحتفظ بالوقت بدقة. المواد الذهبية طبيعية 100%.",
  },
  {
    id: "2",
    title: "جاكيت جلد طبيعي - موديل الثمانينات",
    price: 85000,
    totalBids: 8,
    image: jacketImg,
    category: "ملابس",
    condition: "Used - Good",
    description: "جاكيت جلد طبيعي أصلي من الثمانينات. بحالة جيدة جداً مع بعض علامات الاستخدام الطبيعية.",
  },
  {
    id: "3",
    title: "ساعة أوميغا قديمة نادرة",
    price: 450000,
    currentBid: 380000,
    totalBids: 45,
    image: watchImg,
    category: "ساعات",
    timeLeft: "5 ساعات",
    condition: "Vintage",
    description: "ساعة أوميغا سيماستر نادرة جداً من الستينات. مع شهادة أصالة وضمان دوري أوميغا. حالة المحرك ممتازة.",
  },
  {
    id: "4",
    title: "معطف شتوي كلاسيك",
    price: 60000,
    totalBids: 5,
    image: jacketImg,
    category: "ملابس",
    condition: "Used - Like New",
    description: "معطف شتوي كلاسيكي بحالة شبه جديدة. مادة عالية الجودة وتدفئة ممتازة.",
  },
];
