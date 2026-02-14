import { Sparkles } from "lucide-react";
import { SearchDropdown } from "@/components/ui/SearchDropdown";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router";
import { categories } from "@/constants/sellConstants";
import { ROUTE_NAMES } from "@/constants/enums";
import { supabaseUrl } from "@/lib/supabase";
import RecentlyListed from "@/components/RecentlyListed";
import FeaturedListings from "@/components/FeaturedListings";
import HowItWorks from "@/components/HowItWorks";
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
            Shop hyped sneakers, streetwear, collectibles & more with
            secure payments and fast delivery across India
          </p>

          {/* Trust Features */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-full border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-700 text-sm font-medium">
                100% Authentic
              </span>
            </div>
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-full border border-orange-200">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-orange-700 text-sm font-medium">
                Secure Payments
              </span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-full border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-700 text-sm font-medium">
                Fast Delivery
              </span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <SearchDropdown />
        </div>
      </section>

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

      {/* Featured Listings Section */}
      <FeaturedListings />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Bottom spacing */}
      <div className="h-8"></div>
    </div>
  );
};

export default Home;
