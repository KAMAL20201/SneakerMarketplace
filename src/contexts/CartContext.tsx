import { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import { useCartStorage } from "@/hooks/useCartStorage";
import type { CartItem } from "@/lib/orderService";
import { supabase } from "../lib/supabase";
import type { AppliedCoupon } from "@/types/coupon";

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  addToCart: (item: any) => boolean;
  removeItem: (item: any) => void;
  updateQuantity: (id: string, quantity: number) => void;
  toggleCart: () => void;
  clearCart: () => void;
  totalPrice: number;
  pricesUpdated: boolean;
  dismissPriceUpdate: () => void;
  appliedCoupon: AppliedCoupon | null;
  applyDiscount: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
  discountedTotal: number;
}

export const CartContext = createContext<CartContextType>({
  isOpen: false,
  items: [],
  setIsOpen: () => {},
  addToCart: () => false,
  removeItem: () => {},
  updateQuantity: () => {},
  toggleCart: () => {},
  clearCart: () => {},
  totalPrice: 0,
  pricesUpdated: false,
  dismissPriceUpdate: () => {},
  appliedCoupon: null,
  applyDiscount: () => {},
  removeCoupon: () => {},
  discountedTotal: 0,
});

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pricesUpdated, setPricesUpdated] = useState(false);

  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const { debouncedSave, immediateSave, load, clear } = useCartStorage();

  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedItems = load();
    if (savedItems.length > 0) {
      setItems(savedItems);
    }
    setIsLoaded(true);
  }, [load]);

  // Save cart to localStorage whenever items change (after initial load)
  useEffect(() => {
    if (isLoaded) {
      debouncedSave(items);
    }
  }, [items, isLoaded, debouncedSave]);

  // Cleanup: save immediately on unmount to ensure no data loss
  useEffect(() => {
    return () => {
      if (isLoaded && items.length > 0) {
        immediateSave(items);
      }
    };
  }, [items, isLoaded, immediateSave]);

  // Cleanup: remove cart-open class when component unmounts
  useEffect(() => {
    return () => {
      document.body.classList.remove("cart-open");
    };
  }, []);

  // Re-fetch prices from the DB so stale localStorage prices are corrected
  // after the daily price update script runs.
  const refreshPrices = useCallback(async (currentItems: CartItem[]) => {
    if (currentItems.length === 0) return;

    try {
      const variantItems = currentItems.filter((i) => i.variantId);
      const legacyItems = currentItems.filter((i) => !i.variantId);

      // key → fresh price
      const priceMap = new Map<string, number>();

      if (variantItems.length > 0) {
        const variantIds = [...new Set(variantItems.map((i) => i.variantId!))];
        const { data } = await supabase
          .from("product_variant_sizes")
          .select("variant_id, size_value, price")
          .in("variant_id", variantIds);

        data?.forEach((row) => {
          priceMap.set(`v:${row.variant_id}:${row.size_value}`, row.price);
        });
      }

      if (legacyItems.length > 0) {
        const listingIds = [...new Set(legacyItems.map((i) => i.productId))];
        const { data } = await supabase
          .from("product_listing_sizes")
          .select("listing_id, size_value, price")
          .in("listing_id", listingIds);

        data?.forEach((row) => {
          priceMap.set(`l:${row.listing_id}:${row.size_value}`, row.price);
        });
      }

      let anyChanged = false;
      const updatedItems = currentItems.map((item) => {
        const key = item.variantId
          ? `v:${item.variantId}:${item.size}`
          : `l:${item.productId}:${item.size}`;
        const freshPrice = priceMap.get(key);
        if (freshPrice !== undefined && freshPrice !== item.price) {
          anyChanged = true;
          return { ...item, price: freshPrice };
        }
        return item;
      });

      if (anyChanged) {
        setItems(updatedItems);
        setPricesUpdated(true);
      }
    } catch (err) {
      console.error("Failed to refresh cart prices:", err);
    }
  }, []);

  // Refresh prices once on page load, after cart is restored from localStorage
  useEffect(() => {
    if (isLoaded) {
      refreshPrices(items);
    }
    // intentionally only runs once after initial load, not on every items update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  const addToCart = (item: any) => {
    // Check if item already exists in cart (by productId, sellerId, and size)
    const existingItem = items.find(
      (cartItem) =>
        cartItem.productId === item.productId &&
        cartItem.sellerId === item.sellerId &&
        cartItem.size === item.size &&
        (cartItem.variantId ?? null) === (item.variantId ?? null)
    );

    if (existingItem) {
      // Item already in cart, don't add again
      return false;
    }

    setItems([...items, item]);
    return true;
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
    } else {
      setItems(
        items.map((item) => (item.id === id ? { ...item, quantity } : item))
      );
    }
  };

  const toggleCart = () => {
    setIsOpen((prev) => {
      const newIsOpen = !prev;
      if (newIsOpen) {
        document.body.classList.add("cart-open");
      } else {
        document.body.classList.remove("cart-open");
      }
      return newIsOpen;
    });
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    // Immediately clear from localStorage
    clear();
  };

  const applyDiscount = useCallback((coupon: AppliedCoupon) => {
    setAppliedCoupon(coupon);
  }, []);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  // Invalidate the applied coupon whenever cart items change (discount may no longer be valid)
  useEffect(() => {
    if (isLoaded) {
      setAppliedCoupon(null);
    }
    // intentionally only reacts to item changes, not coupon changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const dismissPriceUpdate = useCallback(() => setPricesUpdated(false), []);

  const totalPrice = useMemo(() => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [items]);

  const discountedTotal = useMemo(() => {
    if (!appliedCoupon) return totalPrice;
    return Math.max(totalPrice - appliedCoupon.discountAmount, 0);
  }, [totalPrice, appliedCoupon]);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        setIsOpen,
        addToCart,
        removeItem,
        updateQuantity,
        toggleCart,
        clearCart,
        totalPrice,
        pricesUpdated,
        dismissPriceUpdate,
        appliedCoupon,
        applyDiscount,
        removeCoupon,
        discountedTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  return useContext(CartContext);
};
