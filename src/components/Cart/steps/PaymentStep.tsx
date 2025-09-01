import React from "react";
import { Button } from "@/components/ui/button";
import { PaymentButton } from "@/components/PaymentButton";
import { useCart } from "@/contexts/CartContext";
import type { ShippingAddress } from "@/types/shipping";
import { ArrowLeft, MapPin } from "lucide-react";

interface PaymentStepProps {
  shippingAddress: ShippingAddress;
  onBack: () => void;
}

export const PaymentStep: React.FC<PaymentStepProps> = ({
  shippingAddress,
  onBack,
}) => {
  const { items, totalPrice } = useCart();
  // const [shippingCost, setShippingCost] = useState(0);
  // const [deliveryEstimate, setDeliveryEstimate] = useState("3-5 business days");

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="h-[70%] overflow-y-auto p-4 space-y-6">
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
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">
                Subtotal ({items.length} items)
              </span>
              <span className="font-medium">₹{totalPrice}</span>
            </div>
            {/* <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span className="font-medium">₹{shippingCost}</span>
            </div> */}
            <div className="border-t pt-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>₹{totalPrice}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Button */}
      <div className="fixed bottom-2 w-full border-t border-gray-200/50 p-4 bg-white/80 backdrop-blur-sm">
        <PaymentButton
          amount={totalPrice}
          metadata={{
            cart_items: items.map((item) => item.id).join(","),
            item_count: items.length.toString(),
            type: "cart_checkout",
          }}
          items={items}
          shippingAddress={shippingAddress}
          className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl shadow-lg text-lg font-bold"
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
