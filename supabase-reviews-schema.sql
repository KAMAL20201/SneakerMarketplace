-- =====================================================
-- REVIEWS AND RATINGS SYSTEM - SUPABASE SCHEMA
-- =====================================================
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Copy and paste this entire file
-- 5. Click "Run" to execute
--
-- This will create:
-- - reviews table (for product reviews)
-- - seller_ratings table (aggregated seller ratings)
-- - review_helpfulness table (helpful/unhelpful votes)
-- - Row Level Security policies
-- - Database functions and triggers
-- =====================================================

-- =====================================================
-- 1. REVIEWS TABLE
-- =====================================================
-- Stores all product reviews with ratings and comments
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    product_id UUID NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,

    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,

    -- Metadata
    verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,

    -- Admin moderation
    is_approved BOOLEAN DEFAULT true,
    is_flagged BOOLEAN DEFAULT false,
    admin_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(product_id, reviewer_id) -- One review per product per user
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_seller_id ON reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(is_approved);

-- =====================================================
-- 2. REVIEW HELPFULNESS TABLE
-- =====================================================
-- Tracks which users found reviews helpful or unhelpful
CREATE TABLE IF NOT EXISTS review_helpfulness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL, -- true = helpful, false = unhelpful
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One vote per user per review
    UNIQUE(review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_helpfulness_review_id ON review_helpfulness(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpfulness_user_id ON review_helpfulness(user_id);

-- =====================================================
-- 3. SELLER RATINGS VIEW
-- =====================================================
-- Materialized view for seller rating statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS seller_ratings AS
SELECT
    seller_id,
    COUNT(*)::INTEGER AS total_reviews,
    ROUND(AVG(rating)::NUMERIC, 2)::FLOAT AS average_rating,
    COUNT(CASE WHEN rating = 5 THEN 1 END)::INTEGER AS five_star_count,
    COUNT(CASE WHEN rating = 4 THEN 1 END)::INTEGER AS four_star_count,
    COUNT(CASE WHEN rating = 3 THEN 1 END)::INTEGER AS three_star_count,
    COUNT(CASE WHEN rating = 2 THEN 1 END)::INTEGER AS two_star_count,
    COUNT(CASE WHEN rating = 1 THEN 1 END)::INTEGER AS one_star_count,
    MAX(created_at) AS last_review_date
FROM reviews
WHERE is_approved = true
GROUP BY seller_id;

-- Index for faster seller rating lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_ratings_seller_id ON seller_ratings(seller_id);

-- =====================================================
-- 4. PRODUCT RATINGS VIEW
-- =====================================================
-- Materialized view for product rating statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS product_ratings AS
SELECT
    product_id,
    COUNT(*)::INTEGER AS total_reviews,
    ROUND(AVG(rating)::NUMERIC, 2)::FLOAT AS average_rating,
    COUNT(CASE WHEN rating = 5 THEN 1 END)::INTEGER AS five_star_count,
    COUNT(CASE WHEN rating = 4 THEN 1 END)::INTEGER AS four_star_count,
    COUNT(CASE WHEN rating = 3 THEN 1 END)::INTEGER AS three_star_count,
    COUNT(CASE WHEN rating = 2 THEN 1 END)::INTEGER AS two_star_count,
    COUNT(CASE WHEN rating = 1 THEN 1 END)::INTEGER AS one_star_count,
    MAX(created_at) AS last_review_date
FROM reviews
WHERE is_approved = true
GROUP BY product_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ratings_product_id ON product_ratings(product_id);

-- =====================================================
-- 5. FUNCTIONS
-- =====================================================

-- Function to update review helpfulness counts
CREATE OR REPLACE FUNCTION update_review_helpfulness_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_helpful THEN
            UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
        ELSE
            UPDATE reviews SET unhelpful_count = unhelpful_count + 1 WHERE id = NEW.review_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_helpful AND NOT NEW.is_helpful THEN
            UPDATE reviews SET helpful_count = helpful_count - 1, unhelpful_count = unhelpful_count + 1 WHERE id = NEW.review_id;
        ELSIF NOT OLD.is_helpful AND NEW.is_helpful THEN
            UPDATE reviews SET helpful_count = helpful_count + 1, unhelpful_count = unhelpful_count - 1 WHERE id = NEW.review_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_helpful THEN
            UPDATE reviews SET helpful_count = helpful_count - 1 WHERE id = OLD.review_id;
        ELSE
            UPDATE reviews SET unhelpful_count = unhelpful_count - 1 WHERE id = OLD.review_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_rating_views()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY seller_ratings;
    REFRESH MATERIALIZED VIEW CONCURRENTLY product_ratings;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Trigger to update helpfulness counts
DROP TRIGGER IF EXISTS trigger_update_review_helpfulness ON review_helpfulness;
CREATE TRIGGER trigger_update_review_helpfulness
    AFTER INSERT OR UPDATE OR DELETE ON review_helpfulness
    FOR EACH ROW
    EXECUTE FUNCTION update_review_helpfulness_count();

-- Trigger to refresh rating views when reviews change
DROP TRIGGER IF EXISTS trigger_refresh_ratings_on_review_change ON reviews;
CREATE TRIGGER trigger_refresh_ratings_on_review_change
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_rating_views();

-- Trigger to update updated_at on reviews
DROP TRIGGER IF EXISTS trigger_reviews_updated_at ON reviews;
CREATE TRIGGER trigger_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpfulness ENABLE ROW LEVEL SECURITY;

-- REVIEWS POLICIES

-- Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
    ON reviews FOR SELECT
    USING (is_approved = true);

-- Users can view their own reviews (even if not approved)
CREATE POLICY "Users can view their own reviews"
    ON reviews FOR SELECT
    USING (auth.uid() = reviewer_id);

-- Users can create reviews for products they purchased
CREATE POLICY "Users can create reviews for purchased products"
    ON reviews FOR INSERT
    WITH CHECK (
        auth.uid() = reviewer_id
        AND EXISTS (
            SELECT 1 FROM orders o
            JOIN product_listings pl ON o.product_id = pl.id
            WHERE o.buyer_id = auth.uid()
            AND pl.id = product_id
            AND o.status IN ('delivered', 'confirmed')
        )
    );

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
    ON reviews FOR UPDATE
    USING (auth.uid() = reviewer_id)
    WITH CHECK (auth.uid() = reviewer_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
    ON reviews FOR DELETE
    USING (auth.uid() = reviewer_id);

-- Admins can do anything with reviews
CREATE POLICY "Admins can manage all reviews"
    ON reviews FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
        )
    );

-- REVIEW HELPFULNESS POLICIES

-- Anyone can view helpfulness votes
CREATE POLICY "Anyone can view review helpfulness"
    ON review_helpfulness FOR SELECT
    USING (true);

-- Authenticated users can vote on reviews
CREATE POLICY "Authenticated users can vote on reviews"
    ON review_helpfulness FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update their own votes"
    ON review_helpfulness FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete their own votes"
    ON review_helpfulness FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- 8. INITIAL DATA REFRESH
-- =====================================================

-- Refresh the materialized views for the first time
REFRESH MATERIALIZED VIEW seller_ratings;
REFRESH MATERIALIZED VIEW product_ratings;

-- =====================================================
-- SCHEMA CREATION COMPLETE
-- =====================================================

-- Verify tables were created
SELECT
    'reviews' AS table_name,
    COUNT(*) AS row_count
FROM reviews
UNION ALL
SELECT
    'review_helpfulness' AS table_name,
    COUNT(*) AS row_count
FROM review_helpfulness
UNION ALL
SELECT
    'seller_ratings' AS view_name,
    COUNT(*) AS row_count
FROM seller_ratings
UNION ALL
SELECT
    'product_ratings' AS view_name,
    COUNT(*) AS row_count
FROM product_ratings;

-- Grant permissions (if needed)
-- GRANT ALL ON reviews TO authenticated;
-- GRANT ALL ON review_helpfulness TO authenticated;
-- GRANT SELECT ON seller_ratings TO authenticated;
-- GRANT SELECT ON product_ratings TO authenticated;
