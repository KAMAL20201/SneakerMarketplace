import { Sparkles, Search, Plus, TrendingUp, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router";

const Home = () => {
  const featuredSneakers = [
    {
      id: 1,
      name: "Air Jordan 1 Retro High",
      brand: "Nike",
      price: 170,
      originalPrice: 200,
      condition: "New",
      size: "US 9",
      rating: 4.8,
      trending: true,
      image: "/placeholder.svg?height=200&width=200&text=Air+Jordan+1",
    },
    {
      id: 2,
      name: "Yeezy Boost 350 V2",
      brand: "Adidas",
      price: 220,
      originalPrice: 220,
      condition: "Like New",
      size: "US 10",
      rating: 4.9,
      trending: true,
      image: "/placeholder.svg?height=200&width=200&text=Yeezy+350",
    },
    {
      id: 3,
      name: "Dunk Low Panda",
      brand: "Nike",
      price: 110,
      originalPrice: 140,
      condition: "Good",
      size: "US 8.5",
      rating: 4.7,
      trending: false,
      image: "/placeholder.svg?height=200&width=200&text=Dunk+Low",
    },
    {
      id: 4,
      name: "Chuck Taylor All Star",
      brand: "Converse",
      price: 65,
      originalPrice: 80,
      condition: "New",
      size: "US 9.5",
      rating: 4.6,
      trending: false,
      image: "/placeholder.svg?height=200&width=200&text=Chuck+Taylor",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="px-4 py-6">
        <div className="text-center mb-8 float-animation">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-purple-500" />
          </div>
          <h1 className="text-4xl font-bold mb-3">
            Find Your Perfect
            <span className="gradient-text block mt-2">Sneakers</span>
          </h1>
          <p className="text-gray-700 text-lg">
            Buy and sell authentic sneakers with style
          </p>
        </div>

        {/* Mobile Search - Only visible on mobile */}
        <div className="md:hidden mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
            <Input
              placeholder="Search sneakers, brands..."
              className="pl-12 glass-input rounded-2xl border-0 h-12 text-gray-700 placeholder:text-gray-500"
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
      {/* <section className="px-4 py-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Shop by Category
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {categories.map((category) => (
            <Card
              key={category.name}
              className="glass-card border-0 hover:scale-105 transition-all duration-300 cursor-pointer group rounded-3xl overflow-hidden"
            >
              <CardContent className="p-0">
                <div
                  className={`h-28 bg-gradient-to-br ${category.gradient} relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-white/10 group-hover:bg-white/5 transition-colors" />
                  <div className="absolute bottom-4 left-4">
                    <div className="w-8 h-8 bg-white/30 rounded-full backdrop-blur-sm"></div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800">{category.name}</h3>
                  <p className="text-sm text-gray-600">
                    {category.count} items
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section> */}

      {/* Trending Section */}
      <section className="px-4 py-6">
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
      </section>

      {/* Featured Products */}
      <section className="px-4 py-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Featured Listings
        </h2>
        <div className="space-y-4">
          {featuredSneakers.slice(2).map((sneaker) => (
            <Link to="/product/dunk-low-panda" key={sneaker.id}>
              <Card className="glass-card border-0 hover:scale-[1.02] transition-all duration-300 cursor-pointer rounded-3xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="relative w-28 h-28 flex-shrink-0">
                      <img
                        src={sneaker.image || "/placeholder.svg"}
                        alt={sneaker.name}
                        width={112}
                        height={112}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs text-purple-600 font-semibold">
                            {sneaker.brand}
                          </p>
                          <h3 className="font-bold text-gray-800">
                            {sneaker.name}
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
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-gray-700 font-medium">
                          {sneaker.rating}
                        </span>
                        <Badge className="glass-button border-0 text-gray-700 text-xs rounded-xl ml-auto">
                          {sneaker.condition}
                        </Badge>
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
