import { useState, useEffect, memo } from "react";
import { Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface AuctionCountdownProps {
  endTime: Date | string | null | undefined;
  onExpired?: () => void;
  simple?: boolean;
}

export const AuctionCountdown = memo(function AuctionCountdown({ endTime, onExpired, simple = false }: AuctionCountdownProps) {
  const { language } = useLanguage();
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

  // Simple mode: just show total hours
  if (simple) {
    const totalHours = timeLeft.days * 24 + timeLeft.hours;
    return (
      <p className="text-white/90 text-sm" data-testid="auction-countdown-simple">
        {totalHours > 0 
          ? (language === "ar" ? `ينتهي خلال ${totalHours} ساعة` : `Ends in ${totalHours} hours`)
          : (language === "ar" ? "انتهى المزاد" : "Auction ended")
        }
      </p>
    );
  }

  const totalHoursRemaining = timeLeft.days * 24 + timeLeft.hours + (timeLeft.minutes / 60);
  const isOverFiveHours = totalHoursRemaining >= 5;
  const isUrgent = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes < 5;

  const formatNumber = (n: number) => n.toString().padStart(2, '0');

  const textColor = isOverFiveHours ? "text-green-600" : "text-red-600";
  const bgColor = isOverFiveHours ? "bg-green-100" : "bg-red-100";

  return (
    <div 
      className={`flex items-center gap-2 text-sm font-medium ${textColor}`}
      data-testid="auction-countdown"
    >
      <Clock className={`h-4 w-4 ${isUrgent ? "animate-pulse" : ""}`} />
      <div className="flex items-center gap-1 font-mono">
        {timeLeft.days > 0 && (
          <>
            <span className={`${bgColor} px-1.5 py-0.5 rounded`}>{timeLeft.days}</span>
            <span className="text-xs">يوم</span>
          </>
        )}
        <span className={`${bgColor} px-1.5 py-0.5 rounded`}>{formatNumber(timeLeft.hours)}</span>
        <span className="text-xs">:</span>
        <span className={`${bgColor} px-1.5 py-0.5 rounded`}>{formatNumber(timeLeft.minutes)}</span>
        <span className="text-xs">:</span>
        <span className={`${bgColor} px-1.5 py-0.5 rounded`}>{formatNumber(timeLeft.seconds)}</span>
      </div>
    </div>
  );
});
