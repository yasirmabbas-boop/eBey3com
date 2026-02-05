import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  OrderCard,
  PurchaseFilters,
  OrderDetailModal,
  type Purchase,
  type DateRange,
  type StatusFilter,
  type ModalAction,
} from "@/components/purchases";
import {
  Loader2,
  ShoppingBag,
  Lock,
} from "lucide-react";

export default function MyPurchases() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  
  // Filter state
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal state
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<ModalAction>("view");

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/account/purchases"],
    enabled: !!user?.id,
  });

  // Filter purchases based on date range, status, and search query
  const filteredPurchases = useMemo(() => {
    let filtered = [...purchases];

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      let cutoffDate: Date;
      
      switch (dateRange) {
        case "30days":
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "60days":
          cutoffDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          break;
        case "thisYear":
          cutoffDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          cutoffDate = new Date(0);
      }
      
      filtered = filtered.filter(p => new Date(p.createdAt) >= cutoffDate);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => {
        const status = p.status || p.deliveryStatus || "pending";
        switch (statusFilter) {
          case "pending":
            return status === "pending" || status === "processing";
          case "shipped":
            return status === "shipped" || status === "in_transit";
          case "delivered":
            return status === "delivered" || status === "completed";
          case "returned":
            return status === "returned";
          default:
            return true;
        }
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.listing?.title?.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        p.listing?.sellerName?.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [purchases, dateRange, statusFilter, searchQuery]);

  // Handlers
  const handleViewDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setModalAction("view");
    setIsDetailModalOpen(true);
  };

  const handleTrackPackage = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setModalAction("view");
    setIsDetailModalOpen(true);
  };

  const handleMessageSeller = (purchase: Purchase) => {
    if (purchase.listing?.sellerId) {
      navigate(`/messages?to=${purchase.listing.sellerId}`);
    }
  };

  const handleRateSeller = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setModalAction("rate");
    setIsDetailModalOpen(true);
  };

  const handleRequestReturn = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setModalAction("return");
    setIsDetailModalOpen(true);
  };

  const handleReportIssue = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setModalAction("report");
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedPurchase(null);
    setModalAction("view");
  };

  const isLoading = authLoading || purchasesLoading;

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </Layout>
    );
  }

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-md text-center">
          <Card className="border-amber-200 bg-amber-50 p-6">
            <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">يجب تسجيل الدخول</h2>
            <p className="text-muted-foreground mb-6">يرجى تسجيل الدخول لعرض مشترياتك</p>
            <Link href="/signin">
              <Button className="w-full">تسجيل الدخول</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    );
  }

  // Empty state (no purchases at all)
  if (purchases.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <PurchaseFilters
            dateRange={dateRange}
            statusFilter={statusFilter}
            searchQuery={searchQuery}
            onDateRangeChange={setDateRange}
            onStatusFilterChange={setStatusFilter}
            onSearchChange={setSearchQuery}
            totalCount={0}
          />
          <Card className="p-12 text-center mt-6">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">لا توجد مشتريات حتى الآن</h2>
            <p className="text-gray-500 mb-6">عندما تقوم بشراء منتجات، ستظهر هنا</p>
            <Link href="/search">
              <Button className="bg-primary hover:bg-primary/90">
                تصفح المنتجات
              </Button>
            </Link>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Filters Header */}
        <PurchaseFilters
          dateRange={dateRange}
          statusFilter={statusFilter}
          searchQuery={searchQuery}
          onDateRangeChange={setDateRange}
          onStatusFilterChange={setStatusFilter}
          onSearchChange={setSearchQuery}
          totalCount={filteredPurchases.length}
        />

        {/* Orders List */}
        <div className="mt-6 space-y-3">
          {filteredPurchases.length === 0 ? (
            <Card className="p-8 text-center">
              <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">لا توجد نتائج</h3>
              <p className="text-gray-500 text-sm">جرّب تغيير معايير البحث أو الفلاتر</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setDateRange("all");
                  setStatusFilter("all");
                  setSearchQuery("");
                }}
              >
                إعادة تعيين الفلاتر
              </Button>
            </Card>
          ) : (
            filteredPurchases.map((purchase) => (
              <OrderCard
                key={purchase.id}
                purchase={purchase}
                onViewDetails={handleViewDetails}
                onTrackPackage={handleTrackPackage}
                onMessageSeller={handleMessageSeller}
                onRateSeller={handleRateSeller}
                onRequestReturn={handleRequestReturn}
                onReportIssue={handleReportIssue}
              />
            ))
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        purchase={selectedPurchase}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        userId={user?.id}
        initialAction={modalAction}
      />
    </Layout>
  );
}
