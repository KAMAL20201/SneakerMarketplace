import React from "react";
import { CartProvider } from "./contexts/CartContext";

const Provider = ({ children }: { children: React.ReactNode }) => {
  return <CartProvider>{children}</CartProvider>;
};

export default Provider;
