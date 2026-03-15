import { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Banner {
  id: string;
  image_url: string;
  cta_url: string | null;
}

const HomeBannerCarousel = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const fetchBanners = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("banners")
        .select("id, image_url, cta_url")
        .eq("is_active", true)
        .or(`start_date.is.null,start_date.lte.${today}`)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order("sort_order", { ascending: true });

      if (!error && data) setBanners(data);
    };
    fetchBanners();
  }, []);

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

  // Touch swipe support
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
    <section className="px-4 pb-4">
      <div
        className="relative rounded-3xl overflow-hidden aspect-[2/1] bg-gray-100 select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sliding track — all banners laid out side by side */}
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((banner) => (
            <div key={banner.id} className="min-w-full h-full flex-shrink-0">
              {banner.cta_url ? (
                <Link to={banner.cta_url} className="block w-full h-full">
                  <img
                    src={banner.image_url}
                    alt="Promotional banner"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </Link>
              ) : (
                <img
                  src={banner.image_url}
                  alt="Promotional banner"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              )}
            </div>
          ))}
        </div>

        {/* Arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={() => go("prev")}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => go("next")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-10"
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
