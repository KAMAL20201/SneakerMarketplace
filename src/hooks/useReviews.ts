import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Review, ProductRating, SellerRating } from "@/types/reviews";

export function useProductReviews(productId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<ProductRating | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
    fetchRating();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const { data, error: reviewError } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (reviewError) throw reviewError;
      setReviews(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRating = async () => {
    try {
      const { data, error: ratingError } = await supabase
        .from("product_ratings")
        .select("*")
        .eq("product_id", productId)
        .single();

      if (ratingError && ratingError.code !== "PGRST116") {
        throw ratingError;
      }

      setRating(data || null);
    } catch (err: any) {
      console.error("Error fetching rating:", err);
    }
  };

  const refetch = () => {
    fetchReviews();
    fetchRating();
  };

  return { reviews, rating, isLoading, error, refetch };
}

export function useSellerRating(sellerId: string) {
  const [rating, setRating] = useState<SellerRating | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRating();
  }, [sellerId]);

  const fetchRating = async () => {
    try {
      const { data, error: ratingError } = await supabase
        .from("seller_ratings")
        .select("*")
        .eq("seller_id", sellerId)
        .single();

      if (ratingError && ratingError.code !== "PGRST116") {
        throw ratingError;
      }

      setRating(data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { rating, isLoading, error, refetch: fetchRating };
}

export function useHasUserReviewed(productId: string, userId: string | undefined) {
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    checkReview();
  }, [productId, userId]);

  const checkReview = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("id")
        .eq("product_id", productId)
        .eq("reviewer_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking review:", error);
      }

      setHasReviewed(!!data);
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return { hasReviewed, isLoading, refetch: checkReview };
}
