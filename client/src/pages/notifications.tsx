import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { getAuthHeaders } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { 
  Bell, 
  MessageSquare, 
  Gavel, 
  ShoppingBag, 
  Truck, 
  Tag, 
  AlertTriangle, 
  RotateCcw, 
  Wallet, 
  Trophy, 
  Store,
  Check,
  CheckCheck,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Message, Notification as DBNotification } from "@shared/schema";

interface Notification {
  id: string;
  type: "message" | "shipping" | "offer" | "bid" | "sale" | "outbid" | "new_bid" | "return_request" | "payment" | "auction_end" | "seller_approved";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  productId?: string;
  senderId?: string;
  linkUrl?: string;
  isSystemNotification?: boolean;
}

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "message":
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case "shipping":
      return <Truck className="h-5 w-5 text-green-500" />;
    case "offer":
      return <Tag className="h-5 w-5 text-purple-500" />;
    case "bid":
    case "new_bid":
      return <Gavel className="h-5 w-5 text-amber-500" />;
    case "outbid":
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case "sale":
      return <ShoppingBag className="h-5 w-5 text-green-600" />;
    case "return_request":
      return <RotateCcw className="h-5 w-5 text-orange-500" />;
    case "payment":
      return <Wallet className="h-5 w-5 text-emerald-500" />;
    case "auction_end":
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case "seller_approved":
      return <Store className="h-5 w-5 text-indigo-500" />;
    default:
      return <Bell className="h-5 w-5" />;
  }
};

const formatTimeAgo = (date: Date, language: string) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (language === "ar") {
    if (seconds < 60) return "الآن";
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
    if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
    return `منذ ${Math.floor(seconds / 604800)} أسبوع`;
  } else {
    if (seconds < 60) return "ئێستا";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} خولەک پێش`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} کاتژمێر پێش`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} ڕۆژ پێش`;
    return `${Math.floor(seconds / 604800)} هەفتە پێش`;
  }
};

const categorizeMessage = (content: string): { type: Notification["type"]; title: string } => {
  if (content.includes("تم شحن طلبك") || content.includes("📦")) {
    return { type: "shipping", title: "تحديث الشحن" };
  }
  if (content.includes("عرض جديد") || content.includes("تم قبول عرضك") || content.includes("تم رفض عرضك")) {
    return { type: "offer", title: "تحديث العرض" };
  }
  if (content.includes("مزايدة") || content.includes("مزاد") || content.includes("تمت المزايدة")) {
    return { type: "bid", title: "تحديث المزاد" };
  }
  if (content.includes("تم بيع") || content.includes("طلب جديد")) {
    return { type: "sale", title: "طلب جديد" };
  }
  if (content.includes("طلب إرجاع") || content.includes("الإرجاع")) {
    return { type: "return_request", title: "طلب إرجاع" };
  }
  if (content.includes("تم استلام الدفعة") || content.includes("الدفع")) {
    return { type: "payment", title: "تحديث الدفع" };
  }
  if (content.includes("انتهى المزاد") || content.includes("فزت بالمزاد")) {
    return { type: "auction_end", title: "انتهاء المزاد" };
  }
  if (content.includes("تم اعتمادك كبائع") || content.includes("موافقة البائع")) {
    return { type: "seller_approved", title: "موافقة البائع" };
  }
  return { type: "message", title: "رسالة جديدة" };
};

export default function NotificationsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/messages/${user.id}`, { 
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: systemNotifications = [], isLoading: notificationsLoading } = useQuery<DBNotification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { 
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  const markNotificationAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });

  const messageNotifications: Notification[] = messages
    .filter(msg => msg.receiverId === user?.id)
    .slice(0, 20)
    .map(msg => {
      const { type, title } = categorizeMessage(msg.content);
      return {
        id: msg.id,
        type,
        title,
        message: msg.content.length > 100 ? msg.content.substring(0, 100) + "..." : msg.content,
        timestamp: new Date(msg.createdAt),
        read: msg.isRead,
        productId: msg.listingId || undefined,
        senderId: msg.senderId,
        isSystemNotification: false,
      };
    });

  const sysNotifications: Notification[] = systemNotifications
    .slice(0, 30)
    .map(notif => ({
      id: notif.id,
      type: notif.type as Notification["type"],
      title: notif.title,
      message: notif.message,
      timestamp: new Date(notif.createdAt),
      read: notif.isRead,
      productId: notif.relatedId || undefined,
      linkUrl: notif.linkUrl || undefined,
      isSystemNotification: true,
    }));

  const allNotifications = [...messageNotifications, ...sysNotifications]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const unreadCount = allNotifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    if (notification.isSystemNotification && !notification.read) {
      markNotificationAsReadMutation.mutate(notification.id);
    }

    if (notification.linkUrl) {
      navigate(notification.linkUrl);
    } else if (notification.type === "message" && notification.senderId) {
      navigate(`/messages/${notification.senderId}`);
    } else if (notification.productId) {
      navigate(`/product/${notification.productId}`);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center" dir="rtl">
          <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold mb-2">
            {language === "ar" ? "الإشعارات" : "ئاگادارییەکان"}
          </h1>
          <p className="text-muted-foreground mb-4">
            {language === "ar" ? "يجب تسجيل الدخول لعرض الإشعارات" : "پێویستە بچیتە ژوورەوە بۆ بینینی ئاگادارییەکان"}
          </p>
          <Button onClick={() => navigate("/signin")}>
            {language === "ar" ? "تسجيل الدخول" : "چوونە ژوورەوە"}
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 pb-24" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">
              {language === "ar" ? "الإشعارات" : "ئاگادارییەکان"}
            </h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="text-xs"
            >
              <CheckCheck className="h-4 w-4 ml-1" />
              {language === "ar" ? "تحديد الكل كمقروء" : "هەموو وەک خوێندراو"}
            </Button>
          )}
        </div>

        {(messagesLoading || notificationsLoading) ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : allNotifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {language === "ar" ? "لا توجد إشعارات" : "هیچ ئاگادارییەک نییە"}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {allNotifications.map((notification) => (
              <Card
                key={`${notification.isSystemNotification ? 'sys' : 'msg'}-${notification.id}`}
                className={cn(
                  "p-4 cursor-pointer transition-colors hover:bg-accent/50",
                  !notification.read && "bg-blue-50/50 border-blue-200"
                )}
                onClick={() => handleNotificationClick(notification)}
                data-testid={`notification-item-${notification.id}`}
              >
                <div className="flex gap-3">
                  <div className="shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{notification.title}</span>
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(notification.timestamp, language)}
                    </p>
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
