import { Link } from "react-router";
import { Zap } from "lucide-react";
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

const NewDropsSection = () => {
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    const fetchNewDrops = async () => {
      const { data, error } = await supabase
        .from("listings_with_images")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Error fetching new drops:", error);
      } else {
        setListings(data ?? []);
      }
    };

    fetchNewDrops();
  }, []);

  if (listings.length === 0) return null;

  return (
    <section className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">New Drops</h2>
        </div>
        <Button
          asChild
          variant="ghost"
          className="text-purple-600 hover:text-purple-700 font-semibold"
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
