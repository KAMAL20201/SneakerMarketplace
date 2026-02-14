import React from "react";
import { CartProvider } from "./contexts/CartContext";
import { PaymentProvider } from "./contexts/PaymentContext";
import { NotificationProvider } from "./contexts/NotificationContext.tsx";

const Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <CartProvider>
      <PaymentProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </PaymentProvider>
    </CartProvider>
  );
};

export default Provider;
