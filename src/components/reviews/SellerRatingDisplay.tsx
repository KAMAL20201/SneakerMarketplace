import { useEffect, useState } from "react";
import { StarRating } from "@/components/ui/StarRating";
import { supabase } from "@/lib/supabase";
import type { SellerRating } from "@/types/reviews";

interface SellerRatingDisplayProps {
  sellerId: string;
  className?: string;
  showCount?: boolean;
}

export function SellerRatingDisplay({
  sellerId,
  className,
  showCount = true,
}: SellerRatingDisplayProps) {
  const [rating, setRating] = useState<SellerRating | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRating();
  }, [sellerId]);

  const fetchRating = async () => {
    try {
      const { data, error } = await supabase
        .from("seller_ratings")
        .select("*")
        .eq("seller_id", sellerId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching seller rating:", error);
        return;
      }

      setRating(data || null);
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse flex items-center gap-2">
        <div className="h-4 bg-gray-200 rounded w-20" />
      </div>
    );
  }

  if (!rating || rating.total_reviews === 0) {
    return (
      <div className={className}>
        <span className="text-sm text-gray-500">No reviews yet</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <StarRating rating={rating.average_rating} size="sm" showNumber />
        {showCount && (
          <span className="text-sm text-gray-600">
            ({rating.total_reviews} {rating.total_reviews === 1 ? "review" : "reviews"})
          </span>
        )}
      </div>
    </div>
  );
}
