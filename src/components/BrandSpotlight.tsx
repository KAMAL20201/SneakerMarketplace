import { Link } from "react-router";
import { ROUTE_NAMES } from "@/constants/enums";

interface SpotlightBrand {
  label: string;
  href: string;
  logoSrc?: string;   // local file in /public/brandLogos/ — optional
  initial: string;    // shown when no logo file exists
  fallbackBg: string;
  fallbackText: string;
}

// Brands with a dedicated brand page link there directly (better SEO — real <a> tags).
// Brands without a dedicated page fall back to filtered browse.
const SPOTLIGHT_BRANDS: SpotlightBrand[] = [
  {
    label: "Nike",
    href: "/brands/nike",
    logoSrc: "/brandLogos/nike.svg",
    initial: "N",
    fallbackBg: "bg-black",
    fallbackText: "text-white",
  },
  {
    label: "Air Jordan",
    href: "/brands/air-jordan",
    logoSrc: "/brandLogos/jordan.svg",
    initial: "J",
    fallbackBg: "bg-red-600",
    fallbackText: "text-white",
  },
  {
    label: "Adidas",
    href: "/brands/adidas",
    logoSrc: "/brandLogos/adidas.svg",
    initial: "A",

    fallbackBg: "bg-black",
    fallbackText: "text-white",
  },
  {
    label: "New Balance",
    href: "/brands/new-balance",
    logoSrc: "/brandLogos/new_balance.jpeg",
    initial: "NB",
    fallbackBg: "bg-gray-700",
    fallbackText: "text-white",
  },
  {
    label: "Asics",
    href: `${ROUTE_NAMES.BROWSE}?brand=asics`,
    logoSrc: "/brandLogos/asics.svg",
    initial: "AS",
    fallbackBg: "bg-blue-700",
    fallbackText: "text-white",
  },
  {
    label: "Onitsuka Tiger",
    href: "/brands/onitsuka-tiger",
    logoSrc: "/brandLogos/onitsuka.svg",
    initial: "OT",
    fallbackBg: "bg-red-500",
    fallbackText: "text-white",
  },
  {
    label: "Puma",
    href: `${ROUTE_NAMES.BROWSE}?brand=puma`,
    logoSrc: "/brandLogos/puma.svg",
    initial: "P",
    fallbackBg: "bg-zinc-800",
    fallbackText: "text-white",
  },
];

// ── Per-chip component ────────────────────────────────────────────────────────
const BrandChip = ({ brand }: { brand: SpotlightBrand }) => {
  const logoEl = brand.logoSrc ? (
    <span className="w-10 h-10 rounded-full flex-shrink-0 bg-white border border-gray-100 flex items-center justify-center overflow-hidden">
      <img
        src={brand.logoSrc}
        alt={`${brand.label} logo`}
        className="w-8 h-8 object-contain"
      />
    </span>
  ) : (
    <span
      className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${brand.fallbackBg} ${brand.fallbackText}`}
    >
      {brand.initial}
    </span>
  );

  return (
    <Link
      to={brand.href}
      className="flex-shrink-0 flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full border border-gray-200 bg-white hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 text-sm font-medium text-gray-700 transition-all duration-200 whitespace-nowrap shadow-sm hover:shadow-md"
    >
      {logoEl}
      {brand.label}
    </Link>
  );
};

// ── Section ───────────────────────────────────────────────────────────────────
const BrandSpotlight = () => {
  return (
    <section className="px-4 py-4">
      <h2 className="text-lg font-bold mb-3 text-gray-800">Shop by Brand</h2>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {SPOTLIGHT_BRANDS.map((brand) => (
          <BrandChip key={brand.href} brand={brand} />
        ))}
      </div>
    </section>
  );
};

export default BrandSpotlight;
