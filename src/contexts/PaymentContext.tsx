import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  loadCashfreeScript,
  createCashfreeInstance,
  formatCurrency,
} from "../lib/cashfree";
import { PaymentService } from "../lib/paymentService";
import { OrderService } from "../lib/orderService";
import type { CreateOrderRequest } from "../types/cashfree";
import { useAuth } from "./AuthContext";
import { useCart, type CartItem } from "./CartContext";
import { toast } from "sonner";
import { ROUTE_NAMES } from "@/constants/enums";
import { useNavigate } from "react-router";
import { logger } from "@/components/ui/Logger";

interface PaymentContextType {
  isLoading: boolean;
  error: string | null;
  initiatePayment: (
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
    items?: CartItem[]
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
      currency: string,
      metadata: Record<string, string> = {},
      items: CartItem[] = []
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        // Load Cashfree script
        await loadCashfreeScript();

        // Create order on server with required customer details and cart items for one-click checkout
        const orderData: CreateOrderRequest = {
          amount: amount,
          currency: formatCurrency(currency),
          receipt: `receipt_${Date.now()}`,
          notes: metadata,
          customer_details: {
            customer_id: user?.id || `user_${Date.now()}`,
            customer_name: user?.user_metadata?.full_name || "Customer",
            customer_email: user?.email || "customer@example.com",
            customer_phone: "9999999999", // Dummy phone number as required by Cashfree
          },
          cart_details: {
            cart_items:
              items?.length > 0
                ? items?.map((item, index) => ({
                    item_id: item.id || `item_${index}`,
                    item_name: item.productName || `Item ${index + 1}`,
                    item_description: `${item.brand} - ${item.condition} - Size: ${item.size}`,
                    item_original_unit_price: item.price,
                    item_discounted_unit_price: item.price,
                    item_quantity: item.quantity,
                    item_currency: currency,
                  }))
                : [],
          },
        };

        const order = await PaymentService.createOrder(orderData);

        // Open Cashfree checkout
        const cashfree = createCashfreeInstance();

        // Debug: Log what's available on the cashfree instance
        logger.debug(`Cashfree instance: ${JSON.stringify(cashfree)}`);
        logger.debug(
          `Cashfree methods: ${Object.getOwnPropertyNames(cashfree).join(", ")}`
        );

        // Use the correct checkout method from v3 SDK
        if (typeof cashfree.checkout === "function") {
          logger.info(`Cashfree order: ${JSON.stringify(order)}`);
          // Open Cashfree checkout with payment session ID
          cashfree
            .checkout({
              paymentSessionId: order.payment_session_id,
              redirectTarget: "_modal",
            })
            .then(async (res: any) => {
              logger.info(`Cashfree response: ${JSON.stringify(res)}`);

              if (res.paymentDetails) {
                logger.info(
                  `Payment details: ${JSON.stringify(res.paymentDetails)}`
                );

                // Save payment details
                const verificationResult = await PaymentService.verifyPayment({
                  cf_order_id: order.order_id,
                });

                if (verificationResult.verified) {
                  logger.info("Payment verified successfully");
                  await PaymentService.savePayment({
                    amount: amount,
                    currency: currency,
                    status: "completed",
                    order_id: verificationResult?.payment?.order_id || "",
                    payment_id: verificationResult?.payment?.id || "",
                    user_id: user?.id || "",
                  });

                  await OrderService.processCartCheckout(
                    items,
                    verificationResult?.payment?.id || "",
                    verificationResult?.payment?.order_id || "",
                    user?.id || ""
                  );

                  // Clear cart after successful purchase
                  if (isOpen) {
                    toggleCart();
                  }

                  clearCart();
                  navigate(ROUTE_NAMES.MY_ORDERS);
                  toast.success(
                    "🎉 Purchase successful! Sellers have been notified."
                  );
                } else {
                  logger.warn("Payment verification failed");
                  throw new Error("Payment verification failed");
                }
              }
            })
            .catch((err: any) => {
              console.error("Cashfree error:", err);
              setIsLoading(false);
            });
        } else {
          console.error(
            "Cashfree instance methods:",
            Object.getOwnPropertyNames(cashfree)
          );
          setIsLoading(false);

          throw new Error(
            "Unable to open Cashfree checkout - checkout method not found"
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initiate payment"
        );
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
