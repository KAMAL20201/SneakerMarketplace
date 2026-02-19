import React from "react";
import { Button } from "./ui/button";
import { usePayment } from "../contexts/PaymentContext";
import { Loader2, MessageCircle } from "lucide-react";
// [GUEST CHECKOUT] toast import commented out - no login error toast needed
// import { toast } from "sonner";
// [GUEST CHECKOUT] Auth imports commented out - guests can pay without login
// import { ROUTE_NAMES } from "@/constants/enums";
// import { useAuth } from "@/contexts/AuthContext";
// import { useNavigate } from "react-router";
// [GUEST CHECKOUT] useCart was only used for login redirect flow
// import { useCart } from "@/contexts/CartContext";
import type { ShippingAddress } from "@/types/shipping";
import type { CartItem } from "@/lib/orderService";

interface PaymentButtonProps {
  amount: number;
  items: CartItem[];

  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
  shippingAddress?: ShippingAddress;
  className?: string;
  buttonText?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount,
  currency = "INR",
  metadata = {},
  className = "",
  buttonText,
  variant = "default",
  size = "default",
  disabled = false,
  items,
  shippingAddress,
}) => {
  const { initiatePayment, isLoading, error } = usePayment();
  const handlePayment = async () => {
    try {
      await initiatePayment(amount, currency, metadata, items, shippingAddress);
    } catch (err) {
      console.error("Order failed:", err);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handlePayment}
        disabled={disabled || isLoading}
        variant={variant}
        size={size}
        className={`${className} ${isLoading ? "cursor-not-allowed" : ""}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Placing Order...
          </>
        ) : (
          <>
            <MessageCircle className="mr-2 h-4 w-4" />
            {buttonText || `Order via WhatsApp - ₹${amount}`}
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
