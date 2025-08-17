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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { ThumbnailImage } from "@/components/ui/OptimizedImage";

interface Order {
  id: string;
  order_number: string;
  product_id: string;
  product_title: string;
  product_brand: string;
  product_image: string;
  seller_name: string;
  price: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  created_at: string;
  estimated_delivery?: string;
  tracking_number?: string;
}

// Mock data for demonstration
const mockOrders: Order[] = [
  {
    id: "1",
    order_number: "ORD-2024-001",
    product_id: "prod-1",
    product_title: "Air Jordan 1 Retro High",
    product_brand: "Nike",
    product_image: "/placeholder.svg",
    seller_name: "SneakerPro",
    price: 12000,
    status: "delivered",
    created_at: "2024-01-15T10:30:00Z",
    estimated_delivery: "2024-01-20",
    tracking_number: "TRK123456789",
  },
  {
    id: "2",
    order_number: "ORD-2024-002",
    product_id: "prod-2",
    product_title: "Adidas Yeezy Boost 350",
    product_brand: "Adidas",
    product_image: "/placeholder.svg",
    seller_name: "YeezyWorld",
    price: 25000,
    status: "shipped",
    created_at: "2024-01-18T14:20:00Z",
    estimated_delivery: "2024-01-25",
    tracking_number: "TRK987654321",
  },
  {
    id: "3",
    order_number: "ORD-2024-003",
    product_id: "prod-3",
    product_title: "Converse Chuck Taylor All Star",
    product_brand: "Converse",
    product_image: "/placeholder.svg",
    seller_name: "ClassicKicks",
    price: 4500,
    status: "confirmed",
    created_at: "2024-01-20T09:15:00Z",
    estimated_delivery: "2024-01-27",
  },
];

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

const EmptyOrdersState = () => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="glass-card border-0 rounded-3xl p-8 text-center max-w-md">
      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
        <ShoppingBag className="h-12 w-12 text-purple-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-3">No Orders Yet</h3>
      <p className="text-gray-600 mb-6 leading-relaxed">
        You haven't placed any orders yet. Start exploring our marketplace to
        find amazing sneakers!
      </p>
      <Link to={ROUTE_NAMES.BROWSE}>
        <Button className="glass-button border-0 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
          <Package className="h-4 w-4 mr-2" />
          Start Shopping
        </Button>
      </Link>
    </div>
  </div>
);

const MyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchOrders = async () => {
      setLoading(true);
      // In a real app, you would fetch from your API/Supabase
      // For now, using mock data
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate loading
      setOrders(mockOrders);
      setLoading(false);
    };

    if (user) {
      fetchOrders();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">
            Track your purchases and order history
          </p>
        </div>

        {/* Orders List or Empty State */}
        {orders.length === 0 ? (
          <EmptyOrdersState />
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
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
                          Order #{order.order_number}
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
                        src={order.product_image}
                        alt={order.product_title}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs text-purple-600 font-semibold">
                            {order.product_brand}
                          </p>
                          <h3 className="font-bold text-gray-800 mb-1">
                            {order.product_title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Sold by {order.seller_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {formatPrice(order.price)}
                          </p>
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-4">
                        {order.estimated_delivery && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Est. delivery:{" "}
                              {formatDate(order.estimated_delivery)}
                            </span>
                          </div>
                        )}
                        {order.tracking_number && (
                          <div className="flex items-center gap-1">
                            <Truck className="h-4 w-4" />
                            <span>Tracking: {order.tracking_number}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 mt-4">
                        <Link
                          to={ROUTE_HELPERS.PRODUCT_DETAIL(order.product_id)}
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
                            className="glass-button border-gray-200 rounded-2xl"
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Rate Product
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
