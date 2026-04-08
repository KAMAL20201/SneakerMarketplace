import { useState } from "react";
import { useLoaderData, useNavigate, data } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import type { Route } from "./+types/ReviewPage";

// ─── Server Loader ─────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const prefillRating = Number(url.searchParams.get("rating")) || 0;

  if (!token) {
    return data({ valid: false, reason: "missing_token" } as const);
  }

  const ssrSupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  const { data: rows, error } = await ssrSupabase.rpc("validate_review_token", {
    p_token: token,
  });

  if (error || !rows || rows.length === 0) {
    return data({ valid: false, reason: "not_found" } as const);
  }

  const row = rows[0] as {
    listing_id: string;
    listing_title: string;
    listing_slug: string;
    listing_image: string | null;
    is_valid: boolean;
  };

  if (!row.is_valid) {
    return data({ valid: false, reason: "expired_or_used" } as const);
  }

  return data({
    valid: true,
    token,
    prefillRating,
    listing: {
      id: row.listing_id,
      title: row.listing_title,
      slug: row.listing_slug,
      image: row.listing_image,
    },
  } as const);
}

// ─── Meta ──────────────────────────────────────────────────────────────────────

export function meta() {
  return [
    { title: "Leave a Review | The Plug Market" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

// ─── Star Rating Component ─────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`h-10 w-10 transition-colors ${
              n <= active
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Excellent!",
};

// ─── Page Component ────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const loaderData = useLoaderData() as Awaited<ReturnType<typeof loader>>["data"];
  const navigate = useNavigate();

  const [rating, setRating] = useState(loaderData.valid ? loaderData.prefillRating : 0);
  const [body, setBody] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Invalid / expired token ────────────────────────────────────────────────

  if (!loaderData.valid) {
    const messages: Record<string, { title: string; body: string }> = {
      missing_token: {
        title: "Invalid review link",
        body: "This review link is not valid. Please use the link from your delivery confirmation email.",
      },
      not_found: {
        title: "Link not found",
        body: "We couldn't find this review link. It may have already been used or the link is incorrect.",
      },
      expired_or_used: {
        title: "Link already used or expired",
        body: "This review link has already been used or has expired (links are valid for 30 days). Each order can only be reviewed once.",
      },
    };

    const msg = messages[loaderData.reason] ?? messages["not_found"];

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{msg.title}</h1>
          <p className="text-gray-500 text-sm mb-6">{msg.body}</p>
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 rounded-2xl"
          >
            Back to Shop
          </Button>
        </div>
      </div>
    );
  }

  const { token, listing } = loaderData;

  // ── Success state ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">🙌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Your review has been posted. It helps other sneaker heads make better decisions!
          </p>
          <Button
            onClick={() => navigate(`/product/${listing.slug}`)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 rounded-2xl"
          >
            See the Product
          </Button>
        </div>
      </div>
    );
  }

  // ── Review form ────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: success, error: rpcError } = await supabase.rpc("submit_review", {
        p_token:         token,
        p_rating:        rating,
        p_body:          body.trim() || null,
        p_reviewer_name: reviewerName.trim() || null,
      });

      if (rpcError) throw rpcError;
      if (!success) {
        setError("This review link has already been used or has expired.");
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold px-3 py-1 rounded-full mb-3">
            Verified Purchase
          </div>
          <h1 className="text-2xl font-bold text-gray-900">How was your purchase?</h1>
          <p className="text-gray-500 text-sm mt-1">Your honest review helps the community</p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {/* Product preview */}
          <div className="flex items-center gap-4 p-5 border-b border-gray-100">
            {listing.image ? (
              <img
                src={listing.image}
                alt={listing.title}
                className="w-16 h-16 object-contain rounded-xl bg-gray-100 flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium mb-0.5">You purchased</p>
              <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                {listing.title}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Star rating */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Overall rating <span className="text-pink-500">*</span>
              </label>
              <StarRating value={rating} onChange={setRating} />
              {rating > 0 && (
                <p className="mt-1.5 text-sm font-medium text-purple-600">
                  {RATING_LABELS[rating]}
                </p>
              )}
            </div>

            {/* Written review */}
            <div>
              <label
                htmlFor="review-body"
                className="block text-sm font-semibold text-gray-700 mb-1.5"
              >
                Write a review{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="review-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tell others about the condition, authenticity, shipping speed…"
                rows={3}
                maxLength={1000}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
              <p className="text-right text-xs text-gray-400 mt-1">{body.length}/1000</p>
            </div>

            {/* Display name */}
            <div>
              <label
                htmlFor="reviewer-name"
                className="block text-sm font-semibold text-gray-700 mb-1.5"
              >
                Your name{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="reviewer-name"
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Displayed as 'Verified Buyer' if left blank"
                maxLength={60}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={submitting || rating === 0}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl h-12 font-semibold text-base"
            >
              {submitting ? "Submitting…" : "Submit Review"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Only verified buyers can leave reviews on The Plug Market.
        </p>
      </div>
    </div>
  );
}
