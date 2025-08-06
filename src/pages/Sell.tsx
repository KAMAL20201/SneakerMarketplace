import type React from "react";

import { useRef, useState } from "react";
import {
  Camera,
  Upload,
  X,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Package,
  Check,
  Eye,
} from "lucide-react";
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
import { Link } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import { categories } from "@/constants/sellConstants";
import { smartCompressImages } from "@/lib/imageCompression";

export default function SellPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conditions = ["New", "Like New", "Good", "Fair", "Poor"];

  const steps = [
    { id: 1, title: "Category", description: "What are you selling?" },
    { id: 2, title: "Photos", description: "Add photos of your item" },
    { id: 3, title: "Basic Info", description: "Tell us about your item" },
    { id: 4, title: "Details", description: "Item details and condition" },
    { id: 5, title: "Price", description: "Set your price and description" },
    { id: 6, title: "Review", description: "Review and publish" },
  ];

  const selectedCategory = categories.find(
    (cat) => cat.id === formData.category
  );

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.category !== "";
      case 2:
        return images.length > 0;
      case 3:
        return (
          formData.title !== "" &&
          (selectedCategory?.hasBrand ? formData.brand !== "" : true)
        );
      case 4:
        return (
          formData.condition !== "" &&
          (selectedCategory?.hasSize ? formData.size !== "" : true)
        );
      case 5:
        return formData.price !== "";
      default:
        return true;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files;
    if (newFiles) {
      // Early return if already at maximum
      if (images.length >= 8) {
        toast.error(
          "Maximum 8 images allowed. Please remove some images first."
        );
        return;
      }

      try {
        setIsLoading(true);

        // Convert FileList to Array
        const filesArray = Array.from(newFiles);

        // Check if adding new images would exceed the limit of 8
        const totalImages = images.length + filesArray.length;
        if (totalImages > 8) {
          const allowedCount = 8 - images.length;
          toast.error(
            `You can only add ${allowedCount} more image(s). Maximum 8 images allowed.`
          );
          return;
        }

        // Compress images using smart compression
        const compressionResults = await smartCompressImages(filesArray);

        // Create preview URLs for compressed images
        const newImages = compressionResults.map((result) =>
          URL.createObjectURL(result.compressedFile)
        );

        // Update state with compressed files
        setImages([...images, ...newImages]);
        setFiles([
          ...files,
          ...compressionResults.map((result) => result.compressedFile),
        ]);

        toast.success(
          `${filesArray.length} photo(s) added! `
        );
      } catch (error) {
        console.error("Image compression failed:", error);
        toast.error("Failed to compress images. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    toast.success("Photo removed");
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    } else {
      toast.error("Please complete all required fields before continuing");
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const uploadImage = async (
    file: File,
    userId: string,
    listingId: string,
    isMainImage = false
  ) => {
    try {
      // Generate file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${
        isMainImage ? "main" : "other"
      }.${fileExt}`;
      const filePath = `${userId}/${listingId}/${fileName}`;

      // Upload to storage
      const { data: _data, error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(filePath);

      // Save to database
      const { data: imageData, error: dbError } = await supabase
        .from("product_images")
        .insert({
          product_id: listingId,
          image_url: publicUrl,
          storage_path: filePath,
          is_poster_image: isMainImage,
          file_size: file.size,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return { success: true, data: imageData, url: publicUrl };
    } catch (error: any) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const ensureSellerProfile = async (user: any) => {
    try {
      // Check if seller profile exists
      const { data: existingSeller, error: checkError } = await supabase
        .from("sellers")
        .select("id")
        .eq("id", user.id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      // If doesn't exist, create it
      if (!existingSeller) {
        const { error: insertError } = await supabase.from("sellers").insert({
          id: user.id,
          display_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Anonymous Seller",
          profile_image_url: user.user_metadata?.avatar_url,
          // Add more fields as needed
        });

        if (insertError) throw insertError;
      }

      return { success: true };
    } catch (error) {
      console.error("Error ensuring seller profile:", error);
      return { success: false, error };
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to list your items");
      navigate("/login");
      return;
    }

    setIsLoading(true);

    try {
      // Ensure seller profile exists
      const sellerResult = await ensureSellerProfile(user);
      if (!sellerResult.success) {
        toast.error("Failed to create seller profile. Please try again.");
        return;
      }
      const { data: listing, error: listingError } = await supabase
        .from("product_listings")
        .insert({
          user_id: user.id,
          title: formData.title,
          category: formData.category,
          brand: formData.brand,
          model: formData.model,
          size_value: formData.size,
          condition: formData.condition,
          price: parseFloat(formData.price),
          description: formData.description,
          status: "active",
        })
        .select()
        .single();

      if (listingError) throw listingError;

      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          await uploadImage(files[i], user.id, listing.id, i === 0);
        }
      }
      toast.success("Listing created successfully");
      navigate("/my-listings");
      return { success: true, listing };
    } catch (error) {
      console.error("Error creating listing:", error);
      toast.error("Failed to create listing. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-16 z-40 glass-navbar">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                    Sell Your Items
                  </h1>
                </div>
                <p className="text-sm md:text-base text-gray-600">
                  Step {currentStep} of {steps.length}:{" "}
                  {steps[currentStep - 1].description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* Mobile Stepper */}
        <Card className="glass-card border-0 rounded-3xl shadow-lg mb-6 md:hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">
                Step {currentStep} of {steps.length}
              </div>
              <div className="text-sm font-semibold text-purple-600">
                {Math.round((currentStep / steps.length) * 100)}% Complete
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-gray-800">
                {steps[currentStep - 1].title}
              </h3>
              <p className="text-sm text-gray-600">
                {steps[currentStep - 1].description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Stepper */}
        <Card className="glass-card border-0 rounded-3xl shadow-lg mb-6 hidden md:block">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                        currentStep > step.id
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                          : currentStep === step.id
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {currentStep > step.id ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p
                        className={`text-sm font-semibold ${
                          currentStep >= step.id
                            ? "text-gray-800"
                            : "text-gray-500"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500 hidden lg:block">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-8 lg:w-12 h-0.5 mx-2 lg:mx-4 transition-all duration-300 ${
                        currentStep > step.id ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="space-y-6">
          {/* Step 1: Category Selection */}
          {currentStep === 1 && (
            <Card className="glass-card border-0 rounded-3xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl">
                    <Package className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  What are you selling?
                </CardTitle>
                <p className="text-sm md:text-base text-gray-600">
                  Choose the category that best describes your item
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      type="button"
                      variant={
                        formData.category === category.id
                          ? "default"
                          : "outline"
                      }
                      onClick={() =>
                        setFormData({ ...formData, category: category.id })
                      }
                      className={`h-20 md:h-24 rounded-2xl border-0 font-semibold flex flex-col gap-2 md:gap-3 transition-all duration-300 ${
                        formData.category === category.id
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105"
                          : "glass-button text-gray-700 hover:bg-white/30 bg-transparent hover:scale-105"
                      }`}
                    >
                      <category.icon className="h-6 w-6 md:h-8 md:w-8" />
                      <span className="text-xs md:text-sm text-center leading-tight">
                        {category.name}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Photos */}
          {currentStep === 2 && (
            <Card className="glass-card border-0 rounded-3xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl">
                    <Camera className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  Add Photos
                </CardTitle>
                <p className="text-sm md:text-base text-gray-600">
                  Add up to 8 high-quality photos of your item. <br />
                  <b>The first photo will be your main image</b> that will be
                  displayed on listing page.
                </p>
              </CardHeader>
              <CardContent>
                <div
                  className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-6 ${
                    images.length === 0 ? "!grid-cols-1" : ""
                  }`}
                >
                  {images.map((image, index) => (
                    <div key={index} className="relative aspect-square group">
                      <img
                        src={image || "/placeholder.svg"}
                        alt={`Item ${index + 1}`}
                        className="w-full h-full object-cover rounded-2xl border border-white/30 shadow-lg"
                      />
                      {index === 0 && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-lg font-semibold">
                          Main
                        </div>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 h-6 w-6 md:h-8 md:w-8 p-0 glass-button border-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <input
                    type="file"
                    hidden
                    onChange={handleImageUpload}
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    disabled={images.length >= 8}
                  />
                  {images.length === 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-max glass-button border-2 border-dashed border-white/40 hover:border-purple-400 bg-transparent rounded-2xl hover:bg-white/20 transition-all duration-300"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 md:p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl">
                          <Camera className="h-4 w-4 md:h-6 md:w-6 text-white" />
                        </div>
                        <span className="text-xs md:text-sm text-gray-700 font-semibold">
                          Add Photo
                        </span>
                      </div>
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full glass-button border-0 rounded-2xl bg-transparent hover:bg-white/20 text-gray-700"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length === 8}
                >
                  <Upload className="h-5 w-5 mr-3" />
                  {images.length === 8
                    ? "Maximum 8 photos reached"
                    : `Upload from Gallery`}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Basic Information */}
          {currentStep === 3 && (
            <Card className="glass-card border-0 rounded-3xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl">
                    <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  Basic Information
                </CardTitle>
                <p className="text-sm md:text-base text-gray-600">
                  Tell us about your{" "}
                  {selectedCategory?.name.toLowerCase() || "item"}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label
                    htmlFor="title"
                    className="text-gray-800 font-semibold text-base md:text-lg mb-3 block"
                  >
                    Title *
                  </Label>
                  <Input
                    id="title"
                    placeholder={
                      selectedCategory
                        ? `e.g., ${
                            selectedCategory.id === "sneakers"
                              ? "Air Jordan 1 Retro High OG"
                              : selectedCategory.id === "clothing"
                              ? "Supreme Box Logo Hoodie"
                              : selectedCategory.id === "electronics"
                              ? "iPhone 15 Pro Max"
                              : "Vintage Item"
                          }`
                        : "e.g., Item name and description"
                    }
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="glass-input rounded-2xl border-0 h-12 md:h-14 text-gray-700 placeholder:text-gray-500 text-base md:text-lg"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedCategory?.hasBrand && (
                    <div>
                      <Label
                        htmlFor="brand"
                        className="text-gray-800 font-semibold text-base md:text-lg mb-3 block"
                      >
                        Brand *
                      </Label>
                      <Select
                        onValueChange={(value) =>
                          setFormData({ ...formData, brand: value })
                        }
                      >
                        <SelectTrigger className="glass-input rounded-2xl border-0 h-12 md:h-14 text-gray-700">
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-50">
                          {selectedCategory.brands.map((brand) => (
                            <SelectItem key={brand} value={brand.toLowerCase()}>
                              {brand}
                            </SelectItem>
                          ))}
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label
                      htmlFor="category"
                      className="text-gray-800 font-semibold text-base md:text-lg mb-3 block"
                    >
                      Category
                    </Label>
                    <div className="glass-input rounded-2xl border-0 h-12 md:h-14 flex items-center px-4 text-gray-700">
                      {selectedCategory ? (
                        <div className="flex items-center gap-2">
                          <selectedCategory.icon className="h-5 w-5 text-purple-500" />
                          <span className="text-sm md:text-base">
                            {selectedCategory.name}
                          </span>
                        </div>
                      ) : (
                        "No category selected"
                      )}
                    </div>
                  </div>
                </div>

                {selectedCategory?.hasModel && (
                  <div>
                    <Label
                      htmlFor="model"
                      className="text-gray-800 font-semibold text-base md:text-lg mb-3 block"
                    >
                      Model/Style
                    </Label>
                    <Input
                      id="model"
                      placeholder={
                        selectedCategory.id === "sneakers"
                          ? "e.g., Dunk Low, Air Force 1"
                          : selectedCategory.id === "electronics"
                          ? "e.g., Pro Max, Galaxy S24"
                          : "e.g., Model or style name"
                      }
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                      className="glass-input rounded-2xl border-0 h-12 md:h-14 text-gray-700 placeholder:text-gray-500 text-base md:text-lg"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Details & Condition */}
          {currentStep === 4 && (
            <Card className="glass-card border-0 rounded-3xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl">
                    <Badge className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  Details & Condition
                </CardTitle>
                <p className="text-sm md:text-base text-gray-600">
                  Provide specific details about your item
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-6">
                  {selectedCategory?.hasSize && (
                    <div>
                      <Label
                        htmlFor="size"
                        className="text-gray-800 font-semibold text-base md:text-lg mb-3 block"
                      >
                        Size *
                      </Label>
                      <Select
                        onValueChange={(value) =>
                          setFormData({ ...formData, size: value })
                        }
                      >
                        <SelectTrigger className="glass-input rounded-2xl border-0 h-12 md:h-14 text-gray-700">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-50">
                          {selectedCategory.sizes.map((size) => (
                            <SelectItem key={size} value={size.toLowerCase()}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label
                      htmlFor="condition"
                      className="text-gray-800 font-semibold text-base md:text-lg mb-3 block"
                    >
                      Condition *
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setFormData({ ...formData, condition: value })
                      }
                    >
                      <SelectTrigger className="glass-input rounded-2xl border-0 h-12 md:h-14 text-gray-700">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-50">
                        {conditions.map((condition) => (
                          <SelectItem
                            key={condition}
                            value={condition.toLowerCase()}
                          >
                            {condition}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-gray-800 font-semibold text-base md:text-lg">
                    Condition Guide
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="glass-button border-0 rounded-2xl p-3 md:p-4 hover:bg-white/20 transition-all">
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 rounded-xl mb-2">
                        New
                      </Badge>
                      <p className="text-xs md:text-sm text-gray-700">
                        Never used, with original packaging
                      </p>
                    </div>
                    <div className="glass-button border-0 rounded-2xl p-3 md:p-4 hover:bg-white/20 transition-all">
                      <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 rounded-xl mb-2">
                        Like New
                      </Badge>
                      <p className="text-xs md:text-sm text-gray-700">
                        Used 1-2 times, minimal signs of wear
                      </p>
                    </div>
                    <div className="glass-button border-0 rounded-2xl p-3 md:p-4 hover:bg-white/20 transition-all">
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 rounded-xl mb-2">
                        Good
                      </Badge>
                      <p className="text-xs md:text-sm text-gray-700">
                        Some wear, still in good condition
                      </p>
                    </div>
                    <div className="glass-button border-0 rounded-2xl p-3 md:p-4 hover:bg-white/20 transition-all">
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 rounded-xl mb-2">
                        Fair
                      </Badge>
                      <p className="text-xs md:text-sm text-gray-700">
                        Noticeable wear, still functional
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Price & Description */}
          {currentStep === 5 && (
            <Card className="glass-card border-0 rounded-3xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl">
                    <span className="text-white font-bold text-base md:text-lg">
                      $
                    </span>
                  </div>
                  Price & Description
                </CardTitle>
                <p className="text-sm md:text-base text-gray-600">
                  Set your price and add a detailed description
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label
                    htmlFor="price"
                    className="text-gray-800 font-semibold text-base md:text-lg mb-3 block"
                  >
                    Price (INR) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 md:left-6 top-1/2 transform -translate-y-1/2 text-gray-600 text-lg md:text-xl font-bold">
                      ₹
                    </span>
                    <Input
                      id="price"
                      type="number"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className="pl-8 md:pl-12 glass-input rounded-2xl border-0 h-14 md:h-16 text-gray-700 placeholder:text-gray-500 text-lg md:text-xl font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="description"
                    className="text-gray-800 font-semibold text-base md:text-lg mb-3 block"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the condition, any flaws, or special features..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="glass-input rounded-2xl border-0 min-h-[100px] md:min-h-[120px] text-gray-700 placeholder:text-gray-500 text-base md:text-lg resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Review */}
          {currentStep === 6 && (
            <Card className="glass-card border-0 rounded-3xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl">
                    <Eye className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  Review Your Listing
                </CardTitle>
                <p className="text-sm md:text-base text-gray-600">
                  Review all details before publishing your listing
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3">
                      Photos
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {images.slice(0, 6).map((image, index) => (
                        <img
                          key={index}
                          src={image || "/placeholder.svg"}
                          alt={`Preview ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-xl"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base md:text-lg font-semibold text-gray-800">
                        Item Details
                      </h3>
                      <div className="mt-2 space-y-2 text-sm md:text-base">
                        <p>
                          <strong>Title:</strong>{" "}
                          {formData.title || "Not specified"}
                        </p>
                        <p>
                          <strong>Category:</strong>{" "}
                          {selectedCategory?.name || "Not selected"}
                        </p>
                        {formData.brand && (
                          <p>
                            <strong>Brand:</strong> {formData.brand}
                          </p>
                        )}
                        {formData.model && (
                          <p>
                            <strong>Model:</strong> {formData.model}
                          </p>
                        )}
                        {formData.size && (
                          <p>
                            <strong>Size:</strong> {formData.size}
                          </p>
                        )}
                        {formData.condition && (
                          <p>
                            <strong>Condition:</strong> {formData.condition}
                          </p>
                        )}

                        <p>
                          <strong>Price:</strong> ₹ {formData.price || "0.00"}
                        </p>
                      </div>
                    </div>
                    {formData.description && (
                      <div>
                        <h3 className="text-base md:text-lg font-semibold text-gray-800">
                          Description
                        </h3>
                        <p className="mt-2 text-gray-600 text-sm md:text-base">
                          {formData.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="glass-button border-0 rounded-2xl px-4 md:px-6 py-2 md:py-3 text-gray-700 hover:bg-white/30 bg-transparent disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Back</span>
            </Button>

            {currentStep < steps.length ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl px-4 md:px-6 py-2 md:py-3 disabled:opacity-50"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 rounded-2xl px-6 md:px-8 py-2 md:py-3 text-base md:text-lg font-bold shadow-2xl"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-white"></div>
                    <span className="hidden sm:inline">Publishing...</span>
                    <span className="sm:hidden">Publishing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="hidden sm:inline">Publish Listing</span>
                    <span className="sm:hidden">Publish</span>
                  </div>
                )}
              </Button>
            )}
          </div>

          <p className="text-gray-600 text-center mt-4 font-medium text-xs md:text-sm">
            🔒 By listing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Bottom spacing */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}
