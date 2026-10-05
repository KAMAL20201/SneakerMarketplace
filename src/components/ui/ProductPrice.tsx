import { cn } from "@/lib/utils";

interface ProductPriceProps {
  price: number;
  retailPrice?: number | null;
  priceClassName?: string;
}

const ProductPrice = ({
  price,
  retailPrice,
  priceClassName,
}: ProductPriceProps) => (
  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
    <span className={cn("font-bold text-gray-800 text-base md:text-lg", priceClassName)}>
      ₹{price.toLocaleString("en-IN")}
    </span>
    {retailPrice != null && Number.isFinite(retailPrice) && retailPrice > 0 && (
      <span className="text-xs text-gray-500 sm:text-sm">
        <span className="sr-only">Retail price: </span>
        <s>₹{retailPrice.toLocaleString("en-IN")}</s>
      </span>
    )}
  </div>
);

export default ProductPrice;
