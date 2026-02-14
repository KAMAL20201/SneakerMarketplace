const WISHLIST_STORAGE_KEY = "plug-market-wishlist";

export interface WishlistItem {
  id: string;
  title: string;
  brand: string;
  price: number;
  image_url: string;
  condition: string;
  size_value: string;
}

export const wishlistStorage = {
  save: (items: WishlistItem[]): boolean => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch (error) {
      console.error("Failed to save wishlist to localStorage:", error);
      return false;
    }
  },

  load: (): WishlistItem[] => {
    try {
      const data = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (!data) return [];

      const items = JSON.parse(data);
      if (!Array.isArray(items)) return [];

      return items.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.title === "string"
      );
    } catch (error) {
      console.error("Failed to load wishlist from localStorage:", error);
      return [];
    }
  },

  clear: (): boolean => {
    try {
      localStorage.removeItem(WISHLIST_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("Failed to clear wishlist from localStorage:", error);
      return false;
    }
  },

  isAvailable: (): boolean => {
    try {
      const testKey = "__wishlist_test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },
};
