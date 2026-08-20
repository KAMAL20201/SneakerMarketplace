import { AdminRoute } from "@/components/AdminRoute";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  PackageOpen,
  Search,
  Loader2,
  X,
  Plus,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Play,
  Pause,
  Square,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router";
import { ROUTE_NAMES } from "@/constants/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreOrderWindow {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  duration_hours: number;
  created_at: string;
}

interface PreOrderProduct {
  id: string;
  window_id: string;
  product_slug: string;
  product_title?: string;
  product_brand?: string;
  product_image?: string | null;
  product_price?: number;
}

interface SearchListing {
  id: string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  size_value: string;
  image_url: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function windowStatus(w: PreOrderWindow): "active" | "upcoming" | "expired" {
  const now = Date.now();
  const start = new Date(w.starts_at).getTime();
  const end = new Date(w.ends_at).getTime();
  if (now < start) return "upcoming";
  if (now > end) return "expired";
  return "active";
}

function formatCountdown(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${m}m remaining`;
}

function formatDt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function AdminPreOrders() {
  const [windows, setWindows] = useState<PreOrderWindow[]>([]);
  const [loadingWindows, setLoadingWindows] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // New window form state
  const [formName, setFormName] = useState("");
  const [formStartsAt, setFormStartsAt] = useState(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [formDuration, setFormDuration] = useState("48");
  const [submitting, setSubmitting] = useState(false);

  const fetchWindows = useCallback(async () => {
    setLoadingWindows(true);
    const { data, error } = await supabase
      .from("pre_order_windows")
      .select("id, name, starts_at, ends_at, duration_hours, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load pre-order windows");
    else setWindows(data ?? []);
    setLoadingWindows(false);
  }, []);

  useEffect(() => {
    fetchWindows();
  }, [fetchWindows]);

  const handleCreateWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSubmitting(true);
    const startsAt = new Date(formStartsAt).toISOString();
    const durationHours = parseInt(formDuration) || 48;
    const endsAt = new Date(
      new Date(formStartsAt).getTime() + durationHours * 3_600_000,
    ).toISOString();

    const { error } = await supabase.from("pre_order_windows").insert({
      name: formName.trim(),
      starts_at: startsAt,
      ends_at: endsAt,
      duration_hours: durationHours,
    });

    if (error) {
      toast.error("Failed to create window");
    } else {
      toast.success(`Pre-order window "${formName}" launched!`);
      setFormName("");
      setFormDuration("48");
      setShowForm(false);
      await fetchWindows();
    }
    setSubmitting(false);
  };

  const handleDeleteWindow = async (w: PreOrderWindow) => {
    if (!confirm(`Delete window "${w.name}"? This will remove all linked products.`)) return;
    const { error } = await supabase
      .from("pre_order_windows")
      .delete()
      .eq("id", w.id);
    if (error) {
      toast.error("Failed to delete window");
    } else {
      toast.success("Window deleted");
      setWindows((prev) => prev.filter((x) => x.id !== w.id));
      if (expandedId === w.id) setExpandedId(null);
    }
  };

  const handleOpenWindow = async (w: PreOrderWindow) => {
    const now = new Date();
    const durationMs = (w.duration_hours || 48) * 3_600_000;
    const startsAt = now.toISOString();
    const endsAt = new Date(now.getTime() + durationMs).toISOString();

    const { error } = await supabase
      .from("pre_order_windows")
      .update({ starts_at: startsAt, ends_at: endsAt })
      .eq("id", w.id);

    if (error) {
      toast.error("Failed to open pre-orders");
    } else {
      toast.success(`Pre-orders for "${w.name}" are now OPEN!`);
      await fetchWindows();
    }
  };

  const handlePauseWindow = async (w: PreOrderWindow, hours = 48) => {
    const now = new Date();
    const pauseStart = new Date(now.getTime() + hours * 3_600_000);
    const durationMs = (w.duration_hours || 48) * 3_600_000;
    const endsAt = new Date(pauseStart.getTime() + durationMs).toISOString();

    const { error } = await supabase
      .from("pre_order_windows")
      .update({ starts_at: pauseStart.toISOString(), ends_at: endsAt })
      .eq("id", w.id);

    if (error) {
      toast.error("Failed to pause pre-orders");
    } else {
      toast.success(`Pre-orders for "${w.name}" PAUSED for ${hours}h! (Countdown active)`);
      await fetchWindows();
    }
  };

  const handleCloseWindow = async (w: PreOrderWindow) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("pre_order_windows")
      .update({ ends_at: now })
      .eq("id", w.id);

    if (error) {
      toast.error("Failed to close pre-orders");
    } else {
      toast.success(`Pre-orders for "${w.name}" are now CLOSED.`);
      await fetchWindows();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <Link to={ROUTE_NAMES.ADMIN_DASHBOARD} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <div className="p-1.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
            <PackageOpen className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Pre-Orders Admin</h1>
            <p className="text-xs text-gray-500">
              Open, pause (48h timer), or close pre-order drops
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm((s) => !s)}
          size="sm"
          className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shrink-0 gap-1"
        >
          <Plus className="h-4 w-4" />
          New Window
        </Button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {/* Launch form */}
        {showForm && (
          <Card className="rounded-2xl border border-violet-200 bg-violet-50/60">
            <CardContent className="p-5">
              <h2 className="text-sm font-bold text-violet-800 mb-4">Launch New Pre-Order Window</h2>
              <form onSubmit={handleCreateWindow} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    Window Name
                  </label>
                  <Input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Summer Batch Aug 2026"
                    className="rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                      Starts At
                    </label>
                    <Input
                      required
                      type="datetime-local"
                      value={formStartsAt}
                      onChange={(e) => setFormStartsAt(e.target.value)}
                      className="rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                      Duration (hours)
                    </label>
                    <Input
                      required
                      type="number"
                      min="1"
                      max="720"
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Window ends:{" "}
                  <span className="font-medium text-gray-600">
                    {formStartsAt
                      ? formatDt(
                          new Date(
                            new Date(formStartsAt).getTime() +
                              (parseInt(formDuration) || 48) * 3_600_000,
                          ).toISOString(),
                        )
                      : "—"}
                  </span>
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex-1"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Launch Window"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Windows list */}
        {loadingWindows ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : windows.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-12 text-center text-gray-400">
              <PackageOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No pre-order windows yet.</p>
              <p className="text-xs mt-1">Click "New Window" to launch one.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {windows.map((w) => (
              <WindowCard
                key={w.id}
                window={w}
                expanded={expandedId === w.id}
                onToggleExpand={() =>
                  setExpandedId((prev) => (prev === w.id ? null : w.id))
                }
                onDelete={handleDeleteWindow}
                onOpen={handleOpenWindow}
                onPause={handlePauseWindow}
                onClose={handleCloseWindow}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Window Card ──────────────────────────────────────────────────────────────

function WindowCard({
  window: w,
  expanded,
  onToggleExpand,
  onDelete,
  onOpen,
  onPause,
  onClose,
}: {
  window: PreOrderWindow;
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: (w: PreOrderWindow) => void;
  onOpen: (w: PreOrderWindow) => void;
  onPause: (w: PreOrderWindow, hours?: number) => void;
  onClose: (w: PreOrderWindow) => void;
}) {
  const status = windowStatus(w);
  const [products, setProducts] = useState<PreOrderProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchListing[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from("pre_order_products")
      .select("id, window_id, product_slug")
      .eq("window_id", w.id)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load products");
      setLoadingProducts(false);
      return;
    }

    const slugs = (data ?? []).map((p) => p.product_slug);
    if (slugs.length > 0) {
      const { data: listings } = await supabase
        .from("listings_with_images")
        .select("slug, title, brand, price, image_url")
        .in("slug", slugs);

      const listingMap = Object.fromEntries(
        (listings ?? []).map((l) => [l.slug, l]),
      );

      setProducts(
        (data ?? []).map((p) => ({
          ...p,
          product_title: listingMap[p.product_slug]?.title ?? p.product_slug,
          product_brand: listingMap[p.product_slug]?.brand ?? "",
          product_image: listingMap[p.product_slug]?.image_url ?? null,
          product_price: listingMap[p.product_slug]?.price ?? 0,
        })),
      );
    } else {
      setProducts([]);
    }
    setLoadingProducts(false);
  }, [w.id]);

  useEffect(() => {
    if (expanded) fetchProducts();
  }, [expanded, fetchProducts]);

  // Debounced search
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoadingSearch(true);
      const { data } = await supabase
        .from("listings_with_images")
        .select("id, slug, title, brand, price, size_value, image_url")
        .eq("status", "active")
        .or(`title.ilike.%${search}%,brand.ilike.%${search}%,slug.ilike.%${search}%`)
        .order("created_at", { ascending: false })
        .limit(20);
      setSearchResults(data ?? []);
      setLoadingSearch(false);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const addProduct = async (listing: SearchListing) => {
    setTogglingSlug(listing.slug);
    const { error } = await supabase
      .from("pre_order_products")
      .insert({ window_id: w.id, product_slug: listing.slug });
    if (error) {
      toast.error(
        error.code === "23505"
          ? "Product already in this window"
          : "Failed to add product",
      );
    } else {
      toast.success(`Added "${listing.title}" to pre-order`);
      await fetchProducts();
    }
    setTogglingSlug(null);
  };

  const removeProduct = async (p: PreOrderProduct) => {
    setTogglingSlug(p.product_slug);
    const { error } = await supabase
      .from("pre_order_products")
      .delete()
      .eq("id", p.id);
    if (error) {
      toast.error("Failed to remove product");
    } else {
      toast.success("Product removed");
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
    }
    setTogglingSlug(null);
  };

  const slugSet = new Set(products.map((p) => p.product_slug));

  return (
    <Card className="rounded-2xl shadow-sm overflow-hidden border border-gray-200">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={onToggleExpand}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-800 text-sm">{w.name}</p>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDt(w.starts_at)} → {formatDt(w.ends_at)}
            </p>
            {status === "active" && (
              <p className="text-xs text-violet-600 font-semibold mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatCountdown(w.ends_at)}
              </p>
            )}
            {status === "upcoming" && (
              <p className="text-xs text-blue-600 font-semibold mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Opens in {formatCountdown(w.starts_at)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Action Control Buttons */}
            <div
              className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {status !== "active" && (
                <button
                  type="button"
                  title="Open Pre-Orders Now"
                  onClick={() => onOpen(w)}
                  className="px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 transition-colors"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Open</span>
                </button>
              )}

              {status !== "upcoming" && (
                <button
                  type="button"
                  title="Pause Pre-Orders for 48 Hours"
                  onClick={() => onPause(w, 48)}
                  className="px-2 py-1 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 transition-colors"
                >
                  <Pause className="h-3 w-3 fill-current" />
                  <span>Pause 48h</span>
                </button>
              )}

              {status !== "expired" && (
                <button
                  type="button"
                  title="Close Pre-Orders Now"
                  onClick={() => onClose(w)}
                  className="px-2 py-1 text-xs font-semibold rounded-lg bg-gray-600 hover:bg-gray-700 text-white flex items-center gap-1 transition-colors"
                >
                  <Square className="h-3 w-3 fill-current" />
                  <span>Close</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(w);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete Window"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </button>

        {/* Expanded panel */}
        {expanded && (
          <div className="border-t border-gray-100 px-4 pb-4 space-y-4">
            {/* Current products */}
            <div className="pt-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Products in this window ({products.length})
              </p>
              {loadingProducts ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : products.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  No products yet. Search below to add.
                </p>
              ) : (
                <div className="space-y-2">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 bg-gray-50 rounded-xl p-2.5"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                        {p.product_image ? (
                          <img
                            src={p.product_image}
                            alt={p.product_title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 font-semibold capitalize truncate">
                          {p.product_brand}
                        </p>
                        <p className="text-sm font-bold text-gray-800 truncate">
                          {p.product_title}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProduct(p)}
                        disabled={togglingSlug === p.product_slug}
                        className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        {togglingSlug === p.product_slug ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Search to add */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Add Products
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, brand or slug…"
                  className="pl-9 pr-9 rounded-xl"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setSearchResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {loadingSearch && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              )}
              {!loadingSearch && search && searchResults.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No listings found.
                </p>
              )}
              {!loadingSearch && searchResults.length > 0 && (
                <div className="space-y-2 mt-2">
                  {searchResults.map((listing) => {
                    const alreadyIn = slugSet.has(listing.slug);
                    return (
                      <div
                        key={listing.id}
                        className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                          {listing.image_url ? (
                            <img
                              src={listing.image_url}
                              alt={listing.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 font-semibold capitalize truncate">
                            {listing.brand}
                          </p>
                          <p className="text-sm font-bold text-gray-800 truncate">
                            {listing.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            ₹{listing.price.toLocaleString()} · {listing.size_value}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addProduct(listing)}
                          disabled={alreadyIn || togglingSlug === listing.slug}
                          variant={alreadyIn ? "outline" : "default"}
                          className={
                            alreadyIn
                              ? "rounded-xl text-xs text-gray-400 border-gray-200 shrink-0"
                              : "rounded-xl text-xs bg-violet-600 hover:bg-violet-700 text-white shrink-0"
                          }
                        >
                          {togglingSlug === listing.slug ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : alreadyIn ? (
                            "Added"
                          ) : (
                            "Add"
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "active" | "upcoming" | "expired" }) {
  if (status === "active")
    return (
      <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 px-1.5 py-0 font-semibold">
        ● Active
      </Badge>
    );
  if (status === "upcoming")
    return (
      <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200 px-1.5 py-0 font-semibold">
        ◷ Upcoming
      </Badge>
    );
  return (
    <Badge className="text-[10px] bg-gray-100 text-gray-500 border-gray-200 px-1.5 py-0 font-semibold">
      ✕ Expired
    </Badge>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AdminPreOrdersPage() {
  return (
    <AdminRoute>
      <AdminPreOrders />
    </AdminRoute>
  );
}
