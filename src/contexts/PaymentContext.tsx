import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
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
    // amount: number,
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
  const [popupBlockedUrl, setPopupBlockedUrl] = useState<string | null>(null);
  // [GUEST CHECKOUT] user may be null for guest checkout — that's expected
  const { user } = useAuth();
  const { toggleCart, isOpen, clearCart } = useCart();
  const navigate = useNavigate();
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initiatePayment = useCallback(
    async (
      // amount: number,
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

        // Process checkout - create orders with pending_payment status
        // Returns the created orders so we can use their real DB IDs in the WhatsApp message
        if (metadata.type === "cart_checkout" && items.length > 0) {
          const createdOrders = await OrderService.processWhatsAppCheckout(
            items,
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

          // Build WhatsApp URL using the real DB order IDs so they match the dashboard
          const orderIds = createdOrders.map((o) => o.id);
          const whatsappURL = WhatsAppService.generateWhatsAppURL(orderIds);

          // Open WhatsApp in new tab — detect if popup was blocked
          const popup = window.open(whatsappURL, "_blank");
          if (!popup || popup.closed) {
            setPopupBlockedUrl(whatsappURL);
          }

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
    <PaymentContext.Provider value={value}>
      {children}

      {/* Popup-blocked dialog — shown when browser blocks the WhatsApp redirect */}
      <Dialog
        open={!!popupBlockedUrl}
        onOpenChange={(open) => {
          if (!open) setPopupBlockedUrl(null);
        }}
      >
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366]/10">
              <svg viewBox="0 0 24 24" className="h-8 w-8 fill-[#25D366]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Allow Pop-ups to Open WhatsApp
            </DialogTitle>
          </DialogHeader>

          <p className="text-center text-sm text-gray-500 mt-1">
            Your browser blocked the WhatsApp redirect. Tap the button below to
            open it directly.
          </p>

          <a
            href={popupBlockedUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setPopupBlockedUrl(null)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-[#1da851]"
          >
            Open WhatsApp
            <ExternalLink className="h-4 w-4" />
          </a>

          <p className="mt-3 text-center text-xs text-gray-400">
            Tip: Allow pop-ups for this site so it opens automatically next time.
          </p>
        </DialogContent>
      </Dialog>
    </PaymentContext.Provider>
  );
};
