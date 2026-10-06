import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/contexts/WishlistContext";
import ProductCard from "@/components/ui/ProductCard";
import { ROUTE_NAMES } from "@/constants/enums";

const WishlistSection = () => {
  const { items } = useWishlist();

  if (items.length === 0) return null;

  return (
    <section className="px-4 py-6">
      <div className="relative mb-6 flex items-center justify-between gap-3 text-left sm:flex-col sm:text-center sm:px-24">
        <div className="flex min-w-0 flex-col items-start gap-2 sm:items-center">
          <h2 className="text-2xl font-bold text-gray-800">Your Wishlist</h2>
        </div>
        <Button
          asChild
          variant="ghost"
          className="min-h-11 font-semibold text-purple-600 hover:text-purple-700 sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2"
        >
          <Link to={ROUTE_NAMES.WISHLIST}>View All</Link>
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {items.map((item) => (
          <div key={item.id} className="flex-shrink-0 sm:w-64 w-48">
            <ProductCard product={item} variant="vertical" />
          </div>
        ))}
      </div>
    </section>
  );
};

export default WishlistSection;
