import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface PriceCountdownBannerProps {
  /** ISO-8601 deadline string — banner hides once now >= deadline */
  deadline: string;
  currentPrice: number;
  newPrice: number;
}

function calcTimeLeft(deadline: string): TimeLeft | null {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export default function PriceCountdownBanner({
  deadline,
  currentPrice,
  newPrice,
}: PriceCountdownBannerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() =>
    calcTimeLeft(deadline),
  );

  useEffect(() => {
    // Recalculate immediately in case of SSR/client hydration mismatch
    setTimeLeft(calcTimeLeft(deadline));

    const id = setInterval(() => {
      const next = calcTimeLeft(deadline);
      setTimeLeft(next);
      if (!next) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [deadline]);

  if (!timeLeft) return null;

  const priceDiff = newPrice - currentPrice;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-3 mx-4 lg:mx-0 rounded-xl overflow-hidden border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50"
    >
      {/* Header strip */}
      <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5">
        <Clock className="h-3.5 w-3.5 text-white shrink-0" />
        <p className="text-xs font-semibold text-white tracking-wide uppercase">
          ⚠️ Price goes up in
        </p>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 flex flex-col gap-2">
        {/* Apology note */}
        <p className="text-sm text-amber-800 leading-snug">
          🙏{" "}
          <span className="font-semibold">We're sorry to share this</span> — due
          to a significant rise in shipping costs, we have no choice but to
          adjust the price of this product. We've held off as long as we could
          and truly appreciate your continued support.
        </p>

        {/* Pricing line */}
        <p className="text-sm text-amber-900">
          Grab it now at{" "}
          <span className="font-bold">
            ₹{currentPrice.toLocaleString("en-IN")}
          </span>{" "}
          before it increases by{" "}
          <span className="font-bold text-orange-600">
            +₹{priceDiff.toLocaleString("en-IN")}
          </span>{" "}
          to{" "}
          <span className="font-bold">
            ₹{newPrice.toLocaleString("en-IN")}
          </span>
        </p>

        {/* Countdown tiles */}
        <div className="flex items-center gap-1.5">
          {[
            { label: "Days", value: timeLeft.days },
            { label: "Hours", value: timeLeft.hours },
            { label: "Mins", value: timeLeft.minutes },
            { label: "Secs", value: timeLeft.seconds },
          ].map(({ label, value }, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="flex flex-col items-center">
                <span className="bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-xl font-bold text-amber-700 tabular-nums shadow-sm min-w-[48px] text-center">
                  {label === "Days" ? value : pad(value)}
                </span>
                <span className="text-[10px] font-medium text-amber-500 mt-0.5 uppercase tracking-wider">
                  {label}
                </span>
              </div>
              {i < 3 && (
                <span className="text-amber-400 font-bold text-lg mb-4 select-none">
                  :
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
