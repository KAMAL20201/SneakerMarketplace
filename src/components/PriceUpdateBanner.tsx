interface PriceUpdateBannerProps {
  effectiveDate: string;
  previousPrice: number;
  newPrice: number;
}

export default function PriceUpdateBanner({
  effectiveDate,
  previousPrice,
  newPrice,
}: PriceUpdateBannerProps) {
  return (
    <aside
      aria-label="Dynafish price update"
      className="border-y border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs leading-relaxed text-amber-950 sm:text-[13px]"
    >
      <p>
        We’re sorry — due to Dynafish’s price increase in China, our price changes
        from{" "}
        <span className="whitespace-nowrap font-semibold">
          ₹{previousPrice.toLocaleString("en-IN")}
        </span>{" "}
        to{" "}
        <span className="whitespace-nowrap font-semibold">
          ₹{newPrice.toLocaleString("en-IN")}
        </span>{" "}
        from <span className="font-semibold">{effectiveDate}</span>. Thank you for
        understanding.
      </p>
    </aside>
  );
}
