import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Calendar, Filter } from "lucide-react";

export type DateRange = "30days" | "60days" | "thisYear" | "all";
export type StatusFilter = "all" | "pending" | "shipped" | "delivered" | "returned";

interface PurchaseFiltersProps {
  dateRange: DateRange;
  statusFilter: StatusFilter;
  searchQuery: string;
  onDateRangeChange: (value: DateRange) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onSearchChange: (value: string) => void;
  totalCount: number;
}

export function PurchaseFilters({
  dateRange,
  statusFilter,
  searchQuery,
  onDateRangeChange,
  onStatusFilterChange,
  onSearchChange,
  totalCount,
}: PurchaseFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">مشترياتي</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount > 0 ? \`\${totalCount} طلب\` : "تتبع طلباتك وتسليماتك"}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Date Range Filter */}
        <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRange)}>
          <SelectTrigger className="w-full sm:w-[160px]" data-testid="filter-date-range">
            <Calendar className="h-4 w-4 ml-2 text-muted-foreground" />
            <SelectValue placeholder="الفترة الزمنية" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30days">آخر 30 يوم</SelectItem>
            <SelectItem value="60days">آخر 60 يوم</SelectItem>
            <SelectItem value="thisYear">هذا العام</SelectItem>
            <SelectItem value="all">كل الطلبات</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-[160px]" data-testid="filter-status">
            <Filter className="h-4 w-4 ml-2 text-muted-foreground" />
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="pending">قيد التجهيز</SelectItem>
            <SelectItem value="shipped">قيد التوصيل</SelectItem>
            <SelectItem value="delivered">تم التسليم</SelectItem>
            <SelectItem value="returned">مرتجع</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث عن طلب أو منتج..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10"
            data-testid="filter-search"
          />
        </div>
      </div>
    </div>
  );
}
