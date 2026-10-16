import React from "react";
import { Plane, Truck } from "lucide-react";
import {
  SHIPPING_METHODS,
  type ShippingMode,
} from "@/constants/shipping";

interface ShippingMethodSelectorProps {
  selected: ShippingMode;
  onChange: (mode: ShippingMode) => void;
  /** Per-mode shipping total for the current items, shown on each card */
  shippingFees: Record<ShippingMode, number>;
  itemCount: number;
}

const MODE_ICONS: Record<ShippingMode, React.ComponentType<{ className?: string }>> = {
  surface: Truck,
  air: Plane,
};

const MODE_ORDER: ShippingMode[] = ["surface", "air"];

/**
 * Delivery method picker: Surface (Delhivery, fully prepaid) or
 * Air (BlueDart, part cash on delivery).
 */
export const ShippingMethodSelector: React.FC<ShippingMethodSelectorProps> = ({
  selected,
  onChange,
  shippingFees,
  itemCount,
}) => {
  return (
    <div role="radiogroup" aria-label="Delivery method" className="space-y-2">
      <p className="text-xs font-semibold text-gray-900">Delivery method</p>
      {MODE_ORDER.map((mode) => {
        const method = SHIPPING_METHODS[mode];
        const Icon = MODE_ICONS[mode];
        const isSelected = selected === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(mode)}
            className={`flex w-full min-h-11 items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${
              isSelected
                ? "border-purple-500 bg-purple-50/70 ring-1 ring-purple-500"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                isSelected ? "border-purple-600" : "border-gray-300"
              }`}
            >
              {isSelected && <span className="h-2 w-2 rounded-full bg-purple-600" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <Icon className="h-4 w-4 shrink-0 text-purple-600" />
                  <span className="truncate">{method.label}</span>
                  {mode === "air" && (
                    <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                      COD
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-semibold text-gray-900">
                  ₹{shippingFees[mode]}
                </span>
              </span>
              <span className="mt-0.5 block text-xs text-gray-600">
                {method.courier} · {method.eta}
                {itemCount > 1 ? ` · ${itemCount} items` : ""}
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">{method.paymentNote}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

interface PaymentSplitRowsProps {
  codAmount: number;
  payNowAmount: number;
}

/** "Pay now" / "Cash on delivery" rows shown under the order total for Air */
export const PaymentSplitRows: React.FC<PaymentSplitRowsProps> = ({
  codAmount,
  payNowAmount,
}) => {
  if (codAmount <= 0) return null;
  return (
    <div className="mt-2 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm">
      <div className="flex justify-between font-semibold text-gray-900">
        <span>Pay now</span>
        <span>₹{payNowAmount}</span>
      </div>
      <div className="flex justify-between text-amber-800">
        <span>Cash on delivery ({SHIPPING_METHODS.air.courier})</span>
        <span className="font-medium">₹{codAmount}</span>
      </div>
    </div>
  );
};
