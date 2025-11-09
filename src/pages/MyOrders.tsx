import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ROUTE_NAMES, ROUTE_HELPERS } from "@/constants/enums";
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
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { ThumbnailImage } from "@/components/ui/OptimizedImage";
import { OrderService, type Order as OrderType } from "@/lib/orderService";
import { toast } from "sonner";
import ShipNowModal from "@/components/ShipNowModal";
import PickupAddressModal, {
  type PickupAddress,
} from "@/components/PickupAddressModal";
import { supabase } from "@/lib/supabase";
import { addPickupToShiprocket } from "@/lib/shiprocket";
import { ReviewDialog } from "@/components/reviews/ReviewDialog";

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

const EmptyOrdersState = ({ type }: { type: "buy" | "sell" }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="glass-card border-0 rounded-3xl p-8 text-center max-w-md">
      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
        <ShoppingBag className="h-12 w-12 text-purple-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-3">
        {type === "buy" ? "No Orders Yet" : "No Sales Yet"}
      </h3>
      <p className="text-gray-600 mb-6 leading-relaxed">
        {type === "buy"
          ? "You haven't placed any orders yet. Start exploring our marketplace to find amazing sneakers!"
          : "You haven't sold any items yet. Start listing your items to make your first sale!"}
      </p>
      <Link to={type === "buy" ? ROUTE_NAMES.BROWSE : ROUTE_NAMES.SELL}>
        <Button className="glass-button border-0 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
          <Package className="h-4 w-4 mr-2" />
          {type === "buy" ? "Start Shopping" : "Start Selling"}
        </Button>
      </Link>
    </div>
  </div>
);

const MyOrders = () => {
  const { user } = useAuth();
  const [buyOrders, setBuyOrders] = useState<Order[]>([]);
  const [sellOrders, setSellOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");

  // Ship Now modal state
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const [pendingOpenShipAfterPickup, setPendingOpenShipAfterPickup] =
    useState(false);
  const [pickupPincode, setPickupPincode] = useState<string | null>(null);
  const [pickupAddress, setPickupAddress] = useState<any | null>(null);

  // Review modal state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewOrderData, setReviewOrderData] = useState<{
    orderId: string;
    productId: string;
    sellerId: string;
    productName: string;
  } | null>(null);

  const ensurePickupAddressAndOpenShip = async (order: Order) => {
    if (!user) return;
    try {
      // Fetch seller profile with pickup_address
      const { data, error } = await supabase
        .from("sellers")
        .select("pickup_address")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (!data || !data.pickup_address) {
        // Ask for pickup address first
        setSelectedOrder(order);
        setPendingOpenShipAfterPickup(true);
        setPickupModalOpen(true);
        return;
      }

      // Pickup exists — open ship modal directly
      setSelectedOrder(order);
      setPickupPincode((data as any).pickup_address?.pin_code || null);
      setPickupAddress((data as any).pickup_address || null);
      setShipModalOpen(true);
    } catch (e) {
      console.error("Error checking pickup address:", e);
      toast.error("Could not verify pickup address");
    }
  };

  // Pagination state for buy orders
  const [buyCurrentPage, setBuyCurrentPage] = useState(1);
  const [buyTotalPages, setBuyTotalPages] = useState(1);

  // Pagination state for sell orders
  const [sellCurrentPage, setSellCurrentPage] = useState(1);
  const [sellTotalPages, setSellTotalPages] = useState(1);

  const itemsPerPage = 5; // Show fewer orders per page

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch buy orders
        const buyerOrders = await OrderService.getBuyerOrders(user.id);
        setBuyOrders(buyerOrders);
        setBuyTotalPages(Math.ceil(buyerOrders.length / itemsPerPage));

        // Fetch sell orders
        const sellerOrders = await OrderService.getSellerOrders(user.id);
        setSellOrders(sellerOrders);
        setSellTotalPages(Math.ceil(sellerOrders.length / itemsPerPage));
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("Failed to load your orders");
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">
            Track your purchases and sales history
          </p>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "buy" | "sell")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="buy" className="text-sm font-medium">
              My Buy Orders ({buyOrders.length})
            </TabsTrigger>
            <TabsTrigger value="sell" className="text-sm font-medium">
              My Sell Orders ({sellOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Buy Orders Tab */}
          <TabsContent value="buy" className="space-y-6">
            {buyOrders.length === 0 ? (
              <EmptyOrdersState type="buy" />
            ) : (
              <>
                <div className="space-y-6">
                  {getPaginatedOrders(buyOrders, buyCurrentPage).map(
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
                                  Placed on {formatDate(order.created_at)}
                                </p>
                              </div>
                            </div>
                            <Badge
                              className={`${getStatusColor(
                                order.status
                              )} border rounded-xl capitalize`}
                            >
                              {order.status}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0">
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
                                alt={order.product_listings?.title || "Product"}
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
                                    {order.product_listings?.title || "Product"}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    Order ID: {order.id.slice(0, 8)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-gray-900">
                                    {formatPrice(order.amount)}
                                  </p>
                                </div>
                              </div>

                              {/* Order Details */}
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-4">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    Order Date: {formatDate(order.created_at)}
                                  </span>
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

                              {/* Action Buttons */}
                              <div className="flex gap-3 mt-4">
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
                                {order.status === "shipped" &&
                                  order.tracking_number && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="glass-button border-gray-200 rounded-2xl"
                                    >
                                      <Truck className="h-4 w-4 mr-2" />
                                      Track Order
                                    </Button>
                                  )}
                                {order.status === "delivered" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setReviewOrderData({
                                        orderId: order.id,
                                        productId: order.product_id,
                                        sellerId: order.seller_id,
                                        productName:
                                          order.product_listings?.title ||
                                          "Product",
                                      });
                                      setReviewDialogOpen(true);
                                    }}
                                    className="glass-button border-gray-200 rounded-2xl"
                                  >
                                    <Star className="h-4 w-4 mr-2" />
                                    Write Review
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>

                {/* Pagination for Buy Orders */}
                {buyTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setBuyCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={buyCurrentPage === 1}
                      className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex gap-1">
                      {Array.from(
                        { length: buyTotalPages },
                        (_, i) => i + 1
                      ).map((page) => (
                        <Button
                          key={page}
                          variant={
                            buyCurrentPage === page ? "default" : "ghost"
                          }
                          onClick={() => setBuyCurrentPage(page)}
                          className={`rounded-xl ${
                            buyCurrentPage === page
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
                        setBuyCurrentPage((prev) =>
                          Math.min(prev + 1, buyTotalPages)
                        )
                      }
                      disabled={buyCurrentPage === buyTotalPages}
                      className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Sell Orders Tab */}
          <TabsContent value="sell" className="space-y-6">
            {sellOrders.length === 0 ? (
              <EmptyOrdersState type="sell" />
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
                                  Sale #{order.id.slice(0, 8)}
                                </CardTitle>
                                <p className="text-sm text-gray-600">
                                  Sold on {formatDate(order.created_at)}
                                </p>
                              </div>
                            </div>
                            <Badge
                              className={`${getStatusColor(
                                order.status
                              )} border rounded-xl capitalize`}
                            >
                              {order.status}
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
                                    <p className="text-sm text-gray-600">
                                      Sale ID: {order.id.slice(0, 8)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-gray-900">
                                      {formatPrice(order.amount)}
                                    </p>
                                  </div>
                                </div>

                                {/* Order Details */}
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-4">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                      Sale Date: {formatDate(order.created_at)}
                                    </span>
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
                            {/* Action Buttons for Seller */}
                            <div className="flex gap-3 items-center mt-4">
                              {order.status === "confirmed" && (
                                <>
                                  <p className="text-sm text-gray-600">
                                    Ready to Ship this Order ?
                                  </p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white hover:text-white border-gray-200 rounded-2xl"
                                    onClick={() =>
                                      ensurePickupAddressAndOpenShip(order)
                                    }
                                  >
                                    <Truck className="h-4 w-4 mr-2" />
                                    Ship now
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>

                {/* Pagination for Sell Orders */}
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
          </TabsContent>
        </Tabs>
      </div>
      {/* Ship Now Modal (Steps 1–2) */}
      <ShipNowModal
        open={shipModalOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
          setShipModalOpen(open);
        }}
        pickupPincode={pickupPincode || ""}
        deliveryPincode={selectedOrder?.shipping_address?.pincode || ""}
        pickupLocationName={pickupAddress?.name}
        order={selectedOrder as any}
        onCourierSelected={(courier) => {
          toast.success(`Selected ${courier.courier_name}`);
          // Step 3 can be added inside this modal next
        }}
      />

      {/* Pickup Address Modal */}
      <PickupAddressModal
        open={pickupModalOpen}
        onOpenChange={(open) => {
          setPickupModalOpen(open);
          if (!open && !pendingOpenShipAfterPickup) {
            setSelectedOrder(null);
          }
        }}
        onSave={async (address: PickupAddress) => {
          if (!user) return;
          try {
            const { error } = await supabase
              .from("sellers")
              .update({ pickup_address: address })
              .eq("id", user.id);
            if (error) throw error;
            // Also create pickup in Shiprocket via edge function
            try {
              const srAddress = {
                name: address.name,
                email: address.email,
                phone: address.phone,
                address: [address.address, address.address_2]
                  .filter(Boolean)
                  .join(", "),
                city: address.city,
                state: address.state,
                pincode: address.pin_code,
                country: address.country,
              };
              await addPickupToShiprocket(srAddress);
              toast.success("Pickup address saved and added to Shiprocket");
            } catch (err) {
              console.error("Shiprocket pickup creation failed:", err);
              toast.error("Saved locally, but failed to add in Shiprocket");
              throw err;
            }
            setPickupModalOpen(false);
            if (pendingOpenShipAfterPickup && selectedOrder) {
              setPendingOpenShipAfterPickup(false);
              setPickupPincode(address.pin_code);
              setPickupAddress(address);
              setShipModalOpen(true);
            }
          } catch (e) {
            console.error("Error saving pickup address:", e);
            toast.error("Failed to save pickup address");
          }
        }}
      />

      {/* Review Dialog */}
      {reviewOrderData && (
        <ReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          productId={reviewOrderData.productId}
          sellerId={reviewOrderData.sellerId}
          orderId={reviewOrderData.orderId}
          productName={reviewOrderData.productName}
        />
      )}
    </div>
  );
};

export default MyOrders;
