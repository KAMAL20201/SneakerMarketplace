import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/ui/ProductCard";
import { ROUTE_NAMES } from "@/constants/enums";
import { Zap } from "lucide-react";

const DISPLAY_LIMIT = 10;

const InstantShipping = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      const { data, error } = await supabase
        .from("instant_shipping_with_images")
        .select("*")
        .order("min_price", { ascending: true })
        .limit(DISPLAY_LIMIT);

      if (!error && data) {
        setListings(data);
      }
      setLoading(false);
    };

    fetchListings();
  }, []);

  if (loading || listings.length === 0) return null;

  return (
    <section className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Instant Shipping</h2>
            <p className="text-xs text-teal-600 font-medium">Delivered in under 10 days</p>
          </div>
        </div>
        <Button
          asChild
          variant="ghost"
          className="text-purple-600 hover:text-purple-700 font-semibold"
        >
          <Link to={ROUTE_NAMES.BROWSE}>View All</Link>
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

export default InstantShipping;
