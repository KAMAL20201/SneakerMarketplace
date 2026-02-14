import { useEffect, useState } from "react";
import { Star, ShoppingCart, Shield, Truck, ZoomIn, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { ProductImage, ThumbnailImage } from "@/components/ui/OptimizedImage";
import ProductDetailSkeleton from "@/components/ui/ProductDetailSkeleton";
import ConditionBadge from "@/components/ui/ConditionBadge";
import { BuyNowModal } from "@/components/checkout/BuyNowModal";
// [GUEST CHECKOUT] Auth import commented out - guests can buy without login
// import { useAuth } from "@/contexts/AuthContext";
// import { useNavigate } from "react-router";
// import { ROUTE_NAMES } from "@/constants/enums";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { EmblaCarouselType } from "embla-carousel";

export default function ProductDetailPage() {
  const { id: productId } = useParams<{ id: string }>();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { addToCart, items } = useCart();
  const [listing, setListing] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buyNowOpen, setBuyNowOpen] = useState(false);
  // [GUEST CHECKOUT] Auth check removed - guests can buy directly
  // const { user, setOperationAfterLogin } = useAuth();
  // const navigate = useNavigate();
  const [zoomOpen, setZoomOpen] = useState(false);
  const [emblaApi, setEmblaApi] = useState<EmblaCarouselType | null>(null);
  const [zoomEmblaApi, setZoomEmblaApi] = useState<EmblaCarouselType | null>(
    null
  );

  // Sync selected index with carousel
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedImageIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  // Scroll to slide when thumbnail changes selectedImageIndex
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.scrollTo(selectedImageIndex);
  }, [selectedImageIndex, emblaApi]);

  // Keep zoom carousel synced to selected index
  useEffect(() => {
    if (!zoomEmblaApi) return;
    zoomEmblaApi.scrollTo(selectedImageIndex);
  }, [selectedImageIndex, zoomEmblaApi, zoomOpen]);

  // When swiping inside zoom modal, update selected index
  useEffect(() => {
    if (!zoomEmblaApi) return;
    const onSelect = () =>
      setSelectedImageIndex(zoomEmblaApi.selectedScrollSnap());
    zoomEmblaApi.on("select", onSelect);
    zoomEmblaApi.on("reInit", onSelect);
    onSelect();
    return () => {
      zoomEmblaApi.off("select", onSelect);
      zoomEmblaApi.off("reInit", onSelect);
    };
  }, [zoomEmblaApi]);

  const handleAddToCart = (seller: any) => {
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
      sellerEmail: seller?.email,
      quantity: 1,
    };

    const success = addToCart(cartItem);
    if (success) {
      toast.success(`Added to cart!`);
    } else {
      toast.error("This item is already in your cart!");
    }
  };

  // Check if item is already in cart
  const isItemInCart = () => {
    if (!listing || !listing.seller_details) return false;

    return items.some(
      (cartItem) =>
        cartItem.productId === listing.id &&
        cartItem.sellerId === listing.seller_details.id?.toString()
    );
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
          id,
          display_name,
          phone,
          bio,
          profile_image_url,
          rating,
          total_reviews,
          location,
          is_verified,
          created_at,
          email
        )
      `
        )
        .eq("id", productId)
        .eq("status", "active")
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
      if (transformedListing.size_value) {
        setSelectedSize(transformedListing.size_value);
      }
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

  if (loading) return <ProductDetailSkeleton />;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="min-h-screen">
      <div className="lg:flex lg:gap-8 lg:p-8">
        {/* Image Gallery - Left side on desktop, full width on mobile */}
        <div className="lg:w-[60%] lg:max-w-2xl px-4 py-6 lg:p-0 lg:flex lg:flex-row-reverse lg:gap-5">
          <div className="mb-4 lg:w-[80%]">
            <Carousel
              className="lg:max-w-lg lg:mx-auto bg-gray-200 rounded-3xl"
              opts={{ loop: (images?.length || 0) > 1 }}
              setApi={setEmblaApi}
            >
              <CarouselContent className="-ml-0 relative aspect-square rounded-none shadow-2xl">
                {images?.length ? (
                  images.map((image, index) => (
                    <CarouselItem key={image.id} className="relative pl-0">
                      {/* Zoom Button */}
                      <button
                        type="button"
                        aria-label="Zoom in"
                        onClick={() => setZoomOpen(true)}
                        className="absolute top-3 right-3 z-10 rounded-xl p-2 bg-white/80 hover:bg-white transition-colors shadow-md"
                      >
                        <ZoomIn className="h-5 w-5 text-gray-700" />
                      </button>
                      <ProductImage
                        src={image?.image_url || "/placeholder.svg"}
                        alt={`${listing?.title} - Image ${index + 1}`}
                        priority={index === 0}
                        className="w-full object-contain rounded-none"
                        onClick={() => {
                          setZoomOpen(true);
                        }}
                      />
                    </CarouselItem>
                  ))
                ) : (
                  <CarouselItem className="relative">
                    <ProductImage
                      src={"/placeholder.svg"}
                      alt={`${listing?.title} - Image`}
                      priority={true}
                      className="w-full object-contain"
                    />
                  </CarouselItem>
                )}
              </CarouselContent>
              {/* Desktop arrows */}
              <div className="hidden sm:block">
                <CarouselPrevious />
                <CarouselNext />
              </div>
            </Carousel>
          </div>

          {/* Image Thumbnails */}
          <div className="flex gap-3 overflow-x-auto p-2 lg:justify-start lg:max-w-lg lg:flex-col">
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
                <ThumbnailImage
                  src={image.image_url || "/placeholder.svg"}
                  alt={`${listing?.title} thumbnail ${index + 1}`}
                  className="w-full h-full"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Details - Right side on desktop, below images on mobile */}
        <div className="lg:w-[40%] lg:py-6">
          <div className="px-4 py-5 flex items-center justify-between lg:px-0 lg:py-0 lg:mb-6">
            <h2 className="text-3xl font-bold text-gray-800 lg:px-0 px-4">
              ₹ {listing?.price}
            </h2>

            <div className="flex items-center">
              <span className="font-bold">Condition:</span>
              <ConditionBadge
                condition={listing?.condition}
                // variant="glass"
                className="uppercase"
              />
            </div>
          </div>

          <div className="px-8 pb-5 lg:px-0 lg:pb-6">
            <h1 className="text-2xl font-bold text-gray-600 capitalize">
              {listing?.brand}
            </h1>
            <h2 className="text-md text-gray-800 capitalize">
              {listing?.title}
            </h2>
          </div>

          {/* Sellers List */}
          <div className="px-4 pb-8 lg:px-0 lg:pb-6">
            <Card className="glass-card border-0 rounded-3xl">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-6 text-gray-800">
                  Sold by
                </h3>

                <div className="flex flex-col items-start gap-4">
                  <div className="flex items-center gap-2">
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
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-3 text-gray-600">
                    <div className="flex items-center gap-1">
                      <Truck className="h-4 w-4" />
                      <span>Free shipping</span>
                      {listing?.delivery_days && (
                        <>
                          <span>•</span>
                          <span>Delivery in {listing?.delivery_days} days</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Size Selection */}
          {listing?.size_value && (
            <div className="px-4 pb-6 lg:px-0">
              <Card className="glass-card border-0 rounded-3xl">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">
                    Available Sizes
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    <Button
                      key={listing?.size_value}
                      variant={
                        selectedSize === listing?.size_value
                          ? "default"
                          : "outline"
                      }
                      // size="sm"
                      onClick={() => setSelectedSize(listing?.size_value)}
                      className={`w-max h-14 rounded-2xl border-0 font-semibold uppercase ${
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

          <div className="px-4 pb-6 grid grid-cols-2 gap-4 lg:px-0">
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleAddToCart(listing?.seller_details)}
              disabled={isItemInCart()}
              className={`border-0 rounded-2xl shadow-lg h-12 ${
                isItemInCart()
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {isItemInCart() ? "In Cart" : "Add to Cart"}
            </Button>

            <Button
              size="lg"
              onClick={() => {
                /* [GUEST CHECKOUT] Login check removed - guests can buy directly
                if (!user) {
                  setOperationAfterLogin(() => () => setBuyNowOpen(true));
                  toast.error("Please login to continue");
                  navigate(ROUTE_NAMES.LOGIN);
                  return;
                }
                */
                setBuyNowOpen(true);
              }}
              disabled={!selectedSize}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl shadow-lg h-12"
            >
              Buy Now
            </Button>
          </div>
          {/* Buy Now Modal requiring shipping address */}
          {listing && (
            <BuyNowModal
              open={buyNowOpen}
              onOpenChange={setBuyNowOpen}
              amount={listing?.price || 0}
              item={{
                id: listing?.id,
                productId: listing?.id,
                productName: listing?.title,
                brand: listing?.brand,
                size: selectedSize || "",
                condition: listing?.condition,
                price: listing?.price,
                image: images?.[0]?.image_url,
                sellerId: listing?.seller_details?.id?.toString(),
                sellerName: listing?.seller_details?.display_name,
                sellerEmail: listing?.seller_details?.email,
                quantity: 1,
              }}
            />
          )}
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-8"></div>

      {/* Zoom Modal */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent
          showCloseButton={false}
          className=" border-0 p-0 bg-black/90 text-white w-[96dvw] max-w-[96dvw] h-[90dvh] sm:max-w-[90vw]"
        >
          {/* Custom close button for better visibility */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setZoomOpen(false)}
            className="absolute top-3 right-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Zoom carousel with swipe */}
          <Carousel
            opts={{ loop: (images?.length || 0) > 1 }}
            setApi={setZoomEmblaApi}
            className="max-h-[90dvh] productZoom"
          >
            <CarouselContent className="h-full">
              {images?.length ? (
                images.map((image, index) => (
                  <CarouselItem key={image.id} className=" h-full">
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={image?.image_url || "/placeholder.svg"}
                        alt={`${listing?.title} - Zoomed ${index + 1}`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem className="relative h-full">
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src={"/placeholder.svg"}
                      alt={`${listing?.title} - Zoomed`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
            <CarouselPrevious className="bg-white/80 text-gray-800" />
            <CarouselNext className="bg-white/80 text-gray-800" />
          </Carousel>
        </DialogContent>
      </Dialog>
    </div>
  );
}
