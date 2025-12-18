
import watchImg from "@assets/generated_images/vintage_gold_watch.png";
import jacketImg from "@assets/generated_images/vintage_leather_jacket.png";

export interface Product {
  id: string;
  title: string;
  price: number;
  currentBid?: number;
  image: string;
  category: string;
  timeLeft?: string;
  condition: "New" | "Used - Like New" | "Used - Good" | "Vintage";
}

export const PRODUCTS: Product[] = [
  {
    id: "1",
    title: "ساعة ذهبية كلاسيكية - فينتاج",
    price: 150000,
    currentBid: 120000,
    image: watchImg,
    category: "ساعات",
    timeLeft: "2 يوم",
    condition: "Vintage",
  },
  {
    id: "2",
    title: "جاكيت جلد طبيعي - موديل الثمانينات",
    price: 85000,
    image: jacketImg,
    category: "ملابس",
    condition: "Used - Good",
  },
  {
    id: "3",
    title: "ساعة أوميغا قديمة نادرة",
    price: 450000,
    currentBid: 380000,
    image: watchImg,
    category: "ساعات",
    timeLeft: "5 ساعات",
    condition: "Vintage",
  },
  {
    id: "4",
    title: "معطف شتوي كلاسيك",
    price: 60000,
    image: jacketImg,
    category: "ملابس",
    condition: "Used - Like New",
  },
];
