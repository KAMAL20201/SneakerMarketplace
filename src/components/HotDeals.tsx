import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/ui/ProductCard";
import { ROUTE_NAMES } from "@/constants/enums";
import { Flame } from "lucide-react";

const DISPLAY_LIMIT = 10;

const HotDeals = () => {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      const { data, error } = await supabase
        .from("hot_deals_with_images")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(DISPLAY_LIMIT);

      if (!error && data) {
        setDeals(data);
      }
      setLoading(false);
    };

    fetchDeals();
  }, []);

  if (loading || deals.length === 0) return null;

  return (
    <section className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Hot Deals</h2>
            <p className="text-xs text-orange-600 font-medium">30% off or more</p>
          </div>
        </div>
        <Button
          asChild
          variant="ghost"
          className="text-purple-600 hover:text-purple-700 font-semibold"
        >
          <Link to={`${ROUTE_NAMES.BROWSE}?deals=true`}>View All</Link>
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {deals.map((item) => (
          <div key={item.id} className="flex-shrink-0 sm:w-64 w-48">
            <ProductCard product={item} variant="vertical" />
          </div>
        ))}
      </div>
    </section>
  );
};

export default HotDeals;
