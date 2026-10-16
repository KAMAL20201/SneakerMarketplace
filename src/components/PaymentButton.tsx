import React, { useId, useState } from "react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { ROUTE_NAMES } from "@/constants/enums";
import { usePayment, type CheckoutDetails } from "../contexts/PaymentContext";
import { Loader2 } from "lucide-react";
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
  couponCode?: string | null;
  /** Delivery method, COD and coupon discount chosen at checkout */
  checkoutDetails?: CheckoutDetails;
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
  couponCode = null,
  checkoutDetails,
  variant = "default",
  size = "default",
  disabled = false,
  items,
  shippingAddress,
}) => {
  const { initiatePayment, isLoading, error } = usePayment();
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState<boolean>(false);
  const policyCheckboxId = useId();

  const handlePayment = async () => {
    if (!hasAcceptedPolicies || disabled || isLoading) return;

    try {
      await initiatePayment(
        currency,
        metadata,
        items,
        shippingAddress,
        amount,
        couponCode,
        checkoutDetails
      );
    } catch (err) {
      console.error("Order failed:", err);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2">
        <Checkbox
          id={policyCheckboxId}
          checked={hasAcceptedPolicies}
          onCheckedChange={(checked) => setHasAcceptedPolicies(checked === true)}
          disabled={isLoading}
          required
          className="size-5"
        />
        <Label
          htmlFor={policyCheckboxId}
          className="block min-h-11 flex-1 cursor-pointer whitespace-nowrap py-3 text-[11px] font-normal leading-5 text-gray-700 sm:text-xs"
        >
          I’ve read &amp; agree to{" "}
          <a
            href={ROUTE_NAMES.SHIPPING_POLICY}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-700 underline underline-offset-2"
            aria-label="Shipping Policy"
          >
            Shipping
          </a>{" "}
          &amp;{" "}
          <a
            href={ROUTE_NAMES.RETURNS}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-700 underline underline-offset-2"
            aria-label="Returns Policy"
          >
            Returns
          </a>.
        </Label>
      </div>
      <Button
        onClick={handlePayment}
        disabled={!hasAcceptedPolicies || disabled || isLoading}
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
            {/* <MessageCircle className="mr-2 h-4 w-4" /> */}
            {buttonText ||
              (checkoutDetails && checkoutDetails.codAmount > 0
                ? `Pay ₹${amount} now`
                : `Checkout Now -  ₹${amount}`)}
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
