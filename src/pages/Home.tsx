import { Sparkles, Search, Plus, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router";
import { categories } from "@/constants/sellConstants";
import { supabase, supabaseUrl } from "@/lib/supabase";
import { useEffect, useState } from "react";

const Home = () => {
  const [featuredSneakers, setFeaturedSneakers] = useState<any[]>([]);
  useEffect(() => {
    const fetchFeaturedSneakers = async () => {
      const { data, error } = await supabase
        .from("listings_with_images")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) console.error(error);
      setFeaturedSneakers(data ?? []);
    };
    fetchFeaturedSneakers();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="px-4 py-6">
        <div className="text-center mb-8 float-animation">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-purple-500" />
          </div>
          <h1 className="text-4xl font-bold mb-3">
            Discover the Hottest
            <span className="gradient-text block mt-2">
              Drops & Collectibles
            </span>
          </h1>
          <p className="text-gray-700 text-lg mb-2">
            Connect with collectors and sellers across India for hyped sneakers,
            streetwear, collectibles & more
          </p>

          {/* Trust & Safety Features */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-full border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-700 text-sm font-medium">
                100% Authentic Guarantee
              </span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-full border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-700 text-sm font-medium">
                Buyer Protection
              </span>
            </div>
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-full border border-purple-200">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-purple-700 text-sm font-medium">
                Secure Payments
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Search - Only visible on mobile */}
        <div className="mb-8">
          <div className="relative flex items-center justify-center border rounded-2xl pl-2">
            <Search className=" h-5 w-5 text-gray-600" />
            <Input
              placeholder="Search sneakers, streetwear, collectibles..."
              className="h-12 text-gray-700 placeholder:text-gray-500 !border-none !outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button
            asChild
            className="flex-1 h-12 glass-button border-0 rounded-2xl text-gray-700 hover:bg-white/30"
          >
            <Link to="/sell">
              <Plus className="h-5 w-5 mr-2" />
              Sell Now
            </Link>
          </Button>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 py-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Explore Categories
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {categories.map((category) => (
            <Card
              key={category.name}
              className="glass-card border-0 hover:scale-105 transition-all duration-300 cursor-pointer group rounded-3xl overflow-hidden"
            >
              <CardContent className="p-0">
                <div
                  className={`h-40 bg-gradient-to-br relative overflow-hidden`}
                >
                  <img
                    src={`${supabaseUrl}${category.image}`}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-white/10 group-hover:bg-white/5 transition-colors" />
                  <div className="absolute bottom-4 left-4">
                    <div className="w-8 h-8 bg-white/30 rounded-full backdrop-blur-sm"></div>
                  </div>
                </div>
                <div className="px-4 py-2 absolute opacity-50 bottom-0 bg-white w-full">
                  <h3 className="font-bold text-black">{category.name}</h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust & Safety Section */}
      <section className="px-4 py-8 bg-gradient-to-br from-green-50 to-blue-50 mx-4 rounded-3xl mb-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-500 rounded-full">
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-800">
            Shop with Complete Peace of Mind
          </h2>
          <p className="text-gray-600">
            Your safety is our priority. Every transaction is protected.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Authenticity Guarantee */}
          <div className="flex items-start gap-4 bg-white/60 p-4 rounded-2xl backdrop-blur-sm">
            <div className="p-2 bg-green-100 rounded-full flex-shrink-0">
              <svg
                className="w-5 h-5 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-1">
                100% Authenticity Guaranteed
              </h3>
              <p className="text-gray-600 text-sm">
                Every item is verified for authenticity. Get your money back if
                it's fake.
              </p>
            </div>
          </div>

          {/* Buyer Protection */}
          <div className="flex items-start gap-4 bg-white/60 p-4 rounded-2xl backdrop-blur-sm">
            <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-1">
                Complete Buyer Protection
              </h3>
              <p className="text-gray-600 text-sm">
                Your money is safe until you receive and approve your item.
              </p>
            </div>
          </div>

          {/* Verified Sellers */}
          <div className="flex items-start gap-4 bg-white/60 p-4 rounded-2xl backdrop-blur-sm">
            <div className="p-2 bg-purple-100 rounded-full flex-shrink-0">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-1">
                Verified Sellers Only
              </h3>
              <p className="text-gray-600 text-sm">
                All sellers are ID verified and rated by the community.
              </p>
            </div>
          </div>
        </div>
      </section>

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
            to="/browse"
            className="text-purple-600 hover:text-purple-700 font-semibold"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {featuredSneakers.slice(0, 2).map((sneaker) => (
            <Link to="/product/dunk-low-panda" key={sneaker.id}>
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

      {/* Featured Products */}
      <section className="px-4 py-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Featured Listings
        </h2>
        <div className="flex flex-col gap-4">
          {featuredSneakers.slice(0, 2).map((sneaker) => (
            <Link
              to={`/product/${sneaker.product_id}`}
              key={sneaker.product_id}
            >
              <Card className="glass-card border-0 hover:scale-[1.02] transition-all duration-300 cursor-pointer rounded-3xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex p-4 gap-2">
                    <div className="relative w-28 h-28 flex-shrink-0">
                      <img
                        src={sneaker.image_url || "/placeholder.svg"}
                        alt={sneaker.name}
                        width={112}
                        height={112}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs text-purple-600 font-semibold capitalize">
                            {sneaker.brand}
                          </p>
                          <h3 className="font-bold text-gray-800 capitalize">
                            {sneaker.title}
                          </h3>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 glass-button border-0 rounded-2xl"
                        >
                          <Heart className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        {/* <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-gray-700 font-medium">
                          {sneaker.rating}
                        </span> */}
                        <Badge className="glass-button border-0 text-gray-700 text-xs rounded-xl ml-auto capitalize">
                          {sneaker.condition}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-gray-800 text-lg">
                            ₹ {sneaker.price}
                          </span>
                          {sneaker.originalPrice > sneaker.price && (
                            <span className="text-sm text-gray-500 line-through ml-2">
                              ${sneaker.originalPrice}
                            </span>
                          )}
                        </div>
                        <Badge className="glass-button border-0 text-gray-700 rounded-xl uppercase">
                          {sneaker.size_value}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom spacing */}
      <div className="h-8"></div>
    </div>
  );
};

export default Home;
