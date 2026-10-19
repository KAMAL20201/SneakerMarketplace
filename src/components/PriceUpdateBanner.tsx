import { formatPriceNoticeDate, parseScheduledPriceNotice } from "@/lib/priceNotice";

interface PriceUpdateBannerProps {
  notice: unknown;
  brand: string | null;
}

export default function PriceUpdateBanner({
  notice,
  brand,
}: PriceUpdateBannerProps) {
  const priceNotice = parseScheduledPriceNotice(notice);
  if (!priceNotice) return null;

  return (
    <aside
      aria-label="Price update"
      className="border-y border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs leading-relaxed text-amber-950 sm:text-[13px]"
    >
      <p>
        {brand?.trim().toLowerCase() === "dynafish"
          ? "We’re sorry — due to Dynafish’s price increase in China, our price changes from "
          : "We’re sorry for the price increase. Our price changes from "}
        <span className="whitespace-nowrap font-semibold">
          ₹{priceNotice.previous_price.toLocaleString("en-IN")}
        </span>{" "}
        to{" "}
        <span className="whitespace-nowrap font-semibold">
          ₹{priceNotice.new_price.toLocaleString("en-IN")}
        </span>{" "}
        from <span className="font-semibold">{formatPriceNoticeDate(priceNotice.effective_at)}</span>. Thank you for
        understanding.
      </p>
    </aside>
  );
}
