import React from "react";
import { CartProvider } from "./contexts/CartContext";
import { PaymentProvider } from "./contexts/PaymentContext";
import { NotificationProvider } from "./contexts/NotificationContext.tsx";
import { SellerFormProvider } from "./contexts/SellerFormContext";

const Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <CartProvider>
      <PaymentProvider>
        <NotificationProvider>
          <SellerFormProvider>{children}</SellerFormProvider>
        </NotificationProvider>
      </PaymentProvider>
    </CartProvider>
  );
};

export default Provider;
