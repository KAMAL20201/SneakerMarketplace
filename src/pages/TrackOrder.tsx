import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router";
import { supabase, toStorageUrl } from "@/lib/supabase";
import { ThumbnailImage } from "@/components/ui/OptimizedImage";
import { getEuSizeFromUk } from "@/constants/sizeCharts";
import {
  Package,
  CheckCircle,
  Truck,
  MapPin,
  Calendar,
  ShoppingBag,
  AlertCircle,
  ArrowLeft,
  Search,
  Loader2,
  Mail,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

interface ShippingAddress {
  full_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  landmark?: string;
}

interface TrackedOrder {
  order_id: string;
  order_status: "confirmed" | "shipped" | "delivered";
  product_title: string;
  product_brand: string | null;
  product_image: string | null;
  amount: number;
  variant_name: string | null;
  ordered_size: string | null;
  tracking_number: string | null;
  courier_name: string | null;
  shipping_address: ShippingAddress | null;
  buyer_name: string | null;
  order_created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatPrice = (price: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

// ── Status Stepper ───────────────────────────────────────────────────────────

const STEPS = [
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Package },
] as const;

const getStepIndex = (status: TrackedOrder["order_status"]): number =>
  STEPS.findIndex((s) => s.key === status);

interface StatusStepperProps {
  status: TrackedOrder["order_status"];
}

const StatusStepper = ({ status }: StatusStepperProps) => {
  const activeIdx = getStepIndex(status);

  return (
    <div className="flex items-center justify-between w-full max-w-md mx-auto mb-8">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isCompleted = idx <= activeIdx;
        const isCurrent = idx === activeIdx;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-initial">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isCurrent
                    ? "bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-200 ring-4 ring-purple-100"
                    : isCompleted
                      ? "bg-gradient-to-br from-green-400 to-emerald-500 shadow-md shadow-green-100"
                      : "bg-gray-100 border-2 border-gray-200"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isCompleted || isCurrent ? "text-white" : "text-gray-400"
                  }`}
                />
                {isCurrent && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-purple-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </div>
              <span
                className={`mt-2 text-xs font-semibold ${
                  isCurrent
                    ? "text-purple-700"
                    : isCompleted
                      ? "text-green-700"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div className="flex-1 mx-2 mt-[-1.25rem]">
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${
                    idx < activeIdx
                      ? "bg-gradient-to-r from-green-400 to-emerald-400"
                      : "bg-gray-200"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Loading State ────────────────────────────────────────────────────────────

const LoadingState = () => (
  <div className="min-h-screen flex items-center justify-center px-4">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
      <p className="text-gray-600 font-medium">Loading your order…</p>
    </div>
  </div>
);

// ── Order Search Form Component ───────────────────────────────────────────────

interface OrderSearchFormProps {
  onSearch: (orderId: string, email: string) => Promise<void>;
  searching: boolean;
  errorMessage?: string | null;
}

const OrderSearchForm = ({ onSearch, searching, errorMessage }: OrderSearchFormProps) => {
  const [inputOrderId, setInputOrderId] = useState("");
  const [inputEmail, setInputEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputOrderId.trim()) {
      toast.error("Please enter your Order ID");
      return;
    }
    if (!inputEmail.trim()) {
      toast.error("Please enter your Email address");
      return;
    }
    onSearch(inputOrderId.trim(), inputEmail.trim());
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="glass-card border-0 rounded-3xl p-8 max-w-md w-full shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Track Your Order</h1>
          <p className="text-sm text-gray-600">
            Enter your Order ID and Email to view live status
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 leading-relaxed font-medium">
              {errorMessage}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Order ID
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="e.g. 84A29F1C"
                value={inputOrderId}
                onChange={(e) => setInputOrderId(e.target.value)}
                className="pl-10 rounded-2xl bg-white/70 border-gray-200 focus:border-purple-500 h-11"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                className="pl-10 rounded-2xl bg-white/70 border-gray-200 focus:border-purple-500 h-11"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={searching}
            className="w-full h-11 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:opacity-95 text-white font-semibold rounded-2xl shadow-md transition-all mt-2"
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching Order…
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Track Order
              </>
            )}
          </Button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Have a tracking link from your email? Simply click that link to view your order.
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

export default function TrackOrder() {
  const [searchParams, setSearchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrderByToken = async (currentToken: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const { data, error } = await supabase.rpc(
        "get_order_by_tracking_token",
        { p_token: currentToken },
      );

      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setOrder(null);
        setErrorMessage("Order not found or not yet confirmed. Please verify your order details.");
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        setOrder(row as TrackedOrder);
      }
    } catch {
      setOrder(null);
      setErrorMessage("An unexpected error occurred while fetching order status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOrderByToken(token);
    } else {
      setOrder(null);
      setLoading(false);
    }
  }, [token]);

  const handleManualSearch = async (orderId: string, email: string) => {
    setSearching(true);
    setErrorMessage(null);

    try {
      const { data: foundToken, error } = await supabase.rpc(
        "lookup_order_tracking_token",
        {
          p_order_id: orderId,
          p_email: email,
        },
      );

      if (error || !foundToken) {
        setErrorMessage(
          "No confirmed order found matching that Order ID and Email address. Please check your order details or wait until payment is confirmed.",
        );
        toast.error("Order not found");
      } else {
        // Update URL with token param & load order
        setSearchParams({ token: foundToken });
        fetchOrderByToken(foundToken);
      }
    } catch {
      setErrorMessage("Failed to look up order. Please try again.");
      toast.error("Lookup failed");
    } finally {
      setSearching(false);
    }
  };

  if (loading) return <LoadingState />;

  // If no order loaded yet (or no token provided / invalid token), show search form
  if (!order) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to store
          </Link>
          <OrderSearchForm
            onSearch={handleManualSearch}
            searching={searching}
            errorMessage={errorMessage}
          />
        </div>
      </div>
    );
  }

  const address = order.shipping_address;

  // Derive sizes
  const ukSize = order.ordered_size?.replace(/^UK\s*/i, "").trim();
  const euSize =
    ukSize && order.product_brand
      ? getEuSizeFromUk(order.product_brand, ukSize)
      : null;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Top Header & Actions */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to store
          </Link>

          <button
            onClick={() => {
              setSearchParams({});
              setOrder(null);
            }}
            className="text-xs font-semibold text-purple-600 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100 transition-colors flex items-center gap-1"
          >
            <Search className="h-3.5 w-3.5" />
            Track Another Order
          </button>
        </div>

        {/* Title Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Track Your Order
          </h1>
          {order.buyer_name && (
            <p className="text-gray-500 text-sm">
              Hi {order.buyer_name}, here's your order status
            </p>
          )}
        </div>

        {/* Status Stepper */}
        <StatusStepper status={order.order_status} />

        {/* Order Card */}
        <div className="glass-card border-0 rounded-3xl overflow-hidden shadow-lg">
          {/* Product Section */}
          <div className="p-6">
            <div className="flex gap-4">
              {/* Product Image */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
                <ThumbnailImage
                  src={toStorageUrl(order.product_image) || "/placeholder.svg"}
                  alt={order.product_title}
                  className="w-full h-full"
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                {order.product_brand && (
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">
                    {order.product_brand}
                  </p>
                )}
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2 leading-tight">
                  {order.product_title}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {order.variant_name && (
                    <span className="inline-block text-xs font-semibold capitalize bg-purple-100 text-purple-700 px-2 py-0.5 rounded-lg">
                      {order.variant_name}
                    </span>
                  )}
                  {ukSize && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                      <span>UK {ukSize}</span>
                      {euSize && (
                        <>
                          <span className="text-gray-300">/</span>
                          <span className="text-blue-600">EU {euSize}</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="border-t border-gray-100 px-6 py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Order ID</span>
              <span className="text-sm font-bold text-gray-800 font-mono">
                #{order.order_id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Amount</span>
              <span className="text-base font-bold text-gray-900">
                {formatPrice(order.amount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Ordered
              </span>
              <span className="text-sm font-medium text-gray-700">
                {formatDate(order.order_created_at)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Status</span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full capitalize ${
                  order.order_status === "delivered"
                    ? "bg-green-100 text-green-800"
                    : order.order_status === "shipped"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                }`}
              >
                {order.order_status === "confirmed" && (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
                {order.order_status === "shipped" && (
                  <Truck className="h-3.5 w-3.5" />
                )}
                {order.order_status === "delivered" && (
                  <Package className="h-3.5 w-3.5" />
                )}
                {order.order_status}
              </span>
            </div>
          </div>

          {/* Tracking Number */}
          {order.tracking_number && (
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5" />
                  Shipping Details
                </p>
                <div className="space-y-1.5">
                  {order.courier_name && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Courier:</span>{" "}
                      {order.courier_name}
                    </p>
                  )}
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">AWB / Tracking:</span>{" "}
                    <span className="font-mono font-bold text-purple-800">
                      {order.tracking_number}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Shipping Address */}
          {address && (
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Delivering To
                </p>
                <div className="text-sm text-gray-700 space-y-0.5">
                  {address.full_name && (
                    <p className="font-medium">{address.full_name}</p>
                  )}
                  {address.address_line1 && <p>{address.address_line1}</p>}
                  {address.address_line2 && <p>{address.address_line2}</p>}
                  {(address.city || address.state || address.pincode) && (
                    <p>
                      {[address.city, address.state]
                        .filter(Boolean)
                        .join(", ")}
                      {address.pincode ? ` – ${address.pincode}` : ""}
                    </p>
                  )}
                  {address.landmark && (
                    <p className="text-gray-500 text-xs">
                      Landmark: {address.landmark}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status Message */}
          <div className="border-t border-gray-100 px-6 py-4">
            <div
              className={`rounded-xl p-4 border text-center ${
                order.order_status === "delivered"
                  ? "bg-green-50 border-green-100"
                  : order.order_status === "shipped"
                    ? "bg-purple-50 border-purple-100"
                    : "bg-blue-50 border-blue-100"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  order.order_status === "delivered"
                    ? "text-green-800"
                    : order.order_status === "shipped"
                      ? "text-purple-800"
                      : "text-blue-800"
                }`}
              >
                {order.order_status === "confirmed" &&
                  "Your order has been confirmed and is being prepared for shipping. We'll email you when it ships!"}
                {order.order_status === "shipped" &&
                  "Your order is on its way! Use the tracking number above to follow your package."}
                {order.order_status === "delivered" &&
                  "Your order has been delivered. Enjoy your purchase! 🎉"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center mt-8">
          <Link to="/">
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl px-8 py-3 shadow-md hover:shadow-lg transition-all font-semibold">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Continue Shopping
            </Button>
          </Link>
          <p className="text-xs text-gray-400 mt-3">
            Need help?{" "}
            <Link
              to="/contact-us"
              className="text-purple-500 hover:text-purple-700 font-medium"
            >
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
