import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import type {
  EmblaCarouselType,
  EmblaOptionsType,
  EmblaPluginType,
} from "embla-carousel";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CarouselApi = EmblaCarouselType;

type CarouselProps = React.HTMLAttributes<HTMLDivElement> & {
  opts?: EmblaOptionsType;
  plugins?: EmblaPluginType[];
  setApi?: (api: CarouselApi) => void;
};

const CarouselContext = React.createContext<{
  api: CarouselApi | null;
} | null>(null);

export function useCarousel() {
  const ctx = React.useContext(CarouselContext);
  if (!ctx) throw new Error("useCarousel must be used within <Carousel>");
  return ctx;
}

const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  ({ className, children, opts, plugins, setApi, ...props }, ref) => {
    const [emblaRef, emblaApi] = useEmblaCarousel(opts, plugins);

    React.useEffect(() => {
      if (emblaApi) setApi?.(emblaApi);
    }, [emblaApi, setApi]);

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        <CarouselContext.Provider value={{ api: emblaApi ?? null }}>
          <div ref={emblaRef} className="embla overflow-hidden">
            {children}
          </div>
        </CarouselContext.Provider>
      </div>
    );
  }
);
Carousel.displayName = "Carousel";

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("embla__container -ml-4 flex", className)}
    {...props}
  />
));
CarouselContent.displayName = "CarouselContent";

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "embla__slide min-w-0 shrink-0 grow-0 basis-full pl-4",
      className
    )}
    {...props}
  />
));
CarouselItem.displayName = "CarouselItem";

const BaseButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "carousel-button absolute top-1/2 -translate-y-1/2 z-10 inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 touch-manipulation",
      className
    )}
    {...props}
  >
    {children}
    <span className="sr-only">Carousel control</span>
  </button>
));
BaseButton.displayName = "CarouselButton";

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { api } = useCarousel();
  const [disabled, setDisabled] = React.useState(true);

  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => setDisabled(!api.canScrollPrev());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  return (
    <BaseButton
      ref={ref}
      className={cn("left-3", className)}
      onClick={() => api?.scrollPrev()}
      disabled={disabled}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
    </BaseButton>
  );
});
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { api } = useCarousel();
  const [disabled, setDisabled] = React.useState(true);

  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => setDisabled(!api.canScrollNext());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  return (
    <BaseButton
      ref={ref}
      className={cn("right-3", className)}
      onClick={() => api?.scrollNext()}
      disabled={disabled}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
    </BaseButton>
  );
});
CarouselNext.displayName = "CarouselNext";

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
};
