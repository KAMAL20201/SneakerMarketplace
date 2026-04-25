import { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Banner {
  id: string;
  image_url: string;
  mobile_image_url: string | null;
  cta_url: string | null;
}

interface Props {
  initialBanners?: Banner[];
}

const HomeBannerCarousel = ({ initialBanners }: Props) => {
  const [banners, setBanners] = useState<Banner[]>(initialBanners ?? []);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    // Skip client fetch if we already have SSR-provided banners
    if (initialBanners && initialBanners.length > 0) return;

    const fetchBanners = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("banners")
        .select("id, image_url, mobile_image_url, cta_url")
        .eq("is_active", true)
        .or(`start_date.is.null,start_date.lte.${today}`)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order("sort_order", { ascending: true });

      if (!error && data) setBanners(data);
    };
    fetchBanners();
  }, [initialBanners]);

  const resetTimer = (length: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % length);
    }, 7000);
  };

  useEffect(() => {
    resetTimer(banners.length);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length]);

  if (banners.length === 0) return null;

  const go = (dir: "prev" | "next") => {
    setCurrent((c) => {
      const next =
        dir === "prev"
          ? (c - 1 + banners.length) % banners.length
          : (c + 1) % banners.length;
      resetTimer(banners.length);
      return next;
    });
  };

  const goTo = (i: number) => {
    setCurrent(i);
    resetTimer(banners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) go(diff > 0 ? "next" : "prev");
    touchStartX.current = null;
  };

  return (
    <section className="md:px-4 md:pb-4">
      {/* Each slide is absolutely positioned — avoids iOS Safari flex/min-w-full bug */}
      <div
        className="relative md:rounded-3xl overflow-hidden bg-gray-100 select-none w-full aspect-[9/16] md:aspect-[2/1]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {banners.map((banner, i) => {
          const offset = i - current;
          const isActive = offset === 0;
          const img = (
            <picture className="w-full h-full">
              {banner.mobile_image_url && (
                <source
                  media="(max-width: 767px)"
                  srcSet={banner.mobile_image_url}
                />
              )}
              <img
                src={banner.image_url}
                alt="Promotional banner"
                className="w-full h-full object-cover"
                draggable={false}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "low"}
                decoding={i === 0 ? "sync" : "async"}
                width={1200}
                height={600}
              />
            </picture>
          );
          return (
            <div
              key={banner.id}
              className="absolute inset-0"
              style={{
                transform: `translateX(${offset * 100}%) scale(${isActive ? 1 : 0.92})`,
                opacity: isActive ? 1 : 0,
                transition: "transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms ease",
                zIndex: isActive ? 1 : 0,
              }}
            >
              {banner.cta_url ? (
                <Link to={banner.cta_url} prefetch="intent" className="block w-full h-full">
                  {img}
                </Link>
              ) : (
                img
              )}
            </div>
          );
        })}

        {/* Arrows — desktop only */}
        {banners.length > 1 && (
          <>
            <button
              onClick={() => go("prev")}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 hidden md:flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => go("next")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 hidden md:flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-5 h-1.5 bg-white"
                    : "w-1.5 h-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomeBannerCarousel;
