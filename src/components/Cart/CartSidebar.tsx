import { useState } from "react";
import { CartHeader } from "./CartHeader";
import { CartItemsStep } from "./steps/CartItemsStep";
import { ShippingStep } from "./steps/ShippingStep";
import { PaymentStep } from "./steps/PaymentStep";
import { useCart } from "@/contexts/CartContext";
import type { ShippingAddress } from "@/types/shipping";
// [GUEST CHECKOUT] Auth import commented out - guests can checkout without login
// import { useAuth } from "@/contexts/AuthContext";
// import { toast } from "sonner";
// import { ROUTE_NAMES } from "@/constants/enums";
// import { useNavigate } from "react-router";

export function CartSidebar() {
  const { isOpen, toggleCart } = useCart();
  // [GUEST CHECKOUT] Auth check removed - guests proceed directly
  // const { user, setOperationAfterLogin } = useAuth();
  const [currentStep, setCurrentStep] = useState<
    "cart" | "shipping" | "payment"
  >("cart");
  const [shippingAddress, setShippingAddress] =
    useState<ShippingAddress | null>(null);
  // const navigate = useNavigate();

  if (!isOpen) return null;

  const handleShippingComplete = (address: ShippingAddress) => {
    setShippingAddress(address);
    setCurrentStep("payment");
  };

  const handleBackToCart = () => {
    setCurrentStep("cart");
    setShippingAddress(null);
  };

  const handleBackToShipping = () => {
    setCurrentStep("shipping");
  };

  const handleCloseCart = () => {
    toggleCart();
    // Reset to initial state when closing
    setCurrentStep("cart");
    setShippingAddress(null);
  };

  const renderStep = () => {
    switch (currentStep) {
      case "cart":
        return (
          <CartItemsStep
            onNext={() => {
              /* [GUEST CHECKOUT] Login check removed - guests proceed to shipping directly
              if (!user) {
                toggleCart();
                toast.error("Please login to continue");
                navigate(ROUTE_NAMES.LOGIN);
                setOperationAfterLogin(() => () => {
                  toggleCart();
                });
              } else {
                setCurrentStep("shipping");
              }
              */
              setCurrentStep("shipping");
            }}
          />
        );

      case "shipping":
        return (
          <ShippingStep
            onBack={handleBackToCart}
            onNext={handleShippingComplete}
          />
        );

      case "payment":
        return (
          <PaymentStep
            shippingAddress={shippingAddress!}
            onBack={handleBackToShipping}
          />
        );

      default:
        return <CartItemsStep onNext={() => setCurrentStep("shipping")} />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md z-50"
        onClick={handleCloseCart}
      />

      {/* Cart Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white/95 backdrop-blur-xl border-l border-gray-200/50 shadow-2xl cart-sidebar">
        <div className="flex flex-col h-full">
          {/* Header with step indicator */}
          <CartHeader currentStep={currentStep} onClose={handleCloseCart} />

          {/* Dynamic content based on step */}
          {renderStep()}
        </div>
      </div>
    </>
  );
}
