export interface Review {
  id: string;
  product_id: string;
  reviewer_id: string;
  order_id: string | null;
  seller_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  verified_purchase: boolean;
  helpful_count: number;
  unhelpful_count: number;
  is_approved: boolean;
  is_flagged: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewWithReviewer extends Review {
  reviewer?: {
    id: string;
    email: string;
    // Add other user fields as needed
  };
}

export interface ReviewHelpfulness {
  id: string;
  review_id: string;
  user_id: string;
  is_helpful: boolean;
  created_at: string;
}

export interface ProductRating {
  product_id: string;
  total_reviews: number;
  average_rating: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
  last_review_date: string | null;
}

export interface SellerRating {
  seller_id: string;
  total_reviews: number;
  average_rating: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
  last_review_date: string | null;
}

export interface CreateReviewRequest {
  product_id: string;
  seller_id: string;
  order_id?: string;
  rating: number;
  title?: string;
  comment?: string;
  verified_purchase?: boolean;
}

export interface UpdateReviewRequest {
  rating?: number;
  title?: string;
  comment?: string;
}

export interface ReviewFilters {
  rating?: number; // Filter by specific star rating
  verified_only?: boolean; // Show only verified purchases
  sort_by?: "newest" | "oldest" | "highest_rated" | "lowest_rated" | "most_helpful";
  limit?: number;
  offset?: number;
}

export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  percentage_distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

// For displaying reviews with user vote status
export interface ReviewWithUserVote extends ReviewWithReviewer {
  user_vote?: {
    is_helpful: boolean;
  } | null;
}
