import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShippingAddressForm } from "@/components/checkout/ShippingAddressForm";
import { AddressCard } from "@/components/checkout/AddressCard";
import { useAddressStorage } from "@/hooks/useAddressStorage";
import type { ShippingAddress } from "@/types/shipping";
import { Plus, ArrowLeft } from "lucide-react";

interface ShippingStepProps {
  onBack: () => void;
  onNext: (address: ShippingAddress) => void;
}

export const ShippingStep: React.FC<ShippingStepProps> = ({
  onBack,
  onNext,
}) => {
  const [shippingAddress, setShippingAddress] =
    useState<ShippingAddress | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(
    null
  );
  const {
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefault,
    defaultAddress,
    loading,
  } = useAddressStorage();

  // Auto-select default address (or first address) when addresses load
  useEffect(() => {
    if (!loading && addresses.length > 0 && shippingAddress === null) {
      const defaultAddr =
        addresses.find((addr) => addr.id === defaultAddress) ?? addresses[0];
      setShippingAddress(defaultAddr);
    }
  }, [loading, addresses, defaultAddress, shippingAddress]);

  const handleSubmit = async (address: ShippingAddress) => {
    try {
      if (editingAddress) {
        const success = await updateAddress(editingAddress.id!, address);
        if (success) {
          setEditingAddress(null);
          setShowNewAddressForm(false);
          setShippingAddress(address);
        }
      } else {
        const success = await addAddress(address);
        if (success) {
          setShowNewAddressForm(false);
          onNext(address);
        }
      }
    } catch (error) {
      console.error("Failed to save address:", error);
    }
  };

  const handleAddressSelect = (address: ShippingAddress) => {
    setShippingAddress(address);
  };

  const handleEditAddress = (address: ShippingAddress) => {
    setEditingAddress(address);
    setShowNewAddressForm(true);
  };

  const handleDeleteAddress = async (address: ShippingAddress) => {
    if (confirm("Are you sure you want to delete this address?")) {
      try {
        const success = await deleteAddress(address.id!);
        if (success && shippingAddress?.id === address.id) {
          setShippingAddress(null);
        }
      } catch (error) {
        console.error("Failed to delete address:", error);
      }
    }
  };

  const handleContinue = () => {
    if (shippingAddress) {
      onNext(shippingAddress);
    }
  };

  const isFormValid = shippingAddress !== null;

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading addresses...</div>
          </div>
        )}

        {/* Saved Addresses */}
        {!loading && addresses.length > 0 && !showNewAddressForm && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Saved Addresses</h4>
            <div className="space-y-3">
              {addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  isDefault={address.id === defaultAddress}
                  isSelected={shippingAddress?.id === address.id}
                  onSelect={() => handleAddressSelect(address)}
                  onEdit={() => handleEditAddress(address)}
                  onDelete={() => handleDeleteAddress(address)}
                  onSetDefault={async () => {
                    try {
                      await setDefault(address.id!);
                    } catch (error) {
                      console.error("Failed to set default address:", error);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* New Address Form or Add New Button */}
        {!loading &&
          (showNewAddressForm ? (
            <div className="border-t border-gray-200/50 ">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">
                  {editingAddress ? "Edit Address" : "Add New Address"}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNewAddressForm(false);
                    setEditingAddress(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </Button>
              </div>
              <ShippingAddressForm
                onSubmit={handleSubmit}
                initialData={editingAddress || undefined}
                isEdit={!!editingAddress}
              />
            </div>
          ) : (
            <div className="border-t border-gray-200/50 pt-6">
              <Button
                variant="outline"
                onClick={() => setShowNewAddressForm(true)}
                className="w-full border-dashed border-2 border-gray-300 hover:border-purple-300 hover:bg-purple-50 text-gray-600 hover:text-purple-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Address
              </Button>
            </div>
          ))}
      </div>

      {/* Footer with Continue Button — hidden when form is open (form has its own submit) */}
      {!showNewAddressForm && <div className="flex-shrink-0 border-t border-gray-200/50 p-4 bg-white/80 backdrop-blur-sm">
        <Button
          onClick={handleContinue}
          disabled={!isFormValid}
          className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl py-3 text-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Payment
        </Button>

        <Button
          onClick={onBack}
          className="mt-2 w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl py-3 text-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cart
        </Button>

        {!isFormValid && (
          <p className="text-sm text-gray-500 text-center mt-2">
            Please select or add a shipping address to continue
          </p>
        )}
      </div>}
    </div>
  );
};
