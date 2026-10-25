import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { ROUTE_NAMES } from "@/constants/enums";
import DiwaliFireworks from "./DiwaliFireworks";
import "./DiwaliBanner.css";

interface Props {
  active: boolean;
  paused: boolean;
}

const sneakers = [
  { id: "9cd362df-133c-4a1b-8d4b-90cdc8ddf8de", name: "New Balance 9060 Neptune", label: "9060 Neptune", image: "neptune", width: 800, height: 371 },
  { id: "5da69673-5ea9-4a7d-ac27-449899ce2503", name: "Adidas Samba", label: "Samba", image: "samba", width: 800, height: 327 },
  { id: "e4c7341a-3429-49fc-a1da-145305827cf1", name: "ASICS GEL-NYC", label: "GEL-NYC", image: "asics", width: 800, height: 373 },
] as const;

const DiwaliBanner = ({ active, paused }: Props) => {
  const bannerRef = useRef<HTMLAnchorElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const element = bannerRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      ref={bannerRef}
      to={`${ROUTE_NAMES.DIWALI_SALE}#diwali-products`}
      aria-label="Shop Diwali sale with instant shipping"
      className="diwali-banner"
      data-paused={paused || !active || !inView}
    >
      <DiwaliFireworks running={active && !paused && inView} />
      <div className="diwali-embers" aria-hidden="true">
        {Array.from({ length: 7 }, (_, ember) => <span key={ember} />)}
      </div>

      <div className="diwali-copy">
        <p className="diwali-eyebrow">THE PLUG MARKET · FESTIVE EDIT</p>
        <h2>Light up<br />your rotation<span>.</span></h2>
        <p className="diwali-sale">The Diwali Sale</p>
        <p className="diwali-description">Fresh kicks. Festive energy.</p>
        <span className="diwali-shop">
          Shop sneakers <ArrowUpRight size={18} aria-hidden="true" />
        </span>
      </div>

      <div className="diwali-sneakers" aria-label="Featured sneakers">
        <div className="diwali-orbit" aria-hidden="true" />
        {sneakers.map((sneaker, index) => (
          <div
            key={sneaker.id}
            className={`diwali-sneaker diwali-sneaker-${index}`}
          >
            <img
              src={`/images/diwali/${sneaker.image}.webp`}
              srcSet={`/images/diwali/${sneaker.image}-small.webp 400w, /images/diwali/${sneaker.image}.webp 800w`}
              sizes="(max-width: 767px) 65vw, 34vw"
              alt={sneaker.name}
              width={sneaker.width}
              height={sneaker.height}
              fetchPriority={index === 0 ? "high" : "low"}
              decoding="async"
              draggable={false}
            />
            <span>{sneaker.label} <ArrowUpRight size={12} aria-hidden="true" /></span>
          </div>
        ))}
      </div>

      <div className="diwali-lights" aria-hidden="true">
        {[0, 1, 2].map((diya) => (
          <div key={diya} className="diwali-diya">
            <span className="diwali-flame" />
            <span className="diwali-bowl" />
          </div>
        ))}
      </div>
      <span className="diwali-footer" aria-hidden="true">A LITTLE LIGHT. A LOT OF HEAT.</span>
    </Link>
  );
};

export default DiwaliBanner;
