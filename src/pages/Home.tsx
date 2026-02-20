import { Sparkles } from "lucide-react";
// [MARKETPLACE REMOVED] Plus icon and Button were used for "Sell Now" CTA
// import { Plus } from "lucide-react";
// import { Button } from "@/components/ui/button";
import { SearchDropdown } from "@/components/ui/SearchDropdown";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router";
import { categories } from "@/constants/sellConstants";
import { ROUTE_NAMES } from "@/constants/enums";
import { supabaseUrl } from "@/lib/supabase";
import RecentlyListed from "@/components/RecentlyListed";
import FeaturedListings from "@/components/FeaturedListings";
import BrandSpotlight from "@/components/BrandSpotlight";
import InstagramBanner from "@/components/InstagramBanner";
import WhyBuyFromUs from "@/components/WhyBuyFromUs";
// [MARKETPLACE REMOVED] HowItWorks section - escrow system explanation not relevant for ecommerce
// import HowItWorks from "@/components/HowItWorks";
import { CardImage } from "@/components/ui/OptimizedImage";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

const Home = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (categoryId: string) => {
    // Navigate to browse page with category filter
    navigate(`${ROUTE_NAMES.BROWSE}?category=${categoryId}`);
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          window.opener.postMessage(
            {
              type: "GOOGLE_AUTH_ERROR",
              error: error.message,
            },
            window.location.origin
          );
        } else if (session?.user) {
          window.opener.postMessage(
            {
              type: "GOOGLE_AUTH_SUCCESS",
              user: session.user,
              session: session,
            },
            window.location.origin
          );
        } else {
          window.opener.postMessage(
            {
              type: "GOOGLE_AUTH_ERROR",
              error: "No session found",
            },
            window.location.origin
          );
        }
      } catch (err: any) {
        window.opener.postMessage(
          {
            type: "GOOGLE_AUTH_ERROR",
            error: err.message,
          },
          window.location.origin
        );
      }

      // Close popup
      window.close();
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="px-4 py-6">
        <div className="text-center mb-8 float-animation">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-orange-500" />
          </div>
          <h1 className="text-4xl font-bold mb-3">
            Discover the Hottest
            <span className="gradient-text block mt-2">
              Drops & Collectibles
            </span>
          </h1>
          <p className="text-gray-700 text-lg mb-2">
            Shop hyped sneakers, streetwear, collectibles & more —
            authentic products, quality guaranteed
          </p>

          {/* Trust badges - ecommerce focused */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-full border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-700 text-sm font-medium">
                Quality Verified
              </span>
            </div>
            {/* [MARKETPLACE REMOVED] Buyer Protection and Secure Payments badges
               These were marketplace trust signals for multi-seller model.
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-full border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-700 text-sm font-medium">
                Buyer Protection
              </span>
            </div>
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-full border border-orange-200">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-orange-700 text-sm font-medium">
                Secure Payments
              </span>
            </div>
            */}
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-full border border-purple-200">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-purple-700 text-sm font-medium">
                100% Authentic
              </span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <SearchDropdown />
        </div>

        {/* [MARKETPLACE REMOVED] "Sell Now" CTA - only admin can sell in ecommerce model
        <div className="flex gap-4">
          <Button
            asChild
            className="flex-1 h-12 bg-white text-gray-800 font-semibold border-2 border-gray-800 rounded-2xl hover:bg-gray-800 hover:text-white transition-all duration-300"
          >
            <Link to={ROUTE_NAMES.SELL}>
              <Plus className="h-5 w-5 mr-2" />
              Sell Now
            </Link>
          </Button>
        </div>
        */}
      </section>

      {/* Brand Spotlight */}
      <BrandSpotlight />

      {/* Categories */}
      <section className="px-4 py-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Explore Categories
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card
              key={category.name}
              onClick={() => handleCategoryClick(category.id)}
              className="glass-card border-0 hover:scale-105 transition-all duration-300 cursor-pointer group rounded-3xl overflow-hidden"
            >
              <CardContent className="p-0">
                <div
                  className={`h-40 bg-gradient-to-br relative overflow-hidden`}
                >
                  <CardImage
                    src={`${supabaseUrl}${category.image}`}
                    alt={category.name}
                    aspectRatio="aspect-[4/3]"
                    className="w-full h-full"
                    priority={true}
                  />
                  <div className="px-4 py-2 absolute opacity-50 bottom-0 bg-white w-full">
                    <h3 className="font-bold text-black">{category.name}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Recently Listed Section */}
      <RecentlyListed />

      {/* Trending Section */}
      {/* <section className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl border-0 bg-gradient-to-br from-purple-500 to-pink-500">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Trending Now</h2>
          </div>
          <Link
                              to={ROUTE_NAMES.BROWSE}
            className="text-purple-600 hover:text-purple-700 font-semibold"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {featuredSneakers.slice(0, 2).map((sneaker) => (
            <Link to={ROUTE_HELPERS.PRODUCT_DETAIL("dunk-low-panda")} key={sneaker.id}>
              <Card className="glass-card border-0 hover:scale-105 transition-all duration-300 group cursor-pointer rounded-3xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={sneaker.image || "/placeholder.svg"}
                      alt={sneaker.name}
                      width={200}
                      height={200}
                      className="w-full h-44 object-cover"
                    />
                    {sneaker.trending && (
                      <Badge className="absolute top-3 left-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 rounded-xl px-3">
                        🔥 Trending
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-3 right-3 h-10 w-10 p-0 glass-button border-0 rounded-2xl"
                    >
                      <Heart className="h-5 w-5 text-gray-600" />
                    </Button>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-purple-600 font-semibold mb-1">
                      {sneaker.brand}
                    </p>
                    <h3 className="font-bold text-sm text-gray-800 mb-3 line-clamp-2">
                      {sneaker.name}
                    </h3>
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-gray-700 font-medium">
                        {sneaker.rating}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-800 text-lg">
                          ${sneaker.price}
                        </span>
                        {sneaker.originalPrice > sneaker.price && (
                          <span className="text-sm text-gray-500 line-through ml-2">
                            ${sneaker.originalPrice}
                          </span>
                        )}
                      </div>
                      <Badge className="glass-button border-0 text-gray-700 rounded-xl">
                        {sneaker.size}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section> */}

      {/* Featured Listings Section */}
      <FeaturedListings />

      {/* Instagram Banner */}
      <InstagramBanner />

      {/* Why Buy From Us */}
      <WhyBuyFromUs />

      {/* [MARKETPLACE REMOVED] How It Works Section - escrow system not used in ecommerce model */}
      {/* <HowItWorks /> */}

      {/* Bottom spacing */}
      <div className="h-8"></div>
    </div>
  );
};

export default Home;
