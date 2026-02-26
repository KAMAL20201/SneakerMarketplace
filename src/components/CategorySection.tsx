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

const CategorySection = ({ categoryId, title, viewAllUrl }: Props) => {
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    const fetchListings = async () => {
      const { data, error } = await supabase
        .from("listings_with_images")
        .select("*")
        .eq("status", "active")
        .eq("category", categoryId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching listings:", error);
      } else {
        setListings(data ?? []);
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
