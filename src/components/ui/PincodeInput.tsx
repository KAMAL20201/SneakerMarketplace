import React, { useState } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { PincodeService } from "../../lib/services/pincodeService";
import type { PincodeData } from "../../types/shipping";

interface PincodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onPincodeFound?: (data: PincodeData) => void;
  error?: string;
  required?: boolean;
  className?: string;
}

export const PincodeInput: React.FC<PincodeInputProps> = ({
  value,
  onChange,
  onPincodeFound,
  error,
  required = false,
  className = "",
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string>("");

  const checkPincode = async (pincode: string) => {
    if (pincode.length === 6 && PincodeService.validateFormat(pincode)) {
      setIsLoading(true);
      setLookupError("");

      try {
        const data = await PincodeService.lookupPincode(pincode);
        if (data) {
          onPincodeFound?.(data);
        } else {
          setLookupError("Pincode not found");
        }
      } catch {
        setLookupError("Unable to verify pincode");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/\D/g, "").substring(0, 6);
    if (newValue.length === 6) {
      checkPincode(newValue);
    }
    onChange(newValue);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="pincode">
        Pincode {required && <span className="text-red-500">*</span>}
      </Label>

      <div className="relative">
        <Input
          id="pincode"
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder="Enter 6-digit pincode"
          className={`pr-10 ${error || lookupError ? "border-red-500" : ""}`}
          maxLength={6}
        />

        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent" />
          </div>
        )}
      </div>

      {/* Validation Messages */}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {lookupError && <p className="text-sm text-red-500">{lookupError}</p>}
    </div>
  );
};
