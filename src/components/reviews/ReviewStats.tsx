import { useEffect, useState } from "react";
import { StarRating } from "@/components/ui/StarRating";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import type { ProductRating } from "@/types/reviews";

interface ReviewStatsProps {
  productId: string;
}

export function ReviewStats({ productId }: ReviewStatsProps) {
  const [stats, setStats] = useState<ProductRating | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [productId]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from("product_ratings")
        .select("*")
        .eq("product_id", productId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error fetching stats:", error);
        return;
      }

      setStats(data || null);
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  if (!stats || stats.total_reviews === 0) {
    return null;
  }

  const ratingBars = [
    { stars: 5, count: stats.five_star_count },
    { stars: 4, count: stats.four_star_count },
    { stars: 3, count: stats.three_star_count },
    { stars: 2, count: stats.two_star_count },
    { stars: 1, count: stats.one_star_count },
  ];

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-6">
        Customer Reviews
      </h3>

      <div className="flex items-start gap-8">
        {/* Overall Rating */}
        <div className="flex flex-col items-center">
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {stats.average_rating.toFixed(1)}
          </div>
          <StarRating rating={stats.average_rating} size="lg" />
          <p className="text-sm text-gray-600 mt-2">
            Based on {stats.total_reviews}{" "}
            {stats.total_reviews === 1 ? "review" : "reviews"}
          </p>
        </div>

        {/* Rating Breakdown */}
        <div className="flex-1 space-y-3">
          {ratingBars.map(({ stars, count }) => {
            const percentage =
              stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0;

            return (
              <div key={stars} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-12">
                  {stars} star
                </span>
                <div className="flex-1">
                  <Progress
                    value={percentage}
                    className="h-2 bg-gray-200"
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
