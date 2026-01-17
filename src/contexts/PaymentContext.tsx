import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";
import { toast } from "sonner";
import { ROUTE_NAMES } from "@/constants/enums";
import { useNavigate } from "react-router";
import type { CartItem } from "../lib/orderService";
import type { ShippingAddress } from "@/types/shipping";
import { generateWhatsAppOrderRef } from "@/lib/whatsapp";

interface PaymentContextType {
  isLoading: boolean;
  error: string | null;
  initiatePayment: (
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
    items?: CartItem[],
    shippingAddress?: ShippingAddress
  ) => Promise<void>;
  clearError: () => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error("usePayment must be used within a PaymentProvider");
  }
  return context;
};

interface PaymentProviderProps {
  children: ReactNode;
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toggleCart, isOpen } = useCart();
  const navigate = useNavigate();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initiatePayment = useCallback(
    async (
      amount: number,
      _currency: string,
      metadata: Record<string, string> = {},
      items: CartItem[] = [],
      shippingAddress?: ShippingAddress
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        // Generate unique order reference
        const orderReference = generateWhatsAppOrderRef();

        // Check if this is a cart checkout
        if (metadata.type === "cart_checkout" && items.length > 0) {
          // Close cart if open
          if (isOpen) {
            toggleCart();
          }

          // Navigate to payment confirmation page with order data
          navigate(ROUTE_NAMES.PAYMENT_CONFIRMATION, {
            state: {
              items,
              totalAmount: amount,
              shippingAddress,
              orderReference,
            },
          });
        }
      } catch (error) {
        console.error("Payment error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to process order";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [user, isOpen, toggleCart, navigate]
  );

  const value: PaymentContextType = {
    isLoading,
    error,
    initiatePayment,
    clearError,
  };

  return (
    <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>
  );
};
