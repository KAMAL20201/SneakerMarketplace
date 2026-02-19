import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShippingStep } from "@/components/Cart/steps/ShippingStep";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import type { ShippingAddress } from "@/types/shipping";
import { PaymentButton } from "@/components/PaymentButton";
import type { CartItem } from "@/lib/orderService";

type BuyNowModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  item: CartItem;
};

export const BuyNowModal: React.FC<BuyNowModalProps> = ({
  open,
  onOpenChange,
  amount,
  item,
}) => {
  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [shippingAddress, setShippingAddress] =
    useState<ShippingAddress | null>(null);

  const handleShippingNext = (address: ShippingAddress) => {
    setShippingAddress(address);
    setStep("payment");
  };

  const handleBackToShipping = () => {
    setStep("shipping");
  };

  const handleClose = () => {
    // Reset on close for a clean start next time
    setStep("shipping");
    setShippingAddress(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(o) : handleClose())}
    >
      <DialogContent className="max-w-md w-[calc(100%-1rem)] p-0 rounded-3xl overflow-hidden">
        {step === "shipping" ? (
          <div className="flex flex-col h-[90vh] sm:h-[80vh]">
            <div className="px-4 pt-4">
              <DialogHeader>
                <DialogTitle>Select Shipping Address</DialogTitle>
              </DialogHeader>
            </div>
            <div className="flex-1">
              <ShippingStep onBack={handleClose} onNext={handleShippingNext} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-[70vh]">
            <div className="px-4 pt-4">
              <DialogHeader>
                <DialogTitle>Confirm & Order</DialogTitle>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Shipping Address Summary */}
              {shippingAddress && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Shipping to:
                      </h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="font-medium">
                          {shippingAddress.full_name}
                        </p>
                        <p>{shippingAddress.address_line1}</p>
                        {shippingAddress.address_line2 && (
                          <p>{shippingAddress.address_line2}</p>
                        )}
                        <p>
                          {shippingAddress.city}, {shippingAddress.state} -{" "}
                          {shippingAddress.pincode}
                        </p>
                        {shippingAddress.landmark && (
                          <p>Near: {shippingAddress.landmark}</p>
                        )}
                        <p className="text-gray-500">{shippingAddress.phone}</p>
                        {shippingAddress.email && (
                          <p className="text-gray-500">{shippingAddress.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Order Summary
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal (1 item)</span>
                    <span className="font-medium">₹{amount}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>₹{amount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Payment */}
            <div className="border-t border-gray-200/50 p-4 bg-white/80 backdrop-blur-sm">
              <PaymentButton
                amount={amount}
                metadata={{
                  cart_items: item.id,
                  item_count: "1",
                  type: "cart_checkout",
                }}
                items={[item]}
                shippingAddress={shippingAddress || undefined}
                className="w-full h-12 bg-[#25D366] hover:bg-[#1da851] text-white border-0 rounded-2xl shadow-lg text-lg font-bold"
              />
              <Button
                onClick={handleBackToShipping}
                variant="outline"
                className="mt-2 w-full rounded-2xl"
              >
                Back to Addresses
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
