import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}

export function StarRatingInput({
  value,
  onChange,
  maxRating = 5,
  size = "md",
  disabled = false,
  className,
}: StarRatingInputProps) {
  const [hoverRating, setHoverRating] = useState<number>(0);

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const displayRating = hoverRating || value;

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!disabled) {
      setHoverRating(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setHoverRating(0);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: maxRating }, (_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= displayRating;

        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
            disabled={disabled}
            className={cn(
              "transition-all duration-150 ease-in-out",
              !disabled && "cursor-pointer hover:scale-110",
              disabled && "cursor-not-allowed opacity-50"
            )}
            aria-label={`Rate ${starValue} out of ${maxRating} stars`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors duration-150",
                isFilled
                  ? "text-yellow-500 fill-yellow-500"
                  : "text-gray-300 fill-gray-300",
                !disabled && "hover:text-yellow-400 hover:fill-yellow-400"
              )}
            />
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-2 text-sm font-medium text-gray-700">
          {value} out of {maxRating}
        </span>
      )}
    </div>
  );
}
