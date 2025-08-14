import React from "react";
import { CartProvider } from "./contexts/CartContext";
import { PaymentProvider } from "./contexts/PaymentContext";

const Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <CartProvider>
      <PaymentProvider>
        {children}
      </PaymentProvider>
    </CartProvider>
  );
};

export default Provider;
