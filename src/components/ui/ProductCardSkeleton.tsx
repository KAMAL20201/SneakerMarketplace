import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ProductCardSkeleton = () => {
  return (
    <Card className="glass-card border-0 rounded-2xl overflow-hidden animate-pulse">
      <CardContent className="p-0">
        {/* Image skeleton - matches h-40 sm:h-48 */}
        <div className="relative h-40 sm:h-48 overflow-hidden">
          <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer"></div>
        </div>

        {/* Content skeleton - matches p-3 md:p-4 */}
        <div className="p-3 md:p-4">
          {/* Brand and title section - matches mb-2 md:mb-3 */}
          <div className="flex items-start justify-between mb-2 md:mb-3">
            <div className="flex-1">
              {/* Brand skeleton - matches text-xs mb-1 */}
              <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded w-16 mb-1"></div>

              {/* Title skeleton - matches text-sm line-clamp-2 mb-2 */}
              <div className="mb-2">
                <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded w-full mb-1"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded w-3/4"></div>
              </div>
            </div>
          </div>

          {/* Price and condition section - matches mb-2 md:mb-3 */}
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="flex items-center gap-1 md:gap-2">
              {/* Price skeleton - matches text-base md:text-lg */}
              <div className="h-5 md:h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded w-20"></div>
            </div>
            {/* Condition badge skeleton - matches Badge with rounded-xl */}
            <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded-xl w-16"></div>
          </div>

          {/* Size and views section */}
          <div className="flex items-center justify-between">
            {/* Size badge skeleton - matches rounded-xl text-xs */}
            <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded-xl w-12"></div>

            {/* Views skeleton - matches text-xs */}
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded"></div>
              <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded w-6"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Component to render multiple skeleton cards in the same grid layout
export const ProductCardSkeletonGrid = ({ count = 12 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};

export default ProductCardSkeleton;
