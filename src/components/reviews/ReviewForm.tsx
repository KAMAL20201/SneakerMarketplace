import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRatingInput } from "@/components/ui/StarRatingInput";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { CreateReviewRequest } from "@/types/reviews";

interface ReviewFormProps {
  productId: string;
  sellerId: string;
  orderId?: string;
  verifiedPurchase?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({
  productId,
  sellerId,
  orderId,
  verifiedPurchase = false,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    rating: 0,
    title: "",
    comment: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!formData.comment.trim()) {
      toast.error("Please write a review");
      return;
    }

    setIsLoading(true);

    try {
      const reviewData: CreateReviewRequest = {
        product_id: productId,
        seller_id: sellerId,
        rating: formData.rating,
        title: formData.title.trim() || null,
        comment: formData.comment.trim(),
        verified_purchase: verifiedPurchase,
      };

      if (orderId) {
        reviewData.order_id = orderId;
      }

      const { error } = await supabase.from("reviews").insert([reviewData]);

      if (error) {
        console.error("Error submitting review:", error);

        // Check for duplicate review error
        if (error.code === "23505") {
          toast.error("You have already reviewed this product");
        } else {
          toast.error("Failed to submit review. Please try again.");
        }
        return;
      }

      toast.success("Review submitted successfully!");

      // Reset form
      setFormData({
        rating: 0,
        title: "",
        comment: "",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-card border-0 rounded-3xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-800">
          Write a Review
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label htmlFor="rating" className="text-sm font-semibold text-gray-700">
              Rating *
            </Label>
            <StarRatingInput
              value={formData.rating}
              onChange={(rating) => setFormData({ ...formData, rating })}
              size="lg"
              disabled={isLoading}
            />
          </div>

          {/* Review Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold text-gray-700">
              Review Title (Optional)
            </Label>
            <Input
              id="title"
              placeholder="Sum up your experience in one line"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={isLoading}
              maxLength={200}
              className="glass-input border-0 rounded-xl"
            />
          </div>

          {/* Review Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-semibold text-gray-700">
              Your Review *
            </Label>
            <Textarea
              id="comment"
              placeholder="Tell us about your experience with this product..."
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              disabled={isLoading}
              rows={6}
              className="glass-input border-0 rounded-xl resize-none"
            />
            <p className="text-xs text-gray-500">
              {formData.comment.length} characters
            </p>
          </div>

          {verifiedPurchase && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-xl">
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Verified Purchase</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isLoading || formData.rating === 0}
              className="flex-1 h-12 glass-button border-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
            >
              {isLoading ? "Submitting..." : "Submit Review"}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="h-12 glass-button border-0 rounded-xl"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
