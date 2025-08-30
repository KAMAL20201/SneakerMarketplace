import { useState, useEffect } from "react";
import type { ShippingAddress } from "../types/shipping";
import { addressService } from "../lib/addressService";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export const useAddressStorage = () => {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [defaultAddress, setDefaultAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load addresses from Supabase on mount or when user changes
  useEffect(() => {
    if (user?.id) {
      loadAddresses();
    } else {
      setAddresses([]);
      setDefaultAddress(null);
      setLoading(false);
    }
  }, [user?.id]);

  const loadAddresses = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const fetchedAddresses = await addressService.getAddresses(user.id);
      setAddresses(fetchedAddresses);

      const defaultAddr =
        fetchedAddresses.find((addr) => addr.is_default)?.id ||
        fetchedAddresses[0]?.id ||
        null;
      setDefaultAddress(defaultAddr);
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  const addAddress = async (
    address: Omit<ShippingAddress, "id" | "created_at" | "updated_at">
  ) => {
    if (!user?.id) {
      toast.error("Please login to add an address");
      return;
    }

    try {
      const newAddress = await addressService.addAddress(user.id, address);
      if (newAddress) {
        await loadAddresses(); // Reload addresses to get the updated list
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to add address:", error);
      return false;
    }
  };

  const updateAddress = async (
    id: string,
    updates: Partial<ShippingAddress>
  ) => {
    if (!user?.id) return;

    try {
      const success = await addressService.updateAddress(user.id, id, updates);
      if (success) {
        await loadAddresses(); // Reload addresses to get the updated list
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to update address:", error);
      return false;
    }
  };

  const deleteAddress = async (id: string) => {
    if (!user?.id) return;

    try {
      const success = await addressService.deleteAddress(user.id, id);
      if (success) {
        await loadAddresses(); // Reload addresses to get the updated list
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to delete address:", error);
      return false;
    }
  };

  const setDefault = async (id: string) => {
    if (!user?.id) return;

    try {
      const success = await addressService.setDefaultAddress(user.id, id);
      if (success) {
        await loadAddresses(); // Reload addresses to get the updated list
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to set default address:", error);
      return false;
    }
  };

  const getDefaultAddress = (): ShippingAddress | null => {
    return addresses.find((addr) => addr.id === defaultAddress) || null;
  };

  const getAddressById = (id: string): ShippingAddress | null => {
    return addresses.find((addr) => addr.id === id) || null;
  };

  return {
    addresses,
    defaultAddress,
    loading,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefault,
    getDefaultAddress,
    getAddressById,
    refreshAddresses: loadAddresses,
  };
};
