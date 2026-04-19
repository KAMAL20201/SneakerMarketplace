import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/ui/ProductCard";

interface Props {
  categoryId: string;
  title: string;
  viewAllUrl: string;
}

// Returns a number that changes once per day — same day always yields same products.
const getDailySeed = () => Math.floor(Date.now() / 86_400_000);

// Fisher-Yates shuffle driven by a simple LCG so results are deterministic per seed.
const seededShuffle = <T,>(array: T[], seed: number): T[] => {
  const arr = [...array];
  let s = seed;
  const next = () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const CategorySection = ({ categoryId, title, viewAllUrl }: Props) => {
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    const fetchListings = async () => {
      // Fetch a larger pool so the daily shuffle surfaces different products.
      const { data, error } = await supabase
        .from("listings_with_images")
        .select("*")
        .eq("status", "active")
        .eq("category", categoryId)
        .limit(60);

      if (error) {
        console.error("Error fetching listings:", error);
      } else {
        const pool = data ?? [];
        const shuffled = seededShuffle(pool, getDailySeed());
        setListings(shuffled.slice(0, 10));
      }
    };

    fetchListings();
  }, [categoryId]);

  if (listings.length === 0) return null;

  return (
    <section className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <Button
          asChild
          variant="ghost"
          className="text-purple-600 hover:text-purple-700 font-semibold"
        >
          <Link to={viewAllUrl}>View All</Link>
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

export default CategorySection;
