import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, MessageCircle, ShoppingBag, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { ROUTE_NAMES } from "@/constants/enums";
import { OrderService } from "@/lib/orderService";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import type { CartItem } from "@/lib/orderService";
import type { ShippingAddress } from "@/types/shipping";
import {
  openWhatsApp,
  type WhatsAppOrderData,
} from "@/lib/whatsapp";

// UPI ID from environment variable
const UPI_ID = import.meta.env.VITE_UPI_ID || "";

// Payment timeout in seconds (10 minutes)
const PAYMENT_TIMEOUT_SECONDS = 10 * 60;

interface PaymentConfirmationState {
  items: CartItem[];
  totalAmount: number;
  shippingAddress?: ShippingAddress;
  orderReference: string;
}

const PaymentConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(PAYMENT_TIMEOUT_SECONDS);

  // Get order data from navigation state
  const orderData = location.state as PaymentConfirmationState | null;

  // Handle session expiry
  const handleSessionExpiry = useCallback(() => {
    toast.error("Payment session expired. Please try again.", {
      duration: 5000,
    });
    navigate(ROUTE_NAMES.HOME);
  }, [navigate]);

  // Timer effect
  useEffect(() => {
    if (!orderData) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSessionExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderData, handleSessionExpiry]);

  useEffect(() => {
    // Redirect if no order data
    if (!orderData) {
      navigate(ROUTE_NAMES.HOME);
    }
  }, [orderData, navigate]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Get timer color based on remaining time
  const getTimerColor = (): string => {
    if (timeRemaining <= 60) return "text-red-600 dark:text-red-400";
    if (timeRemaining <= 180) return "text-orange-600 dark:text-orange-400";
    return "text-green-600 dark:text-green-400";
  };

  if (!orderData) {
    return null;
  }

  const { items, totalAmount, shippingAddress, orderReference } = orderData;

  // Generate UPI payment URL for QR code
  const upiPaymentUrl = `upi://pay?pa=${UPI_ID}&pn=ThePlugMarket&am=${totalAmount}&cu=INR&tn=Order-${orderReference}`;

  const handleCopyUPI = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      toast.success("UPI ID copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy UPI ID");
    }
  };

  const handleConfirmPayment = async () => {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    if (timeRemaining <= 0) {
      handleSessionExpiry();
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare WhatsApp order data
      const whatsAppOrderData: WhatsAppOrderData = {
        items,
        totalAmount,
        shippingAddress,
        buyerName: user.user_metadata?.full_name || "Customer",
        buyerEmail: user.email || "",
        orderReference,
      };

      // Open WhatsApp with payment confirmation message
      const whatsAppOpened = openWhatsApp(whatsAppOrderData);

      if (!whatsAppOpened) {
        toast.error("Failed to open WhatsApp. Please ensure WhatsApp is configured.");
        setIsProcessing(false);
        return;
      }

      // Create orders in database (only if not already created)
      if (!orderCreated) {
        await OrderService.processCartCheckout(
          items,
          orderReference,
          orderReference,
          user.id || "",
          {
            full_name: user.user_metadata?.full_name || "",
            email: user.email || "",
          },
          shippingAddress
        );
        setOrderCreated(true);
      }

      // Clear cart
      clearCart();

      // Navigate to order submitted confirmation page
      navigate(ROUTE_NAMES.ORDER_SUBMITTED, {
        state: {
          orderReference,
          totalAmount,
          itemCount: items.length,
        },
      });

      toast.success("Order submitted successfully!");
    } catch (error) {
      console.error("Error processing order:", error);
      toast.error("Failed to process order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!UPI_ID) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payment Not Configured</h2>
            <p className="text-muted-foreground">
              UPI payment is not configured. Please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Complete Your Payment</CardTitle>
          <p className="text-muted-foreground mt-2">
            Scan the QR code or use the UPI ID to pay
          </p>
          {/* Timer Display */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <Clock className={`h-5 w-5 ${getTimerColor()}`} />
            <span className={`text-lg font-mono font-bold ${getTimerColor()}`}>
              {formatTime(timeRemaining)}
            </span>
            <span className="text-sm text-muted-foreground">remaining</span>
          </div>
          {timeRemaining <= 60 && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1 animate-pulse">
              Hurry! Session expiring soon
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Amount Display */}
          <div className="text-center bg-primary/5 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Amount to Pay</p>
            <p className="text-4xl font-bold text-primary">₹{totalAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Order Ref: {orderReference}</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <QRCodeSVG
                value={upiPaymentUrl}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>

          {/* UPI ID */}
          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">Or pay using UPI ID</p>
            <div className="flex items-center justify-center gap-2">
              <code className="bg-muted px-4 py-2 rounded-md text-lg font-mono">
                {UPI_ID}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUPI}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Order Summary */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Order Summary
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm py-2 border-b last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.brand} - Size: {item.size}
                    </p>
                  </div>
                  <p className="font-medium">₹{item.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          {shippingAddress && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Shipping To</h3>
                <div className="text-sm text-muted-foreground">
                  <p>{shippingAddress.full_name}</p>
                  <p>{shippingAddress.address_line1}</p>
                  {shippingAddress.address_line2 && (
                    <p>{shippingAddress.address_line2}</p>
                  )}
                  <p>
                    {shippingAddress.city}, {shippingAddress.state} -{" "}
                    {shippingAddress.pincode}
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium text-blue-800 dark:text-blue-200">How to complete payment:</p>
            <ol className="list-decimal list-inside text-blue-700 dark:text-blue-300 space-y-1">
              <li>Scan the QR code with any UPI app (GPay, PhonePe, Paytm, etc.)</li>
              <li>Or copy the UPI ID and pay manually</li>
              <li>After payment, click the button below to confirm via WhatsApp</li>
            </ol>
          </div>

          {/* Confirm Payment Button */}
          <Button
            onClick={handleConfirmPayment}
            disabled={isProcessing || timeRemaining <= 0}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {isProcessing ? (
              <>Processing...</>
            ) : timeRemaining <= 0 ? (
              <>Session Expired</>
            ) : (
              <>
                <MessageCircle className="mr-2 h-5 w-5" />
                I've Paid - Confirm via WhatsApp
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By clicking above, you confirm that you have completed the UPI payment
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentConfirmation;
