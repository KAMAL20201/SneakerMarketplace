import React from "react";
import { CartProvider } from "./contexts/CartContext";
import { PaymentProvider } from "./contexts/PaymentContext";
import { NotificationProvider } from "./contexts/NotificationContext.tsx";
import { SellerFormProvider } from "./contexts/SellerFormContext";
import { WishlistProvider } from "./contexts/WishlistContext";

const Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WishlistProvider>
      <CartProvider>
        <PaymentProvider>
          <NotificationProvider>
            <SellerFormProvider>{children}</SellerFormProvider>
          </NotificationProvider>
        </PaymentProvider>
      </CartProvider>
    </WishlistProvider>
  );
};

export default Provider;
