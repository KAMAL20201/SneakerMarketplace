
import type React from "react";

import { useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SellPage() {
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    brand: "",
    model: "",
    size: "",
    condition: "",
    price: "",
    description: "",
    category: "",
  });

  const handleImageUpload = () => {
    // Simulate image upload
    const newImage = `/placeholder.svg?height=200&width=200&text=Sneaker+${
      images.length + 1
    }`;
    setImages([...images, newImage]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Page Header */}
      <div className="px-4 py-6 bg-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sell Your Sneakers
            </h1>
            <p className="text-gray-600">
              List your sneakers and reach thousands of buyers
            </p>
          </div>
          <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
            Publish Listing
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
        {/* Photo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Photos</CardTitle>
            <p className="text-sm text-gray-500">
              Add up to 8 photos of your sneakers
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {images.map((image, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={image || "/placeholder.svg"}
                    alt={`Sneaker ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border border-gray-200"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="absolute top-1 right-1 h-6 w-6 p-0 bg-white/80 hover:bg-white"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {images.length < 8 && (
                <Button
                  type="button"
                  variant="outline"
                  className="aspect-square border-dashed border-2 border-gray-300 hover:border-black bg-transparent"
                  onClick={handleImageUpload}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Camera className="h-5 w-5 text-gray-400" />
                    <span className="text-xs text-gray-500">Add Photo</span>
                  </div>
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={handleImageUpload}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload from Gallery
            </Button>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Air Jordan 1 Retro High OG"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brand">Brand *</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, brand: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nike">Nike</SelectItem>
                    <SelectItem value="adidas">Adidas</SelectItem>
                    <SelectItem value="jordan">Jordan</SelectItem>
                    <SelectItem value="converse">Converse</SelectItem>
                    <SelectItem value="vans">Vans</SelectItem>
                    <SelectItem value="newbalance">New Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basketball">Basketball</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="skateboarding">Skateboarding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                placeholder="e.g., Dunk Low, Air Force 1"
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Size & Condition */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Size & Condition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="size">Size *</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, size: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us7">US 7</SelectItem>
                    <SelectItem value="us7.5">US 7.5</SelectItem>
                    <SelectItem value="us8">US 8</SelectItem>
                    <SelectItem value="us8.5">US 8.5</SelectItem>
                    <SelectItem value="us9">US 9</SelectItem>
                    <SelectItem value="us9.5">US 9.5</SelectItem>
                    <SelectItem value="us10">US 10</SelectItem>
                    <SelectItem value="us10.5">US 10.5</SelectItem>
                    <SelectItem value="us11">US 11</SelectItem>
                    <SelectItem value="us11.5">US 11.5</SelectItem>
                    <SelectItem value="us12">US 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="condition">Condition *</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, condition: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="like-new">Like New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Condition Guide</Label>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <Badge variant="outline">New</Badge>
                  <span>Never worn, with original box</span>
                </div>
                <div className="flex justify-between">
                  <Badge variant="outline">Like New</Badge>
                  <span>Worn 1-2 times, minimal signs of wear</span>
                </div>
                <div className="flex justify-between">
                  <Badge variant="outline">Good</Badge>
                  <span>Some signs of wear, good overall condition</span>
                </div>
                <div className="flex justify-between">
                  <Badge variant="outline">Fair</Badge>
                  <span>Noticeable wear, still wearable</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Price & Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Price & Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="price">Price (USD) *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="price"
                  type="number"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="pl-8"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                SneakHub takes a 10% commission on successful sales
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the condition, any flaws, or special features..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="mt-1 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            className="w-full bg-black text-white hover:bg-gray-800 h-12"
          >
            List Your Sneakers
          </Button>
          <p className="text-xs text-gray-500 text-center mt-2">
            By listing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </form>

      {/* Bottom spacing */}
      <div className="h-20"></div>
    </div>
  );
}
