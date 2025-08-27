import React from "react";
import { Button } from "./ui/button";
import { usePayment } from "../contexts/PaymentContext";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { ROUTE_NAMES } from "@/constants/enums";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router";
import { useCart, type CartItem } from "@/contexts/CartContext";

interface PaymentButtonProps {
  amount: number;
  items: CartItem[];

  currency?: string;
  // description: string;
  metadata?: Record<string, string>;
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
}) => {
  const { initiatePayment, isLoading, error } = usePayment();
  const { user, setOperationAfterLogin } = useAuth();
  const { isOpen, toggleCart } = useCart();
  const navigate = useNavigate();
  const handlePayment = async () => {
    try {
      if (!user) {
        if (isOpen) {
          toggleCart();
        }
        setOperationAfterLogin(() => () => {
          initiatePayment(amount, currency, metadata, items);
        });
        toast.error("Please login to continue");

        navigate(ROUTE_NAMES.LOGIN);

        return;
      }

      await initiatePayment(amount, currency, metadata, items);
    } catch (err) {
      console.error("Payment failed:", err);
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
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            {buttonText || `Pay ₹${amount}`}
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
