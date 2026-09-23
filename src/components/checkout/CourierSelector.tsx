import React from "react";
import { Truck } from "lucide-react";
import type { CourierOption } from "@/contexts/CartContext";

interface CourierSelectorProps {
  selected?: CourierOption;
  onChange?: (option: CourierOption) => void;
}

/**
 * Delivery partner notice displaying shipping method.
 * Items are shipped via Delhivery or BlueDart based on serviceability.
 */
export const CourierSelector: React.FC<CourierSelectorProps> = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/90 p-3.5 shadow-sm">
      <div className="flex items-center gap-2 font-semibold text-gray-900 text-xs">
        <Truck className="h-4 w-4 text-purple-600 shrink-0" />
        Delivery Partner
      </div>
      <p className="mt-1 text-xs text-gray-600 leading-relaxed pl-6">
        Your item will be shipped by either <span className="font-semibold text-gray-800">Delhivery</span> or <span className="font-semibold text-gray-800">BlueDart</span> based on serviceability.
      </p>
    </div>
  );
};
