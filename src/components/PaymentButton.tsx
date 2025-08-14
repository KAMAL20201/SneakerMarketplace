import React from "react";
import { Button } from "./ui/button";
import { usePayment } from "../contexts/PaymentContext";
import { Loader2, CreditCard } from "lucide-react";

interface PaymentButtonProps {
  amount: number;
  currency?: string;
  description: string;
  metadata?: Record<string, string>;
  className?: string;
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
  description,
  metadata = {},
  className = "",
  variant = "default",
  size = "default",
  disabled = false,
}) => {
  const { initiatePayment, isLoading, error } = usePayment();

  const handlePayment = async () => {
    try {
      await initiatePayment(amount, currency, description, metadata);
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
            Pay ₹{amount}
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
