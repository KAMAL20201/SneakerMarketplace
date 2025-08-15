import React, { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps
  extends Omit<
    React.ImgHTMLAttributes<HTMLImageElement>,
    "onLoad" | "onError"
  > {
  src: string;
  alt: string;
  aspectRatio?: string;
  className?: string;
  shimmerClassName?: string;
  fallbackSrc?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  aspectRatio = "aspect-square",
  className = "",
  shimmerClassName = "",
  fallbackSrc = "/placeholder.svg",
  priority = false,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
    }
    onError?.();
  }, [currentSrc, fallbackSrc, onError]);

  // Preload critical images
  React.useEffect(() => {
    if (priority && src) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = src;
      document.head.appendChild(link);

      return () => {
        try {
          document.head.removeChild(link);
        } catch (e) {
          // Link might already be removed
        }
      };
    }
  }, [src, priority]);

  return (
    <div className={cn("relative overflow-hidden", aspectRatio, className)}>
      {/* Shimmer Loading State */}
      {isLoading && (
        <div 
          className={cn(
            'absolute inset-0 glass-shimmer rounded-xl',
            shimmerClassName
          )}
        />
      )}

      {/* Actual Image */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        {...props}
      />

      {/* Error State */}
      {hasError && currentSrc === fallbackSrc && (
        <div className="absolute inset-0 glass-card rounded-xl flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg
              className="w-8 h-8 mx-auto mb-2 opacity-50"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs">Failed to load</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Specific variants for common use cases
export const ProductImage: React.FC<OptimizedImageProps> = (props) => (
  <OptimizedImage
    {...props}
    aspectRatio="aspect-square"
    className={cn("rounded-xl", props.className)}
  />
);

export const CardImage: React.FC<OptimizedImageProps> = (props) => (
  <OptimizedImage
    {...props}
    aspectRatio="aspect-[4/3]"
    className={cn("rounded-2xl", props.className)}
  />
);

export const ThumbnailImage: React.FC<OptimizedImageProps> = (props) => (
  <OptimizedImage
    {...props}
    aspectRatio="aspect-square"
    className={cn("rounded-lg", props.className)}
  />
);

export const HeroImage: React.FC<OptimizedImageProps> = (props) => (
  <OptimizedImage
    {...props}
    priority={true}
    aspectRatio="aspect-[16/9]"
    className={cn("rounded-3xl", props.className)}
  />
);
