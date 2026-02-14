// [GUEST CHECKOUT] Original Supabase-based address service commented out.
// Addresses now stored in localStorage for guest checkout.
// No user auth required.

/* Original Supabase address service:
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
      const isFirstAddress = await this.isFirstAddress(userId);
      const isDefault = isFirstAddress || address.is_default;

      if (isDefault) {
        await this.removeDefaultFromOtherAddresses(userId);
      }

      const { data, error } = await supabase
        .from("user_addresses")
        .insert({
          user_id: userId,
          type: "other",
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
      await this.removeDefaultFromOtherAddresses(userId);

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
*/

// [GUEST CHECKOUT] localStorage-based address service
// Same interface as the original so all consumers (useAddressStorage, ShippingStep, etc.) work unchanged.
import type { ShippingAddress } from "../types/shipping";

const STORAGE_KEY = "guest_shipping_addresses";

function generateId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `addr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadFromStorage(): ShippingAddress[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return (parsed as ShippingAddress[]).map((addr) => ({
      ...addr,
      created_at: addr.created_at ? new Date(addr.created_at) : undefined,
      updated_at: addr.updated_at ? new Date(addr.updated_at) : undefined,
    }));
  } catch {
    return [];
  }
}

function saveToStorage(addresses: ShippingAddress[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
}

// userId parameters kept for interface compatibility but not used
export const addressService = {
  async getAddresses(_userId?: string): Promise<ShippingAddress[]> {
    const addresses = loadFromStorage();
    return addresses.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  },

  async addAddress(
    _userId: string,
    address: Omit<ShippingAddress, "id" | "created_at" | "updated_at">
  ): Promise<ShippingAddress | null> {
    try {
      const addresses = loadFromStorage();
      const isFirst = addresses.length === 0;
      const isDefault = isFirst || address.is_default;

      if (isDefault) {
        addresses.forEach((a) => (a.is_default = false));
      }

      const now = new Date();
      const newAddress: ShippingAddress = {
        ...address,
        id: generateId(),
        is_default: isDefault,
        country: address.country || "India",
        created_at: now,
        updated_at: now,
      };

      addresses.push(newAddress);
      saveToStorage(addresses);
      return newAddress;
    } catch (error) {
      console.error("Error in addAddress:", error);
      return null;
    }
  },

  async updateAddress(
    _userId: string,
    addressId: string,
    updates: Partial<Omit<ShippingAddress, "id" | "created_at" | "updated_at">>
  ): Promise<boolean> {
    try {
      const addresses = loadFromStorage();
      const index = addresses.findIndex((a) => a.id === addressId);
      if (index === -1) return false;

      if (updates.is_default) {
        addresses.forEach((a) => (a.is_default = false));
      }

      addresses[index] = {
        ...addresses[index],
        ...updates,
        updated_at: new Date(),
      };

      saveToStorage(addresses);
      return true;
    } catch (error) {
      console.error("Error in updateAddress:", error);
      return false;
    }
  },

  async deleteAddress(_userId: string, addressId: string): Promise<boolean> {
    try {
      let addresses = loadFromStorage();
      const deletedAddr = addresses.find((a) => a.id === addressId);
      addresses = addresses.filter((a) => a.id !== addressId);

      if (deletedAddr?.is_default && addresses.length > 0) {
        addresses[0].is_default = true;
      }

      saveToStorage(addresses);
      return true;
    } catch (error) {
      console.error("Error in deleteAddress:", error);
      return false;
    }
  },

  async setDefaultAddress(
    _userId: string,
    addressId: string
  ): Promise<boolean> {
    try {
      const addresses = loadFromStorage();
      addresses.forEach((a) => {
        a.is_default = a.id === addressId;
      });
      saveToStorage(addresses);
      return true;
    } catch (error) {
      console.error("Error in setDefaultAddress:", error);
      return false;
    }
  },

  async getDefaultAddress(
    _userId?: string
  ): Promise<ShippingAddress | null> {
    const addresses = loadFromStorage();
    return addresses.find((a) => a.is_default) || addresses[0] || null;
  },

  async getAddressById(
    _userId: string,
    addressId: string
  ): Promise<ShippingAddress | null> {
    const addresses = loadFromStorage();
    return addresses.find((a) => a.id === addressId) || null;
  },

  async isFirstAddress(_userId?: string): Promise<boolean> {
    const addresses = loadFromStorage();
    return addresses.length === 0;
  },

  async removeDefaultFromOtherAddresses(_userId?: string): Promise<void> {
    const addresses = loadFromStorage();
    addresses.forEach((a) => (a.is_default = false));
    saveToStorage(addresses);
  },
};
