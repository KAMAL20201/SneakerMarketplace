import React from "react";
import { Button } from "@/components/ui/button";
import { X, ShoppingBag } from "lucide-react";


interface CartHeaderProps {
  currentStep: "cart" | "shipping" | "payment";
  onClose: () => void;
}

export const CartHeader: React.FC<CartHeaderProps> = ({
  currentStep,
  onClose,
}) => {

  return (
    <div className="p-4 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
      {/* Close Button and Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {currentStep === "cart" && "Shopping Cart"}
              {currentStep === "shipping" && "Shipping Address"}
              {currentStep === "payment" && "Payment"}
            </h2>
            <p className="text-sm text-gray-600">
              {currentStep === "cart" && "Review your items"}
              {currentStep === "shipping" && "Where to deliver"}
              {currentStep === "payment" && "Complete purchase"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-10 w-10 p-0 rounded-2xl bg-gray-100/80 hover:bg-gray-200/80 border-0"
        >
          <X className="h-5 w-5 text-gray-700" />
        </Button>
      </div>

    </div>
  );
};
