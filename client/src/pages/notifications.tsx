import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Bell, Check, Clock, Gavel, Tag, ShoppingBag, MessageSquare, Truck, AlertTriangle, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import type { Notification } from "@shared/schema";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "message":
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case "shipping":
    case "order_shipped":
      return <Truck className="h-5 w-5 text-green-500" />;
    case "offer":
    case "offer_received":
    case "offer_accepted":
    case "offer_rejected":
      return <Tag className="h-5 w-5 text-purple-500" />;
    case "bid":
    case "new_bid":
    case "auction_won":
    case "auction_sold":
      return <Gavel className="h-5 w-5 text-amber-500" />;
    case "outbid":
    case "auction_lost":
    case "auction_ended_no_bids":
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case "sale":
    case "order_received":
      return <ShoppingBag className="h-5 w-5 text-green-600" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return "الآن";
  if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
  if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
  if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
  return `منذ ${Math.floor(seconds / 604800)} أسبوع`;
};

export default function NotificationsPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.relatedId) {
      navigate(`/product/${notification.relatedId}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Bell className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">سجل الدخول لعرض الإشعارات</h2>
            <p className="text-gray-500 mb-4">يرجى تسجيل الدخول للاطلاع على إشعاراتك</p>
            <Button onClick={() => navigate("/signin")}>تسجيل الدخول</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">الإشعارات</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount} جديد
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-4 w-4 ml-2" />
              تحديد الكل كمقروء
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">لا توجد إشعارات</h2>
            <p className="text-gray-500">ستظهر هنا إشعاراتك الجديدة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                  !notification.isRead ? "bg-blue-50 border-blue-200" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
                data-testid={`notification-${notification.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold ${!notification.isRead ? "text-primary" : "text-gray-800"}`}>
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2">{notification.message}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeAgo(notification.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
