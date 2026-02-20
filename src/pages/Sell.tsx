import type React from "react";

import { useRef, useState,  useContext } from "react";
import {
  Camera,
  Upload,
  X,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Package,
  // Check,
  Eye,
  // CreditCard,
  // Smartphone,
  // AlertTriangle,
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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import { categories } from "@/constants/sellConstants";
import { smartCompressImages } from "@/lib/imageCompression";
import { ProductImage } from "@/components/ui/OptimizedImage";
// import { PaymentMethodsService } from "@/lib/paymentMethodsService";
// import type { PaymentMethod } from "@/lib/encryptionService";
import {
  ROUTE_NAMES,
  PRODUCT_CONDITIONS,
  DELIVERY_TIMELINES,
  LISTING_STATUS,
} from "@/constants/enums";
import { SellerFormContext } from "@/contexts/SellerFormContext";

export default function SellPage() {
  const [isLoading, setIsLoading] = useState(false);
  // const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  // const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [showOtherBrandInput, setShowOtherBrandInput] = useState(false);
  const [otherBrandName, setOtherBrandName] = useState("");
  const [multiSizeMode, setMultiSizeMode] = useState(false);

  const { user, setOperationAfterLogin } = useAuth();
  const {
    formData,
    setFormData,
    clearFormData,
    images,
    files,
    currentStep,
    setCurrentStep,
    setImages,
    setFiles,
  } = useContext(SellerFormContext);

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to scroll to top - using a more reliable method
  const scrollToTop = () => {
    // Try multiple methods for better compatibility
    try {
      // Method 1: Smooth scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      try {
        // Method 2: Instant scroll to top
        window.scrollTo(0, 0);
      } catch {
        // Method 3: Use document element
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    }
  };

  const steps = [
    { id: 1, title: "Category", description: "What are you selling?" },
    { id: 2, title: "Photos", description: "Add photos of your item" },
    { id: 3, title: "Basic Info", description: "Tell us about your item" },
    { id: 4, title: "Details", description: "Item details and condition" },
    { id: 5, title: "Price", description: "Set your price and description" },
    {
      id: 6,
      title: "Shipping",
      description: "Shipping charges and delivery time",
    },
    // Payment step removed — admin-only listing doesn't need payment method
    // { id: 7, title: "Payment", description: "Choose payment method" },
    { id: 7, title: "Review", description: "Review and submit for approval" },
  ];

  const selectedCategory = categories.find(
    (cat) => cat.id === formData.category
  );

  // Payment method fetch — commented out (admin-only listing, no payment method needed)
  /* useEffect(() => {
    const fetchPaymentMethods = async () => {
      if (user) {
        try {
          setLoadingPaymentMethods(true);
          const methods = await PaymentMethodsService.getPaymentMethods(user.id);
          setPaymentMethods(methods);
          if (methods.length > 0 && !formData.paymentMethodId) {
            const defaultMethod = methods.find((m) => m.is_default) || methods[0];
            setFormData((prev) => ({ ...prev, paymentMethodId: defaultMethod.id }));
          }
        } catch (error) {
          console.error("Error fetching payment methods:", error);
          toast.error("Failed to load payment methods");
        } finally {
          setLoadingPaymentMethods(false);
        }
      }
    };
    fetchPaymentMethods();
  }, [user]); */

  // ── Multi-size helpers ───────────────────────────────────────────────────
  const handleMultiSizeModeToggle = (enabled: boolean) => {
    setMultiSizeMode(enabled);
    if (enabled) {
      // Switch to multi: clear single size selection
      setFormData((prev) => ({ ...prev, size: "" }));
    } else {
      // Switch to single: clear multi-size entries
      setFormData((prev) => ({ ...prev, sizes: [] }));
    }
  };

  const toggleSizeEntry = (sizeValue: string) => {
    setFormData((prev) => {
      const prevSizes = prev.sizes ?? [];
      const exists = prevSizes.find((e) => e.size_value === sizeValue);
      return {
        ...prev,
        sizes: exists
          ? prevSizes.filter((e) => e.size_value !== sizeValue)
          : [...prevSizes, { size_value: sizeValue, price: "" }],
      };
    });
  };

  const updateSizePrice = (sizeValue: string, price: string) => {
    setFormData((prev) => ({
      ...prev,
      sizes: (prev.sizes ?? []).map((e) =>
        e.size_value === sizeValue ? { ...e, price } : e
      ),
    }));
  };
  // ─────────────────────────────────────────────────────────────────────────

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return true; // Category is always selected by default
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
          (selectedCategory?.hasSize
            ? multiSizeMode
              ? (formData.sizes ?? []).length > 0 &&
                (formData.sizes ?? []).every(
                  (e) => e.price !== "" && parseFloat(e.price) > 0
                )
              : formData.size !== ""
            : true)
        );
      case 5:
        return formData.price !== "";
      case 6:
        if (formData.deliveryDays === DELIVERY_TIMELINES.CUSTOM) {
          return (
            formData.shippingCharges !== "" &&
            formData.customDeliveryDays !== ""
          );
        }
        return formData.shippingCharges !== "" && formData.deliveryDays !== "";
      case 7:
        return true; // Review step - no validation needed
      // case 8: payment method step removed — admin-only listing
      // case 8: return formData.paymentMethodId !== "";
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

        toast.success(`${filesArray.length} photo(s) added! `);
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
      scrollToTop();
    } else {
      toast.error("Please complete all required fields before continuing");
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    scrollToTop();
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
      const { error: uploadError } = await supabase.storage
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
    } catch (error: unknown) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const ensureSellerProfile = async (user: {
    id: string;
    user_metadata?: { full_name?: string; name?: string; avatar_url?: string };
    email?: string;
  }) => {
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
          email: user.email,
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
      // Set operation to redirect back to sell page after login
      setOperationAfterLogin(() => () => {
        navigate(ROUTE_NAMES.SELL);
      });

      toast.error("Please sign in to list your items");
      navigate(ROUTE_NAMES.LOGIN);
      return;
    }

    // Payment method checks — commented out (admin-only listing)
    /* if (paymentMethods.length === 0) {
      toast.error("Please add a payment method before listing items");
      navigate(ROUTE_NAMES.PAYMENT_METHODS);
      return;
    }
    if (!formData.paymentMethodId) {
      toast.error("Please select a payment method");
      return;
    } */

    setIsLoading(true);

    try {
      // Ensure seller profile exists
      const sellerResult = await ensureSellerProfile(user);
      if (!sellerResult.success) {
        toast.error("Failed to create seller profile. Please try again.");
        return;
      }
      const isMultiSize = (formData.sizes ?? []).length > 0;
      const listingPrice = isMultiSize
        ? Math.min(...(formData.sizes ?? []).map((e) => parseFloat(e.price)))
        : parseFloat(formData.price);

      const { data: listing, error: listingError } = await supabase
        .from("product_listings")
        .insert({
          user_id: user.id,
          title: formData.title,
          category: formData.category,
          brand: formData.brand,
          model: formData.model,
          // Multi-size: size_value is null (sizes live in product_listing_sizes)
          size_value: isMultiSize ? null : formData.size,
          condition: formData.condition,
          price: listingPrice,
          retail_price:
            formData.retailPrice && parseFloat(formData.retailPrice) > 0
              ? parseFloat(formData.retailPrice)
              : null,
          description: formData.description,
          status: LISTING_STATUS.UNDER_REVIEW,
          // payment_method_id: formData.paymentMethodId, // commented out — admin listing
          shipping_charges: parseFloat(formData.shippingCharges) || 0,
          delivery_days:
            formData.deliveryDays === DELIVERY_TIMELINES.CUSTOM
              ? formData.customDeliveryDays
              : formData.deliveryDays,
        })
        .select()
        .single();

      if (listingError) throw listingError;

      // Insert per-size prices for multi-size listings
      if (isMultiSize) {
        const sizeRows = (formData.sizes ?? []).map((e) => ({
          listing_id: listing.id,
          size_value: e.size_value,
          price: parseFloat(e.price),
        }));
        const { error: sizesError } = await supabase
          .from("product_listing_sizes")
          .insert(sizeRows);
        if (sizesError) throw sizesError;
      }

      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          await uploadImage(files[i], user.id, listing.id, i === 0);
        }
      }

      // Clear any saved form data after successful submission
      clearFormData();

      toast.success(
        "Listing submitted for review! You'll be notified once it's approved."
      );
      navigate(ROUTE_NAMES.MY_LISTINGS);
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
      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* Mobile Stepper */}
        <Card className="glass-card border-0 rounded-3xl shadow-lg mb-6 ">
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
                style={{
                  width: `${(currentStep / steps.length) * 100}%`,
                }}
              />
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
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          category: category.id,
                        }));
                        setShowOtherBrandInput(false);
                        setOtherBrandName("");
                      }}
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
                      <ProductImage
                        src={image || "/placeholder.svg"}
                        alt={`Item ${index + 1}`}
                        className="w-full h-full rounded-2xl border border-white/30 shadow-lg"
                      />
                      {index === 0 && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-lg font-semibold z-10">
                          Main
                        </div>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 h-6 w-6 md:h-8 md:w-8 p-0 glass-button border-0 rounded-2xl opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
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
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
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
                      <div className="flex items-center gap-2">
                        <Select
                          onValueChange={(value) => {
                            if (value === "other") {
                              setShowOtherBrandInput(true);
                              setFormData({ ...formData, brand: "" });
                            } else {
                              setShowOtherBrandInput(false);
                              setOtherBrandName("");
                              setFormData({ ...formData, brand: value });
                            }
                          }}
                        >
                          <SelectTrigger className="glass-input rounded-2xl border-0 !h-12 md:h-14 text-gray-700">
                            <SelectValue
                              placeholder="Select brand"
                              className="capitalize"
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-50">
                            {selectedCategory.brands.map((brand) => (
                              <SelectItem
                                key={brand}
                                value={brand.toLowerCase()}
                                className="capitalize"
                              >
                                {brand}
                              </SelectItem>
                            ))}
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>

                        {showOtherBrandInput && (
                          <Input
                            placeholder="Enter brand name"
                            value={otherBrandName}
                            onChange={(e) => {
                              setOtherBrandName(e.target.value);
                              setFormData({
                                ...formData,
                                brand: e.target.value,
                              });
                            }}
                            className="glass-input rounded-2xl border-0 h-12 md:h-14 text-gray-700 placeholder:text-gray-500 text-base md:text-lg"
                          />
                        )}
                      </div>
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
                {selectedCategory?.hasSize && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-gray-800 font-semibold text-base md:text-lg">
                        Size *
                      </Label>
                      {/* Single / Multiple toggle */}
                      <div className="flex items-center bg-gray-100 rounded-xl p-1 text-xs font-semibold gap-1">
                        <button
                          type="button"
                          onClick={() => handleMultiSizeModeToggle(false)}
                          className={`px-3 py-1.5 rounded-lg transition-all ${
                            !multiSizeMode
                              ? "bg-white text-purple-700 shadow"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          Single
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMultiSizeModeToggle(true)}
                          className={`px-3 py-1.5 rounded-lg transition-all ${
                            multiSizeMode
                              ? "bg-white text-purple-700 shadow"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          Multiple
                        </button>
                      </div>
                    </div>

                    {!multiSizeMode ? (
                      // ── Single-size dropdown ──
                      <Select
                        value={formData.size}
                        onValueChange={(value) =>
                          setFormData({ ...formData, size: value })
                        }
                      >
                        <SelectTrigger className="glass-input rounded-2xl border-0 h-12 md:h-14 text-gray-700">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-50">
                          {selectedCategory.sizes.map((size) => (
                            <SelectItem
                              key={size}
                              value={size.toLowerCase()}
                              className="uppercase"
                            >
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      // ── Multi-size grid ──
                      <div>
                        <p className="text-xs text-gray-500 mb-3">
                          Select all available sizes and set a price for each
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {selectedCategory.sizes.map((sz) => {
                            const entry = (formData.sizes ?? []).find(
                              (e) => e.size_value === sz.toLowerCase()
                            );
                            const isSelected = !!entry;
                            return (
                              <div key={sz} className="flex flex-col gap-1">
                                <Button
                                  type="button"
                                  onClick={() =>
                                    toggleSizeEntry(sz.toLowerCase())
                                  }
                                  className={`rounded-2xl border-0 h-10 text-xs font-semibold uppercase transition-all ${
                                    isSelected
                                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                                      : "glass-button text-gray-700 hover:bg-white/30"
                                  }`}
                                >
                                  {sz}
                                </Button>
                                {isSelected && (
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-semibold pointer-events-none">
                                      ₹
                                    </span>
                                    <Input
                                      type="number"
                                      placeholder="Price"
                                      min={1}
                                      value={entry.price}
                                      onChange={(e) =>
                                        updateSizePrice(
                                          sz.toLowerCase(),
                                          e.target.value
                                        )
                                      }
                                      className="pl-6 h-8 text-xs rounded-xl glass-input border-0 text-gray-700"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {(formData.sizes ?? []).length > 0 && (
                          <p className="text-xs text-purple-600 mt-2 font-medium">
                            {(formData.sizes ?? []).length} size
                            {(formData.sizes ?? []).length > 1 ? "s" : ""} selected
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <Label className="text-gray-800 font-semibold text-base md:text-lg">
                    Condition
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 md:gap-4">
                    <div
                      className={` border !border-gray-100 cursor-pointer rounded-2xl p-3 md:p-4 hover:bg-white/20 transition-all ${
                        formData.condition === PRODUCT_CONDITIONS.NEW
                          ? "bg-gradient-to-r from-green-500 to-emerald-500"
                          : "bg-white"
                      }`}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          condition: PRODUCT_CONDITIONS.NEW,
                        })
                      }
                    >
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 rounded-xl mb-2">
                        New
                      </Badge>
                      <p
                        className={`text-xs md:text-sm ${
                          formData.condition === PRODUCT_CONDITIONS.NEW
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
                        Never used, with original packaging
                      </p>
                    </div>
                    <div
                      className={` border !border-gray-100 cursor-pointer rounded-2xl p-3 md:p-4 hover:bg-white/20 transition-all ${
                        formData.condition === PRODUCT_CONDITIONS.LIKE_NEW
                          ? "bg-gradient-to-r from-blue-500 to-purple-500"
                          : "bg-white"
                      }`}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          condition: PRODUCT_CONDITIONS.LIKE_NEW,
                        })
                      }
                    >
                      <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 rounded-xl mb-2">
                        Like New
                      </Badge>
                      <p
                        className={`text-xs md:text-sm ${
                          formData.condition === PRODUCT_CONDITIONS.LIKE_NEW
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
                        Used 1-2 times, minimal signs of wear
                      </p>
                    </div>
                    <div
                      className={` border !border-gray-100 cursor-pointer rounded-2xl p-3 md:p-4 hover:bg-white/20 transition-all ${
                        formData.condition === PRODUCT_CONDITIONS.GOOD
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                          : "bg-white"
                      }`}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          condition: PRODUCT_CONDITIONS.GOOD,
                        })
                      }
                    >
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 rounded-xl mb-2">
                        Good
                      </Badge>
                      <p
                        className={`text-xs md:text-sm ${
                          formData.condition === PRODUCT_CONDITIONS.GOOD
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
                        Some wear, still in good condition
                      </p>
                    </div>
                    <div
                      className={` border !border-gray-100 cursor-pointer rounded-2xl p-3 md:p-4 hover:bg-white/20 transition-all ${
                        formData.condition === PRODUCT_CONDITIONS.FAIR
                          ? "bg-gradient-to-r from-orange-500 to-red-500"
                          : "bg-white"
                      }`}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          condition: PRODUCT_CONDITIONS.FAIR,
                        })
                      }
                    >
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 rounded-xl mb-2">
                        Fair
                      </Badge>
                      <p
                        className={`text-xs md:text-sm ${
                          formData.condition === PRODUCT_CONDITIONS.FAIR
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
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
                  {/* Selling price + Retail/MRP price side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="price"
                        className="text-gray-800 font-semibold text-base md:text-lg mb-3 block"
                      >
                        Selling Price (INR) *
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
                        htmlFor="retailPrice"
                        className="text-gray-800 font-semibold text-base md:text-lg mb-3 block"
                      >
                        Retail / MRP Price (INR){" "}
                        <span className="text-xs font-normal text-gray-400">
                          (optional)
                        </span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-4 md:left-6 top-1/2 transform -translate-y-1/2 text-gray-600 text-lg md:text-xl font-bold">
                          ₹
                        </span>
                        <Input
                          id="retailPrice"
                          type="number"
                          placeholder="0.00"
                          value={formData.retailPrice}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              retailPrice: e.target.value,
                            })
                          }
                          className="pl-8 md:pl-12 glass-input rounded-2xl border-0 h-14 md:h-16 text-gray-700 placeholder:text-gray-500 text-lg md:text-xl font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live % off preview */}
                  {formData.price &&
                    formData.retailPrice &&
                    parseFloat(formData.retailPrice) >
                      parseFloat(formData.price) && (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-sm text-gray-500">Discount:</span>
                        <span className="text-sm font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 px-2 py-0.5 rounded-lg">
                          {Math.round(
                            ((parseFloat(formData.retailPrice) -
                              parseFloat(formData.price)) /
                              parseFloat(formData.retailPrice)) *
                              100
                          )}
                          % off
                        </span>
                        <span className="text-xs text-gray-400">
                          will show on product page
                        </span>
                      </div>
                    )}

                  {/* Charges Calculator */}
                  {formData.price && parseFloat(formData.price) > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Payment Breakdown
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Listed Price:</span>
                          <span className="font-medium">
                            ₹{parseFloat(formData.price).toFixed(2)}
                          </span>
                        </div>
                        {/* Payment Gateway + Platform charges — commented out for now
                        <div className="flex justify-between items-center text-red-600">
                          <span>Payment Gateway Charges (2%):</span>
                          <span>
                            -₹{(parseFloat(formData.price) * 0.02).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-red-600">
                          <span>Platform Charges (0.5%):</span>
                          <span>
                            -₹{(parseFloat(formData.price) * 0.005).toFixed(2)}
                          </span>
                        </div>
                        */}
                        <div className="border-t border-gray-300 pt-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-800">
                              You'll Receive:
                            </span>
                            <span className="font-bold text-lg text-green-600">
                              ₹{parseFloat(formData.price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Charges note — commented out for now
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700">
                          💡 Total charges: 2.5% (₹
                          {(parseFloat(formData.price) * 0.025).toFixed(2)}) -
                          Only on item price, not shipping
                        </p>
                      </div>
                      */}
                    </div>
                  )}
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

          {/* Step 6: Shipping */}
          {currentStep === 6 && (
            <Card className="glass-card border-0 rounded-3xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl">
                    <Package className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  Shipping & Delivery
                </CardTitle>
                <p className="text-sm md:text-base text-gray-600">
                  Set shipping charges and delivery timeline
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label
                    htmlFor="shippingCharges"
                    className="text-gray-800 font-semibold text-base md:text-lg mb-3 block"
                  >
                    Shipping Charges (INR) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 md:left-6 top-1/2 transform -translate-y-1/2 text-gray-600 text-lg md:text-xl font-bold">
                      ₹
                    </span>
                    <Input
                      id="shippingCharges"
                      type="number"
                      placeholder="0.00"
                      value={formData.shippingCharges}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          shippingCharges: e.target.value,
                        })
                      }
                      className="pl-8 md:pl-12 glass-input rounded-2xl border-0 h-12 md:h-14 text-gray-700 placeholder:text-gray-500 text-base md:text-lg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Set to 0 if you want to offer free shipping
                  </p>
                </div>

                <div>
                  <Label className="text-gray-800 font-semibold text-base md:text-lg mb-3 block">
                    Delivery Timeline *
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        value: DELIVERY_TIMELINES.THREE_TO_FIVE,
                        label: "3-5 Days",
                        color: "from-green-500 to-emerald-500",
                      },
                      {
                        value: DELIVERY_TIMELINES.SEVEN_TO_TEN,
                        label: "7-10 Days",
                        color: "from-blue-500 to-purple-500",
                      },
                      {
                        value: DELIVERY_TIMELINES.TWELVE_TO_FIFTEEN,
                        label: "12-15 Days",
                        color: "from-yellow-500 to-orange-500",
                      },
                      {
                        value: DELIVERY_TIMELINES.EIGHTEEN_TO_TWENTY_ONE,
                        label: "18-21 Days",
                        color: "from-gray-500 to-slate-500",
                      },
                    ].map((option) => (
                      <div
                        key={option.value}
                        className={`border-2 cursor-pointer rounded-2xl p-4 hover:scale-105 transition-all ${
                          formData.deliveryDays === option.value
                            ? `bg-gradient-to-r ${option.color} text-white border-0`
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            deliveryDays: option.value,
                          })
                        }
                      >
                        <div className="text-center">
                          <span
                            className={`text-sm font-semibold ${
                              formData.deliveryDays === option.value
                                ? "text-white"
                                : "text-gray-700"
                            }`}
                          >
                            {option.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {formData.deliveryDays === DELIVERY_TIMELINES.CUSTOM && (
                    <div className="mt-4">
                      <Label
                        htmlFor="customDeliveryDays"
                        className="text-gray-800 font-semibold text-base md:text-lg mb-3 block"
                      >
                        Custom Delivery Time
                      </Label>
                      <Input
                        id="customDeliveryDays"
                        placeholder="e.g., 2-3 weeks, 1-2 months"
                        value={formData.customDeliveryDays}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customDeliveryDays: e.target.value,
                          })
                        }
                        className="glass-input rounded-2xl border-0 h-12 md:h-14 text-gray-700 placeholder:text-gray-500 text-base md:text-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Total Price Preview */}
                {formData.price && formData.shippingCharges && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Total Price Preview
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Item Price:</span>
                        <span className="font-medium">
                          ₹{parseFloat(formData.price).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Shipping:</span>
                        <span className="font-medium">
                          ₹{parseFloat(formData.shippingCharges).toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-blue-300 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-800">
                            Total for Buyer:
                          </span>
                          <span className="font-bold text-lg text-blue-600">
                            ₹
                            {(
                              parseFloat(formData.price) +
                              parseFloat(formData.shippingCharges)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-700">
                          💡 Note: Platform charges (2.5%) are only applied to
                          the item price, not shipping charges
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 7: Review */}
          {currentStep === 7 && (
            <Card className="glass-card border-0 rounded-3xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl">
                    <Eye className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  Review Your Listing
                </CardTitle>
                <p className="text-sm md:text-base text-gray-600 mb-3">
                  Review all details before submitting for approval
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5"></div>
                    <div>
                      <p className="text-yellow-800 text-sm font-medium mb-1">
                        Review Process
                      </p>
                      <p className="text-yellow-700 text-xs">
                        Your listing will be reviewed by our team within 24
                        hours to ensure quality and accurate description. You'll
                        be notified once it's approved and live.
                      </p>
                    </div>
                  </div>
                </div>
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
                        <ProductImage
                          key={index}
                          src={image || "/placeholder.svg"}
                          alt={`Preview ${index + 1}`}
                          className="w-full aspect-square rounded-xl"
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
                        {(formData.sizes ?? []).length > 0 ? (
                          <div>
                            <strong>Sizes & Prices:</strong>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(formData.sizes ?? []).map((e) => (
                                <span
                                  key={e.size_value}
                                  className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg uppercase font-medium"
                                >
                                  {e.size_value} — ₹
                                  {parseFloat(e.price).toLocaleString("en-IN")}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : formData.size ? (
                          <p>
                            <strong>Size:</strong> {formData.size}
                          </p>
                        ) : null}
                        {formData.condition && (
                          <p>
                            <strong>Condition:</strong> {formData.condition}
                          </p>
                        )}

                        <p>
                          <strong>Price:</strong> ₹{formData.price || "0.00"}
                        </p>
                        {formData.retailPrice &&
                          parseFloat(formData.retailPrice) > 0 && (
                            <p className="flex items-center gap-2 flex-wrap">
                              <strong>Retail / MRP:</strong>{" "}
                              <span className="line-through text-gray-400">
                                ₹
                                {parseFloat(
                                  formData.retailPrice
                                ).toLocaleString("en-IN")}
                              </span>
                              {parseFloat(formData.retailPrice) >
                                parseFloat(formData.price) && (
                                <span className="text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 px-1.5 py-0.5 rounded-md">
                                  {Math.round(
                                    ((parseFloat(formData.retailPrice) -
                                      parseFloat(formData.price)) /
                                      parseFloat(formData.retailPrice)) *
                                      100
                                  )}
                                  % off
                                </span>
                              )}
                            </p>
                          )}
                        {/* Charges breakdown — commented out for now
                        {formData.price && parseFloat(formData.price) > 0 && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="text-xs space-y-1">
                              <div className="flex justify-between">
                                <span>Payment Gateway (2%):</span>
                                <span className="text-red-600">
                                  -₹{(parseFloat(formData.price) * 0.02).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Platform (0.5%):</span>
                                <span className="text-red-600">
                                  -₹{(parseFloat(formData.price) * 0.005).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between font-semibold border-t border-gray-300 pt-1">
                                <span>You'll Receive:</span>
                                <span className="text-green-600">
                                  ₹{(parseFloat(formData.price) * 0.975).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        */}

                        {/* Shipping Information */}
                        {formData.shippingCharges && (
                          <p>
                            <strong>Shipping Charges:</strong> ₹{" "}
                            {formData.shippingCharges}
                          </p>
                        )}
                        {formData.deliveryDays && (
                          <p>
                            <strong>Delivery Time:</strong>{" "}
                            {formData.deliveryDays ===
                            DELIVERY_TIMELINES.THREE_TO_FIVE
                              ? "3-5 Days"
                              : formData.deliveryDays ===
                                DELIVERY_TIMELINES.SEVEN_TO_TEN
                              ? "7-10 Days"
                              : formData.deliveryDays ===
                                DELIVERY_TIMELINES.TWELVE_TO_FIFTEEN
                              ? "12-15 Days"
                              : formData.deliveryDays ===
                                DELIVERY_TIMELINES.EIGHTEEN_TO_TWENTY_ONE
                              ? "18-21 Days"
                              : formData.deliveryDays === "3-weeks"
                              ? "3 Weeks"
                              : formData.deliveryDays === "1-month"
                              ? "1 Month"
                              : formData.deliveryDays ===
                                DELIVERY_TIMELINES.CUSTOM
                              ? formData.customDeliveryDays || "Custom"
                              : formData.deliveryDays}
                          </p>
                        )}

                        {/* Total Price for Buyer */}
                        {formData.price && formData.shippingCharges && (
                          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-xs space-y-1">
                              <div className="flex justify-between">
                                <span>Item Price:</span>
                                <span>
                                  ₹{parseFloat(formData.price).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Shipping:</span>
                                <span>
                                  ₹
                                  {parseFloat(formData.shippingCharges).toFixed(
                                    2
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between font-semibold border-t border-blue-300 pt-1">
                                <span>Total for Buyer:</span>
                                <span className="text-blue-600 font-bold">
                                  ₹
                                  {(
                                    parseFloat(formData.price) +
                                    parseFloat(formData.shippingCharges)
                                  ).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
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

          {/* Step 8: Payment Method — commented out (admin-only listing, no payment method needed) */}
          {/* {currentStep === 8 && (
            <Card className="glass-card border-0 rounded-3xl shadow-lg">
              ...payment method selection UI...
            </Card>
          )} */}

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
                    <span className="hidden sm:inline">
                      Submitting for Review...
                    </span>
                    <span className="sm:hidden">Submitting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="hidden sm:inline">Submit for Review</span>
                    <span className="sm:hidden">Submit</span>
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
