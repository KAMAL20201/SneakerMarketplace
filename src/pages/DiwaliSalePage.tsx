import { useEffect, useState } from "react";
import { useLocation, useNavigationType } from "react-router";
import { Pause, Play } from "lucide-react";
import DiwaliBanner from "@/components/DiwaliBanner";
import { ROUTE_NAMES } from "@/constants/enums";
import { BrowseCatalog, loader as browseLoader } from "./Browse";
import "./DiwaliSalePage.css";

// React Router route modules also export loaders, revalidation, and metadata.
// eslint-disable-next-line react-refresh/only-export-components
export const loader = browseLoader;
// eslint-disable-next-line react-refresh/only-export-components
export { shouldRevalidate } from "./Browse";

// eslint-disable-next-line react-refresh/only-export-components
export function meta() {
  return [
    { title: "Diwali Sale | The Plug Market" },
    { name: "description", content: "Light up your rotation with The Plug Market Diwali Sale. Shop festive picks with instant shipping, delivered in 7–10 days." },
    { tagName: "link", rel: "canonical", href: `https://theplugmarket.in${ROUTE_NAMES.DIWALI_SALE}` },
    { property: "og:title", content: "Diwali Sale | The Plug Market" },
    { property: "og:url", content: `https://theplugmarket.in${ROUTE_NAMES.DIWALI_SALE}` },
  ];
}

const DiwaliSalePage = () => {
  const [paused, setPaused] = useState(false);
  const { hash, key } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // History navigation restores its position through the catalog and ScrollRestoration.
    if (hash !== "#diwali-products" || navigationType === "POP") return;
    const frame = requestAnimationFrame(() => {
      document.getElementById("diwali-products")?.scrollIntoView({ block: "start", behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, key, navigationType]);

  return (
    <div className="diwali-sale-page min-h-screen">
      <section aria-label="Diwali sale" className="relative w-full overflow-hidden aspect-[9/16] md:aspect-[2/1]">
        <DiwaliBanner active paused={paused} />
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? "Resume banner animations" : "Pause banner animations"}
          aria-pressed={paused}
          className="absolute bottom-2 right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50"
        >
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>
      </section>
      <BrowseCatalog variant="diwali-sale" />
      <p className="pb-10 text-center text-xs tracking-widest text-[#d3af8c]">A LITTLE LIGHT. A FRESH ROTATION.</p>
    </div>
  );
};

export default DiwaliSalePage;
