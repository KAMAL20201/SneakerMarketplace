import { z } from "zod";

// Indian pincode validation schema
export const pincodeSchema = z.object({
  pincode: z
    .string()
    .min(6, "Pincode must be 6 digits")
    .max(6, "Pincode must be 6 digits")
    .regex(/^[1-9][0-9]{5}$/, "Invalid pincode format")
    .refine((val) => {
      // Additional validation: first digit should not be 0
      return val.charAt(0) !== "0";
    }, "Pincode cannot start with 0"),
});

// Complete shipping address schema
export const shippingAddressSchema = z.object({
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),

  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian phone number")
    .min(10, "Phone number must be 10 digits")
    .max(10, "Phone number must be 10 digits"),

  pincode: z
    .string()
    .min(6, "Pincode must be 6 digits")
    .max(6, "Pincode must be 6 digits")
    .regex(/^[1-9][0-9]{5}$/, "Invalid pincode format"),

  address_line1: z
    .string()
    .min(10, "Address must be at least 10 characters")
    .max(100, "Address cannot exceed 100 characters"),

  address_line2: z
    .string()
    .max(100, "Address cannot exceed 100 characters")
    .optional(),

  city: z
    .string()
    .min(2, "City name is required")
    .max(30, "City name cannot exceed 30 characters"),

  state: z
    .string()
    .min(2, "State is required")
    .max(30, "State name cannot exceed 30 characters"),

  landmark: z
    .string()
    .max(50, "Landmark cannot exceed 50 characters")
    .optional(),

  country: z.string().default("India").optional(),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
