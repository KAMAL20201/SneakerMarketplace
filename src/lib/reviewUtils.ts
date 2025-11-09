import type { ReviewStats } from "@/types/reviews";

/**
 * Calculate review statistics from a list of reviews
 */
export function calculateReviewStats(
  totalReviews: number,
  averageRating: number,
  fiveStarCount: number,
  fourStarCount: number,
  threeStarCount: number,
  twoStarCount: number,
  oneStarCount: number
): ReviewStats {
  const ratingDistribution = {
    5: fiveStarCount,
    4: fourStarCount,
    3: threeStarCount,
    2: twoStarCount,
    1: oneStarCount,
  };

  const percentageDistribution = {
    5: totalReviews > 0 ? (fiveStarCount / totalReviews) * 100 : 0,
    4: totalReviews > 0 ? (fourStarCount / totalReviews) * 100 : 0,
    3: totalReviews > 0 ? (threeStarCount / totalReviews) * 100 : 0,
    2: totalReviews > 0 ? (twoStarCount / totalReviews) * 100 : 0,
    1: totalReviews > 0 ? (oneStarCount / totalReviews) * 100 : 0,
  };

  return {
    average_rating: averageRating,
    total_reviews: totalReviews,
    rating_distribution: ratingDistribution,
    percentage_distribution: percentageDistribution,
  };
}

/**
 * Format rating text (e.g., "4.5 out of 5 stars")
 */
export function formatRatingText(rating: number, maxRating: number = 5): string {
  return `${rating.toFixed(1)} out of ${maxRating} stars`;
}

/**
 * Get rating color based on score
 */
export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return "text-green-600";
  if (rating >= 3.5) return "text-yellow-600";
  if (rating >= 2.5) return "text-orange-600";
  return "text-red-600";
}

/**
 * Get rating badge variant based on score
 */
export function getRatingBadgeVariant(
  rating: number
): "default" | "secondary" | "destructive" | "outline" {
  if (rating >= 4.5) return "default";
  if (rating >= 3.5) return "secondary";
  if (rating >= 2.5) return "outline";
  return "destructive";
}

/**
 * Validate review content
 */
export function validateReview(rating: number, comment: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (rating < 1 || rating > 5) {
    errors.push("Rating must be between 1 and 5 stars");
  }

  if (!comment || comment.trim().length === 0) {
    errors.push("Review comment is required");
  }

  if (comment && comment.trim().length < 10) {
    errors.push("Review must be at least 10 characters long");
  }

  if (comment && comment.length > 2000) {
    errors.push("Review must not exceed 2000 characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Truncate review text for preview
 */
export function truncateReview(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

/**
 * Sort reviews by different criteria
 */
export function sortReviews<T extends { rating: number; created_at: string; helpful_count: number }>(
  reviews: T[],
  sortBy: "newest" | "oldest" | "highest_rated" | "lowest_rated" | "most_helpful"
): T[] {
  const sorted = [...reviews];

  switch (sortBy) {
    case "newest":
      return sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    case "oldest":
      return sorted.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    case "highest_rated":
      return sorted.sort((a, b) => b.rating - a.rating);
    case "lowest_rated":
      return sorted.sort((a, b) => a.rating - b.rating);
    case "most_helpful":
      return sorted.sort((a, b) => b.helpful_count - a.helpful_count);
    default:
      return sorted;
  }
}
