/**
 * Action Card Component for Seller Dashboard
 * 
 * Displays urgent action items that need seller attention.
 * Part of the "task-first" design following eBay's Seller Hub patterns.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, 
  HandCoins, 
  MessageSquare, 
  RotateCcw,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export type ActionCardType = "ship" | "offers" | "messages" | "returns";

interface ActionCardProps {
  type: ActionCardType;
  count: number;
  onClick: () => void;
  /** Optional: show time-sensitive indicator */
  urgent?: boolean;
}

interface CardConfig {
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
  badgeColor: string;
  title: { ar: string; ku: string; en: string };
  description: { ar: string; ku: string; en: string };
  action: { ar: string; ku: string; en: string };
}

const CARD_CONFIGS: Record<ActionCardType, CardConfig> = {
  ship: {
    icon: Truck,
    bgColor: "bg-amber-50 border-amber-200 hover:bg-amber-100",
    iconColor: "text-amber-600",
    badgeColor: "bg-amber-500",
    title: {
      ar: "طلبات بانتظار الشحن",
      ku: "داواکاری چاوەڕێی ناردن",
      en: "Orders to Ship",
    },
    description: {
      ar: "يجب شحنها في أقرب وقت",
      ku: "دەبێت بە زووترین کات بنێردرێت",
      en: "Ship as soon as possible",
    },
    action: {
      ar: "إدارة الشحن",
      ku: "بەڕێوەبردنی ناردن",
      en: "Manage Shipping",
    },
  },
  offers: {
    icon: HandCoins,
    bgColor: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    iconColor: "text-blue-600",
    badgeColor: "bg-blue-500",
    title: {
      ar: "عروض بانتظار الرد",
      ku: "پێشنیارەکان چاوەڕێی وەڵامن",
      en: "Offers Waiting",
    },
    description: {
      ar: "تنتهي صلاحيتها قريباً",
      ku: "بەم زووانە تەواو دەبن",
      en: "Expiring soon",
    },
    action: {
      ar: "مراجعة العروض",
      ku: "پێداچوونەوەی پێشنیار",
      en: "Review Offers",
    },
  },
  messages: {
    icon: MessageSquare,
    bgColor: "bg-green-50 border-green-200 hover:bg-green-100",
    iconColor: "text-green-600",
    badgeColor: "bg-green-500",
    title: {
      ar: "رسائل غير مقروءة",
      ku: "نامە نەخوێندراوەکان",
      en: "Unread Messages",
    },
    description: {
      ar: "من المشترين المحتملين",
      ku: "لە کڕیارە ئەگەرییەکان",
      en: "From potential buyers",
    },
    action: {
      ar: "الرد الآن",
      ku: "ئێستا وەڵامبدەوە",
      en: "Reply Now",
    },
  },
  returns: {
    icon: RotateCcw,
    bgColor: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    iconColor: "text-orange-600",
    badgeColor: "bg-orange-500",
    title: {
      ar: "طلبات إرجاع",
      ku: "داواکاری گەڕاندنەوە",
      en: "Return Requests",
    },
    description: {
      ar: "تحتاج إلى الرد",
      ku: "پێویستی بە وەڵام هەیە",
      en: "Needs response",
    },
    action: {
      ar: "مراجعة الطلبات",
      ku: "پێداچوونەوەی داواکاری",
      en: "Review Requests",
    },
  },
};

export function ActionCard({ type, count, onClick, urgent }: ActionCardProps) {
  const { language } = useLanguage();
  const config = CARD_CONFIGS[type];
  const Icon = config.icon;

  if (count === 0) return null;

  return (
    <Card 
      className={`min-w-[200px] flex-shrink-0 cursor-pointer transition-all border ${config.bgColor}`}
      onClick={onClick}
      data-testid={`action-card-${type}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg bg-white/80 ${config.iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <Badge className={`${config.badgeColor} text-white`}>
            {count}
          </Badge>
        </div>
        
        <h3 className="font-semibold text-sm mb-1">
          {config.title[language]}
        </h3>
        
        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
          {urgent && <Clock className="h-3 w-3 text-orange-500" />}
          {config.description[language]}
        </p>
        
        <Button 
          size="sm" 
          variant="ghost" 
          className="w-full justify-between text-xs h-8 px-2"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {config.action[language]}
          <ArrowRight className="h-3 w-3 rtl:rotate-180" />
        </Button>
      </CardContent>
    </Card>
  );
}
