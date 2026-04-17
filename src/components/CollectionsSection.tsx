import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { ALL_COLLECTIONS } from "@/constants/collectionsConfig";
import { CardImage } from "@/components/ui/OptimizedImage";

const gradients = [
  "from-purple-500 via-pink-500 to-rose-500",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-orange-500 via-amber-500 to-yellow-500",
  "from-green-500 via-emerald-500 to-teal-500",
  "from-indigo-500 via-purple-500 to-pink-500",
  "from-red-500 via-pink-500 to-purple-500",
];

const CollectionsSection = () => {
  return (
    <section className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Shop by Collection</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {ALL_COLLECTIONS.map((collection, index) => (
          <Link
            key={collection.id}
            to={`/collections/${collection.slug}`}
            prefetch="intent"
            className="flex-shrink-0 w-44 sm:w-52 group"
          >
            <div className="glass-card rounded-2xl overflow-hidden hover:scale-[1.03] transition-all duration-300 border-0 shadow-sm hover:shadow-md">
              {/* Banner image or gradient fallback */}
              <div className="relative h-36 sm:h-40 overflow-hidden">
                {collection.imageUrl ? (
                  <>
                    <CardImage
                      src={collection.imageUrl}
                      alt={collection.name}
                      aspectRatio="aspect-[4/3]"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </>
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center`}
                  >
                    <span className="text-4xl font-black text-white/30 select-none">
                      {collection.brandName.charAt(0)}
                    </span>
                  </div>
                )}
                {collection.badge && (
                  <Badge className="absolute top-2 left-2 bg-white/80 text-gray-800 border-0 text-[10px] px-2 py-0 font-semibold">
                    {collection.badge}
                  </Badge>
                )}
              </div>

              {/* Card body */}
              <div className="p-3">
                <p className="text-[10px] text-purple-600 font-semibold uppercase tracking-wide mb-0.5">
                  {collection.brandName}
                </p>
                <h3 className="font-bold text-gray-800 text-sm line-clamp-1 mb-1">
                  {collection.name}
                </h3>
                <p className="text-gray-500 text-[11px] line-clamp-2">
                  {collection.tagline}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CollectionsSection;
