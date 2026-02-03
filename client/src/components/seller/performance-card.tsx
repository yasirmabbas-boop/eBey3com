/**
 * Performance Card Component for Seller Dashboard
 * 
 * Phase 3: Analytics and Performance Insights
 * Displays sales trends, conversion metrics, and actionable insights.
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Eye,
  ShoppingBag,
  BarChart3,
  Lightbulb,
  Clock,
  CheckCircle,
  Package,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { getAuthHeaders } from "@/lib/queryClient";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface SalesTrendPoint {
  date: string;
  sales: number;
  revenue: number;
}

interface TopProduct {
  id: string;
  title: string;
  image: string;
  views: number;
  sales: number;
  revenue: number;
  conversionRate: number;
}

interface SellerAnalytics {
  salesTrend: SalesTrendPoint[];
  topProducts: TopProduct[];
  categoryBreakdown: Array<{ category: string; sales: number; revenue: number; percentage: number }>;
  periodComparison: {
    current: { sales: number; revenue: number; views: number };
    previous: { sales: number; revenue: number; views: number };
    change: { salesPercent: number; revenuePercent: number; viewsPercent: number };
  };
}

interface SellerPerformance {
  responseTime: {
    averageHours: number;
    percentile95Hours: number;
  };
  offerAcceptanceRate: number;
  returnRate: number;
  shippingSpeed: {
    averageDays: number;
    onTimeRate: number;
  };
  customerSatisfaction: number;
}

interface PerformanceCardProps {
  /** Period to show: "7d", "30d", or "90d" */
  period?: string;
}

function TrendIndicator({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (value > 0) {
    return (
      <span className="flex items-center text-green-600 text-xs">
        <TrendingUp className="h-3 w-3 mr-0.5" />
        +{value}{suffix}
      </span>
    );
  } else if (value < 0) {
    return (
      <span className="flex items-center text-red-600 text-xs">
        <TrendingDown className="h-3 w-3 mr-0.5" />
        {value}{suffix}
      </span>
    );
  }
  return (
    <span className="flex items-center text-gray-500 text-xs">
      <Minus className="h-3 w-3 mr-0.5" />
      0{suffix}
    </span>
  );
}

function MetricBox({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  suffix = "" 
}: { 
  icon: React.ElementType;
  label: string;
  value: number | string;
  trend?: number;
  suffix?: string;
}) {
  return (
    <div className="text-center p-3 bg-muted/30 rounded-lg">
      <Icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
      <p className="text-2xl font-bold">{value}{suffix}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {trend !== undefined && <TrendIndicator value={trend} />}
    </div>
  );
}

function InsightTip({ message }: { message: string }) {
  return (
    <Alert className="bg-primary/5 border-primary/20">
      <Lightbulb className="h-4 w-4 text-primary" />
      <AlertDescription className="text-sm">{message}</AlertDescription>
    </Alert>
  );
}

export function PerformanceCard({ period = "30d" }: PerformanceCardProps) {
  const { language } = useLanguage();

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery<SellerAnalytics>({
    queryKey: ["/api/seller/analytics", period],
    queryFn: async () => {
      const res = await fetch(`/api/seller/analytics?period=${period}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch performance data
  const { data: performance, isLoading: performanceLoading } = useQuery<SellerPerformance>({
    queryKey: ["/api/seller/performance"],
    queryFn: async () => {
      const res = await fetch("/api/seller/performance", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch performance");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const labels = {
    title: {
      ar: "أداء هذا الشهر",
      ku: "کارکردی ئەم مانگە",
      en: "This Month's Performance",
    },
    views: {
      ar: "المشاهدات",
      ku: "بینین",
      en: "Views",
    },
    sales: {
      ar: "المبيعات",
      ku: "فرۆشتن",
      en: "Sales",
    },
    conversion: {
      ar: "معدل التحويل",
      ku: "ڕێژەی گۆڕین",
      en: "Conversion",
    },
    revenue: {
      ar: "الإيرادات",
      ku: "داهات",
      en: "Revenue",
    },
    responseTime: {
      ar: "وقت الرد",
      ku: "کاتی وەڵامدان",
      en: "Response Time",
    },
    offerAcceptance: {
      ar: "قبول العروض",
      ku: "قبوڵکردنی پێشنیار",
      en: "Offer Acceptance",
    },
    shippingSpeed: {
      ar: "سرعة الشحن",
      ku: "خێرایی ناردن",
      en: "Shipping Speed",
    },
    customerSatisfaction: {
      ar: "رضا العملاء",
      ku: "ڕازیبوونی کڕیار",
      en: "Satisfaction",
    },
    hours: {
      ar: "ساعة",
      ku: "کاتژمێر",
      en: "hrs",
    },
    days: {
      ar: "يوم",
      ku: "ڕۆژ",
      en: "days",
    },
  };

  // Generate insight based on data
  const generateInsight = (): string | null => {
    if (!analytics || !performance) return null;

    // Check for low conversion rate
    if (analytics.topProducts.length > 0) {
      const avgConversion = analytics.topProducts.reduce((sum, p) => sum + p.conversionRate, 0) / analytics.topProducts.length;
      if (avgConversion < 1) {
        return language === "ar" 
          ? "معدل التحويل منخفض. جرب تحسين صور المنتجات أو تعديل الأسعار."
          : "Conversion rate is low. Try improving product photos or adjusting prices.";
      }
    }

    // Check for slow response time
    if (performance.responseTime.averageHours > 24) {
      return language === "ar"
        ? "وقت الرد أبطأ من المعدل. الرد السريع يزيد من فرص البيع بنسبة 30%."
        : "Response time is slower than average. Faster responses convert 30% more offers.";
    }

    // Check for high return rate
    if (performance.returnRate > 5) {
      return language === "ar"
        ? "معدل الإرجاع مرتفع. راجع أوصاف المنتجات لتتطابق مع التوقعات."
        : "Return rate is high. Review product descriptions to match expectations.";
    }

    // Positive insight
    if (analytics.periodComparison.change.salesPercent > 10) {
      return language === "ar"
        ? `مبيعاتك زادت بنسبة ${analytics.periodComparison.change.salesPercent}%! استمر في العمل الرائع.`
        : `Your sales increased by ${analytics.periodComparison.change.salesPercent}%! Keep up the great work.`;
    }

    return null;
  };

  const isLoading = analyticsLoading || performanceLoading;

  if (isLoading) {
    return (
      <Card className="soft-border" data-testid="performance-card-loading">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const insight = generateInsight();
  const conversionRate = analytics && analytics.periodComparison.current.views > 0
    ? ((analytics.periodComparison.current.sales / analytics.periodComparison.current.views) * 100).toFixed(1)
    : "0";

  return (
    <Card className="soft-border" data-testid="performance-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {labels.title[language]}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {period === "7d" ? "7 days" : period === "90d" ? "90 days" : "30 days"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Metrics */}
        <div className="grid grid-cols-4 gap-3">
          <MetricBox
            icon={Eye}
            label={labels.views[language]}
            value={formatNumber(analytics?.periodComparison.current.views || 0)}
            trend={analytics?.periodComparison.change.viewsPercent}
          />
          <MetricBox
            icon={ShoppingBag}
            label={labels.sales[language]}
            value={analytics?.periodComparison.current.sales || 0}
            trend={analytics?.periodComparison.change.salesPercent}
          />
          <MetricBox
            icon={TrendingUp}
            label={labels.conversion[language]}
            value={conversionRate}
            suffix="%"
          />
          <MetricBox
            icon={Package}
            label={labels.revenue[language]}
            value={formatNumber(analytics?.periodComparison.current.revenue || 0)}
            suffix=" د.ع"
            trend={analytics?.periodComparison.change.revenuePercent}
          />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-4 gap-3 pt-2 border-t border-border/50">
          <div className="text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-semibold">
              {performance?.responseTime.averageHours || 0}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {labels.hours[language]}
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground">{labels.responseTime[language]}</p>
          </div>
          <div className="text-center">
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-semibold">{performance?.offerAcceptanceRate || 0}%</p>
            <p className="text-[10px] text-muted-foreground">{labels.offerAcceptance[language]}</p>
          </div>
          <div className="text-center">
            <Package className="h-4 w-4 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-semibold">
              {performance?.shippingSpeed.averageDays || 0}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {labels.days[language]}
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground">{labels.shippingSpeed[language]}</p>
          </div>
          <div className="text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-lg font-semibold">{performance?.customerSatisfaction || 0}%</p>
            <p className="text-[10px] text-muted-foreground">{labels.customerSatisfaction[language]}</p>
          </div>
        </div>

        {/* Insight */}
        {insight && <InsightTip message={insight} />}
      </CardContent>
    </Card>
  );
}
