import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { ALL_BRANDS } from "@/constants/brandsConfig";

export function meta() {
  return [
    { title: "Shop by Brand | The Plug Market" },
    {
      name: "description",
      content:
        "Browse authentic sneakers and streetwear by brand. Shop Nike, Jordan, New Balance, Adidas, Onitsuka Tiger and more at The Plug Market India.",
    },
    {
      tagName: "link",
      rel: "canonical",
      href: "https://theplugmarket.in/brands",
    },
    { property: "og:title", content: "Shop by Brand | The Plug Market" },
    {
      property: "og:description",
      content:
        "Browse authentic sneakers by brand at The Plug Market India.",
    },
    { property: "og:url", content: "https://theplugmarket.in/brands" },
  ];
}

const BrandsIndex = () => {
  return (
    <div className="min-h-screen px-4 py-8">
      {/* JSON-LD SiteLinks / ItemList for brands */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Shop by Brand | The Plug Market",
            url: "https://theplugmarket.in/brands",
            itemListElement: ALL_BRANDS.map((brand, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `https://theplugmarket.in/brands/${brand.slug}`,
              name: brand.name,
            })),
          }),
        }}
      />

      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-bold gradient-text mb-3">
            Shop by Brand
          </h1>
          <p className="text-gray-600 text-sm md:text-base max-w-xl mx-auto">
            Browse authentic products from your favourite brands — all listings
            are manually reviewed and verified.
          </p>
        </div>

        {/* Brand grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_BRANDS.map((brand) => (
            <Link
              key={brand.slug}
              to={`/brands/${brand.slug}`}
              className="group"
            >
              <div className="glass-card border-0 rounded-2xl p-6 h-full hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1 group-hover:gradient-text transition-all">
                    {brand.name}
                  </h2>
                  <p className="text-sm text-gray-500 italic mb-3">
                    {brand.tagline}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {brand.description}
                  </p>
                </div>

                {/* Model chips preview */}
                <div className="flex flex-wrap gap-1.5">
                  {brand.models.slice(0, 4).map((model) => (
                    <span
                      key={model.slug}
                      className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200"
                    >
                      {model.name}
                    </span>
                  ))}
                  {brand.models.length > 4 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      +{brand.models.length - 4} more
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-sm font-semibold text-purple-600 group-hover:gap-2 transition-all">
                  Shop Now <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BrandsIndex;
