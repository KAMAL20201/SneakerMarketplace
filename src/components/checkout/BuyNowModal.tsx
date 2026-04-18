import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShippingStep } from "@/components/Cart/steps/ShippingStep";
import { Button } from "@/components/ui/button";
import { MapPin, Tag } from "lucide-react";
import type { ShippingAddress } from "@/types/shipping";
import { PaymentButton } from "@/components/PaymentButton";
import { CouponInput } from "@/components/CouponInput";
import type { CartItem } from "@/lib/orderService";
import type { AppliedCoupon } from "@/types/coupon";

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
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const discountedAmount = appliedCoupon
    ? Math.max(amount - appliedCoupon.discountAmount, 0)
    : amount;

  const handleShippingNext = (address: ShippingAddress) => {
    setShippingAddress(address);
    setStep("payment");
  };

  const handleBackToShipping = () => {
    setStep("shipping");
  };

  const handleClose = () => {
    setStep("shipping");
    setShippingAddress(null);
    setAppliedCoupon(null);
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
            <div className="flex-1 min-h-0 overflow-hidden">
              <ShippingStep onBack={handleClose} onNext={handleShippingNext} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-[80vh]">
            <div className="px-4 pt-4">
              <DialogHeader>
                <DialogTitle>Confirm & Order</DialogTitle>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

                {/* Item row */}
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-12 h-12 object-cover rounded-lg shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.brand} · Size {item.size}
                        {item.variantName ? ` · ${item.variantName}` : ""}
                      </p>
                      {appliedCoupon &&
                        (appliedCoupon.applicableProductIds === null ||
                          appliedCoupon.applicableProductIds.includes(item.productId)) && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium mt-0.5">
                            <Tag className="h-3 w-3" />
                            Coupon applied
                          </span>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                      {appliedCoupon &&
                      (appliedCoupon.applicableProductIds === null ||
                        appliedCoupon.applicableProductIds.includes(item.productId)) ? (
                        <>
                          <p className="text-xs line-through text-gray-400">₹{amount}</p>
                          <p className="text-sm font-semibold text-green-700">₹{discountedAmount}</p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-gray-900">₹{amount}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal (1 item)</span>
                    <span className={appliedCoupon ? "line-through text-gray-400" : "font-medium"}>
                      ₹{amount}
                    </span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({appliedCoupon.code})</span>
                      <span className="font-medium">−₹{appliedCoupon.discountAmount}</span>
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>₹{discountedAmount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coupon Input */}
              <CouponInput
                orderAmount={amount}
                productIds={[item.productId]}
                itemAmounts={[amount]}
                appliedCoupon={appliedCoupon}
                onApply={setAppliedCoupon}
                onRemove={() => setAppliedCoupon(null)}
              />
            </div>

            {/* Footer with Payment */}
            <div className="border-t border-gray-200/50 p-4 bg-white/80 backdrop-blur-sm">
              <PaymentButton
                amount={discountedAmount}
                couponCode={appliedCoupon?.code ?? null}
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
