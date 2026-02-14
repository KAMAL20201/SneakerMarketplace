import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { PaymentService } from "../lib/paymentService";
import { OrderService } from "../lib/orderService";
// [GUEST CHECKOUT] Auth still imported for optional admin prefill
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";
import { toast } from "sonner";
import { ROUTE_NAMES } from "@/constants/enums";
import { useNavigate } from "react-router";
import type { CartItem } from "../lib/orderService";

import {
  createRazorpayInstance,
  formatAmount,
  formatCurrency,
  loadRazorpayScript,
  RAZORPAY_KEY_ID,
} from "@/lib/razorpay";
import type {
  RazorpayOptions,
  RazorpayResponse,
  CreateOrderRequest,
} from "../types/razorpay";
import type { ShippingAddress } from "@/types/shipping";

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
  // [GUEST CHECKOUT] user may be null for guest checkout — that's expected
  const { user } = useAuth();
  const { toggleCart, isOpen, clearCart } = useCart();
  const navigate = useNavigate();
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initiatePayment = useCallback(
    async (
      amount: number,
      currency: string,
      metadata: Record<string, string> = {},
      items: CartItem[] = [],
      shippingAddress?: ShippingAddress
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        // Load razorpay script
        await loadRazorpayScript();

        // Create order on server with required customer details and cart items for one-click checkout
        const orderData: CreateOrderRequest = {
          amount: formatAmount(amount),
          currency: formatCurrency(currency),
          receipt: `receipt_${Date.now()}`,
          notes: metadata,
          // customer_details: {
          //   customer_id: user?.id || `user_${Date.now()}`,
          //   customer_name: user?.user_metadata?.full_name || "Customer",
          //   customer_email: user?.email || "customer@example.com",
          //   customer_phone: "9999999999", // Dummy phone number as required by Cashfree
          // },
          // cart_details: {
          //   cart_items:
          //     items?.length > 0
          //       ? items?.map((item, index) => ({
          //           item_id: item.id || `item_${index}`,
          //           item_name: item.productName || `Item ${index + 1}`,
          //           item_description: `${item.brand} - ${item.condition} - Size: ${item.size}`,
          //           item_original_unit_price: item.price,
          //           item_discounted_unit_price: item.price,
          //           item_quantity: item.quantity,
          //           item_currency: currency,
          //         }))
          //       : [],
          // },
        };

        const order = await PaymentService.createOrder(orderData);

        // Configure Razorpay options
        const options: RazorpayOptions = {
          key: RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          name: "The Plug Market",
          // description: description,
          order_id: order.id,
          // [GUEST CHECKOUT] Prefill with user data if logged in (admin), empty for guests
          // Razorpay will collect contact info from guest during payment
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
                  // [GUEST CHECKOUT] user_id is empty for guest orders
                  user_id: user?.id || "",
                });
                // Check if this is a cart checkout
                if (metadata.type === "cart_checkout" && items.length > 0) {
                  // Process cart checkout - create orders and notify sellers
                  await OrderService.processCartCheckout(
                    items,
                    response.razorpay_payment_id,
                    response.razorpay_order_id,
                    // [GUEST CHECKOUT] buyer_id will be empty for guest orders
                    user?.id || "",
                    {
                      // [GUEST CHECKOUT] For guests, name/email will come from shipping address in later phases
                      full_name: user?.user_metadata?.full_name || "",
                      email: user?.email || "",
                    },
                    shippingAddress
                  );
                  if (isOpen) {
                    toggleCart();
                  }
                  clearCart();
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
      } catch (error) {
        console.error("Payment error:", error);
        toast.error("Payment failed. Please try again.");
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
