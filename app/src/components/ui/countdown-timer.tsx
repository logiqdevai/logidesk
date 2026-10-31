import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CountdownTimerProps {
  targetDate: Date;
  className?: string;
}

const CountdownTimer = ({ targetDate, className = "" }: CountdownTimerProps) => {
  const { t } = useTranslation("ui");
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        };
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return {
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
      };
    };

    const updateTimer = () => {
      setTimeLeft(calculateTimeLeft());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.isExpired) {
    return (
      <div className={`flex items-center gap-2 text-red-600 dark:text-red-400 ${className}`}>
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">{t("countdown.passed")}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-orange-600 dark:text-orange-400 ${className}`}>
      <Clock className="w-4 h-4" />
      <div className="flex items-center gap-1 text-sm font-medium">
        <span className="bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-md">{t("countdown.d", { count: timeLeft.days })}</span>
        <span className="bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-md">{t("countdown.h", { count: timeLeft.hours })}</span>
        <span className="bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-md">{t("countdown.m", { count: timeLeft.minutes })}</span>
        <span className="bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-md">{t("countdown.s", { count: timeLeft.seconds })}</span>
      </div>
    </div>
  );
};

export default CountdownTimer;
