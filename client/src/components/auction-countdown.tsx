import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface AuctionCountdownProps {
  endTime: Date | string | null | undefined;
  onExpired?: () => void;
}

export function AuctionCountdown({ endTime, onExpired }: AuctionCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    if (!endTime) {
      // No end time set - show as "no time limit" not expired
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });
      return;
    }

    const calculateTimeLeft = () => {
      const end = typeof endTime === "string" ? new Date(endTime) : endTime;
      
      // Check if the date is valid
      if (isNaN(end.getTime())) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });
        return;
      }
      
      const now = new Date();
      const difference = end.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        onExpired?.();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpired]);

  if (timeLeft.expired) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm font-medium" data-testid="auction-expired">
        <Clock className="h-4 w-4" />
        <span>انتهى المزاد</span>
      </div>
    );
  }

  // If no end time is set, show open auction message
  if (!endTime) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm font-medium" data-testid="auction-open">
        <Clock className="h-4 w-4" />
        <span>مزاد مفتوح</span>
      </div>
    );
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes < 5;

  return (
    <div 
      className={`flex items-center gap-2 text-sm font-medium ${isUrgent ? "text-red-600" : "text-orange-600"}`}
      data-testid="auction-countdown"
    >
      <Clock className={`h-4 w-4 ${isUrgent ? "animate-pulse" : ""}`} />
      <span>
        {timeLeft.days > 0 && <>{timeLeft.days} يوم و </>}
        {timeLeft.hours} ساعة
      </span>
    </div>
  );
}
