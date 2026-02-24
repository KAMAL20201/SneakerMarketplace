import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ROUTE_HELPERS } from "@/constants/enums";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Calendar,
  Eye,
  ShoppingBag,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  User,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { ThumbnailImage } from "@/components/ui/OptimizedImage";
import { OrderService, type Order as OrderType } from "@/lib/orderService";
import { toast } from "sonner";
import ShipNowModal from "@/components/ShipNowModal";
import { StockValidationService } from "@/lib/stockValidationService";
import { EmailService, type OrderEmailData } from "@/lib/emailService";

// Use the OrderType from orderService, but extend it with product details
interface Order extends OrderType {
  product_listings?: {
    title: string;
    brand: string;
    product_images: Array<{
      image_url: string;
      is_poster_image: boolean;
    }>;
  };
}

const getStatusIcon = (status: Order["status"]) => {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4" />;
    case "pending_payment":
      return <Clock className="h-4 w-4" />;
    case "confirmed":
      return <CheckCircle className="h-4 w-4" />;
    case "shipped":
      return <Truck className="h-4 w-4" />;
    case "delivered":
      return <Package className="h-4 w-4" />;
    case "cancelled":
      return <XCircle className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

const getStatusColor = (status: Order["status"]) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "pending_payment":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "confirmed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "shipped":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "delivered":
      return "bg-green-100 text-green-800 border-green-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusLabel = (status: Order["status"]) => {
  if (status === "pending_payment") return "Awaiting Payment";
  return status;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
};

const EmptyOrdersState = () => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="glass-card border-0 rounded-3xl p-8 text-center max-w-md">
      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
        <ShoppingBag className="h-12 w-12 text-purple-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-3">
        No Orders Yet
      </h3>
      <p className="text-gray-600 mb-6 leading-relaxed">
        No orders have been placed yet. Orders will appear here when customers make purchases.
      </p>
    </div>
  </div>
);

// [GUEST CHECKOUT] Orders page is admin-only — shows all sell orders with buyer info.
// Guests receive order confirmations via email; there is no guest orders page.
const MyOrders = () => {
  const { user } = useAuth();
  const [sellOrders, setSellOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Ship Now modal state
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const openShipModal = (order: Order) => {
    setSelectedOrder(order);
    setShipModalOpen(true);
  };

  // Pagination state for sell orders
  const [sellCurrentPage, setSellCurrentPage] = useState(1);
  const [sellTotalPages, setSellTotalPages] = useState(1);

  const itemsPerPage = 5;

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // [GUEST CHECKOUT] Admin sees all sell orders (they are the only seller)
        const sellerOrders = await OrderService.getSellerOrders(user.id);
        setSellOrders(sellerOrders);
        setSellTotalPages(Math.ceil(sellerOrders.length / itemsPerPage));
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOrders();
    }
  }, [user]);

  // Get paginated orders for current tab
  const getPaginatedOrders = (orders: Order[], currentPage: number) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return orders.slice(startIndex, endIndex);
  };

  if (loading) {
    return (
      <div className="min-h-screen ">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your orders...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Orders</h1>
          <p className="text-gray-600">
            All customer orders ({sellOrders.length})
          </p>
        </div>

        {/* Sell Orders */}
        <div className="space-y-6">
          {sellOrders.length === 0 ? (
            <EmptyOrdersState />
          ) : (
            <>
              <div className="space-y-6">
                {getPaginatedOrders(sellOrders, sellCurrentPage).map(
                  (order) => (
                    <Card
                      key={order.id}
                      className="glass-card border-0 rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-300"
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-2xl ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {getStatusIcon(order.status)}
                            </div>
                            <div>
                              <CardTitle className="text-lg font-bold text-gray-900">
                                Order #{order.id.slice(0, 8)}
                              </CardTitle>
                              <p className="text-sm text-gray-600">
                                {formatDate(order.created_at)}
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={`${getStatusColor(
                              order.status
                            )} border rounded-xl capitalize`}
                          >
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="flex flex-col gap-4">
                          <div className="flex gap-4">
                            {/* Product Image */}
                            <div className="w-20 h-20 flex-shrink-0">
                              <ThumbnailImage
                                src={
                                  order.product_listings?.product_images?.find(
                                    (img) => img.is_poster_image
                                  )?.image_url ||
                                  order.product_listings?.product_images?.[0]
                                    ?.image_url ||
                                  "/placeholder.svg"
                                }
                                alt={
                                  order.product_listings?.title || "Product"
                                }
                                className="w-full h-full"
                              />
                            </div>

                            {/* Product Details */}
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-xs text-purple-600 font-semibold">
                                    {order.product_listings?.brand || "Brand"}
                                  </p>
                                  <h3 className="font-bold text-gray-800 mb-1">
                                    {order.product_listings?.title ||
                                      "Product"}
                                  </h3>
                                  {order.ordered_size && (
                                    <span className="inline-block text-xs font-semibold uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                                      Size: {order.ordered_size}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-gray-900">
                                    {formatPrice(order.amount)}
                                  </p>
                                </div>
                              </div>

                              {/* Order Details */}
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(order.created_at)}</span>
                                </div>
                                {order.tracking_number && (
                                  <div className="flex items-center gap-1">
                                    <Truck className="h-4 w-4" />
                                    <span>
                                      Tracking: {order.tracking_number}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* [GUEST CHECKOUT] Buyer Contact Info */}
                          {(order.buyer_name || order.buyer_email || order.buyer_phone) && (
                            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                              <p className="text-xs font-semibold text-blue-700 mb-2">Buyer Info</p>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                                {order.buyer_name && (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3.5 w-3.5 text-blue-500" />
                                    <span>{order.buyer_name}</span>
                                  </div>
                                )}
                                {order.buyer_email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5 text-blue-500" />
                                    <span>{order.buyer_email}</span>
                                  </div>
                                )}
                                {order.buyer_phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5 text-blue-500" />
                                    <span>{order.buyer_phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Shipping Address */}
                          {order.shipping_address && (
                            <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                              <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                Shipping Address
                              </p>
                              <div className="text-sm text-gray-700 space-y-0.5">
                                {order.shipping_address.full_name && (
                                  <p className="font-medium">{order.shipping_address.full_name}</p>
                                )}
                                {order.shipping_address.address_line1 && (
                                  <p>{order.shipping_address.address_line1}</p>
                                )}
                                {order.shipping_address.address_line2 && (
                                  <p>{order.shipping_address.address_line2}</p>
                                )}
                                {(order.shipping_address.city || order.shipping_address.state || order.shipping_address.pincode) && (
                                  <p>
                                    {[order.shipping_address.city, order.shipping_address.state].filter(Boolean).join(", ")}
                                    {order.shipping_address.pincode ? ` – ${order.shipping_address.pincode}` : ""}
                                  </p>
                                )}
                                {order.shipping_address.landmark && (
                                  <p className="text-gray-500 text-xs">Landmark: {order.shipping_address.landmark}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-3 items-center">
                            <Link
                              to={ROUTE_HELPERS.PRODUCT_DETAIL(
                                order.product_id
                              )}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="glass-button border-gray-200 rounded-2xl"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Product
                              </Button>
                            </Link>
                            {order.status === "pending_payment" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white hover:text-white border-gray-200 rounded-2xl"
                                onClick={async () => {
                                  try {
                                    // Mark the ordered size (or whole product for single-size) as sold
                                    await StockValidationService.markSizeAsSold(order.product_id, order.ordered_size || "");
                                    await OrderService.updateOrderStatus(order.id, "confirmed");
                                    setSellOrders((prev) =>
                                      prev.map((o) =>
                                        o.id === order.id ? { ...o, status: "confirmed" as const } : o
                                      )
                                    );

                                    // Send order confirmation emails now that payment is confirmed
                                    const productTitle = order.product_listings?.title || "Product";
                                    const productImage =
                                      order.product_listings?.product_images?.find((img) => img.is_poster_image)?.image_url ||
                                      order.product_listings?.product_images?.[0]?.image_url;
                                    const orderEmailData: OrderEmailData = {
                                      order_id: order.id,
                                      product_title: productTitle,
                                      product_image: productImage,
                                      amount: order.amount,
                                      currency: "INR",
                                      buyer_name: order.buyer_name,
                                      buyer_email: order.buyer_email,
                                      seller_name: user?.user_metadata?.full_name,
                                      seller_email: user?.email,
                                      order_status: "confirmed",
                                      shipping_address: order.shipping_address,
                                    };
                                    try {
                                      if (order.buyer_email) {
                                        await EmailService.sendOrderConfirmationToBuyer(
                                          order.buyer_email,
                                          order.buyer_name || "",
                                          orderEmailData
                                        );
                                      }
                                      // if (user?.email) {
                                      //   await EmailService.sendOrderConfirmationToSeller(
                                      //     user.email,
                                      //     user.user_metadata?.full_name || "",
                                      //     orderEmailData
                                      //   );
                                      // }
                                    } catch {
                                      // Email failure should not block the confirmation
                                    }

                                    toast.success("Payment confirmed! Order is now ready to ship.");
                                  } catch {
                                    toast.error("Failed to confirm payment");
                                  }
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm Payment
                              </Button>
                            )}
                            {order.status === "confirmed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white hover:text-white border-gray-200 rounded-2xl"
                                onClick={() => openShipModal(order)}
                              >
                                <Truck className="h-4 w-4 mr-2" />
                                Ship now
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>

              {/* Pagination */}
              {sellTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setSellCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={sellCurrentPage === 1}
                    className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex gap-1">
                    {Array.from(
                      { length: sellTotalPages },
                      (_, i) => i + 1
                    ).map((page) => (
                      <Button
                        key={page}
                        variant={
                          sellCurrentPage === page ? "default" : "ghost"
                        }
                        onClick={() => setSellCurrentPage(page)}
                        className={`rounded-xl ${
                          sellCurrentPage === page
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
                            : "glass-button border-0 text-gray-700 hover:bg-white/30"
                        }`}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() =>
                      setSellCurrentPage((prev) =>
                        Math.min(prev + 1, sellTotalPages)
                      )
                    }
                    disabled={sellCurrentPage === sellTotalPages}
                    className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Ship Now Modal */}
      <ShipNowModal
        open={shipModalOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
          setShipModalOpen(open);
        }}
        order={selectedOrder ?? undefined}
        onShipConfirmed={async (deliveryCompany, awb) => {
          if (!selectedOrder) return;
          try {
            // Update order status to shipped and store AWB as tracking number
            await OrderService.updateOrderStatus(selectedOrder.id, "shipped", awb);

            // Update local state so the card reflects new status + tracking
            setSellOrders((prev) =>
              prev.map((o) =>
                o.id === selectedOrder.id
                  ? { ...o, status: "shipped" as const, tracking_number: awb }
                  : o
              )
            );

            // Send shipping notification email to buyer
            if (selectedOrder.buyer_email) {
              const productTitle = selectedOrder.product_listings?.title || "Product";
              const productImage =
                selectedOrder.product_listings?.product_images?.find((img) => img.is_poster_image)?.image_url ||
                selectedOrder.product_listings?.product_images?.[0]?.image_url;
              const orderEmailData: OrderEmailData = {
                order_id: selectedOrder.id,
                product_title: productTitle,
                product_image: productImage,
                amount: selectedOrder.amount,
                currency: "INR",
                buyer_name: selectedOrder.buyer_name,
                buyer_email: selectedOrder.buyer_email,
                order_status: "shipped",
                shipping_address: selectedOrder.shipping_address,
                tracking_number: awb,
                courier_name: deliveryCompany,
              };
              try {
                await EmailService.sendShippingNotificationToBuyer(
                  selectedOrder.buyer_email,
                  selectedOrder.buyer_name || "",
                  orderEmailData
                );
              } catch {
                // Email failure should not block the status update
              }
            }

            toast.success("Order marked as shipped! Buyer has been notified.");
          } catch {
            toast.error("Failed to update shipping details");
          }
        }}
      />

    </div>
  );
};

export default MyOrders;
