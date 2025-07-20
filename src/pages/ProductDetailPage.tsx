"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Heart,
  Share,
  Star,
  ShoppingCart,
  MessageCircle,
  Shield,
  Truck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ProductDetailPage() {
  const [selectedSize, setSelectedSize] = useState("US 9");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const { addToCart } = useCart();

  const product = {
    id: "dunk-low-panda",
    name: "Nike Dunk Low Panda",
    brand: "Nike",
    model: "Dunk Low",
    colorway: "White/Black",
    releaseDate: "2021",
    retailPrice: 100,
    rating: 4.8,
    reviews: 1247,
    description:
      "The Nike Dunk Low 'Panda' features a classic two-tone color scheme. A white leather base is contrasted by black overlays on the forefoot, heel, and collar. Perforations on the toe box provide breathability, while a black Swoosh delivers the finishing touch.",
    images: [
      "/placeholder.svg?height=400&width=400&text=Dunk+Low+Panda+1",
      "/placeholder.svg?height=400&width=400&text=Dunk+Low+Panda+2",
      "/placeholder.svg?height=400&width=400&text=Dunk+Low+Panda+3",
      "/placeholder.svg?height=400&width=400&text=Dunk+Low+Panda+4",
      "/placeholder.svg?height=400&width=400&text=Dunk+Low+Panda+5",
    ],
  };

  const sizes = [
    "US 7",
    "US 7.5",
    "US 8",
    "US 8.5",
    "US 9",
    "US 9.5",
    "US 10",
    "US 10.5",
    "US 11",
    "US 11.5",
    "US 12",
  ];

  const sellers = [
    {
      id: 1,
      name: "SneakerPro",
      rating: 4.9,
      reviews: 1234,
      verified: true,
      price: 110,
      condition: "New",
      location: "New York, NY",
      shipping: "Free",
      avatar: "/placeholder.svg?height=40&width=40&text=SP",
      responseTime: "Usually responds within 1 hour",
      sizes: ["US 8.5", "US 9", "US 9.5", "US 10"],
    },
    {
      id: 2,
      name: "DunkMaster",
      rating: 4.7,
      reviews: 892,
      verified: true,
      price: 105,
      condition: "Like New",
      location: "Los Angeles, CA",
      shipping: "$10",
      avatar: "/placeholder.svg?height=40&width=40&text=DM",
      responseTime: "Usually responds within 2 hours",
      sizes: ["US 9", "US 10", "US 11"],
    },
    {
      id: 3,
      name: "KickCollector",
      rating: 4.8,
      reviews: 567,
      verified: false,
      price: 115,
      condition: "New",
      location: "Chicago, IL",
      shipping: "Free",
      avatar: "/placeholder.svg?height=40&width=40&text=KC",
      responseTime: "Usually responds within 3 hours",
      sizes: ["US 8", "US 9", "US 10.5"],
    },
    {
      id: 4,
      name: "UrbanSole",
      rating: 4.6,
      reviews: 445,
      verified: true,
      price: 120,
      condition: "New",
      location: "Miami, FL",
      shipping: "Free",
      avatar: "/placeholder.svg?height=40&width=40&text=US",
      responseTime: "Usually responds within 4 hours",
      sizes: ["US 9", "US 9.5", "US 11", "US 12"],
    },
  ];

  const filteredSellers = sellers
    .filter((seller) => seller.sizes.includes(selectedSize))
    .sort((a, b) => a.price - b.price);

  const handleAddToCart = (seller: (typeof sellers)[0]) => {
    const cartItem = {
      id: `${product.id}-${selectedSize}-${seller.id}`,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      size: selectedSize,
      condition: seller.condition,
      price: seller.price,
      image: product.images[0],
      sellerId: seller.id.toString(),
      sellerName: seller.name,
    };

    addToCart(cartItem);
    toast.success(`Added ${product.name} (${selectedSize}) to cart!`);
  };

  const handleContactSeller = (seller: (typeof sellers)[0]) => {
    console.log(`Contact seller: ${seller.name}`);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-16 z-40 glass-navbar">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 glass-button rounded-2xl border-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-bold text-gray-800">{product.name}</h1>
                <p className="text-sm text-gray-600">
                  {product.brand} • {product.colorway}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLiked(!isLiked)}
                className={`p-2 glass-button rounded-2xl border-0 ${
                  isLiked ? "text-red-500" : "text-gray-600"
                }`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 glass-button rounded-2xl border-0"
              >
                <Share className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="px-4 py-6">
        <div className="mb-4">
          <div className="relative aspect-square glass-card rounded-3xl overflow-hidden shadow-2xl">
            <img
              src={product.images[selectedImageIndex] || "/placeholder.svg"}
              alt={`${product.name} - Image ${selectedImageIndex + 1}`}
              className="object-cover"
            />
          </div>
        </div>

        {/* Image Thumbnails */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {product.images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={`relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-300 ${
                selectedImageIndex === index
                  ? "ring-3 ring-purple-500 scale-105"
                  : "glass-button border-0 hover:scale-105"
              }`}
            >
              <img
                src={image || "/placeholder.svg"}
                alt={`${product.name} thumbnail ${index + 1}`}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Product Info */}
      <div className="px-4 pb-6">
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  {product.name}
                </h2>
                <p className="text-gray-600 text-lg">
                  {product.brand} • {product.model}
                </p>
                <p className="text-sm text-gray-500">
                  Released {product.releaseDate} • Retail ${product.retailPrice}
                </p>
              </div>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 rounded-xl px-4 py-2">
                ✓ Authentic
              </Badge>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-lg">{product.rating}</span>
              </div>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{product.reviews} reviews</span>
            </div>

            <p className="text-gray-700 leading-relaxed">
              {product.description}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Size Selection */}
      <div className="px-4 pb-6">
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              Select Size
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {sizes.map((size) => {
                const isAvailable = sellers.some((seller) =>
                  seller.sizes.includes(size)
                );
                const isSelected = selectedSize === size;

                return (
                  <Button
                    key={size}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    disabled={!isAvailable}
                    onClick={() => setSelectedSize(size)}
                    className={`h-14 rounded-2xl border-0 font-semibold ${
                      isSelected
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                        : isAvailable
                        ? "glass-button text-gray-700 hover:bg-white/30"
                        : "opacity-50 cursor-not-allowed glass-button"
                    }`}
                  >
                    {size}
                  </Button>
                );
              })}
            </div>
            <p className="text-gray-600 mt-3">
              {filteredSellers.length} seller
              {filteredSellers.length !== 1 ? "s" : ""} available for{" "}
              {selectedSize}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sellers List */}
      <div className="px-4 pb-8">
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-6 text-gray-800">
              Available from {filteredSellers.length} sellers
            </h3>

            {filteredSellers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-2 text-lg">
                  No sellers available for {selectedSize}
                </p>
                <p className="text-gray-500">Try selecting a different size</p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredSellers.map((seller, index) => (
                  <div key={seller.id}>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage
                          src={seller.avatar || "/placeholder.svg"}
                          alt={seller.name}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl text-lg">
                          {seller.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-gray-800 text-lg">
                            {seller.name}
                          </h4>
                          {seller.verified && (
                            <Badge className="glass-button border-0 text-green-700 rounded-xl px-3">
                              <Shield className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">
                              {seller.rating}
                            </span>
                          </div>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600">
                            {seller.reviews} reviews
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mb-3 text-gray-600">
                          <div className="flex items-center gap-1">
                            <Truck className="h-4 w-4" />
                            <span>
                              {seller.shipping === "Free"
                                ? "Free shipping"
                                : `$${seller.shipping} shipping`}
                            </span>
                          </div>
                          <span>•</span>
                          <span>{seller.location}</span>
                        </div>

                        <p className="text-sm text-gray-500 mb-4">
                          {seller.responseTime}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <span className="text-2xl font-bold text-gray-800">
                                ${seller.price}
                              </span>
                              <Badge className="ml-3 glass-button border-0 text-gray-700 rounded-xl">
                                {seller.condition}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleContactSeller(seller)}
                              className="glass-button border-0 rounded-2xl text-gray-700 hover:bg-white/30"
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Message
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAddToCart(seller)}
                              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl shadow-lg"
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Add to Cart
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {index < filteredSellers.length - 1 && (
                      <Separator className="mt-6 bg-white/30" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Info Tabs */}
      <div className="px-4 pb-8">
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className="p-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3 glass-button border-0 rounded-2xl p-1">
                <TabsTrigger
                  value="details"
                  className="rounded-xl data-[state=active]:bg-white/30"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-xl data-[state=active]:bg-white/30"
                >
                  Reviews
                </TabsTrigger>
                <TabsTrigger
                  value="shipping"
                  className="rounded-xl data-[state=active]:bg-white/30"
                >
                  Shipping
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Brand</span>
                    <span className="font-semibold text-gray-800">
                      {product.brand}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Model</span>
                    <span className="font-semibold text-gray-800">
                      {product.model}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Colorway</span>
                    <span className="font-semibold text-gray-800">
                      {product.colorway}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Release Date</span>
                    <span className="font-semibold text-gray-800">
                      {product.releaseDate}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Retail Price</span>
                    <span className="font-semibold text-gray-800">
                      ${product.retailPrice}
                    </span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-2 text-lg">
                    Reviews coming soon
                  </p>
                  <p className="text-gray-500">
                    See what other buyers are saying
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="shipping" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 glass-button rounded-2xl border-0">
                      <Truck className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Fast & Secure Shipping
                      </p>
                      <p className="text-gray-600">
                        All items are shipped with tracking and insurance
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 glass-button rounded-2xl border-0">
                      <Shield className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Authenticity Guaranteed
                      </p>
                      <p className="text-gray-600">
                        Every item is verified by our authentication team
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Bottom spacing */}
      <div className="h-8"></div>
    </div>
  );
}
