import { Card, CardContent } from "@/components/ui/card";

const ProductDetailSkeleton = () => {
  return (
    <div className="min-h-screen">
      <div className="lg:flex lg:gap-8 lg:p-8">
        {/* Image Gallery Skeleton - Left side on desktop, full width on mobile */}
        <div className="lg:w-[60%] lg:max-w-2xl px-4 py-6 lg:p-0 lg:flex lg:flex-row-reverse lg:gap-5">
          <div className="mb-4 lg:w-[80%]">
            <div className="relative aspect-square glass-card rounded-3xl overflow-hidden shadow-2xl lg:max-w-lg lg:mx-auto">
              <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer"></div>
            </div>
          </div>

          {/* Image Thumbnails Skeleton */}
          <div className="flex gap-3 overflow-x-auto p-2 lg:justify-start lg:max-w-lg lg:flex-col">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0"
              >
                <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Product Details Skeleton - Right side on desktop, below images on mobile */}
        <div className="lg:w-[40%] lg:py-6">
          {/* Price and Condition Skeleton */}
          <div className="px-4 py-5 flex items-center justify-between lg:px-0 lg:py-0 lg:mb-6">
            <div className="h-8 w-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded"></div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded"></div>
              <div className="h-6 w-20 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded-xl"></div>
            </div>
          </div>

          {/* Brand and Title Skeleton */}
          <div className="px-8 pb-5 lg:px-0 lg:pb-6">
            <div className="h-6 w-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded mb-2"></div>
            <div className="h-5 w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded"></div>
          </div>

          {/* Seller Card Skeleton */}
          <div className="px-4 pb-8 lg:px-0 lg:pb-6">
            <Card className="glass-card border-0 rounded-3xl">
              <CardContent className="p-6">
                <div className="h-6 w-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded mb-6"></div>

                <div className="flex items-start gap-4">
                  {/* Avatar Skeleton */}
                  <div className="h-14 w-14 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded-2xl"></div>

                  <div className="flex-1 min-w-0">
                    {/* Seller Name and Verification */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-5 w-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded"></div>
                      <div className="h-5 w-16 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded-xl"></div>
                    </div>

                    {/* Rating and Reviews */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-4 w-20 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded"></div>
                      <div className="h-4 w-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded"></div>
                    </div>

                    {/* Shipping Info */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="h-4 w-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Size Selection Skeleton */}
          <div className="px-4 pb-6 lg:px-0">
            <Card className="glass-card border-0 rounded-3xl">
              <CardContent className="p-6">
                <div className="h-6 w-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded mb-4"></div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="h-14 w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded-2xl"></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons Skeleton */}
          <div className="px-4 pb-6 grid grid-cols-2 gap-4 lg:px-0">
            <div className="h-12 w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded-2xl"></div>
            <div className="h-12 w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded-2xl"></div>
          </div>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-8"></div>
    </div>
  );
};

export default ProductDetailSkeleton;
