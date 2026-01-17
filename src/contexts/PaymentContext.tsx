import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { OrderService } from "../lib/orderService";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";
import { toast } from "sonner";
import { ROUTE_NAMES } from "@/constants/enums";
import { useNavigate } from "react-router";
import type { CartItem } from "../lib/orderService";
import type { ShippingAddress } from "@/types/shipping";
import {
  openWhatsApp,
  generateWhatsAppOrderRef,
  isWhatsAppConfigured,
  type WhatsAppOrderData,
} from "@/lib/whatsapp";

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
  const { toggleCart, isOpen, clearCart } = useCart();
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

        // Check if WhatsApp is configured
        if (!isWhatsAppConfigured()) {
          setError("WhatsApp Business number not configured. Please contact support.");
          toast.error("WhatsApp Business number not configured");
          return;
        }

        // Generate unique order reference
        const whatsappOrderRef = generateWhatsAppOrderRef();

        // Check if this is a cart checkout
        if (metadata.type === "cart_checkout" && items.length > 0) {
          // Prepare WhatsApp order data
          const whatsAppOrderData: WhatsAppOrderData = {
            items,
            totalAmount: amount,
            shippingAddress,
            buyerName: user?.user_metadata?.full_name || "Customer",
            buyerEmail: user?.email || "",
            orderReference: whatsappOrderRef,
          };

          // Open WhatsApp with order details
          const whatsAppOpened = openWhatsApp(whatsAppOrderData);

          if (!whatsAppOpened) {
            setError("Failed to open WhatsApp. Please ensure WhatsApp is installed.");
            toast.error("Failed to open WhatsApp");
            return;
          }

          // Process cart checkout - create orders with pending_payment status
          await OrderService.processCartCheckout(
            items,
            whatsappOrderRef, // Using whatsapp order ref as payment identifier
            whatsappOrderRef,
            user?.id || "",
            {
              full_name: user?.user_metadata?.full_name || "",
              email: user?.email || "",
            },
            shippingAddress
          );

          // Close cart if open
          if (isOpen) {
            toggleCart();
          }

          // Clear cart
          clearCart();

          // Navigate to orders page
          navigate(ROUTE_NAMES.MY_ORDERS);

          toast.success(
            "Order placed! Please complete payment via WhatsApp. Sellers have been notified."
          );
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
    [user, isOpen, toggleCart, navigate, clearCart]
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
