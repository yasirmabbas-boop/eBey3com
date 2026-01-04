import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Clock, Gavel, Tag, ShoppingBag, MessageSquare, Check, Truck, Package, AlertTriangle, RotateCcw, Wallet, Trophy, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
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

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return "الآن";
  if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
  if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
  if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
  return `منذ ${Math.floor(seconds / 604800)} أسبوع`;
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

interface NotificationsButtonProps {
  variant?: "default" | "mobile";
}

export function NotificationsButton({ variant = "default" }: NotificationsButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/messages/${user.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Fetch system notifications (outbid, new_bid, etc.)
  const { data: systemNotifications = [] } = useQuery<DBNotification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const markMessageAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/messages/${messageId}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const markNotificationAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllNotificationsAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Combine messages and system notifications
  const messageNotifications: Notification[] = messages
    .filter(msg => msg.receiverId === user?.id)
    .slice(0, 10)
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
    .slice(0, 20)
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

  // Combine and sort by timestamp
  const notifications: Notification[] = [...sysNotifications, ...messageNotifications]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 30);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (notification: Notification) => {
    if (notification.isSystemNotification) {
      markNotificationAsReadMutation.mutate(notification.id);
    } else {
      markMessageAsReadMutation.mutate(notification.id);
    }
  };

  const markAllAsRead = () => {
    markAllNotificationsAsReadMutation.mutate();
    notifications.filter(n => !n.read && !n.isSystemNotification).forEach(n => {
      markMessageAsReadMutation.mutate(n.id);
    });
  };

  if (!user) {
    if (variant === "mobile") {
      return (
        <div 
          className="relative cursor-pointer"
          onClick={() => window.location.href = "/signin"}
        >
          <Bell className="h-6 w-6 text-gray-600" />
        </div>
      );
    }
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        data-testid="button-notifications"
        onClick={() => window.location.href = "/auth"}
      >
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  const triggerButton = variant === "mobile" ? (
    <div className="relative cursor-pointer">
      <Bell className="h-6 w-6 text-gray-600" />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold px-1">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </div>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      data-testid="button-notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0" 
        align="end" 
        dir="rtl"
        data-testid="notifications-panel"
      >
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-l from-blue-50 to-white">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            الإشعارات
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-blue-600 hover:text-blue-700 text-xs"
              data-testid="button-mark-all-read"
            >
              <Check className="h-4 w-4 ml-1" />
              تحديد الكل كمقروء
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Bell className="h-12 w-12 mb-3 opacity-50" />
              <p>لا توجد إشعارات</p>
              <p className="text-sm mt-1">ستظهر هنا الرسائل وتحديثات الطلبات</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-gray-50 transition-colors cursor-pointer relative group",
                    !notification.read && "bg-blue-50/50",
                    notification.type === "outbid" && !notification.read && "bg-red-50 border-r-4 border-red-500"
                  )}
                  onClick={() => {
                    markAsRead(notification);
                    setOpen(false);
                    
                    if (notification.linkUrl) {
                      window.location.href = notification.linkUrl;
                      return;
                    }
                    
                    switch (notification.type) {
                      case "sale":
                        window.location.href = "/seller-dashboard?tab=sales";
                        break;
                      case "return_request":
                        window.location.href = notification.isSystemNotification 
                          ? "/seller-dashboard?tab=returns" 
                          : "/my-purchases";
                        break;
                      case "shipping":
                      case "payment":
                        window.location.href = "/my-purchases";
                        break;
                      case "offer":
                        window.location.href = notification.isSystemNotification 
                          ? "/my-purchases" 
                          : "/seller-dashboard?tab=offers";
                        break;
                      case "seller_approved":
                        window.location.href = "/sell";
                        break;
                      case "bid":
                      case "new_bid":
                      case "outbid":
                      case "auction_end":
                        if (notification.productId) {
                          window.location.href = `/product/${notification.productId}`;
                        } else {
                          window.location.href = "/my-purchases";
                        }
                        break;
                      default:
                        if (notification.productId) {
                          window.location.href = `/product/${notification.productId}`;
                        } else {
                          window.location.href = "/messages";
                        }
                    }
                  }}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "font-semibold text-sm",
                          !notification.read && "text-blue-900"
                        )}>
                          {notification.title}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTimeAgo(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t bg-gray-50">
          <Button
            variant="outline"
            className="w-full text-sm"
            onClick={() => {
              window.location.href = "/messages";
              setOpen(false);
            }}
            data-testid="button-all-notifications"
          >
            عرض جميع الرسائل
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
