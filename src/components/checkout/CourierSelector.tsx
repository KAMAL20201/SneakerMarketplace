import React from "react";
import { Truck, Check } from "lucide-react";
import {
  COURIER_OPTIONS,
  type CourierOption,
} from "@/contexts/CartContext";

interface CourierSelectorProps {
  selected: CourierOption;
  onChange: (option: CourierOption) => void;
}

/**
 * Radio-card picker for courier / delivery method.
 * Renders one card per COURIER_OPTIONS entry.
 */
export const CourierSelector: React.FC<CourierSelectorProps> = ({
  selected,
  onChange,
}) => {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
        <Truck className="h-4 w-4 text-gray-500" />
        Delivery Method
      </h4>

      <div className="space-y-2">
        {COURIER_OPTIONS.map((option) => {
          const isActive = selected.id === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option)}
              className={`
                w-full flex items-center gap-3 rounded-xl border-2 px-3 py-2.5
                transition-all duration-150 text-left
                ${
                  isActive
                    ? "border-gray-900 bg-gray-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }
              `}
            >
              {/* Radio indicator */}
              <span
                className={`
                  flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2
                  transition-colors
                  ${
                    isActive
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white"
                  }
                `}
              >
                {isActive && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>

              {/* Label + ETA */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    isActive ? "text-gray-900" : "text-gray-700"
                  }`}
                >
                  {option.label}
                </p>
                <p className="text-xs text-gray-500">
                  Est. {option.eta}
                </p>
              </div>

              {/* Price */}
              <span className="text-sm font-semibold text-gray-900 shrink-0">
                ₹{option.price}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
