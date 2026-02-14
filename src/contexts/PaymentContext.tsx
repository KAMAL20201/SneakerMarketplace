import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
// [WHATSAPP CHECKOUT] Razorpay imports commented out until payment provider is set up
// import { PaymentService } from "../lib/paymentService";
import { OrderService } from "../lib/orderService";
// [GUEST CHECKOUT] Auth still imported for optional admin prefill
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";
import { toast } from "sonner";
import { ROUTE_NAMES } from "@/constants/enums";
import { useNavigate } from "react-router";
import type { CartItem } from "../lib/orderService";

// [WHATSAPP CHECKOUT] Razorpay imports commented out
// import {
//   createRazorpayInstance,
//   formatAmount,
//   formatCurrency,
//   loadRazorpayScript,
//   RAZORPAY_KEY_ID,
// } from "@/lib/razorpay";
// import type {
//   RazorpayOptions,
//   RazorpayResponse,
//   CreateOrderRequest,
// } from "../types/razorpay";
import type { ShippingAddress } from "@/types/shipping";
import { WhatsAppService } from "@/lib/whatsappService";

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
      _currency: string,
      metadata: Record<string, string> = {},
      items: CartItem[] = [],
      shippingAddress?: ShippingAddress
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        if (!shippingAddress) {
          throw new Error("Shipping address is required");
        }

        if (!items || items.length === 0) {
          throw new Error("No items to checkout");
        }

        // Generate order reference
        const orderRef = WhatsAppService.generateOrderRef();

        // Process checkout - create orders with pending_payment status
        // This also validates stock and marks products as sold
        if (metadata.type === "cart_checkout" && items.length > 0) {
          await OrderService.processWhatsAppCheckout(
            items,
            orderRef,
            user?.id || "",
            {
              full_name:
                shippingAddress.full_name ||
                user?.user_metadata?.full_name ||
                "",
              email: shippingAddress.email || user?.email || "",
              phone: shippingAddress.phone || "",
            },
            shippingAddress
          );

          // Generate WhatsApp URL and redirect
          const whatsappURL = WhatsAppService.generateWhatsAppURL(
            items,
            shippingAddress,
            orderRef,
            amount
          );

          // Open WhatsApp in new tab
          window.open(whatsappURL, "_blank");

          // Clean up cart and navigate
          if (isOpen) {
            toggleCart();
          }
          clearCart();
          navigate(ROUTE_NAMES.HOME);
          toast.success(
            "Order placed! Complete the payment on WhatsApp to confirm your order."
          );
        }
      } catch (error) {
        console.error("Order error:", error);
        const message =
          error instanceof Error ? error.message : "Order failed. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [user, isOpen, toggleCart, navigate, clearCart]
  );

  /* [WHATSAPP CHECKOUT] Original Razorpay payment flow commented out.
   * Uncomment and restore this when Razorpay/payment provider is ready.
   *
   * const initiatePayment_razorpay = useCallback(
   *   async (
   *     amount: number,
   *     currency: string,
   *     metadata: Record<string, string> = {},
   *     items: CartItem[] = [],
   *     shippingAddress?: ShippingAddress
   *   ) => {
   *     try {
   *       setIsLoading(true);
   *       setError(null);
   *       await loadRazorpayScript();
   *       const orderData: CreateOrderRequest = {
   *         amount: formatAmount(amount),
   *         currency: formatCurrency(currency),
   *         receipt: `receipt_${Date.now()}`,
   *         notes: metadata,
   *       };
   *       const order = await PaymentService.createOrder(orderData);
   *       const options: RazorpayOptions = {
   *         key: RAZORPAY_KEY_ID,
   *         amount: order.amount,
   *         currency: order.currency,
   *         name: "The Plug Market",
   *         order_id: order.id,
   *         prefill: {
   *           name: shippingAddress?.full_name || user?.user_metadata?.full_name || "",
   *           email: shippingAddress?.email || user?.email || "",
   *           contact: shippingAddress?.phone || "",
   *         },
   *         notes: metadata,
   *         theme: { color: "#3B82F6" },
   *         handler: async (response: RazorpayResponse) => {
   *           try {
   *             const verification = await PaymentService.verifyPayment(response);
   *             if (verification.verified && verification.payment) {
   *               await PaymentService.savePayment({
   *                 amount, currency, status: "completed",
   *                 order_id: response.razorpay_order_id,
   *                 payment_id: response.razorpay_payment_id,
   *                 user_id: user?.id || "",
   *               });
   *               if (metadata.type === "cart_checkout" && items.length > 0) {
   *                 await OrderService.processCartCheckout(
   *                   items, response.razorpay_payment_id,
   *                   response.razorpay_order_id, user?.id || "",
   *                   {
   *                     full_name: shippingAddress?.full_name || user?.user_metadata?.full_name || "",
   *                     email: shippingAddress?.email || user?.email || "",
   *                     phone: shippingAddress?.phone || "",
   *                   },
   *                   shippingAddress
   *                 );
   *                 if (isOpen) toggleCart();
   *                 clearCart();
   *                 navigate(ROUTE_NAMES.HOME);
   *                 toast.success("🎉 Purchase successful! You'll receive a confirmation email shortly.");
   *               }
   *             } else {
   *               setError("Payment verification failed");
   *             }
   *           } catch (err) {
   *             setError(err instanceof Error ? err.message : "Payment verification failed");
   *           } finally {
   *             setIsLoading(false);
   *           }
   *         },
   *         modal: { ondismiss: () => setIsLoading(false) },
   *       };
   *       const razorpay = createRazorpayInstance(options);
   *       razorpay.open();
   *     } catch (error) {
   *       console.error("Payment error:", error);
   *       toast.error("Payment failed. Please try again.");
   *     } finally {
   *       setIsLoading(false);
   *     }
   *   },
   *   [user, isOpen, toggleCart, navigate, clearCart]
   * );
   */

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
