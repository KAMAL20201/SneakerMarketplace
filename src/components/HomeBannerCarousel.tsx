import { useCallback, useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
import DiwaliBanner from "@/components/DiwaliBanner";

interface Banner {
  id: string;
  image_url: string;
  mobile_image_url: string | null;
  cta_url: string | null;
}

interface Props {
  initialBanners?: Banner[] | Promise<Banner[]>;
}

const HomeBannerCarousel = ({ initialBanners }: Props) => {
  const [banners, setBanners] = useState<Banner[]>(
    Array.isArray(initialBanners) ? initialBanners : [],
  );
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const slideCount = banners.length + 1;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => {
      preference.removeEventListener("change", updatePreference);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // Deferred loader data adds slides without blocking or remounting the local banner.
    if (initialBanners !== undefined) {
      let cancelled = false;
      Promise.resolve(initialBanners)
        .then((resolvedBanners) => {
          if (!cancelled) setBanners(resolvedBanners);
        })
        .catch(() => {
          if (!cancelled) setBanners([]);
        });
      return () => { cancelled = true; };
    }

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

  const resetTimer = useCallback((length: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (length <= 1 || paused || reducedMotion || !visible) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % length);
    }, 10000);
  }, [paused, reducedMotion, visible]);

  useEffect(() => {
    resetTimer(slideCount);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slideCount, resetTimer]);

  const go = (dir: "prev" | "next") => {
    resetTimer(slideCount);
    setCurrent((c) => {
      const next =
        dir === "prev"
          ? (c - 1 + slideCount) % slideCount
          : (c + 1) % slideCount;
      return next;
    });
  };

  const goTo = (i: number) => {
    setCurrent(i);
    resetTimer(slideCount);
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
    <section ref={sectionRef} className="md:pb-4" aria-label="Homepage promotions" aria-roledescription="carousel">
      {/* Each slide is absolutely positioned — avoids iOS Safari flex/min-w-full bug */}
      <div
        className="relative overflow-hidden bg-gray-100 select-none w-full aspect-[9/16] md:aspect-[2/1]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="absolute inset-0"
          inert={current !== 0}
          aria-hidden={current !== 0}
          style={{
            transform: `translateX(${-current * 100}%)`,
            opacity: current === 0 ? 1 : 0,
            transition: reducedMotion ? "none" : "transform 500ms ease, opacity 400ms ease",
            zIndex: current === 0 ? 1 : 0,
          }}
        >
          <DiwaliBanner active={current === 0} paused={paused || reducedMotion} />
        </div>
        {banners.map((banner, i) => {
          const offset = i + 1 - current;
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
                loading="lazy"
                fetchPriority="low"
                decoding="async"
                width={1200}
                height={600}
              />
            </picture>
          );
          return (
            <div
              key={banner.id}
              className="absolute inset-0"
              inert={!isActive}
              aria-hidden={!isActive}
              style={{
                transform: `translateX(${offset * 100}%) scale(${isActive ? 1 : 0.92})`,
                opacity: isActive ? 1 : 0,
                transition: reducedMotion ? "none" : "transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms ease",
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
        {slideCount > 1 && (
          <>
            <button
              onClick={() => go("prev")}
              aria-label="Previous banner"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 hidden md:flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => go("next")}
              aria-label="Next banner"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 hidden md:flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Dots */}
        {slideCount > 1 && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex z-10">
            {Array.from({ length: slideCount }, (_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to banner ${i + 1}`}
                aria-current={i === current ? "true" : undefined}
                className="w-11 h-11 flex items-center justify-center"
              >
                <span className={`block rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-5 h-1.5 bg-white"
                    : "w-1.5 h-1.5 bg-white/60"
                }`} />
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? "Resume banner animations" : "Pause banner animations"}
          aria-pressed={paused}
          className="absolute bottom-2 right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50"
        >
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
};

export default HomeBannerCarousel;
