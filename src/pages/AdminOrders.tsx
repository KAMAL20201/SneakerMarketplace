import { AdminRoute } from "@/components/AdminRoute";
import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Package,
  RefreshCw,
  Search,
  Send,
  Users,
  CheckCircle2,
  XCircle,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { EmailService, type OrderEmailData } from "@/lib/emailService";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface CampaignRecipient {
  email: string;
  name: string;
  sendStatus: "pending" | "sending" | "success" | "failed";
}

type Tab = "delivered" | "campaign";

// ── Delivered Orders Tab ───────────────────────────────────────────────────────

function DeliveredOrdersTab() {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Resend review request emails to customers</p>
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
  );
}

// ── Bulk Campaign Tab ─────────────────────────────────────────────────────────

function BulkCampaignTab() {
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [totalSent, setTotalSent] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [testEmail, setTestEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const loadRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    try {
      // 1. Fetch already-sent emails for this campaign
      const { data: sentData, error: sentError } = await supabase
        .from("campaign_sends")
        .select("email, status")
        .eq("campaign", "whatsapp_invite");

      if (sentError) throw sentError;

      const alreadySent = new Set((sentData ?? []).map((r: { email: string }) => r.email));
      const sentSuccessCount = (sentData ?? []).filter(
        (r: { status: string }) => r.status === "success"
      ).length;
      const sentFailedCount = (sentData ?? []).filter(
        (r: { status: string }) => r.status === "failed"
      ).length;

      // 2. Fetch all orders with a buyer email (all statuses)
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("buyer_email, buyer_name")
        .not("buyer_email", "is", null)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // 3. Deduplicate by email, skip already-sent, take next 50
      const seen = new Set<string>();
      const unsent: CampaignRecipient[] = [];
      let remaining = 0;

      for (const order of ordersData ?? []) {
        const email = (order.buyer_email as string).toLowerCase().trim();
        if (seen.has(email)) continue;
        seen.add(email);

        if (alreadySent.has(email)) continue;

        remaining++;
        if (unsent.length < 50) {
          unsent.push({
            email,
            name: (order.buyer_name as string | null) ?? "Customer",
            sendStatus: "pending",
          });
        }
      }

      setRecipients(unsent);
      setTotalSent(sentSuccessCount);
      setTotalFailed(sentFailedCount);
      setTotalRemaining(remaining);
    } catch (err) {
      toast.error("Failed to load recipients");
      console.error(err);
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  const handleSendTest = async () => {
    const email = testEmail.trim();
    if (!email || !email.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setIsTesting(true);
    try {
      const sent = await EmailService.sendWhatsAppInviteEmail(email, "Test");
      if (sent) {
        toast.success(`✅ Test email sent to ${email}`);
      } else {
        toast.error("Test send failed — check edge function logs");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => { loadRecipients(); }, [loadRecipients]);

  const handleSendCampaign = async () => {
    if (recipients.length === 0) return;
    setIsSending(true);
    setSentCount(0);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      // Mark as "sending"
      setRecipients((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, sendStatus: "sending" } : r))
      );

      let status: "success" | "failed" = "failed";
      try {
        const sent = await EmailService.sendWhatsAppInviteEmail(recipient.email, recipient.name);
        status = sent ? "success" : "failed";
        if (sent) successCount++; else failCount++;
      } catch {
        failCount++;
      }

      // Record in campaign_sends
      try {
        await supabase.from("campaign_sends").insert({
          campaign: "whatsapp_invite",
          email: recipient.email,
          status,
        });
      } catch {
        // Non-fatal — email was still sent
      }

      setRecipients((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, sendStatus: status } : r))
      );
      setSentCount(i + 1);

      // 300ms delay to respect Resend rate limits
      if (i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    setIsSending(false);
    setTotalSent((prev) => prev + successCount);
    setTotalFailed((prev) => prev + failCount);
    setTotalRemaining((prev) => Math.max(0, prev - recipients.length));

    if (failCount === 0) {
      toast.success(`🎉 Campaign sent! ${successCount} emails delivered.`);
    } else {
      toast.warning(`Campaign done: ${successCount} sent, ${failCount} failed.`);
    }
  };

  const progress = recipients.length > 0 ? Math.round((sentCount / recipients.length) * 100) : 0;
  const allDone = recipients.length > 0 && recipients.every((r) => r.sendStatus !== "pending" && r.sendStatus !== "sending");

  return (
    <div className="space-y-6">

      {/* Test email section */}
      <Card className="border border-dashed border-violet-300 bg-violet-50/50">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-violet-700 mb-3">🧪 Send Test Email First</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="your@email.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendTest()}
              className="flex-1 text-sm"
              disabled={isTesting}
            />
            <Button
              size="sm"
              onClick={handleSendTest}
              disabled={isTesting || !testEmail}
              className="bg-violet-600 hover:bg-violet-700 text-white whitespace-nowrap"
            >
              {isTesting ? (
                <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Sending…</>
              ) : (
                <><Send className="h-3.5 w-3.5 mr-1.5" />Send Test</>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Not recorded in campaign_sends — won't affect your batch count.</p>
        </CardContent>
      </Card>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{totalSent}</p>
            <p className="text-xs text-green-600 mt-1 font-medium">Sent so far</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-violet-700">{totalRemaining}</p>
            <p className="text-xs text-violet-600 mt-1 font-medium">Remaining</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{totalFailed}</p>
            <p className="text-xs text-red-600 mt-1 font-medium">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign info card */}
      <Card className="border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-pink-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-violet-600" />
            WhatsApp Community Invite Campaign
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-sm text-gray-600 leading-relaxed">
            Sends a personalised invite email to the <strong>next {recipients.length} unsent customers</strong> from your orders.
            Each day's batch is automatically excluded from future sends.
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>🔥 Steal deals</li>
            <li>📦 Stock notifications</li>
            <li>⚡ First priority early access</li>
          </ul>
          <div className="flex items-center gap-2 pt-1">
            <Users className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold text-violet-700">
              {recipients.length} recipients in this batch
            </span>
            <span className="text-xs text-gray-400">(max 50 / day)</span>
          </div>
        </CardContent>
      </Card>

      {/* Progress bar — visible while sending */}
      {isSending && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Sending… {sentCount} / {recipients.length}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-violet-500 to-pink-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Send button */}
      {!allDone && (
        <Button
          onClick={handleSendCampaign}
          disabled={isSending || loadingRecipients || recipients.length === 0}
          className="w-full bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white font-bold py-3 text-base"
        >
          {isSending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Sending {sentCount} / {recipients.length}…
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Campaign to {recipients.length} Recipients
            </>
          )}
        </Button>
      )}

      {allDone && (
        <div className="flex items-center justify-center gap-2 py-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-sm font-semibold text-green-700">
            Batch complete! Refresh to load tomorrow's batch.
          </span>
          <Button size="sm" variant="outline" onClick={loadRecipients} className="ml-2">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      )}

      {/* Recipient list */}
      {loadingRecipients ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin opacity-40" />
          Loading recipients…
        </div>
      ) : recipients.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">All customers have been invited!</p>
          <p className="text-xs mt-1">Check back when new orders come in.</p>
        </div>
      ) : (
        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 font-medium">Recipient List — Today's Batch</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {recipients.map((r, idx) => (
                <div key={r.email} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                    <p className="text-xs text-gray-500 truncate">{r.email}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {r.sendStatus === "pending" && (
                      <span className="text-xs text-gray-400">Pending</span>
                    )}
                    {r.sendStatus === "sending" && (
                      <RefreshCw className="h-4 w-4 text-violet-500 animate-spin" />
                    )}
                    {r.sendStatus === "success" && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {r.sendStatus === "failed" && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function AdminOrders() {
  const [activeTab, setActiveTab] = useState<Tab>("delivered");

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders & Campaigns</h1>
            <p className="text-sm text-gray-500 mt-1">Manage delivered orders and marketing campaigns</p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("delivered")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "delivered"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Package className="h-4 w-4" />
              📋 Delivered Orders
            </button>
            <button
              onClick={() => setActiveTab("campaign")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "campaign"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Megaphone className="h-4 w-4" />
              📣 Bulk Campaign
            </button>
          </div>

          {/* Tab content */}
          {activeTab === "delivered" ? <DeliveredOrdersTab /> : <BulkCampaignTab />}
        </div>
      </div>
    </AdminRoute>
  );
}

export default function AdminOrdersPage() {
  return <AdminOrders />;
}
