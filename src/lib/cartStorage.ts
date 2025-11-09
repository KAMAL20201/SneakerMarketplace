import { logger } from "@/components/ui/Logger";
import type { CartItem } from "./orderService";

export const CART_STORAGE_KEY = "sneakin-market-cart";

export const cartStorage = {
  /**
   * Save cart items to localStorage
   */
  save: (items: CartItem[]): boolean => {
    try {
      const serializedItems = JSON.stringify(items);
      localStorage.setItem(CART_STORAGE_KEY, serializedItems);
      return true;
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
      return false;
    }
  },

  /**
   * Load cart items from localStorage
   */
  load: (): CartItem[] => {
    try {
      const serializedItems = localStorage.getItem(CART_STORAGE_KEY);
      if (!serializedItems) {
        return [];
      }

      const items = JSON.parse(serializedItems);

      // Validate the structure of loaded items
      if (!Array.isArray(items)) {
        logger.warn("Invalid cart data structure in localStorage");
        return [];
      }

      // Basic validation for each cart item
      const validItems = items.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.productId === "string" &&
          typeof item.price === "number" &&
          typeof item.quantity === "number" &&
          item.quantity > 0
      );

      return validItems;
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
      return [];
    }
  },

  /**
   * Clear cart from localStorage
   */
  clear: (): boolean => {
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("Failed to clear cart from localStorage:", error);
      return false;
    }
  },

  /**
   * Check if localStorage is available
   */
  isAvailable: (): boolean => {
    try {
      const testKey = "__localStorage_test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },
};
