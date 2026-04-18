import { AdminRoute } from "@/components/AdminRoute";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Tag,
  Loader2,
  ArrowLeft,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router";
import { ROUTE_NAMES } from "@/constants/enums";
import type { Coupon } from "@/types/coupon";

type FilterTab = "all" | "active" | "expired" | "exhausted";

interface ProductOption {
  id: string;
  title: string;
  brand: string;
  category: string;
}

interface CouponFormState {
  code: string;
  type: "percentage" | "flat";
  value: string;
  max_uses: string;
  selectedProducts: ProductOption[];   // replaces raw UUID textarea
  min_order_amount: string;
  expires_at: string;
  is_active: boolean;
  description: string;
}

const EMPTY_FORM: CouponFormState = {
  code: "",
  type: "flat",
  value: "",
  max_uses: "",
  selectedProducts: [],
  min_order_amount: "",
  expires_at: "",
  is_active: true,
  description: "",
};

// ── Product Picker ─────────────────────────────────────────────────────────

function ProductPicker({
  selected,
  onChange,
}: {
  selected: ProductOption[];
  onChange: (products: ProductOption[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setSearching(true);
    // No LIMIT here — we want ALL active listings matching the query so duplicates
    // with the same title but different IDs are all visible.
    const { data } = await supabase
      .from("product_listings")
      .select("id, title, brand, category")
      .or(`title.ilike.%${q}%,brand.ilike.%${q}%`)
      .eq("status", "active")
      .order("title")
      .limit(20);
    setResults(data || []);
    setOpen(true);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /** Add a single listing */
  const add = (product: ProductOption) => {
    if (selected.some((p) => p.id === product.id)) return;
    onChange([...selected, product]);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  /**
   * "Add all listings" — when the same title has multiple active listings
   * (e.g. two sellers listing the same shoe), add every one so the coupon
   * covers all of them regardless of which listing lands in the buyer's cart.
   */
  const addAllByTitle = (title: string) => {
    const matches = results.filter((r) => r.title === title);
    const newOnes = matches.filter((m) => !selected.some((s) => s.id === m.id));
    if (newOnes.length === 0) return;
    onChange([...selected, ...newOnes]);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const remove = (id: string) => {
    onChange(selected.filter((p) => p.id !== id));
  };

  // Group results by title so we can show an "Add all" button for duplicates
  const grouped = results.reduce<Record<string, ProductOption[]>>((acc, p) => {
    (acc[p.title] = acc[p.title] || []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      <Label>Applicable products</Label>
      <p className="text-xs text-gray-400">
        Leave empty to apply to all products. Search and pick specific listings below.
        If a product has multiple listings, use <strong>Add all</strong> to cover every listing.
      </p>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-1 text-xs text-purple-700"
            >
              <span className="font-medium">{p.title}</span>
              <span className="text-purple-400">· {p.brand}</span>
              {/* Show truncated ID so duplicate listings are distinguishable */}
              <span className="font-mono text-purple-300 text-[10px]">#{p.id.slice(-6)}</span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="ml-0.5 rounded-full hover:text-purple-900 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search products by name or brand…"
            className="pl-8 text-sm"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-gray-400" />
          )}
        </div>

        {/* Dropdown — grouped by title, shows duplicate listings clearly */}
        {open && Object.keys(grouped).length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden max-h-72 overflow-y-auto">
            {Object.entries(grouped).map(([title, listings]) => {
              const hasDuplicates = listings.length > 1;
              const allSelected = listings.every((l) => selected.some((s) => s.id === l.id));
              return (
                <div key={title} className="border-b border-gray-50 last:border-0">
                  {/* Group header with "Add all" when duplicates exist */}
                  {hasDuplicates && (
                    <div className="flex items-center justify-between px-3 pt-2 pb-1">
                      <span className="text-xs font-semibold text-gray-500 truncate">{title}</span>
                      {!allSelected && (
                        <button
                          type="button"
                          onClick={() => addAllByTitle(title)}
                          className="text-xs text-purple-600 font-medium hover:text-purple-800 shrink-0 ml-2"
                        >
                          Add all ({listings.length})
                        </button>
                      )}
                    </div>
                  )}
                  {listings.map((p) => {
                    const alreadySelected = selected.some((s) => s.id === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => add(p)}
                        disabled={alreadySelected}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
                          alreadySelected
                            ? "bg-gray-50 text-gray-400 cursor-default"
                            : "hover:bg-purple-50 text-gray-800"
                        }`}
                      >
                        <div className="min-w-0">
                          {/* Only show title on each row when not under a group header */}
                          {!hasDuplicates && (
                            <p className="font-medium truncate">{p.title}</p>
                          )}
                          <p className="text-xs text-gray-400 capitalize">
                            {p.brand} · {p.category}
                            {/* Always show truncated ID — critical for distinguishing duplicate listings */}
                            <span className="font-mono text-gray-300 ml-1">#{p.id.slice(-6)}</span>
                          </p>
                        </div>
                        {alreadySelected && (
                          <span className="text-xs text-gray-400 shrink-0">Added</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {open && !searching && query.trim() && results.length === 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg px-3 py-3 text-sm text-gray-400">
            No active products found for "{query}"
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getCouponStatus(coupon: Coupon): "active" | "inactive" | "expired" | "exhausted" {
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return "expired";
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return "exhausted";
  if (!coupon.is_active) return "inactive";
  return "active";
}

function StatusBadge({ coupon }: { coupon: Coupon }) {
  const status = getCouponStatus(coupon);
  const map = {
    active: "bg-green-100 text-green-700 border-green-200",
    inactive: "bg-gray-100 text-gray-600 border-gray-200",
    expired: "bg-red-100 text-red-700 border-red-200",
    exhausted: "bg-orange-100 text-orange-700 border-orange-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function UsageBar({ coupon }: { coupon: Coupon }) {
  if (coupon.max_uses === null) {
    return (
      <p className="text-xs text-gray-500">
        {coupon.used_count} use{coupon.used_count !== 1 ? "s" : ""} / unlimited
      </p>
    );
  }
  const pct = Math.min((coupon.used_count / coupon.max_uses) * 100, 100);
  const barColor = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500">{coupon.used_count} / {coupon.max_uses} uses</p>
      <div className="h-1.5 w-full rounded-full bg-gray-200">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ExpiryLabel({ coupon }: { coupon: Coupon }) {
  if (!coupon.expires_at) return <span className="text-xs text-gray-400">No expiry</span>;
  const exp = new Date(coupon.expires_at);
  const diffH = (exp.getTime() - Date.now()) / (1000 * 60 * 60);
  let cls = "text-xs text-gray-500";
  if (diffH < 0) cls = "text-xs text-red-600 font-medium";
  else if (diffH < 48) cls = "text-xs text-amber-600 font-medium";
  return (
    <span className={cls}>
      Expires {exp.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
    </span>
  );
}

// ── Create / Edit Form ─────────────────────────────────────────────────────

function CouponForm({
  form,
  setForm,
  saving,
  onSave,
  onCancel,
  isEdit,
}: {
  form: CouponFormState;
  setForm: React.Dispatch<React.SetStateAction<CouponFormState>>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
}) {
  return (
    <Card className="mb-6 border-2 border-dashed border-gray-200">
      <CardContent className="p-4 space-y-4">
        <h3 className="font-semibold text-gray-800">{isEdit ? "Edit Coupon" : "New Coupon"}</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Code</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") }))}
              placeholder="e.g. SNEAK10"
              className="font-mono uppercase"
              disabled={isEdit}
            />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "percentage" | "flat" }))}
              disabled={isEdit}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
            >
              <option value="flat">Flat (₹)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>{form.type === "percentage" ? "Discount %" : "Discount ₹"}</Label>
            <Input
              type="number"
              min="1"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              placeholder={form.type === "percentage" ? "10" : "200"}
              disabled={isEdit}
            />
          </div>
          <div className="space-y-1">
            <Label>Max uses</Label>
            <Input
              type="number"
              min="1"
              value={form.max_uses}
              onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
              placeholder="Leave empty for unlimited"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Min order amount (₹)</Label>
            <Input
              type="number"
              min="0"
              value={form.min_order_amount}
              onChange={(e) => setForm((f) => ({ ...f, min_order_amount: e.target.value }))}
              placeholder="Leave empty for no minimum"
            />
          </div>
          <div className="space-y-1">
            <Label>Expires at</Label>
            <Input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
            />
          </div>
        </div>

        {/* Product Picker — replaces raw UUID textarea */}
        <ProductPicker
          selected={form.selectedProducts}
          onChange={(products) => setForm((f) => ({ ...f, selectedProducts: products }))}
        />

        <div className="space-y-1">
          <Label>Description (admin notes)</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="e.g. Launch promo — first 10 buyers"
          />
        </div>

        <div className="flex items-center gap-3">
          <Label>Active</Label>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? "bg-green-500" : "bg-gray-300"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={onSave} disabled={saving} className="flex-1">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Save Changes" : "Create Coupon"}
          </Button>
          <Button onClick={onCancel} variant="outline">Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormState>(EMPTY_FORM);
  const [tab, setTab] = useState<FilterTab>("all");

  const fetchCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load coupons");
    else setCoupons(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = async (coupon: Coupon) => {
    setEditingId(coupon.id);

    // Resolve UUIDs → product titles for the picker
    let selectedProducts: ProductOption[] = [];
    if (coupon.applicable_product_ids && coupon.applicable_product_ids.length > 0) {
      const { data } = await supabase
        .from("product_listings")
        .select("id, title, brand, category")
        .in("id", coupon.applicable_product_ids);
      selectedProducts = data || [];
    }

    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value.toString(),
      max_uses: coupon.max_uses?.toString() ?? "",
      selectedProducts,
      min_order_amount: coupon.min_order_amount?.toString() ?? "",
      expires_at: coupon.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 16) : "",
      is_active: coupon.is_active,
      description: coupon.description ?? "",
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error("Code is required"); return; }
    if (!form.value || Number(form.value) <= 0) { toast.error("Value must be greater than 0"); return; }
    if (form.type === "percentage" && Number(form.value) > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    const payload = {
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      applicable_product_ids: form.selectedProducts.length > 0
        ? form.selectedProducts.map((p) => p.id)
        : null,
      min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
      description: form.description.trim() || null,
    };

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("coupons")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Coupon updated");
      } else {
        const { error } = await supabase.from("coupons").insert({
          code: form.code.toUpperCase(),
          type: form.type,
          value: parseFloat(form.value),
          ...payload,
        });
        if (error) {
          if (error.message.includes("unique") || error.code === "23505") {
            toast.error("A coupon with this code already exists");
          } else {
            throw error;
          }
          return;
        }
        toast.success("Coupon created");
      }
      cancelForm();
      fetchCoupons();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    const status = getCouponStatus(coupon);
    if (status === "expired") { toast.error("Extend the expiry date before activating"); return; }
    if (status === "exhausted") { toast.error("Increase max uses before activating"); return; }
    const { error } = await supabase
      .from("coupons")
      .update({ is_active: !coupon.is_active, updated_at: new Date().toISOString() })
      .eq("id", coupon.id);
    if (error) { toast.error("Failed to update coupon"); return; }
    setCoupons((prev) => prev.map((c) => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon? This will also remove its usage history.")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) { toast.error("Failed to delete coupon"); return; }
    toast.success("Coupon deleted");
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  const filtered = coupons.filter((c) => tab === "all" || getCouponStatus(c) === tab);

  const tabCounts: Record<FilterTab, number> = {
    all: coupons.length,
    active: coupons.filter((c) => getCouponStatus(c) === "active").length,
    expired: coupons.filter((c) => getCouponStatus(c) === "expired").length,
    exhausted: coupons.filter((c) => getCouponStatus(c) === "exhausted").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <div className="flex items-center gap-3">
            <Link to={ROUTE_NAMES.HOME} className="p-2 rounded-full hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Coupons</h1>
              <p className="text-sm text-gray-500">Manage discount codes</p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Coupon
          </Button>
        </div>

        {showForm && (
          <CouponForm
            form={form}
            setForm={setForm}
            saving={saving}
            onSave={handleSave}
            onCancel={cancelForm}
            isEdit={!!editingId}
          />
        )}

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 border border-gray-200">
          {(["all", "active", "expired", "exhausted"] as FilterTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                tab === t ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}{" "}
              <span className={tab === t ? "text-gray-300" : "text-gray-400"}>
                ({tabCounts[t]})
              </span>
            </button>
          ))}
        </div>

        {/* Coupon List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No {tab === "all" ? "" : tab} coupons yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((coupon) => {
              const status = getCouponStatus(coupon);
              return (
                <Card key={coupon.id} className="bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-base text-gray-900 tracking-wide">
                            {coupon.code}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {coupon.type === "percentage" ? `${coupon.value}% off` : `₹${coupon.value} off`}
                          </Badge>
                          <StatusBadge coupon={coupon} />
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-gray-500 mb-2">{coupon.description}</p>
                        )}
                        <div className="space-y-1.5">
                          <UsageBar coupon={coupon} />
                          <ExpiryLabel coupon={coupon} />
                          {coupon.min_order_amount && (
                            <p className="text-xs text-gray-400">Min order: ₹{coupon.min_order_amount}</p>
                          )}
                          {coupon.applicable_product_ids && (
                            <p className="text-xs text-gray-400">
                              {coupon.applicable_product_ids.length} product{coupon.applicable_product_ids.length !== 1 ? "s" : ""} only
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(coupon)}
                          title={coupon.is_active ? "Deactivate" : "Activate"}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-40"
                          disabled={status === "expired" || status === "exhausted"}
                        >
                          {coupon.is_active && status === "active"
                            ? <ToggleRight className="h-5 w-5 text-green-500" />
                            : <ToggleLeft className="h-5 w-5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(coupon)}
                          title="Edit"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(coupon.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
  );
}

export default function AdminCouponsPage() {
  return (
    <AdminRoute>
      <AdminCoupons />
    </AdminRoute>
  );
}
