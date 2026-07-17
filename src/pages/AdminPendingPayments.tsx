import { AdminRoute } from "@/components/AdminRoute";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Mail,
  Package,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  SendHorizontal,
  IndianRupee,
  CalendarDays,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { EmailService, type OrderEmailData } from "@/lib/emailService";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

interface PendingOrder {
  id: string;
  product_id: string;
  buyer_email: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  amount: number;
  original_amount: number | null;
  discount_amount: number;
  status: string;
  ordered_size: string | null;
  variant_name: string | null;
  created_at: string;
  product_listings: {
    title: string;
    brand: string;
    slug: string | null;
    product_images: Array<{ image_url: string; is_poster_image: boolean }>;
  } | null;
  // local UI state
  _sent?: boolean;
  _sending?: boolean;
  _failed?: boolean;
}

type DateFilter = "all" | "today" | "week" | "month" | "older";
type EmailFilter = "all" | "has_email" | "no_email";

const PAGE_SIZE = 20;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getPosterImage(order: PendingOrder): string | undefined {
  const imgs = order.product_listings?.product_images;
  return imgs?.find((i) => i.is_poster_image)?.image_url ?? imgs?.[0]?.image_url;
}

// ── Email preview HTML ────────────────────────────────────────────────────────

function buildPreviewHtml(order: PendingOrder): string {
  const posterImage = getPosterImage(order);
  const productTitle = order.product_listings?.title ?? "Your Item";
  const hasDiscount =
    order.original_amount != null && order.original_amount > order.amount;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Payment Reminder Preview</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#db2777);border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">&#9889; The Plug Market</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">Hyped Sneakers &middot; Streetwear &middot; Collectibles</div>
        </td></tr>
        <tr><td style="background:#fff;padding:40px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <h2 style="margin:0 0 4px;font-size:24px;font-weight:800;color:#111827;">You left something behind!</h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${order.buyer_name ?? "there"}, you were so close! Your cart is waiting &mdash; and this item is selling fast.</p>
          <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1.5px solid #f59e0b;border-radius:12px;padding:14px 18px;margin-bottom:24px;">
            <p style="margin:0;color:#92400e;font-size:14px;font-weight:700;">&#9889; Limited stock &mdash; this item may sell out soon. Don't miss your chance!</p>
          </div>
          ${posterImage ? `<div style="text-align:center;margin-bottom:24px;"><img src="${posterImage}" alt="${productTitle}" style="max-width:200px;max-height:200px;object-fit:contain;border-radius:16px;background:#f9fafb;padding:16px;border:2px solid #e9d5ff;" /></div>` : ""}
          <div style="background:#faf5ff;border:1.5px solid #e9d5ff;border-radius:14px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:0.5px;">Your reserved item</p>
            <p style="margin:0;font-size:18px;font-weight:800;color:#111827;line-height:1.3;">${productTitle}</p>
            ${order.variant_name ? `<p style="margin:4px 0 0;font-size:14px;color:#4b5563;">Variant: <strong>${order.variant_name}</strong></p>` : ""}
            ${order.ordered_size ? `<p style="margin:4px 0 0;font-size:14px;color:#4b5563;">Size: <strong>${order.ordered_size.toUpperCase()}</strong></p>` : ""}
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            ${hasDiscount ? `
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:14px;">Original Price</td>
              <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:14px;font-weight:500;text-align:right;text-decoration:line-through;">${formatINR(order.original_amount!)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#16a34a;font-size:14px;">Discount</td>
              <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#16a34a;font-size:14px;font-weight:600;text-align:right;">-${formatINR(order.discount_amount)}</td>
            </tr>` : ""}
            <tr>
              <td style="padding:10px 0;color:#111827;font-size:16px;font-weight:700;">Total to Pay</td>
              <td style="padding:10px 0;color:#7c3aed;font-size:20px;font-weight:900;text-align:right;">${formatINR(order.amount)}</td>
            </tr>
          </table>
          <div style="text-align:center;margin:32px 0;">
            <a href="https://theplugmarket.in/product/${order.product_id}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:12px;">Complete Your Purchase</a>
          </div>
          <p style="margin:0 0 28px;color:#9ca3af;font-size:13px;text-align:center;">This link takes you back to the product page where you can retry checkout.</p>
          <div style="border-top:1px solid #f3f4f6;padding-top:20px;text-align:center;">
            <p style="margin:0 0 12px;font-size:14px;color:#374151;font-weight:600;">Have any questions?</p>
            <a href="https://wa.me/917888527970" style="display:inline-flex;align-items:center;gap:8px;background:#25d366;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:50px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              Chat with us on WhatsApp
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:24px 0;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} The Plug Market &middot; All rights reserved</p>
          <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;"><a href="https://theplugmarket.in" style="color:#7c3aed;text-decoration:none;">theplugmarket.in</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const SENT_IDS_KEY = "plugmarket_pp_sent_ids";

function getSentIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SENT_IDS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function markSentInStorage(id: string) {
  try {
    const ids = getSentIds();
    ids.add(id);
    localStorage.setItem(SENT_IDS_KEY, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

// ── Main Component ────────────────────────────────────────────────────────────

function AdminPendingPayments() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [emailFilter, setEmailFilter] = useState<EmailFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [previewOrder, setPreviewOrder] = useState<PendingOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dedupeByEmail, setDedupeByEmail] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, product_id, buyer_email, buyer_name, buyer_phone,
        amount, original_amount, discount_amount, status,
        ordered_size, variant_name, created_at,
        product_listings (
          title, brand, slug,
          product_images ( image_url, is_poster_image )
        )
      `)
      .eq("status", "pending_payment")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load pending orders");
    } else {
      const sentIds = getSentIds();
      setOrders(
        ((data as PendingOrder[]) ?? []).map((o) =>
          sentIds.has(o.id) ? { ...o, _sent: true } : o
        )
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Filtering + Dedup ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const now = Date.now();

    let result = orders.filter((o) => {
      if (q) {
        const match =
          o.id.toLowerCase().includes(q) ||
          (o.buyer_email ?? "").toLowerCase().includes(q) ||
          (o.buyer_name ?? "").toLowerCase().includes(q) ||
          (o.product_listings?.title ?? "").toLowerCase().includes(q) ||
          (o.product_listings?.brand ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      if (emailFilter === "has_email" && !o.buyer_email) return false;
      if (emailFilter === "no_email" && o.buyer_email) return false;
      const created = new Date(o.created_at).getTime();
      const diffDays = (now - created) / 86400000;
      if (dateFilter === "today" && diffDays > 1) return false;
      if (dateFilter === "week" && diffDays > 7) return false;
      if (dateFilter === "month" && diffDays > 30) return false;
      if (dateFilter === "older" && diffDays <= 30) return false;
      return true;
    });

    // Deduplicate: keep only the most recent order per email
    if (dedupeByEmail) {
      const seen = new Set<string>();
      result = result.filter((o) => {
        if (!o.buyer_email) return true; // keep no-email rows as-is
        if (seen.has(o.buyer_email)) return false;
        seen.add(o.buyer_email);
        return true;
      });
    }

    return result;
  }, [orders, search, emailFilter, dateFilter, dedupeByEmail]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = orders.length;
    const withEmail = orders.filter((o) => o.buyer_email).length;
    const totalValue = orders.reduce((sum, o) => sum + o.amount, 0);
    const sent = orders.filter((o) => o._sent).length;
    return { total, withEmail, noEmail: total - withEmail, totalValue, sent };
  }, [orders]);

  // ── Pagination ─────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [search, dateFilter, emailFilter, dedupeByEmail]);

  // ── Single send ────────────────────────────────────────────────────────────

  const handleSendReminder = useCallback(async (order: PendingOrder) => {
    if (!order.buyer_email) {
      toast.error("No buyer email on this order");
      return;
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, _sending: true } : o))
    );
    try {
      const listing = order.product_listings;
      const posterImage = getPosterImage(order);
      const orderData: OrderEmailData = {
        order_id: order.id,
        product_title: listing?.title ?? "Your Item",
        product_image: posterImage,
        amount: order.amount,
        original_amount: order.original_amount ?? undefined,
        discount_amount: order.discount_amount,
        currency: "INR",
        buyer_name: order.buyer_name ?? undefined,
        brand: listing?.brand,
        product_id: order.product_id,
        variant_name: order.variant_name ?? undefined,
        ordered_size: order.ordered_size ?? undefined,
        order_status: "pending_payment",
      };
      const sent = await EmailService.sendPaymentReminderEmail(
        order.buyer_email,
        order.buyer_name ?? "Customer",
        orderData
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, _sending: false, _sent: sent, _failed: !sent } : o
        )
      );
      if (sent) {
        markSentInStorage(order.id);
        toast.success(`Reminder sent to ${order.buyer_email}`);
      } else {
        toast.error("Failed to send email");
      }
    } catch (err) {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, _sending: false, _failed: true } : o))
      );
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }, []);

  // ── Bulk send ──────────────────────────────────────────────────────────────

  const handleBulkSend = useCallback(async () => {
    const targets = filtered.filter(
      (o) => selectedIds.has(o.id) && o.buyer_email && !o._sent
    );
    if (targets.length === 0) {
      toast.error("No valid orders selected (need email, not already sent)");
      return;
    }
    setBulkSending(true);
    setBulkProgress({ done: 0, total: targets.length });
    let successCount = 0;
    let failCount = 0;
    for (const order of targets) {
      try {
        const listing = order.product_listings;
        const posterImage = getPosterImage(order);
        const orderData: OrderEmailData = {
          order_id: order.id,
          product_title: listing?.title ?? "Your Item",
          product_image: posterImage,
          amount: order.amount,
          original_amount: order.original_amount ?? undefined,
          discount_amount: order.discount_amount,
          currency: "INR",
          buyer_name: order.buyer_name ?? undefined,
          brand: listing?.brand,
          product_id: order.product_id,
          variant_name: order.variant_name ?? undefined,
          ordered_size: order.ordered_size ?? undefined,
          order_status: "pending_payment",
        };
        const sent = await EmailService.sendPaymentReminderEmail(
          order.buyer_email!,
          order.buyer_name ?? "Customer",
          orderData
        );
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id ? { ...o, _sent: sent, _failed: !sent } : o
          )
        );
        if (sent) {
          markSentInStorage(order.id);
          successCount++;
        } else failCount++;
      } catch {
        failCount++;
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, _failed: true } : o))
        );
      }
      setBulkProgress((p) => p && { ...p, done: p.done + 1 });
      await new Promise((r) => setTimeout(r, 300));
    }
    setBulkSending(false);
    setBulkProgress(null);
    setSelectedIds(new Set());
    toast.success(`Bulk send complete: ${successCount} sent, ${failCount} failed`);
  }, [filtered, selectedIds]);

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const pageIds = paginated.filter((o) => o.buyer_email).map((o) => o.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }, [paginated, selectedIds]);

  const pageEmailOrders = paginated.filter((o) => o.buyer_email);
  const allPageSelected =
    pageEmailOrders.length > 0 && pageEmailOrders.every((o) => selectedIds.has(o.id));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="h-5 w-5 text-amber-500" />
                Payment Recovery
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Send reminder emails to buyers who did not complete payment
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrders}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Pending Orders", value: stats.total, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Revenue at Stake", value: formatINR(stats.totalValue), icon: IndianRupee, color: "text-violet-600", bg: "bg-violet-50" },
              { label: "Have Email", value: stats.withEmail, icon: Mail, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Reminders Sent", value: stats.sent, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
            ].map((s) => (
              <Card key={s.label} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`${s.bg} p-2.5 rounded-xl`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="pending-search"
                className="pl-9"
                placeholder="Search by name, email, product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
              <CalendarDays className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="text-sm text-gray-700 bg-transparent border-0 outline-none cursor-pointer pr-1"
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="older">Older than 30d</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
              <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <select
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value as EmailFilter)}
                className="text-sm text-gray-700 bg-transparent border-0 outline-none cursor-pointer pr-1"
              >
                <option value="all">All buyers</option>
                <option value="has_email">Has email</option>
                <option value="no_email">No email</option>
              </select>
            </div>

            {/* Dedup toggle */}
            <button
              id="dedup-toggle"
              onClick={() => setDedupeByEmail((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                dedupeByEmail
                  ? "bg-violet-600 border-violet-600 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Unique emails only
              {dedupeByEmail && (
                <span className="ml-1 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {filtered.length}
                </span>
              )}
            </button>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-700">
                  {selectedIds.size} order{selectedIds.size !== 1 ? "s" : ""} selected
                </span>
                {bulkProgress && (
                  <span className="text-xs text-violet-500 ml-2">
                    {bulkProgress.done}/{bulkProgress.total} sent...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {bulkProgress && (
                  <div className="w-36 bg-violet-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-violet-600 h-full transition-all duration-300"
                      style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                )}
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                  onClick={handleBulkSend}
                  disabled={bulkSending}
                  id="bulk-send-btn"
                >
                  {bulkSending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <SendHorizontal className="h-4 w-4" />
                  )}
                  {bulkSending ? "Sending..." : `Send to ${selectedIds.size}`}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-violet-600 h-8 w-8 p-0"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="text-center py-20 text-gray-400">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin opacity-40" />
              <p>Loading pending orders...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No pending payment orders found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_auto] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <Checkbox
                    id="select-all-checkbox"
                    checked={allPageSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </div>
                <div>Product</div>
                <div>Buyer</div>
                <div>Amount</div>
                <div>Date</div>
                <div className="text-right">Action</div>
              </div>

              <div className="divide-y divide-gray-100">
                {paginated.map((order) => {
                  const listing = order.product_listings;
                  const posterImage = getPosterImage(order);
                  const hasEmail = !!order.buyer_email;

                  return (
                    <div
                      key={order.id}
                      className={`px-4 py-4 flex flex-col md:grid md:grid-cols-[auto_2fr_1.5fr_1fr_1fr_auto] gap-3 md:gap-4 md:items-center transition-colors ${
                        selectedIds.has(order.id) ? "bg-violet-50/60" : "hover:bg-gray-50/80"
                      } ${order._sent ? "bg-green-50/50" : ""}`}
                    >
                      <div className="hidden md:flex items-center">
                        <Checkbox
                          id={`select-${order.id}`}
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={() => toggleSelect(order.id)}
                          disabled={!hasEmail || order._sent}
                        />
                      </div>

                      <div className="flex items-center gap-3 min-w-0">
                        {posterImage ? (
                          <img
                            src={posterImage}
                            alt={listing?.title}
                            className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate text-sm">
                            {listing?.title ?? "—"}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {listing?.brand ?? ""}
                            {order.variant_name ? ` · ${order.variant_name}` : ""}
                            {order.ordered_size ? ` · ${order.ordered_size.toUpperCase()}` : ""}
                          </p>
                          <p className="text-xs font-mono text-gray-300 mt-0.5">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {order.buyer_name ?? "Unknown"}
                        </p>
                        {hasEmail ? (
                          <p className="text-xs text-gray-500 truncate">{order.buyer_email}</p>
                        ) : (
                          <Badge className="bg-red-100 text-red-600 border-red-200 text-[10px] mt-0.5">
                            No email
                          </Badge>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-bold text-violet-700">
                          {formatINR(order.amount)}
                        </p>
                        {order.original_amount != null && order.original_amount > order.amount && (
                          <p className="text-xs text-gray-400 line-through">
                            {formatINR(order.original_amount)}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-700">{timeSince(order.created_at)}</p>
                        <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                      </div>

                      <div className="flex items-center justify-end gap-2 flex-shrink-0">
                        {order._sent ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Sent
                          </Badge>
                        ) : order._failed ? (
                          <Badge className="bg-red-100 text-red-600 border-red-200 gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Failed
                          </Badge>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-500 hover:text-violet-700 h-8 w-8 p-0"
                              onClick={() => setPreviewOrder(order)}
                              title="Preview email"
                              id={`preview-${order.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-1.5 text-xs"
                              onClick={() => handleSendReminder(order)}
                              disabled={!hasEmail || order._sending}
                              id={`send-${order.id}`}
                            >
                              {order._sending ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <SendHorizontal className="h-3.5 w-3.5" />
                              )}
                              {order._sending ? "Sending..." : "Send Reminder"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50/60">
                  <p className="text-xs text-gray-500">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      id="prev-page-btn"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page =
                        totalPages <= 5
                          ? i + 1
                          : Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                      return (
                        <Button
                          key={page}
                          size="sm"
                          variant={page === currentPage ? "default" : "ghost"}
                          className={`h-8 w-8 p-0 text-xs ${
                            page === currentPage
                              ? "bg-violet-600 hover:bg-violet-700 text-white"
                              : ""
                          }`}
                          onClick={() => setCurrentPage(page)}
                          id={`page-${page}-btn`}
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      id="next-page-btn"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Email Preview Modal */}
        {previewOrder && (
          <div
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setPreviewOrder(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Email Preview</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    To: {previewOrder.buyer_email ?? "No email"} &middot; Subject: Do not miss out — complete your order for {previewOrder.product_listings?.title ?? "this item"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                    onClick={async () => {
                      const order = previewOrder;
                      setPreviewOrder(null);
                      await handleSendReminder(order);
                    }}
                    disabled={!previewOrder.buyer_email}
                    id="preview-send-btn"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    Send Now
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0 text-gray-500"
                    onClick={() => setPreviewOrder(null)}
                    id="close-preview-btn"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-2">
                <iframe
                  title="Email Preview"
                  srcDoc={buildPreviewHtml(previewOrder)}
                  className="w-full h-full min-h-[500px] rounded-xl border border-gray-100"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  );
}

export default function AdminPendingPaymentsPage() {
  return <AdminPendingPayments />;
}
