import React, { useState, useEffect } from "react";
import { Package, Clock, Truck, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { OrderService, type Order } from "../../lib/orderService";
import { useAuth } from "../../contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

export const SellerOrdersWidget: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSellerOrders = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const sellerOrders = await OrderService.getSellerOrders(user.id);
        // Filter to show only orders that need shipping
        const pendingOrders = sellerOrders.filter(
          (order) => order.status === "confirmed"
        );
        setOrders(pendingOrders);
      } catch (error) {
        console.error("Error fetching seller orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerOrders();
  }, [user]);

  const handleMarkAsShipped = async (orderId: string) => {
    try {
      await OrderService.updateOrderStatus(orderId, "shipped");
      // Remove from pending orders
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
    } catch (error) {
      console.error("Error marking order as shipped:", error);
    }
  };

  if (!user || loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orders to Ship
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orders to Ship
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No pending orders to ship</p>
            <p className="text-sm text-gray-500 mt-1">
              Orders will appear here when customers purchase your items
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orders to Ship
          </div>
          <Badge variant="destructive" className="bg-red-500">
            {orders.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div
              key={order.id}
              className="border rounded-lg p-4 bg-orange-50/50 border-orange-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {order.product_listings?.title || "Product"}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {order.product_listings?.brand}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-lg font-bold text-green-600">
                      ₹{order.amount}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Order #{order.id.slice(0, 8)}
                    </Badge>
                  </div>
                </div>
                {order.product_listings?.product_images?.[0] && (
                  <img
                    src={order.product_listings.product_images[0].image_url}
                    alt={order.product_listings?.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-gray-600">
                  Ordered{" "}
                  {formatDistanceToNow(new Date(order.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Ship within 24 hours
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleMarkAsShipped(order.id)}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                  >
                    <Truck className="h-3 w-3 mr-1" />
                    Mark as Shipped
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {orders.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Shipping Tips
              </span>
            </div>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Pack items securely to prevent damage</li>
              <li>• Use tracking numbers for all shipments</li>
              <li>• Ship within 24 hours to maintain seller rating</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
