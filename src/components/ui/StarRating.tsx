import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
  className?: string;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  showNumber = false,
  className,
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {Array.from({ length: maxRating }, (_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= Math.floor(rating);
          const isPartial = starValue === Math.ceil(rating) && rating % 1 !== 0;
          const partialPercentage = isPartial ? (rating % 1) * 100 : 0;

          return (
            <div key={index} className="relative">
              {isPartial ? (
                <>
                  {/* Background star (empty) */}
                  <Star
                    className={cn(
                      sizeClasses[size],
                      "text-gray-300 fill-gray-300"
                    )}
                  />
                  {/* Foreground star (partial fill) */}
                  <div
                    className="absolute top-0 left-0 overflow-hidden"
                    style={{ width: `${partialPercentage}%` }}
                  >
                    <Star
                      className={cn(
                        sizeClasses[size],
                        "text-yellow-500 fill-yellow-500"
                      )}
                    />
                  </div>
                </>
              ) : (
                <Star
                  className={cn(
                    sizeClasses[size],
                    isFilled
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-gray-300 fill-gray-300"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      {showNumber && (
        <span className={cn("font-medium text-gray-700", textSizeClasses[size])}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
