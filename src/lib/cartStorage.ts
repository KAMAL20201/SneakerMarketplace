import type { CartItem } from "@/contexts/CartContext";
import { logger } from "@/components/ui/Logger";

export const CART_STORAGE_KEY = "sneakin-market-cart";
const CART_KEY_STORAGE = "sneakin-cart-key";

// Simple encryption helper using Web Crypto API
class CartEncryption {
  private static readonly ALGORITHM = "AES-GCM";
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;

  // Get or create encryption key for this browser session
  private static async getEncryptionKey(): Promise<CryptoKey> {
    try {
      // Try to get existing key from sessionStorage (cleared on browser close)
      let keyData = sessionStorage.getItem(CART_KEY_STORAGE);

      if (!keyData) {
        // Generate new random key
        const key = await window.crypto.subtle.generateKey(
          { name: this.ALGORITHM, length: this.KEY_LENGTH },
          true,
          ["encrypt", "decrypt"]
        );

        // Export and store key
        const exportedKey = await window.crypto.subtle.exportKey("raw", key);
        const keyArray = Array.from(new Uint8Array(exportedKey));
        keyData = btoa(String.fromCharCode(...keyArray));
        sessionStorage.setItem(CART_KEY_STORAGE, keyData);

        return key;
      }

      // Import existing key
      const keyArray = new Uint8Array(
        atob(keyData).split("").map(char => char.charCodeAt(0))
      );

      return await window.crypto.subtle.importKey(
        "raw",
        keyArray,
        { name: this.ALGORITHM, length: this.KEY_LENGTH },
        false,
        ["encrypt", "decrypt"]
      );
    } catch (error) {
      console.error("Failed to get encryption key:", error);
      throw error;
    }
  }

  static async encrypt(data: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const encoder = new TextEncoder();
      const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      const encryptedData = await window.crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv },
        key,
        encoder.encode(data)
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error("Encryption failed:", error);
      throw new Error("Failed to encrypt cart data");
    }
  }

  static async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const decoder = new TextDecoder();

      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split("").map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, this.IV_LENGTH);
      const encrypted = combined.slice(this.IV_LENGTH);

      const decryptedData = await window.crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        encrypted
      );

      return decoder.decode(decryptedData);
    } catch (error) {
      console.error("Decryption failed:", error);
      throw new Error("Failed to decrypt cart data");
    }
  }
}

export const cartStorage = {
  /**
   * Save cart items to localStorage (encrypted)
   */
  save: async (items: CartItem[]): Promise<boolean> => {
    try {
      const serializedItems = JSON.stringify(items);
      const encryptedData = await CartEncryption.encrypt(serializedItems);
      localStorage.setItem(CART_STORAGE_KEY, encryptedData);
      return true;
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
      return false;
    }
  },

  /**
   * Load cart items from localStorage (decrypted)
   */
  load: async (): Promise<CartItem[]> => {
    try {
      const encryptedData = localStorage.getItem(CART_STORAGE_KEY);
      if (!encryptedData) {
        return [];
      }

      const serializedItems = await CartEncryption.decrypt(encryptedData);
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
      // If decryption fails (e.g., old unencrypted data), clear and return empty
      localStorage.removeItem(CART_STORAGE_KEY);
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
