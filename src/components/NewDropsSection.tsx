import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/ui/ProductCard";
import { ROUTE_NAMES } from "@/constants/enums";

interface Listing {
  id: string;
  title: string;
  brand: string;
  price: number;
  retail_price?: number | null;
  condition: string;
  size_value: string;
  image_url: string;
}

const NewDropsSection = ({
  initialListings,
}: {
  initialListings?: Listing[];
}) => {
  const [listings, setListings] = useState<Listing[]>(initialListings ?? []);

  useEffect(() => {
    // Skip client fetch if we already have SSR-provided listings
    if (initialListings && initialListings.length > 0) return;

    const fetchNewDrops = async () => {
      const { data, error } = await supabase
        .from("listings_with_images")
        .select("*")
        .eq("status", "active")
        .eq("is_new_drop", true)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Error fetching new drops:", error);
      } else {
        setListings(data ?? []);
      }
    };

    fetchNewDrops();
  }, [initialListings]);

  if (listings.length === 0) return null;

  return (
    <section className="px-4 py-6">
      <div className="relative mb-6 flex flex-col items-center gap-3 text-center sm:px-24">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-3xl font-bold text-gray-800 sm:text-4xl">New Drops</h2>
        </div>
        <Button
          asChild
          variant="ghost"
          className="min-h-11 font-semibold text-purple-600 hover:text-purple-700 sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2"
        >
          <Link to={ROUTE_NAMES.NEW_DROPS}>View All</Link>
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {listings.map((item) => (
          <div key={item.id} className="flex-shrink-0 sm:w-64 w-48">
            <ProductCard product={item} variant="vertical" />
          </div>
        ))}
      </div>
    </section>
  );
};

export default NewDropsSection;
