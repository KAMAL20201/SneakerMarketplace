import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/ui/ProductCard";
import { ROUTE_NAMES } from "@/constants/enums";

interface SaleBanner {
  id: string;
  sale_slug: string;
  image_url: string;
  mobile_image_url: string | null;
  is_active: boolean;
  end_date: string | null;
}

interface SaleListing {
  id: string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  retail_price: number | null;
  min_price: number | null;
  condition: string;
  size_value: string;
  image_url: string;
}

export default function SalePage() {
  const { slug } = useParams<{ slug: string }>();
  const [banner, setBanner] = useState<SaleBanner | null>(null);
  const [listings, setListings] = useState<SaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      setLoading(true);

      // Fetch the sale banner
      const { data: bannerData, error: bannerError } = await supabase
        .from("banners")
        .select(
          "id, sale_slug, image_url, mobile_image_url, is_active, end_date",
        )
        .eq("sale_slug", slug)
        .single();

      if (bannerError || !bannerData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setBanner(bannerData);

      // Fetch products in this sale via listings_with_images
      const { data: saleProducts, error: productsError } = await supabase
        .from("sale_products")
        .select("listing_id")
        .eq("banner_id", bannerData.id);

      if (!productsError && saleProducts && saleProducts.length > 0) {
        const ids = saleProducts.map(
          (r: { listing_id: string }) => r.listing_id,
        );
        const { data: listingData } = await supabase
          .from("listings_with_images")
          .select(
            "id, slug, title, brand, price, min_price, retail_price, condition, size_value, image_url",
          )
          .in("id", ids)
          .eq("status", "active");

        if (listingData) setListings(listingData);
      }

      setLoading(false);
    };

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (notFound || !banner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-gray-700 font-semibold text-lg">Sale not found</p>
        <p className="text-gray-400 text-sm text-center">
          This sale may have ended or the link is incorrect.
        </p>
        <Link
          to={ROUTE_NAMES.HOME}
          className="text-purple-600 text-sm underline mt-2"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const isExpired =
    !banner.is_active ||
    (banner.end_date ? new Date(banner.end_date) < new Date() : false);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Sale banner */}
      <div className=" md:pb-4">
        <div className=" overflow-hidden aspect-[9/16] md:aspect-[2/1] bg-gray-100 w-full">
          <picture className="w-full h-full">
            {banner.mobile_image_url && (
              <source
                media="(max-width: 767px)"
                srcSet={banner.mobile_image_url}
              />
            )}
            <img
              src={banner.image_url}
              alt={`${banner.sale_slug} sale`}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </picture>
        </div>
      </div>

      {/* Expired notice */}
      {isExpired && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-700">
            This sale has ended. Browse the products below while stocks last.
          </div>
        </div>
      )}

      {/* Products grid */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        {listings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">No products in this sale yet.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {listings.length} product{listings.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {listings.map((listing) => (
                <ProductCard
                  key={listing.id}
                  variant="vertical"
                  product={{
                    id: listing.id,
                    slug: listing.slug,
                    title: listing.title,
                    brand: listing.brand,
                    price: listing.min_price ?? listing.price,
                    retail_price: listing.retail_price,
                    condition: listing.condition,
                    size_value: listing.size_value,
                    image_url: listing.image_url,
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
