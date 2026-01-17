import { useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, MessageCircle, Package, ArrowRight } from "lucide-react";
import { ROUTE_NAMES } from "@/constants/enums";

interface OrderSubmittedState {
  orderReference: string;
  totalAmount: number;
  itemCount: number;
}

const OrderSubmitted = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get order data from navigation state
  const orderData = location.state as OrderSubmittedState | null;

  useEffect(() => {
    // Redirect if no order data
    if (!orderData) {
      navigate(ROUTE_NAMES.HOME);
    }
  }, [orderData, navigate]);

  if (!orderData) {
    return null;
  }

  const { orderReference, totalAmount, itemCount } = orderData;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl min-h-[70vh] flex items-center justify-center">
      <Card className="w-full">
        <CardContent className="p-8 text-center space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
              <div className="relative bg-green-100 dark:bg-green-900/30 rounded-full p-4">
                <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Main Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">
              Order Submitted Successfully!
            </h1>
            <p className="text-muted-foreground">
              Thank you for your order. We've received your payment confirmation.
            </p>
          </div>

          {/* Order Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Reference</span>
              <span className="font-mono font-medium">{orderReference}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items</span>
              <span className="font-medium">{itemCount} item{itemCount > 1 ? "s" : ""}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-medium text-primary">₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Review Status */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Order Under Review</span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              We will verify your payment and confirm your order as soon as possible.
              You'll receive a confirmation message on WhatsApp once verified.
            </p>
          </div>

          {/* What's Next */}
          <div className="space-y-3 text-left">
            <h3 className="font-semibold text-center">What happens next?</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 text-sm">
                <div className="bg-primary/10 rounded-full p-1.5 mt-0.5">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Payment Verification</p>
                  <p className="text-muted-foreground">We'll verify your UPI payment within a few hours</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="bg-primary/10 rounded-full p-1.5 mt-0.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Order Confirmation</p>
                  <p className="text-muted-foreground">You'll receive a WhatsApp message once confirmed</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="bg-primary/10 rounded-full p-1.5 mt-0.5">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Shipping Updates</p>
                  <p className="text-muted-foreground">Track your order from the My Orders page</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              asChild
            >
              <Link to={ROUTE_NAMES.HOME}>
                Continue Shopping
              </Link>
            </Button>
            <Button
              className="flex-1"
              asChild
            >
              <Link to={ROUTE_NAMES.MY_ORDERS}>
                View My Orders
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Having issues? Contact us via WhatsApp for assistance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderSubmitted;
