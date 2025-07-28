import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Heart,
  Share,
  Star,
  ShoppingCart,
  Shield,
  Truck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export default function ProductDetailPage() {
  const { id: productId } = useParams<{ id: string }>();
  const [selectedSize, setSelectedSize] = useState("US 9");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const { addToCart } = useCart();
  const [listing, setListing] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddToCart = (seller: any) => {
    console.log("kamal", seller, listing);
    const cartItem = {
      id: `${listing?.id}`,
      productId: listing?.id,
      productName: listing?.title,
      brand: listing?.brand,
      size: selectedSize,
      condition: listing?.condition,
      price: listing?.price,
      image: images?.[0]?.image_url,
      sellerId: seller?.id?.toString(),
      sellerName: seller?.display_name,
    };

    addToCart(cartItem);
    toast.success(`Added ${listing?.title} (${selectedSize}) to cart!`);
  };

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query 1: Get listing details with seller information using join
      const { data: listingData, error: listingError } = await supabase
        .from("product_listings")
        .select(
          `
        *,
        sellers (
          display_name,
          phone,
          bio,
          profile_image_url,
          rating,
          total_reviews,
          location,
          is_verified,
          created_at
        )
      `
        )
        .eq("id", productId)
        .single();

      if (listingError) throw listingError;

      // Query 2: Get all images for the listing (same as before)
      const { data: imagesData, error: imagesError } = await supabase
        .from("product_images")
        .select(
          `
        id,
        image_url,
        is_poster_image
      `
        )
        .eq("product_id", productId)
        .order("is_poster_image", { ascending: false })
        .order("id", { ascending: true });

      if (imagesError) throw imagesError;

      // Transform data structure
      const transformedListing = {
        ...listingData,
        seller_details: listingData.sellers || null,
      };
      delete transformedListing.sellers;

      setListing(transformedListing);
      setImages(imagesData || []);

      // Set the first image (poster or first available) as selected
      setSelectedImageIndex(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
    }
  }, [productId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-16 z-40 glass-navbar">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 glass-button rounded-2xl border-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-bold text-gray-800">{listing?.title}</h1>
                <p className="text-sm text-gray-600">
                  {listing?.brand} • {listing?.model}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLiked(!isLiked)}
                className={`p-2 glass-button rounded-2xl border-0 ${
                  isLiked ? "text-red-500" : "text-gray-600"
                }`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 glass-button rounded-2xl border-0"
              >
                <Share className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="px-4 py-6">
        <div className="mb-4">
          <div className="relative aspect-square glass-card rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
            <img
              src={
                images?.[selectedImageIndex]?.image_url || "/placeholder.svg"
              }
              alt={`${listing?.title} - Image ${selectedImageIndex + 1}`}
              className="object-cover w-full h-full"
            />
          </div>
        </div>

        {/* Image Thumbnails */}
        <div className="flex gap-3 overflow-x-auto p-2">
          {images?.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedImageIndex(index)}
              className={`relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-300 ${
                selectedImageIndex === index
                  ? "ring-3 ring-purple-500 scale-105"
                  : "glass-button border-0 hover:scale-105"
              }`}
            >
              <img
                src={image.image_url || "/placeholder.svg"}
                alt={`${listing?.title} thumbnail ${index + 1}`}
                className="object-cover w-full h-full"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800 px-4">
          ₹ {listing?.price}
        </h2>
        <div className="flex items-center ">
          <span className="font-bold">Condition:</span>
          <Badge className="glass-button border-0 text-gray-700 rounded-xl uppercase">
            {listing?.condition}
          </Badge>
        </div>
      </div>

      {/* Sellers List */}
      <div className="px-4 pb-8">
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-6 text-gray-800">Sold by</h3>

            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage
                  src={
                    listing?.seller_details?.profile_image_url ||
                    "/placeholder.svg"
                  }
                  alt={listing?.seller_details?.display_name}
                />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl text-lg">
                  {listing?.seller_details?.display_name?.slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-bold text-gray-800 text-lg">
                    {listing?.seller_details?.display_name}
                  </h4>
                  {listing?.seller_details?.is_verified && (
                    <Badge className="glass-button border-0 text-green-700 rounded-xl px-3">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">
                      {listing?.seller_details?.rating || 0}
                    </span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">
                    {listing?.seller_details?.total_reviews || 0} reviews
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-3 text-gray-600">
                  <div className="flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    <span>Free shipping</span>
                  </div>
                  <span>•</span>
                  {/* <span>{seller.location}</span> */}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Size Selection */}
      {listing?.size_value && (
        <div className="px-4 pb-6">
          <Card className="glass-card border-0 rounded-3xl">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">
                Available Sizes
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <Button
                  key={listing?.size_value}
                  variant={
                    selectedSize === listing?.size_value ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedSize(listing?.size_value)}
                  className={`h-14 rounded-2xl border-0 font-semibold uppercase ${
                    selectedSize === listing?.size_value
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                      : "glass-button text-gray-700 hover:bg-white/30"
                  }`}
                >
                  {listing?.size_value}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="px-4 pb-6 grid grid-cols-2 gap-4">
        <Button
          size="lg"
          variant="outline"
          onClick={() => handleAddToCart(listing?.seller_details)}
          className="bg-white  text-gray-700 border-0 rounded-2xl shadow-lg h-12"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
        <Button
          size="lg"
          // onClick={() => handleAddToCart(listing?.seller_details)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl shadow-lg h-12"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Buy Now
        </Button>
      </div>

      {/* Bottom spacing */}
      <div className="h-8"></div>
    </div>
  );
}
