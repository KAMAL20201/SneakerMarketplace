import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { useCartStorage } from "@/hooks/useCartStorage";

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  size: string;
  condition: string;
  price: number;
  image: string;
  sellerId: string;
  sellerName: string;
  quantity: number;
}

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
});

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

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

  const addToCart = (item: any) => {
    // Check if item already exists in cart (by productId and sellerId)
    const existingItem = items.find(
      (cartItem) =>
        cartItem.productId === item.productId &&
        cartItem.sellerId === item.sellerId
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
    setIsOpen(!isOpen);
  };

  const clearCart = () => {
    setItems([]);
    // Immediately clear from localStorage
    clear();
  };

  const totalPrice = useMemo(() => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [items]);

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
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  return useContext(CartContext);
};
