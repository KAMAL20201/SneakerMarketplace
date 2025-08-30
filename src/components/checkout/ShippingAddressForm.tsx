import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { shippingAddressSchema } from "../../lib/validations/shipping";
import type { ShippingAddress } from "../../lib/validations/shipping";
import type { PincodeData } from "../../types/shipping";
import { PincodeInput } from "../ui/PincodeInput";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface ShippingAddressFormProps {
  onSubmit: (data: ShippingAddress) => void;
  initialData?: Partial<ShippingAddress>;
  isEdit?: boolean;
}

export const ShippingAddressForm: React.FC<ShippingAddressFormProps> = ({
  onSubmit,
  initialData,
  isEdit = false,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ShippingAddress>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: {
      country: "India",
      ...initialData,
    },
    mode: "onChange", // Enable real-time validation
  });

  const watchedPincode = watch("pincode");
  const watchedState = watch("state");

  // Indian states for dropdown
  const indianStates = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chandigarh",
    "Chhattisgarh",
    "Delhi",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
  ];

  const handlePincodeFound = (data: PincodeData) => {
    setValue("city", data.city);
    setValue("state", data.state);
    // Trigger validation for the updated fields
    trigger(["city", "state"]);
  };
  const onFormSubmit = (data: ShippingAddress) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Name and Phone */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="full_name"
            {...register("full_name")}
            placeholder="Enter your full name"
            className={errors.full_name ? "border-red-500" : ""}
          />
          {errors.full_name && (
            <p className="text-sm text-red-500">{errors.full_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            {...register("phone")}
            placeholder="Enter 10-digit phone number"
            className={errors.phone ? "border-red-500" : ""}
            maxLength={10}
          />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone.message}</p>
          )}
        </div>
      </div>

      {/* Address Line 1 */}
      <div className="space-y-2">
        <Label htmlFor="address_line1">
          Address Line 1 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="address_line1"
          {...register("address_line1")}
          placeholder="House/Flat number, Street name"
          className={errors.address_line1 ? "border-red-500" : ""}
        />
        {errors.address_line1 && (
          <p className="text-sm text-red-500">{errors.address_line1.message}</p>
        )}
      </div>

      {/* Address Line 2 (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
        <Input
          id="address_line2"
          {...register("address_line2")}
          placeholder="Apartment, suite, etc."
          className={errors.address_line2 ? "border-red-500" : ""}
        />
        {errors.address_line2 && (
          <p className="text-sm text-red-500">{errors.address_line2.message}</p>
        )}
      </div>

      {/* Pincode, City, State */}
      <div className="grid grid-cols-2 gap-4">
        <PincodeInput
          value={watchedPincode || ""}
          onChange={(value) => setValue("pincode", value)}
          onPincodeFound={handlePincodeFound}
          error={errors.pincode?.message}
          required
        />

        <div className="space-y-2">
          <Label htmlFor="city">
            City <span className="text-red-500">*</span>
          </Label>
          <Input
            id="city"
            {...register("city")}
            placeholder="City name"
            className={errors.city ? "border-red-500" : ""}
          />
          {errors.city && (
            <p className="text-sm text-red-500">{errors.city.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">
            State <span className="text-red-500">*</span>
          </Label>
          <Select
            value={watchedState}
            onValueChange={(value) => setValue("state", value)}
          >
            <SelectTrigger className={errors.state ? "border-red-500" : ""}>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {indianStates.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.state && (
            <p className="text-sm text-red-500">{errors.state.message}</p>
          )}
        </div>
      </div>

      {/* Landmark (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="landmark">Landmark (Optional)</Label>
        <Input
          id="landmark"
          {...register("landmark")}
          placeholder="Near hospital, school, etc."
          className={errors.landmark ? "border-red-500" : ""}
        />
        {errors.landmark && (
          <p className="text-sm text-red-500">{errors.landmark.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!isValid || isSubmitting}
        className="w-full md:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl px-8 py-3 text-lg font-semibold shadow-lg"
      >
        {isSubmitting
          ? "Saving..."
          : isEdit
          ? "Update Address"
          : "Save Address"}
      </Button>
    </form>
  );
};
