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
import { Copy, ExternalLink, CheckCircle2 } from "lucide-react";
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

const UPI_ID = import.meta.env.VITE_UPI_ID || "ks708570-3@oksbi";

interface UpiPaymentState {
  orderIds: string[];
  whatsappURL: string;
  amount: number;
}

interface PaymentContextType {
  isLoading: boolean;
  error: string | null;
  initiatePayment: (
    // amount: number,
    currency: string,
    metadata?: Record<string, string>,
    items?: CartItem[],
    shippingAddress?: ShippingAddress,
    amount?: number
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
  const [upiPaymentState, setUpiPaymentState] = useState<UpiPaymentState | null>(null);
  const [copied, setCopied] = useState(false);
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
      shippingAddress?: ShippingAddress,
      amount?: number
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

          // Show UPI payment screen instead of immediately redirecting to WhatsApp
          setUpiPaymentState({ orderIds, whatsappURL, amount: amount || 0 });
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
    [user]
  );

  const handleWhatsAppConfirm = useCallback(() => {
    if (!upiPaymentState) return;

    const popup = window.open(upiPaymentState.whatsappURL, "_blank");
    if (!popup || popup.closed) {
      setPopupBlockedUrl(upiPaymentState.whatsappURL);
    }

    setUpiPaymentState(null);
    if (isOpen) toggleCart();
    clearCart();
    navigate(ROUTE_NAMES.HOME);
    toast.success("Order placed! Complete the payment on WhatsApp to confirm your order.");
  }, [upiPaymentState, isOpen, toggleCart, clearCart, navigate]);

  const handleCopyUpiId = useCallback(() => {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const upiQrData = upiPaymentState
    ? encodeURIComponent(
        `upi://pay?pa=${UPI_ID}&pn=The+Plug+Market&am=${upiPaymentState.amount}&cu=INR`
      )
    : "";

  const value: PaymentContextType = {
    isLoading,
    error,
    initiatePayment,
    clearError,
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}

      {/* UPI Payment Dialog — shown after order is created */}
      <Dialog
        open={!!upiPaymentState}
        onOpenChange={(open) => {
          if (!open) setUpiPaymentState(null);
        }}
      >
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader className="text-center">
            <DialogTitle className="text-lg font-bold text-gray-900">
              Pay to Complete Order
            </DialogTitle>
            <p className="text-xs text-gray-400 mt-1">
              Order #{upiPaymentState?.orderIds[0]?.slice(0, 8).toUpperCase()}
            </p>
          </DialogHeader>

          {/* Amount */}
          <div className="text-center mt-2">
            <p className="text-3xl font-extrabold text-gray-900">
              ₹{upiPaymentState?.amount}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Amount to pay</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center my-3">
            <div className="p-2 bg-white border border-gray-200 rounded-2xl shadow-sm">
              {upiPaymentState && (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${upiQrData}`}
                  alt="UPI QR Code"
                  className="w-44 h-44 rounded-lg"
                />
              )}
            </div>
          </div>

          {/* UPI ID */}
          <div className="bg-gray-50 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">UPI ID</p>
              <p className="font-mono font-semibold text-gray-800 text-sm truncate">
                {UPI_ID}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyUpiId}
              className="flex-shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl bg-white border border-gray-200 shadow-sm transition-colors hover:bg-gray-100"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-gray-500" />
                  Copy
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 -mt-1">
            Scan the QR or copy the UPI ID to pay
          </p>

          {/* WhatsApp Confirm Button */}
          <button
            type="button"
            onClick={handleWhatsAppConfirm}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-[#1da851]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            I've Paid — Confirm on WhatsApp
          </button>

          <p className="text-center text-xs text-gray-400">
            After paying, tap above to send us your order confirmation
          </p>
        </DialogContent>
      </Dialog>

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

          <button
            type="button"
            onClick={() => {
              if (popupBlockedUrl) {
                window.location.href = popupBlockedUrl;
              }
              setPopupBlockedUrl(null);
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-[#1da851]"
          >
            Open WhatsApp
            <ExternalLink className="h-4 w-4" />
          </button>

          <p className="mt-3 text-center text-xs text-gray-400">
            Tip: Allow pop-ups for this site so it opens automatically next time.
          </p>
        </DialogContent>
      </Dialog>
    </PaymentContext.Provider>
  );
};
