import type { ComponentProps } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ui/ProductCard";
import { ROUTE_HELPERS } from "@/constants/enums";
import { BRANDS_CONFIG } from "@/constants/brandsConfig";

export type AntaListing = ComponentProps<typeof ProductCard>["product"];

interface ShopAntaSectionProps {
  listings: AntaListing[];
}

export default function ShopAntaSection({ listings }: ShopAntaSectionProps) {
  if (listings.length === 0) return null;

  return (
    <section aria-labelledby="shop-anta-heading" className="px-4 py-6">
      <div className="relative mb-6 flex flex-col items-center gap-3 text-center sm:px-24">
        <div>
          <h2 id="shop-anta-heading" className="text-3xl font-bold text-gray-800 sm:text-4xl">Anta Running</h2>
          <p className="text-xs font-medium text-purple-600">{BRANDS_CONFIG.anta.tagline}</p>
        </div>
        <Button asChild variant="ghost" className="min-h-11 font-semibold text-purple-600 hover:text-purple-700 sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2">
          <Link to={ROUTE_HELPERS.BRAND_PAGE(BRANDS_CONFIG.anta.slug)} aria-label="View all Anta products">View All</Link>
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {listings.map((listing) => (
          <div key={listing.id} className="w-48 shrink-0 sm:w-64">
            <ProductCard product={listing} variant="vertical" />
          </div>
        ))}
      </div>

    </section>
  );
}
