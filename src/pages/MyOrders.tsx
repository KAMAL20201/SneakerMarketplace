import { AdminRoute } from "@/components/AdminRoute";
import { useState, useEffect, useRef, useCallback } from "react";
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
  PackageCheck,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { ThumbnailImage } from "@/components/ui/OptimizedImage";
import { OrderService, type Order as OrderType } from "@/lib/orderService";
import { supabase, toStorageUrl } from "@/lib/supabase";
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

// ── AdaptivePaginator ────────────────────────────────────────────────────────
// Measures its own container width via ResizeObserver and fills it with as
// many page-number buttons as physically fit — no hardcoded window sizes.
interface AdaptivePaginatorProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const AdaptivePaginator = ({ totalPages, currentPage, onPageChange }: AdaptivePaginatorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState(5); // page-number slots (re-computed on resize)

  const computeSlots = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    // Prev + Next buttons: ~82px each (icon + text + padding), gap: 6px
    const navWidth = 82 * 2 + 6 * 2;
    // Each page button: 36px wide, gap between items: 6px
    const btnWidth = 36 + 6;
    const available = containerWidth - navWidth;
    const count = Math.max(1, Math.floor(available / btnWidth));
    setSlots(count);
  }, []);

  useEffect(() => {
    computeSlots();
    const ro = new ResizeObserver(computeSlots);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [computeSlots]);

  if (totalPages <= 1) return null;

  // Build visible page items to fill exactly `slots` number slots
  const buildPageItems = (): (number | "…")[] => {
    if (totalPages <= slots) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    // We always show first + last; remaining inner slots surround current page
    const innerSlots = Math.max(1, slots - 2); // -2 for first & last
    const halfWin = Math.floor(innerSlots / 2);
    let winStart = Math.max(2, currentPage - halfWin);
    let winEnd = winStart + innerSlots - 1;
    if (winEnd >= totalPages) {
      winEnd = totalPages - 1;
      winStart = Math.max(2, winEnd - innerSlots + 1);
    }

    const items: (number | "…")[] = [1];
    if (winStart > 2) items.push("…");
    for (let p = winStart; p <= winEnd; p++) items.push(p);
    if (winEnd < totalPages - 1) items.push("…");
    items.push(totalPages);
    return items;
  };

  const pages = buildPageItems();

  return (
    <div ref={containerRef} className="flex items-center justify-center gap-1.5 mt-8 w-full">
      {/* Prev */}
      <Button
        variant="ghost"
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
        className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 disabled:opacity-50 flex items-center gap-1 px-3 shrink-0"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline text-sm">Prev</span>
      </Button>

      {/* Page numbers */}
      {pages.map((item, idx) =>
        item === "…" ? (
          <span key={`ellipsis-${idx}`} className="text-gray-400 select-none px-1 shrink-0">
            …
          </span>
        ) : (
          <Button
            key={item}
            variant={currentPage === item ? "default" : "ghost"}
            onClick={() => onPageChange(item as number)}
            className={`h-9 w-9 p-0 rounded-xl text-sm font-medium shrink-0 ${
              currentPage === item
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-md"
                : "glass-button border-0 text-gray-700 hover:bg-white/30"
            }`}
          >
            {item}
          </Button>
        )
      )}

      {/* Next */}
      <Button
        variant="ghost"
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 disabled:opacity-50 flex items-center gap-1 px-3 shrink-0"
      >
        <span className="hidden sm:inline text-sm">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const EmptyOrdersState = () => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="glass-card border-0 rounded-3xl p-8 text-center max-w-md">
      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
        <ShoppingBag className="h-12 w-12 text-purple-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-3">No Orders Yet</h3>
      <p className="text-gray-600 mb-6 leading-relaxed">
        No orders have been placed yet. Orders will appear here when customers
        make purchases.
      </p>
    </div>
  </div>
);

// [GUEST CHECKOUT] Orders page is admin-only — shows all sell orders with buyer info.
// Guests receive order confirmations via email; there is no guest orders page.
type TabStatus = "all" | "pending_payment" | "confirmed" | "shipped" | "delivered";

const TABS: { key: TabStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending_payment", label: "Pending Payment" },
  { key: "confirmed", label: "Confirmed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

const MyOrders = () => {
  const { user } = useAuth();
  const [sellOrders, setSellOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>("all");
  const [search, setSearch] = useState("");

  // Ship Now modal state
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const openShipModal = (order: Order) => {
    setSelectedOrder(order);
    setShipModalOpen(true);
  };

  // Change Variant Modal state
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantOrder, setVariantOrder] = useState<Order | null>(null);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [availableSizes, setAvailableSizes] = useState<any[]>([]);
  const [selectedSize, setSelectedSize] = useState<any | null>(null);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [updatingVariant, setUpdatingVariant] = useState(false);

  const openChangeVariantModal = async (order: Order) => {
    setVariantOrder(order);
    setVariantModalOpen(true);
    setLoadingVariants(true);
    setSelectedVariant(null);
    setAvailableSizes([]);
    setSelectedSize(null);

    try {
      // Fetch variants for this listing
      const { data, error } = await supabase
        .from("product_variants")
        .select(`
          id, color_name, color_hex, price, display_order, image_url,
          product_variant_sizes (variant_id, size_value, price, is_sold, is_instant_ship)
        `)
        .eq("listing_id", order.product_id)
        .order("display_order", { ascending: true });

      if (error) throw error;

      let variantsList = data || [];

      // Fallback: check if it's a legacy multi-size listing with no variants
      if (variantsList.length === 0) {
        const { data: legacySizes, error: sizeErr } = await supabase
          .from("product_listing_sizes")
          .select("size_value, price, is_sold")
          .eq("listing_id", order.product_id);
        
        if (sizeErr) throw sizeErr;

        if (legacySizes && legacySizes.length > 0) {
          const mockVariant = {
            id: null,
            color_name: "Default (Legacy Listing)",
            price: order.amount,
            product_variant_sizes: legacySizes.map(s => ({
              variant_id: null,
              size_value: s.size_value,
              price: s.price,
              is_sold: s.is_sold,
              is_instant_ship: false
            }))
          };
          variantsList = [mockVariant];
        }
      }

      setProductVariants(variantsList);
      
      // Auto-select current variant and size
      if (variantsList.length > 0) {
        const current = order.variant_id 
          ? variantsList.find(v => v.id === order.variant_id)
          : variantsList[0];

        if (current) {
          setSelectedVariant(current);
          const sizes = current.product_variant_sizes || [];
          setAvailableSizes(sizes);
          if (order.ordered_size) {
            const size = sizes.find((s: any) => s.size_value === order.ordered_size);
            if (size) setSelectedSize(size);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching variants:", err);
      toast.error("Failed to load variants for this product");
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleConfirmChangeVariant = async () => {
    if (!variantOrder || !selectedSize) {
      toast.error("Please select a size / variant");
      return;
    }

    setUpdatingVariant(true);
    try {
      const isConfirmedOrder = variantOrder.status === "confirmed";

      // 1. Release old size/variant stock if the order is confirmed
      if (isConfirmedOrder && variantOrder.ordered_size) {
        await StockValidationService.releaseSize(
          variantOrder.product_id,
          variantOrder.ordered_size,
          variantOrder.variant_id
        );
      }

      // 2. Reserve new size/variant stock if the order is confirmed
      if (isConfirmedOrder) {
        const markedAsSold = await StockValidationService.markSizeAsSold(
          variantOrder.product_id,
          selectedSize.size_value,
          selectedVariant?.id
        );
        if (!markedAsSold) {
          toast.warning("Note: Failed to mark new variant size as sold in stock. It might be already sold out.");
        }
      }

      // 3. Update order in database
      const updateFields: Record<string, any> = {
        variant_id: selectedVariant?.id || null,
        variant_name: selectedVariant?.id ? selectedVariant.color_name : (selectedVariant ? "Default" : null),
        ordered_size: selectedSize.size_value,
      };

      const { error: dbError } = await supabase
        .from("orders")
        .update(updateFields)
        .eq("id", variantOrder.id);

      if (dbError) throw dbError;

      // 4. Send updated confirmation email to buyer (only if order is already confirmed/paid)
      if (variantOrder.buyer_email && isConfirmedOrder) {
        const productDetails = await OrderService.getProductDetails(variantOrder.product_id);
        const posterImage = selectedVariant?.image_url
          ? toStorageUrl(selectedVariant.image_url)
          : (productDetails?.product_images?.find((img: any) => img.is_poster_image)?.image_url ||
             productDetails?.product_images?.[0]?.image_url);

        const orderEmailData: OrderEmailData = {
          order_id: variantOrder.id,
          product_title: productDetails?.title || variantOrder.product_listings?.title || "Product",
          product_image: posterImage,
          amount: variantOrder.amount, // keep paid amount unchanged
          currency: "INR",
          buyer_name: variantOrder.buyer_name || undefined,
          buyer_email: variantOrder.buyer_email || undefined,
          seller_name: user?.user_metadata?.full_name || undefined,
          seller_email: user?.email || undefined,
          order_status: "confirmed",
          shipping_address: variantOrder.shipping_address,
          product_id: variantOrder.product_id,
          brand: productDetails?.brand || variantOrder.product_listings?.brand || undefined,
          variant_name: selectedVariant?.id ? selectedVariant.color_name : undefined,
          ordered_size: selectedSize.size_value,
          custom_message: "We have updated your order to a different variant as agreed, because the originally ordered variant is no longer available. Below are the updated details of your order.",
        };

        const { error: mailError } = await supabase.functions.invoke("send-order-email", {
          body: {
            type: "order_confirmed",
            recipient_email: variantOrder.buyer_email,
            recipient_name: variantOrder.buyer_name || "Customer",
            order_data: orderEmailData,
            template_data: {
              subject: `🎉 Order Confirmation Update — Order #${variantOrder.id.slice(0, 8).toUpperCase()}`,
              action_url: `${window.location.origin}/`,
            }
          }
        });

        if (mailError) {
          console.warn("Mail invoke error:", mailError);
          toast.warning("Order updated, but failed to send email notification.");
        } else {
          toast.success("Order updated and confirmation email sent!");
        }
      } else {
        toast.success(
          isConfirmedOrder
            ? "Order updated successfully in database."
            : "Order variant updated! Confirmation email will be sent when payment is confirmed."
        );
      }

      // 5. Update local state
      setSellOrders(prev =>
        prev.map(o =>
          o.id === variantOrder.id
            ? {
                ...o,
                variant_id: selectedVariant?.id || null,
                variant_name: selectedVariant?.id ? selectedVariant.color_name : (selectedVariant ? "Default" : null),
                ordered_size: selectedSize.size_value,
              }
            : o
        )
      );

      // Close modal
      setVariantModalOpen(false);
    } catch (err) {
      console.error("Error updating variant:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update order variant");
    } finally {
      setUpdatingVariant(false);
    }
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

  const tabFilteredOrders =
    activeTab === "all"
      ? sellOrders
      : sellOrders.filter((o) => o.status === activeTab);

  const filteredOrders = search.trim()
    ? tabFilteredOrders.filter((o) => {
        const q = search.trim().toLowerCase();
        return (
          o.id.toLowerCase().includes(q) ||
          (o.buyer_name ?? "").toLowerCase().includes(q) ||
          (o.shipping_address?.city ?? "").toLowerCase().includes(q)
        );
      })
    : tabFilteredOrders;

  const tabCounts = {
    all: sellOrders.length,
    pending_payment: sellOrders.filter((o) => o.status === "pending_payment").length,
    confirmed: sellOrders.filter((o) => o.status === "confirmed").length,
    shipped: sellOrders.filter((o) => o.status === "shipped").length,
    delivered: sellOrders.filter((o) => o.status === "delivered").length,
  };

  const handleTabChange = (tab: TabStatus) => {
    setActiveTab(tab);
    setSellCurrentPage(1);
    setSellTotalPages(Math.ceil(
      (tab === "all" ? sellOrders.length : sellOrders.filter((o) => o.status === tab).length) / itemsPerPage
    ));
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setSellCurrentPage(1);
  };

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Orders</h1>
          <p className="text-gray-600">
            All customer orders ({sellOrders.length})
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            className="pl-9 rounded-2xl bg-white/60 border-gray-200 focus:border-purple-400"
            placeholder="Search by order ID, name, or city…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                  : "glass-card border-0 text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold ${
                  activeTab === tab.key
                    ? "bg-white/25 text-white"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Sell Orders */}
        <div className="space-y-6">
          {filteredOrders.length === 0 ? (
            <EmptyOrdersState />
          ) : (
            <>
              <div className="space-y-6">
                {getPaginatedOrders(filteredOrders, sellCurrentPage).map(
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
                                order.status,
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
                              order.status,
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
                                    (img) => img.is_poster_image,
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
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {order.variant_name && (
                                      <span className="inline-block text-xs font-semibold capitalize bg-purple-100 text-purple-700 px-2 py-0.5 rounded-lg">
                                        {order.variant_name}
                                      </span>
                                    )}
                                    {order.ordered_size && (
                                      <span className="inline-block text-xs font-semibold uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                                        Size: {order.ordered_size}
                                      </span>
                                    )}
                                  </div>
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
                          {(order.buyer_name ||
                            order.buyer_email ||
                            order.buyer_phone) && (
                            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                              <p className="text-xs font-semibold text-blue-700 mb-2">
                                Buyer Info
                              </p>
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
                                  <p className="font-medium">
                                    {order.shipping_address.full_name}
                                  </p>
                                )}
                                {order.shipping_address.address_line1 && (
                                  <p>{order.shipping_address.address_line1}</p>
                                )}
                                {order.shipping_address.address_line2 && (
                                  <p>{order.shipping_address.address_line2}</p>
                                )}
                                {(order.shipping_address.city ||
                                  order.shipping_address.state ||
                                  order.shipping_address.pincode) && (
                                  <p>
                                    {[
                                      order.shipping_address.city,
                                      order.shipping_address.state,
                                    ]
                                      .filter(Boolean)
                                      .join(", ")}
                                    {order.shipping_address.pincode
                                      ? ` – ${order.shipping_address.pincode}`
                                      : ""}
                                  </p>
                                )}
                                {order.shipping_address.landmark && (
                                  <p className="text-gray-500 text-xs">
                                    Landmark: {order.shipping_address.landmark}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-3 items-center flex-wrap">
                            <Link
                              to={ROUTE_HELPERS.PRODUCT_DETAIL(
                                order.product_id,
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
                                    await StockValidationService.markSizeAsSold(
                                      order.product_id,
                                      order.ordered_size || "",
                                      order.variant_id,
                                    );
                                    await OrderService.updateOrderStatus(
                                      order.id,
                                      "confirmed",
                                    );

                                    // Redeem the coupon now that payment is confirmed.
                                    // finalize_coupon_redemption is a no-op if no coupon is
                                    // attached or it was already redeemed.
                                    let finalAmount = order.amount;
                                    if (order.coupon_id && (order.discount_amount ?? 0) > 0 && order.original_amount == null) {
                                      const { data: redeemResult, error: redeemErr } =
                                        await supabase.rpc("finalize_coupon_redemption", {
                                          p_order_id: order.id,
                                          p_user_email: order.buyer_email || "",
                                        });
                                      if (redeemErr) {
                                        toast.warning(`Coupon could not be redeemed: ${redeemErr.message}`);
                                      } else if (redeemResult > 0) {
                                        finalAmount = Math.max(order.amount - redeemResult, 0);
                                      }
                                    }

                                    setSellOrders((prev) =>
                                      prev.map((o) =>
                                        o.id === order.id
                                          ? {
                                              ...o,
                                              status: "confirmed" as const,
                                              amount: finalAmount,
                                              original_amount: order.coupon_id ? order.amount : null,
                                            }
                                          : o,
                                      ),
                                    );

                                    // Send order confirmation emails now that payment is confirmed
                                    const productTitle =
                                      order.product_listings?.title ||
                                      "Product";
                                    let productImage =
                                      order.product_listings?.product_images?.find(
                                        (img) => img.is_poster_image,
                                      )?.image_url ||
                                      order.product_listings
                                        ?.product_images?.[0]?.image_url;

                                    if (order.variant_id) {
                                      const { data: varData } = await supabase
                                        .from("product_variants")
                                        .select("image_url")
                                        .eq("id", order.variant_id)
                                        .maybeSingle();
                                      if (varData?.image_url) {
                                        productImage = toStorageUrl(varData.image_url);
                                      }
                                    }

                                    const orderEmailData: OrderEmailData = {
                                      order_id: order.id,
                                      product_title: productTitle,
                                      product_image: productImage,
                                      amount: order.amount,
                                      currency: "INR",
                                      buyer_name: order.buyer_name,
                                      buyer_email: order.buyer_email,
                                      seller_name:
                                        user?.user_metadata?.full_name,
                                      seller_email: user?.email,
                                      order_status: "confirmed",
                                      shipping_address: order.shipping_address,
                                      product_id: order.product_id,
                                      brand: order.product_listings?.brand ?? undefined,
                                      variant_name: order.variant_name || undefined,
                                      ordered_size: order.ordered_size || undefined,
                                    };
                                    try {
                                      if (order.buyer_email) {
                                        await EmailService.sendOrderConfirmationToBuyer(
                                          order.buyer_email,
                                          order.buyer_name || "",
                                          orderEmailData,
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

                                    toast.success(
                                      "Payment confirmed! Order is now ready to ship.",
                                    );
                                  } catch {
                                    toast.error("Failed to confirm payment");
                                  }
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm Payment
                              </Button>
                            )}
                            {["pending_payment", "confirmed"].includes(order.status) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-2xl"
                                onClick={() => openChangeVariantModal(order)}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Change Variant
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
                            {order.status === "shipped" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white hover:text-white border-gray-200 rounded-2xl"
                                onClick={async () => {
                                  try {
                                    await OrderService.updateOrderStatus(
                                      order.id,
                                      "delivered",
                                    );
                                    setSellOrders((prev) =>
                                      prev.map((o) =>
                                        o.id === order.id
                                          ? { ...o, status: "delivered" as const }
                                          : o,
                                      ),
                                    );
                                    toast.success(
                                      "Order marked as delivered! Review request sent to buyer.",
                                    );
                                  } catch {
                                    toast.error("Failed to mark order as delivered");
                                  }
                                }}
                              >
                                <PackageCheck className="h-4 w-4 mr-2" />
                                Mark as Delivered
                              </Button>
                            )}
                            {!["confirmed", "shipped", "delivered"].includes(order.status) && <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200 rounded-2xl ml-auto"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Order</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to permanently delete order #{order.id.slice(0, 8)}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={async () => {
                                      try {
                                        await OrderService.deleteOrder(order.id);
                                        setSellOrders((prev) =>
                                          prev.filter((o) => o.id !== order.id),
                                        );
                                        setSellTotalPages(
                                          Math.ceil((sellOrders.length - 1) / itemsPerPage),
                                        );
                                        toast.success("Order deleted successfully.");
                                      } catch {
                                        toast.error("Failed to delete order.");
                                      }
                                    }}
                                  >
                                    Delete Order
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>

              {/* Pagination – width-driven, no hardcoded limits */}
              <AdaptivePaginator
                totalPages={Math.ceil(filteredOrders.length / itemsPerPage)}
                currentPage={sellCurrentPage}
                onPageChange={setSellCurrentPage}
              />
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
            await OrderService.updateOrderStatus(
              selectedOrder.id,
              "shipped",
              awb,
            );

            // Update local state so the card reflects new status + tracking
            setSellOrders((prev) =>
              prev.map((o) =>
                o.id === selectedOrder.id
                  ? { ...o, status: "shipped" as const, tracking_number: awb }
                  : o,
              ),
            );

            // Send shipping notification email to buyer
            if (selectedOrder.buyer_email) {
              const productTitle =
                selectedOrder.product_listings?.title || "Product";
              const productImage =
                selectedOrder.product_listings?.product_images?.find(
                  (img) => img.is_poster_image,
                )?.image_url ||
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
                product_id: selectedOrder.product_id,
                brand: selectedOrder.product_listings?.brand ?? undefined,
              };
              try {
                await EmailService.sendShippingNotificationToBuyer(
                  selectedOrder.buyer_email,
                  selectedOrder.buyer_name || "",
                  orderEmailData,
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

      {/* Change Variant Modal */}
      <Dialog open={variantModalOpen} onOpenChange={setVariantModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Change Order Variant</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">
              Select a different variant / size to confirm. This will update the order, release old inventory, reserve new inventory, and send a confirmation email with the new picture to the buyer.
            </DialogDescription>
          </DialogHeader>

          {loadingVariants ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
              <p className="text-sm text-gray-500 mt-2">Loading variants...</p>
            </div>
          ) : (
            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  Select Variant
                </label>
                <select
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={selectedVariant?.id || ""}
                  onChange={(e) => {
                    const selectedId = e.target.value === "" ? null : e.target.value;
                    const variant = productVariants.find(v => v.id === selectedId);
                    setSelectedVariant(variant || null);
                    if (variant) {
                      const sizes = variant.product_variant_sizes || [];
                      setAvailableSizes(sizes);
                      setSelectedSize(sizes.find((s: any) => !s.is_sold) || sizes[0] || null);
                    } else {
                      setAvailableSizes([]);
                      setSelectedSize(null);
                    }
                  }}
                >
                  {productVariants.map((v) => (
                    <option key={v.id || "default"} value={v.id || ""}>
                      {v.color_name} {v.price ? `(₹${v.price.toLocaleString("en-IN")})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedVariant && (
                <div className="flex gap-4 items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div className="w-16 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-150">
                    {selectedVariant.image_url ? (
                      <img
                        src={toStorageUrl(selectedVariant.image_url)}
                        alt={selectedVariant.color_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 text-sm truncate">{selectedVariant.color_name}</p>
                    <p className="text-xs text-gray-400">Variant Image Preview</p>
                  </div>
                </div>
              )}

              {availableSizes.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                    Select Size
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {availableSizes.map((s) => (
                      <button
                        key={s.size_value}
                        type="button"
                        disabled={s.is_sold && s.size_value !== variantOrder?.ordered_size}
                        onClick={() => setSelectedSize(s)}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all duration-150 ${
                          selectedSize?.size_value === s.size_value
                            ? "bg-purple-600 border-purple-600 text-white shadow-sm"
                            : s.is_sold
                            ? "bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed"
                            : "bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50/30"
                        }`}
                      >
                        {s.size_value}
                        <span className="block text-[9px] font-normal opacity-80">
                          ₹{s.price.toLocaleString("en-IN")}
                        </span>
                        {s.is_sold && s.size_value !== variantOrder?.ordered_size && (
                          <span className="block text-[8px] font-bold text-red-500 uppercase mt-0.5">Sold</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-6 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setVariantModalOpen(false)}
              className="rounded-xl flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmChangeVariant}
              disabled={updatingVariant || loadingVariants || !selectedSize}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex-1 shadow-md"
            >
              {updatingVariant ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm & Send Email"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function MyOrdersPage() {
  return (
    <AdminRoute>
      <MyOrders />
    </AdminRoute>
  );
}
