import { AdminRoute } from "@/components/AdminRoute";
import { useState, useEffect, useCallback } from "react";
import { Mail, Package, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { EmailService, type OrderEmailData } from "@/lib/emailService";
import { toast } from "sonner";

interface AdminOrder {
  id: string;
  product_id: string;
  buyer_email: string | null;
  buyer_name: string | null;
  amount: number;
  status: string;
  created_at: string;
  product_listings: {
    title: string;
    brand: string;
    product_images: Array<{ image_url: string; is_poster_image: boolean }>;
  } | null;
}

function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, product_id, buyer_email, buyer_name, amount, status, created_at,
        product_listings (
          title, brand,
          product_images ( image_url, is_poster_image )
        )
      `)
      .eq("status", "delivered")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast.error("Failed to load orders");
    } else {
      setOrders((data as AdminOrder[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleResendReview = async (order: AdminOrder) => {
    if (!order.buyer_email) {
      toast.error("No buyer email on this order");
      return;
    }

    setSending(order.id);
    try {
      const { data: tokenData, error: tokenError } = await supabase.rpc(
        "create_review_token",
        {
          p_order_id: order.id,
          p_listing_id: order.product_id,
          p_email: order.buyer_email,
        }
      );

      if (tokenError || !tokenData) throw new Error(tokenError?.message ?? "Token creation failed");

      const listing = order.product_listings;
      const posterImage = listing?.product_images?.find((i) => i.is_poster_image)?.image_url
        ?? listing?.product_images?.[0]?.image_url;

      const orderData: OrderEmailData = {
        order_id: order.id,
        product_title: listing?.title ?? "Your purchase",
        product_image: posterImage,
        amount: order.amount,
        currency: "INR",
        brand: listing?.brand,
        product_id: order.product_id,
        order_status: "delivered",
      };

      const sent = await EmailService.sendReviewRequestEmail(
        order.buyer_email,
        order.buyer_name ?? "Customer",
        orderData,
        tokenData as string
      );

      if (sent) {
        toast.success(`Review email sent to ${order.buyer_email}`);
      } else {
        toast.error("Failed to send email");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(null);
    }
  };

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      !q ||
      o.id.toLowerCase().includes(q) ||
      (o.buyer_email ?? "").toLowerCase().includes(q) ||
      (o.buyer_name ?? "").toLowerCase().includes(q) ||
      (o.product_listings?.title ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Delivered Orders</h1>
              <p className="text-sm text-gray-500 mt-1">Resend review request emails to customers</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search by order ID, email, name, or product…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading orders…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No delivered orders found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((order) => {
                const listing = order.product_listings;
                const posterImage =
                  listing?.product_images?.find((i) => i.is_poster_image)?.image_url ??
                  listing?.product_images?.[0]?.image_url;

                return (
                  <Card key={order.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {posterImage ? (
                          <img
                            src={posterImage}
                            alt={listing?.title}
                            className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-300" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {listing?.title ?? "—"}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {order.buyer_name ?? "Guest"} · {order.buyer_email ?? "No email"}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            #{order.id.slice(0, 8).toUpperCase()} ·{" "}
                            {new Date(order.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Delivered
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResendReview(order)}
                            disabled={sending === order.id || !order.buyer_email}
                            className="border-violet-200 text-violet-700 hover:bg-violet-50"
                          >
                            {sending === order.id ? (
                              <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4 mr-1.5" />
                            )}
                            {sending === order.id ? "Sending…" : "Resend Review Email"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminRoute>
  );
}

export default function AdminOrdersPage() {
  return <AdminOrders />;
}
