import { createContext, useContext, useState, useMemo } from "react";

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
  addToCart: (item: any) => void;
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
  addToCart: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  toggleCart: () => {},
  clearCart: () => {},
  totalPrice: 0,
});

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addToCart = (item: any) => {
    setItems([...items, item]);
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
