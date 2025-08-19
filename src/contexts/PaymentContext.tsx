import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  loadRazorpayScript,
  createRazorpayInstance,
  formatAmount,
  formatCurrency,
  RAZORPAY_KEY_ID,
} from "../lib/razorpay";
import { PaymentService } from "../lib/paymentService";
import { OrderService } from "../lib/orderService";
import type {
  RazorpayOptions,
  RazorpayResponse,
  CreateOrderRequest,
} from "../types/razorpay";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";
import { toast } from "sonner";
import { ROUTE_NAMES } from "@/constants/enums";
import { useNavigate } from "react-router";

interface PaymentContextType {
  isLoading: boolean;
  error: string | null;
  initiatePayment: (
    amount: number,
    currency: string,
    description: string,
    metadata?: Record<string, string>
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
  const { items: cartItems, toggleCart, isOpen } = useCart();
  const navigate = useNavigate();
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initiatePayment = useCallback(
    async (
      amount: number,
      currency: string,
      description: string,
      metadata: Record<string, string> = {}
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        // Load Razorpay script
        await loadRazorpayScript();

        // Create order on server
        const orderData: CreateOrderRequest = {
          amount: formatAmount(amount),
          currency: formatCurrency(currency),
          receipt: `receipt_${Date.now()}`,
          notes: metadata,
        };

        const order = await PaymentService.createOrder(orderData);

        // Configure Razorpay options
        const options: RazorpayOptions = {
          key: RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          name: "SneakIn Market",
          description: description,
          order_id: order.id,
          prefill: {
            name: user?.user_metadata?.full_name || "",
            email: user?.email || "",
          },
          notes: metadata,
          theme: {
            color: "#3B82F6",
          },
          handler: async (response: RazorpayResponse) => {
            try {
              // Verify payment
              const verification = await PaymentService.verifyPayment(response);

              if (verification.verified && verification.payment) {
                // Save payment to database
                await PaymentService.savePayment({
                  amount: amount,
                  currency: currency,
                  status: "completed",
                  order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  user_id: user?.id || "",
                });

                // Check if this is a cart checkout
                if (metadata.type === "cart_checkout" && cartItems.length > 0) {
                  // Process cart checkout - create orders and notify sellers
                  await OrderService.processCartCheckout(
                    cartItems,
                    response.razorpay_payment_id,
                    response.razorpay_order_id,
                    user?.id || "",
                    user?.user_metadata?.full_name || ""
                  );

                  // Clear cart after successful purchase
                  if (isOpen) {
                    toggleCart();
                  }

                  navigate(ROUTE_NAMES.MY_ORDERS);

                  toast.success(
                    "🎉 Purchase successful! Sellers have been notified."
                  );
                }
              } else {
                setError("Payment verification failed");
              }
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Payment verification failed"
              );
            } finally {
              setIsLoading(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsLoading(false);
            },
          },
        };

        // Open Razorpay modal
        const razorpay = createRazorpayInstance(options);
        razorpay.open();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initiate payment"
        );
        setIsLoading(false);
      }
    },
    [user]
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
