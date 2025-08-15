import { useCallback, useRef } from "react";
import { cartStorage } from "@/lib/cartStorage";
import type { CartItem } from "@/contexts/CartContext";

/**
 * Custom hook for debounced cart localStorage operations
 * Prevents excessive writes when items are rapidly updated
 */
export const useCartStorage = (debounceMs: number = 500) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback(
    (items: CartItem[]) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        if (cartStorage.isAvailable()) {
          cartStorage.save(items);
        }
      }, debounceMs);
    },
    [debounceMs]
  );

  const immediateSave = useCallback((items: CartItem[]) => {
    // Clear any pending debounced save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (cartStorage.isAvailable()) {
      cartStorage.save(items);
    }
  }, []);

  const load = useCallback(() => {
    if (cartStorage.isAvailable()) {
      return cartStorage.load();
    }
    return [];
  }, []);

  const clear = useCallback(() => {
    // Clear any pending save operations
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (cartStorage.isAvailable()) {
      return cartStorage.clear();
    }
    return false;
  }, []);

  return {
    debouncedSave,
    immediateSave,
    load,
    clear,
  };
};
