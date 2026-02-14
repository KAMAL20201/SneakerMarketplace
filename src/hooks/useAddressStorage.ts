// [GUEST CHECKOUT] Original auth-dependent useAddressStorage commented out.
// Now loads addresses from localStorage without requiring user login.

/* Original Supabase/auth-dependent useAddressStorage:
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
        await loadAddresses();
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
        await loadAddresses();
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
        await loadAddresses();
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
        await loadAddresses();
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
*/

// [GUEST CHECKOUT] localStorage-based useAddressStorage — no auth required
import { useState, useEffect } from "react";
import type { ShippingAddress } from "../types/shipping";
import { addressService } from "../lib/addressService";

// Dummy userId passed to addressService for interface compat (not used internally)
const GUEST_USER_ID = "guest";

export const useAddressStorage = () => {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [defaultAddress, setDefaultAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load addresses from localStorage on mount
  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const fetchedAddresses = await addressService.getAddresses(GUEST_USER_ID);
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
    try {
      const newAddress = await addressService.addAddress(GUEST_USER_ID, address);
      if (newAddress) {
        await loadAddresses();
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
    try {
      const success = await addressService.updateAddress(GUEST_USER_ID, id, updates);
      if (success) {
        await loadAddresses();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to update address:", error);
      return false;
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      const success = await addressService.deleteAddress(GUEST_USER_ID, id);
      if (success) {
        await loadAddresses();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to delete address:", error);
      return false;
    }
  };

  const setDefault = async (id: string) => {
    try {
      const success = await addressService.setDefaultAddress(GUEST_USER_ID, id);
      if (success) {
        await loadAddresses();
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
