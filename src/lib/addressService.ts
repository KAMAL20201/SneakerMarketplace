import { supabase } from "./supabase";
import type { ShippingAddress } from "../types/shipping";

export interface SupabaseAddress {
  id: string;
  user_id: string;
  type: string;
  label?: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const addressService = {
  async getAddresses(userId: string): Promise<ShippingAddress[]> {
    try {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching addresses:", error);
        throw error;
      }

      return (data || []).map((addr: SupabaseAddress) => ({
        id: addr.id,
        full_name: addr.full_name,
        phone: addr.phone,
        address_line1: addr.address_line_1,
        address_line2: addr.address_line_2,
        city: addr.city,
        state: addr.state,
        pincode: addr.postal_code,
        country: addr.country,
        is_default: addr.is_default,
        created_at: new Date(addr.created_at),
        updated_at: new Date(addr.updated_at),
      }));
    } catch (error) {
      console.error("Error in getAddresses:", error);
      return [];
    }
  },

  async addAddress(
    userId: string,
    address: Omit<ShippingAddress, "id" | "created_at" | "updated_at">
  ): Promise<ShippingAddress | null> {
    try {
      // If this is the first address or explicitly set as default, set is_default to true
      const isFirstAddress = await this.isFirstAddress(userId);
      const isDefault = isFirstAddress || address.is_default;

      // If setting as default, remove default from other addresses
      if (isDefault) {
        await this.removeDefaultFromOtherAddresses(userId);
      }

      const { data, error } = await supabase
        .from("user_addresses")
        .insert({
          user_id: userId,
          type: "other", // Default type
          label: "Shipping Address",
          full_name: address.full_name,
          phone: address.phone,
          address_line_1: address.address_line1,
          address_line_2: address.address_line2,
          city: address.city,
          state: address.state,
          postal_code: address.pincode,
          country: address.country || "India",
          is_default: isDefault,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding address:", error);
        throw error;
      }

      return {
        id: data.id,
        full_name: data.full_name,
        phone: data.phone,
        address_line1: data.address_line_1,
        address_line2: data.address_line_2,
        city: data.city,
        state: data.state,
        pincode: data.postal_code,
        country: data.country,
        is_default: data.is_default,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
      };
    } catch (error) {
      console.error("Error in addAddress:", error);
      return null;
    }
  },

  async updateAddress(
    userId: string,
    addressId: string,
    updates: Partial<Omit<ShippingAddress, "id" | "created_at" | "updated_at">>
  ): Promise<boolean> {
    try {
      const updateData: any = {};

      if (updates.full_name !== undefined)
        updateData.full_name = updates.full_name;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.address_line1 !== undefined)
        updateData.address_line_1 = updates.address_line1;
      if (updates.address_line2 !== undefined)
        updateData.address_line_2 = updates.address_line2;
      if (updates.city !== undefined) updateData.city = updates.city;
      if (updates.state !== undefined) updateData.state = updates.state;
      if (updates.pincode !== undefined)
        updateData.postal_code = updates.pincode;
      if (updates.country !== undefined) updateData.country = updates.country;
      if (updates.is_default !== undefined)
        updateData.is_default = updates.is_default;

      // If setting as default, remove default from other addresses
      if (updates.is_default) {
        await this.removeDefaultFromOtherAddresses(userId);
      }

      const { error } = await supabase
        .from("user_addresses")
        .update(updateData)
        .eq("id", addressId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error updating address:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in updateAddress:", error);
      return false;
    }
  },

  async deleteAddress(userId: string, addressId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_addresses")
        .update({ is_active: false })
        .eq("id", addressId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error deleting address:", error);
        throw error;
      }

      // If deleting default address, set first remaining as default
      const remainingAddresses = await this.getAddresses(userId);
      if (remainingAddresses.length > 0) {
        const firstAddress = remainingAddresses[0];
        await this.updateAddress(userId, firstAddress.id!, {
          is_default: true,
        });
      }

      return true;
    } catch (error) {
      console.error("Error in deleteAddress:", error);
      return false;
    }
  },

  async setDefaultAddress(userId: string, addressId: string): Promise<boolean> {
    try {
      // Remove default from all addresses
      await this.removeDefaultFromOtherAddresses(userId);

      // Set the specified address as default
      const { error } = await supabase
        .from("user_addresses")
        .update({ is_default: true })
        .eq("id", addressId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error setting default address:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in setDefaultAddress:", error);
      return false;
    }
  },

  async getDefaultAddress(userId: string): Promise<ShippingAddress | null> {
    try {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", userId)
        .eq("is_default", true)
        .eq("is_active", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No default address found
          return null;
        }
        console.error("Error fetching default address:", error);
        throw error;
      }

      return {
        id: data.id,
        full_name: data.full_name,
        phone: data.phone,
        address_line1: data.address_line_1,
        address_line2: data.address_line_2,
        city: data.city,
        state: data.state,
        pincode: data.postal_code,
        country: data.country,
        is_default: data.is_default,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
      };
    } catch (error) {
      console.error("Error in getDefaultAddress:", error);
      return null;
    }
  },

  async getAddressById(
    userId: string,
    addressId: string
  ): Promise<ShippingAddress | null> {
    try {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("id", addressId)
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Address not found
          return null;
        }
        console.error("Error fetching address by ID:", error);
        throw error;
      }

      return {
        id: data.id,
        full_name: data.full_name,
        phone: data.phone,
        address_line1: data.address_line_1,
        address_line2: data.address_line_2,
        city: data.city,
        state: data.state,
        pincode: data.postal_code,
        country: data.country,
        is_default: data.is_default,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
      };
    } catch (error) {
      console.error("Error in getAddressById:", error);
      return null;
    }
  },

  async isFirstAddress(userId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from("user_addresses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) {
        console.error("Error checking if first address:", error);
        throw error;
      }

      return count === 0;
    } catch (error) {
      console.error("Error in isFirstAddress:", error);
      return false;
    }
  },

  async removeDefaultFromOtherAddresses(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("user_addresses")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true);

      if (error) {
        console.error("Error removing default from other addresses:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error in removeDefaultFromOtherAddresses:", error);
    }
  },
};
