import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { ALL_COLLECTIONS } from "@/constants/collectionsConfig";

export function meta() {
  return [
    {
      title:
        "Sneaker Collections | Shop By Model | The Plug Market",
    },
    {
      name: "description",
      content:
        "Browse curated sneaker collections at The Plug Market. Shop New Balance 9060, Nike Dunk Low, Air Jordan 1, Adidas Samba & more. 100% authentic, quality verified.",
    },
    {
      tagName: "link",
      rel: "canonical",
      href: "https://theplugmarket.in/collections",
    },
    { property: "og:url", content: "https://theplugmarket.in/collections" },
    {
      property: "og:title",
      content: "Sneaker Collections | Shop By Model | The Plug Market",
    },
    {
      property: "og:description",
      content:
        "Browse curated sneaker collections at The Plug Market. Shop New Balance 9060, Nike Dunk Low, Air Jordan 1, Adidas Samba & more.",
    },
  ];
}

const gradients = [
  "from-purple-500 via-pink-500 to-rose-500",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-orange-500 via-amber-500 to-yellow-500",
  "from-green-500 via-emerald-500 to-teal-500",
  "from-indigo-500 via-purple-500 to-pink-500",
  "from-red-500 via-pink-500 to-purple-500",
];

const CollectionsIndex = () => {
  return (
    <div className="min-h-screen px-4 py-6">
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Sneaker Collections | The Plug Market",
            url: "https://theplugmarket.in/collections",
            description:
              "Browse curated sneaker collections at The Plug Market India.",
          }),
        }}
      />

      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-3">
            Sneaker Collections
          </h1>
          <p className="text-gray-600 text-base md:text-lg max-w-xl mx-auto">
            Curated collections of the most sought-after sneakers in India.
            Every pair quality verified and 100% authentic.
          </p>
        </div>

        {/* Collections grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ALL_COLLECTIONS.map((collection, index) => (
            <Link
              key={collection.id}
              to={`/collections/${collection.slug}`}
              prefetch="intent"
              className="group"
            >
              <div className="glass-card rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-300 border-0 shadow-sm hover:shadow-md">
                {/* Gradient banner */}
                <div
                  className={`h-28 bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center relative`}
                >
                  <span className="text-5xl font-black text-white/20 tracking-tight select-none">
                    {collection.brandName.charAt(0)}
                  </span>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-white font-bold text-lg tracking-wide drop-shadow">
                      {collection.name}
                    </p>
                    <p className="text-white/80 text-xs mt-1">
                      {collection.tagline}
                    </p>
                  </div>
                  {collection.badge && (
                    <Badge className="absolute top-3 right-3 bg-white/20 text-white border-0 text-xs backdrop-blur-sm">
                      {collection.badge}
                    </Badge>
                  )}
                </div>

                {/* Card body */}
                <div className="p-5">
                  <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide mb-1">
                    {collection.brandName}
                  </p>
                  <h2 className="text-base font-bold text-gray-800 mb-2">
                    {collection.name}
                  </h2>
                  <p className="text-gray-500 text-xs line-clamp-2 mb-4">
                    {collection.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        Verified
                      </span>
                      <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                        Authentic
                      </span>
                    </div>
                    <span className="text-purple-600 text-sm font-semibold group-hover:translate-x-1 transition-transform">
                      Shop →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CollectionsIndex;
