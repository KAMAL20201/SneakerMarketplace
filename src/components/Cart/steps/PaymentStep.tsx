import React from "react";
import { Button } from "@/components/ui/button";
import { PaymentButton } from "@/components/PaymentButton";
import { useCart } from "@/contexts/CartContext";
import { CouponInput } from "@/components/CouponInput";
import type { ShippingAddress } from "@/types/shipping";
import type { CartItem } from "@/lib/orderService";
import type { AppliedCoupon } from "@/types/coupon";
import { ArrowLeft, MapPin, Tag } from "lucide-react";

interface PaymentStepProps {
  shippingAddress: ShippingAddress;
  onBack: () => void;
}

function isItemEligible(item: CartItem, coupon: AppliedCoupon): boolean {
  return (
    coupon.applicableProductIds === null ||
    coupon.applicableProductIds.includes(item.productId)
  );
}

function computeLineDiscount(
  item: CartItem,
  coupon: AppliedCoupon,
  eligibleSubtotal: number
): number {
  const lineTotal = item.price * item.quantity;
  if (coupon.couponType === "percentage") {
    return Math.round(lineTotal * coupon.couponValue) / 100;
  }
  // flat: distribute proportionally across eligible items
  if (eligibleSubtotal === 0) return 0;
  return Math.round((lineTotal / eligibleSubtotal) * coupon.discountAmount * 100) / 100;
}

export const PaymentStep: React.FC<PaymentStepProps> = ({
  shippingAddress,
  onBack,
}) => {
  const {
    items,
    totalPrice,
    appliedCoupon,
    applyDiscount,
    removeCoupon,
    discountedTotal,
  } = useCart();

  const productIds = items.map((i) => i.productId);
  const itemAmounts = items.map((i) => i.price);

  const eligibleSubtotal = appliedCoupon
    ? items
        .filter((i) => isItemEligible(i, appliedCoupon))
        .reduce((s, i) => s + i.price * i.quantity, 0)
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="h-[70%] overflow-y-auto p-4 space-y-4">
        {/* Shipping Address Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-2">Shipping to:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium">{shippingAddress.full_name}</p>
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

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>

          {/* Items list */}
          <div className="space-y-3 mb-3 pb-3 border-b border-gray-200">
            {items.map((item) => {
              const eligible = appliedCoupon
                ? isItemEligible(item, appliedCoupon)
                : false;
              const lineTotal = item.price * item.quantity;
              const lineDiscount =
                eligible && appliedCoupon
                  ? computeLineDiscount(item, appliedCoupon, eligibleSubtotal)
                  : 0;

              return (
                <div key={item.id} className="flex items-center gap-3">
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
                    {eligible && appliedCoupon && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium mt-0.5">
                        <Tag className="h-3 w-3" />
                        Coupon applied
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {eligible && appliedCoupon && lineDiscount > 0 ? (
                      <>
                        <p className="text-xs line-through text-gray-400">
                          ₹{lineTotal}
                        </p>
                        <p className="text-sm font-semibold text-green-700">
                          ₹{(lineTotal - lineDiscount).toFixed(2).replace(/\.00$/, "")}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">
                        ₹{lineTotal}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Subtotal ({items.length} item{items.length !== 1 ? "s" : ""})
              </span>
              <span
                className={
                  appliedCoupon ? "line-through text-gray-400" : "font-medium"
                }
              >
                ₹{totalPrice}
              </span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount ({appliedCoupon.code})</span>
                <span className="font-medium">
                  −₹{appliedCoupon.discountAmount}
                </span>
              </div>
            )}
            <div className="border-t pt-2 mt-1">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>₹{discountedTotal}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Coupon Input */}
        <CouponInput
          orderAmount={totalPrice}
          productIds={productIds}
          itemAmounts={itemAmounts}
          appliedCoupon={appliedCoupon}
          onApply={applyDiscount}
          onRemove={removeCoupon}
        />
      </div>

      {/* Payment Button */}
      <div className="fixed bottom-2 w-full border-t border-gray-200/50 p-4 bg-white/80 backdrop-blur-sm">
        <PaymentButton
          amount={discountedTotal}
          couponCode={appliedCoupon?.code ?? null}
          metadata={{
            cart_items: items.map((item) => item.id).join(","),
            item_count: items.length.toString(),
            type: "cart_checkout",
          }}
          items={items}
          shippingAddress={shippingAddress}
          className="w-full h-12 bg-[#25D366] hover:bg-[#1da851] text-white border-0 rounded-2xl shadow-lg text-lg font-bold"
        />
        <Button
          onClick={onBack}
          className="mt-2 w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl py-3 text-lg font-semibold shadow-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Addresses
        </Button>

        <p className="text-xs text-gray-500 text-center mt-2">
          By proceeding, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};
