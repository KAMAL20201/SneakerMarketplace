import { useState, useEffect } from "react";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThumbsUp, ThumbsDown, Flag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ReviewWithUserVote } from "@/types/reviews";
import { formatDistanceToNow } from "date-fns";

interface ReviewListProps {
  productId: string;
  limit?: number;
}

export function ReviewList({ productId, limit }: ReviewListProps) {
  const [reviews, setReviews] = useState<ReviewWithUserVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [votingReviewId, setVotingReviewId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchReviews();
  }, [productId, user]);

  const fetchReviews = async () => {
    try {
      // Build the query
      let query = supabase
        .from("reviews")
        .select(
          `
          *,
          reviewer:auth.users!reviewer_id(id, email)
        `
        )
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching reviews:", error);
        toast.error("Failed to load reviews");
        return;
      }

      // Fetch user votes if logged in
      if (user && data) {
        const reviewIds = data.map((r) => r.id);
        const { data: votes } = await supabase
          .from("review_helpfulness")
          .select("review_id, is_helpful")
          .in("review_id", reviewIds)
          .eq("user_id", user.id);

        const votesMap = new Map(
          votes?.map((v) => [v.review_id, { is_helpful: v.is_helpful }])
        );

        const reviewsWithVotes = data.map((review) => ({
          ...review,
          user_vote: votesMap.get(review.id) || null,
        }));

        setReviews(reviewsWithVotes);
      } else {
        setReviews(data || []);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (reviewId: string, isHelpful: boolean) => {
    if (!user) {
      toast.error("Please sign in to vote on reviews");
      return;
    }

    setVotingReviewId(reviewId);

    try {
      const review = reviews.find((r) => r.id === reviewId);
      const existingVote = review?.user_vote;

      if (existingVote) {
        // If clicking the same vote, remove it
        if (existingVote.is_helpful === isHelpful) {
          const { error } = await supabase
            .from("review_helpfulness")
            .delete()
            .eq("review_id", reviewId)
            .eq("user_id", user.id);

          if (error) throw error;
        } else {
          // Update to opposite vote
          const { error } = await supabase
            .from("review_helpfulness")
            .update({ is_helpful: isHelpful })
            .eq("review_id", reviewId)
            .eq("user_id", user.id);

          if (error) throw error;
        }
      } else {
        // Create new vote
        const { error } = await supabase
          .from("review_helpfulness")
          .insert([
            {
              review_id: reviewId,
              user_id: user.id,
              is_helpful: isHelpful,
            },
          ]);

        if (error) throw error;
      }

      // Refresh reviews to get updated counts
      await fetchReviews();
    } catch (error) {
      console.error("Error voting on review:", error);
      toast.error("Failed to record your vote");
    } finally {
      setVotingReviewId(null);
    }
  };

  const handleFlag = async (reviewId: string) => {
    if (!user) {
      toast.error("Please sign in to report reviews");
      return;
    }

    try {
      const { error } = await supabase
        .from("reviews")
        .update({ is_flagged: true })
        .eq("id", reviewId);

      if (error) throw error;

      toast.success("Review has been flagged for moderation");
    } catch (error) {
      console.error("Error flagging review:", error);
      toast.error("Failed to flag review");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <p className="text-gray-500 text-lg">
          No reviews yet. Be the first to review this product!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review, index) => (
        <div key={review.id}>
          <div className="glass-card rounded-2xl p-6">
            {/* Review Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <StarRating rating={review.rating} size="sm" />
                  {review.verified_purchase && (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      Verified Purchase
                    </Badge>
                  )}
                </div>
                {review.title && (
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {review.title}
                  </h4>
                )}
                <p className="text-sm text-gray-500">
                  By {review.reviewer?.email?.split("@")[0] || "Anonymous"} •{" "}
                  {formatDistanceToNow(new Date(review.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>

            {/* Review Comment */}
            {review.comment && (
              <p className="text-gray-700 leading-relaxed mb-4">
                {review.comment}
              </p>
            )}

            {/* Review Actions */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">Was this helpful?</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote(review.id, true)}
                disabled={votingReviewId === review.id}
                className={`gap-2 ${
                  review.user_vote?.is_helpful === true
                    ? "text-green-600 bg-green-50"
                    : "text-gray-600"
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{review.helpful_count}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote(review.id, false)}
                disabled={votingReviewId === review.id}
                className={`gap-2 ${
                  review.user_vote?.is_helpful === false
                    ? "text-red-600 bg-red-50"
                    : "text-gray-600"
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>{review.unhelpful_count}</span>
              </Button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFlag(review.id)}
                className="gap-2 text-gray-600"
              >
                <Flag className="w-4 h-4" />
                Report
              </Button>
            </div>
          </div>
          {index < reviews.length - 1 && <Separator className="my-6" />}
        </div>
      ))}
    </div>
  );
}
