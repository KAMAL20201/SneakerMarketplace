import { createContext, useContext, useState } from "react";

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
  toggleCart: () => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextType>({
  isOpen: false,
  items: [],
  setIsOpen: () => {},
  addToCart: () => {},
  removeItem: () => {},
  toggleCart: () => {},
  clearCart: () => {},
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

  const toggleCart = () => {
    setIsOpen(!isOpen);
  };

  const clearCart = () => {
    setItems([]);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        setIsOpen,
        addToCart,
        removeItem,
        toggleCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  return useContext(CartContext);
};
