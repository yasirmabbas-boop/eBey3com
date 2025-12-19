import { useState } from "react";
import { Bell, X, Clock, Gavel, Tag, ShoppingBag, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "auction_ending" | "outbid" | "auction_won" | "price_drop" | "new_item" | "watchlist";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  productId?: string;
  image?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "auction_ending",
    title: "المزاد ينتهي قريباً",
    message: "ساعة رولكس صبمارينر ينتهي مزادها خلال ساعة واحدة!",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    read: false,
    productId: "1",
  },
  {
    id: "2",
    type: "outbid",
    title: "تم تجاوز مزايدتك",
    message: "شخص آخر قدم مزايدة أعلى على سجادة نائين الملكية",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: false,
    productId: "17",
  },
  {
    id: "3",
    type: "watchlist",
    title: "تحديث قائمة المتابعة",
    message: "تم تخفيض سعر ساعة كاسيو التي تتابعها",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    read: true,
    productId: "6",
  },
  {
    id: "4",
    type: "new_item",
    title: "منتج جديد في فئتك المفضلة",
    message: "تم إضافة سجادة تبريز جديدة في قسم التحف والأثاث",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    read: true,
    productId: "8",
  },
];

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "auction_ending":
      return <Clock className="h-5 w-5 text-amber-500" />;
    case "outbid":
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case "auction_won":
      return <Gavel className="h-5 w-5 text-green-500" />;
    case "price_drop":
      return <Tag className="h-5 w-5 text-blue-500" />;
    case "new_item":
      return <ShoppingBag className="h-5 w-5 text-purple-500" />;
    case "watchlist":
      return <Bell className="h-5 w-5 text-blue-500" />;
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

export function NotificationsButton() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [open, setOpen] = useState(false);
  
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-gray-50 transition-colors cursor-pointer relative group",
                    !notification.read && "bg-blue-50/50"
                  )}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.productId) {
                      window.location.href = `/product/${notification.productId}`;
                      setOpen(false);
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                          data-testid={`button-remove-notification-${notification.id}`}
                        >
                          <X className="h-4 w-4 text-gray-400" />
                        </button>
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
              setOpen(false);
            }}
            data-testid="button-all-notifications"
          >
            عرض جميع الإشعارات
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
