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
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">مشترياتي</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {totalCount > 0 ? \`\${totalCount} طلب\` : "تتبع طلباتك وتسليماتك"}
          </p>
        </div>
      </div>

      {/* Filter Bar - Sticky on mobile */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-4 px-4 py-2 sm:static sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          {/* Row 1 on mobile: Date + Status filters */}
          <div className="flex gap-2 sm:contents">
            {/* Date Range Filter */}
            <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRange)}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px] md:w-[160px] h-10 sm:h-9 text-sm" data-testid="filter-date-range">
                <Calendar className="h-4 w-4 ml-1 sm:ml-2 text-muted-foreground flex-shrink-0" />
                <SelectValue placeholder="الفترة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days" className="py-3 sm:py-2">آخر 30 يوم</SelectItem>
                <SelectItem value="60days" className="py-3 sm:py-2">آخر 60 يوم</SelectItem>
                <SelectItem value="thisYear" className="py-3 sm:py-2">هذا العام</SelectItem>
                <SelectItem value="all" className="py-3 sm:py-2">كل الطلبات</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px] md:w-[160px] h-10 sm:h-9 text-sm" data-testid="filter-status">
                <Filter className="h-4 w-4 ml-1 sm:ml-2 text-muted-foreground flex-shrink-0" />
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="py-3 sm:py-2">كل الحالات</SelectItem>
                <SelectItem value="pending" className="py-3 sm:py-2">قيد التجهيز</SelectItem>
                <SelectItem value="shipped" className="py-3 sm:py-2">قيد التوصيل</SelectItem>
                <SelectItem value="delivered" className="py-3 sm:py-2">تم التسليم</SelectItem>
                <SelectItem value="returned" className="py-3 sm:py-2">مرتجع</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 2 on mobile: Search */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن طلب أو منتج..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pr-10 h-10 sm:h-9 text-sm"
              data-testid="filter-search"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
