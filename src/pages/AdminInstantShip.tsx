import { AdminRoute } from "@/components/AdminRoute";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Zap, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router";
import { ROUTE_NAMES } from "@/constants/enums";

interface SizeRow {
  id: string;
  size_value: string;
  price: number;
  is_instant_ship: boolean;
  is_sold: boolean;
}

interface ProductRow {
  id: string;
  title: string;
  brand: string;
  slug: string;
  product_listing_sizes: SizeRow[];
}

interface SizeListItemProps {
  size: SizeRow;
  toggling: boolean;
  onToggle: () => void;
  onSavePrice: (newPrice: number) => Promise<void>;
}

function SizeListItem({ size, toggling, onToggle, onSavePrice }: SizeListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [priceInput, setPriceInput] = useState<string>(String(size.price ?? 0));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPriceInput(String(size.price ?? 0));
  }, [size.price]);

  const parsed = Number(priceInput);
  const dirty =
    priceInput.trim() !== "" &&
    Number.isFinite(parsed) &&
    parsed >= 0 &&
    parsed !== Number(size.price);

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    await onSavePrice(parsed);
    setSaving(false);
  };

  // Sold-out sizes that are NOT instant ship are locked (can't be marked).
  // Sold-out sizes that ARE instant ship remain clickable so admins can revert them.
  const isLocked = size.is_sold && !size.is_instant_ship;

  if (!expanded) {
    return (
      <button
        type="button"
        disabled={isLocked}
        onClick={() => setExpanded(true)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold uppercase transition-all border ${
          isLocked
            ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
            : size.is_instant_ship
              ? size.is_sold
                ? "bg-teal-400 text-white border-teal-400 hover:bg-teal-500 ring-1 ring-offset-1 ring-teal-300"
                : "bg-teal-500 text-white border-teal-500 hover:bg-teal-600"
              : "bg-white text-gray-600 border-gray-200 hover:border-teal-400 hover:text-teal-600"
        }`}
      >
        {size.is_instant_ship && <Zap className="h-2.5 w-2.5" />}
        {size.size_value}
        {size.is_sold && size.is_instant_ship && (
          <span className="text-[9px] opacity-80 normal-case font-normal">(sold)</span>
        )}
      </button>
    );
  }

  return (
    <div className="w-full flex items-center gap-2 p-2 rounded-xl border border-teal-200 bg-teal-50/40">
      <span className="text-xs font-bold uppercase w-10 shrink-0 text-gray-700">
        {size.size_value}
      </span>
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <span className="text-xs text-gray-400">₹</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          autoFocus
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          disabled={saving}
          className="w-full min-w-0 px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:bg-gray-100"
        />
        {dirty && (
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-7 px-2 text-[10px] rounded-lg bg-gray-800 hover:bg-gray-900 text-white shrink-0"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </Button>
        )}
      </div>
      <button
        type="button"
        disabled={toggling}
        onClick={onToggle}
        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold uppercase transition-all border ${
          size.is_instant_ship
            ? "bg-teal-500 text-white border-teal-500 hover:bg-teal-600"
            : "bg-white text-gray-600 border-gray-200 hover:border-teal-400 hover:text-teal-600"
        }`}
      >
        {toggling ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Zap className="h-3 w-3" />
        )}
        {size.is_instant_ship ? "Instant" : "Mark"}
      </button>
      <button
        type="button"
        onClick={() => {
          setPriceInput(String(size.price ?? 0));
          setExpanded(false);
        }}
        className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        aria-label="Close"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AdminInstantShip() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchProducts = useCallback(async (q: string) => {
    setLoading(true);
    const req = supabase
      .from("product_listings")
      .select(
        "id, title, brand, slug, product_listing_sizes(id, size_value, price, is_instant_ship, is_sold)",
      )
      .eq("status", "active")
      .order("title")
      .range(0, 49);

    if (q.trim()) req.ilike("title", `%${q.trim()}%`);

    const { data, error } = await req;
    if (error) toast.error("Failed to load products");
    else setProducts((data as ProductRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts(query);
  }, [fetchProducts, query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search);
  };

  const toggleSize = async (size: SizeRow) => {
    setToggling(size.id);
    const next = !size.is_instant_ship;
    const { error } = await supabase
      .from("product_listing_sizes")
      .update({ is_instant_ship: next })
      .eq("id", size.id);
    if (error) {
      toast.error("Failed to update size");
    } else {
      toast.success(
        next
          ? `Marked ${size.size_value} as Instant Ship`
          : `Removed ${size.size_value} from Instant Ship`,
      );
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          product_listing_sizes: p.product_listing_sizes.map((s) =>
            s.id === size.id ? { ...s, is_instant_ship: next } : s,
          ),
        })),
      );
    }
    setToggling(null);
  };

  const updatePrice = async (size: SizeRow, newPrice: number) => {
    const { error } = await supabase
      .from("product_listing_sizes")
      .update({ price: newPrice })
      .eq("id", size.id);
    if (error) {
      toast.error("Failed to update price");
      return;
    }
    toast.success(`Updated ${size.size_value} price to ₹${newPrice}`);
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        product_listing_sizes: p.product_listing_sizes.map((s) =>
          s.id === size.id ? { ...s, price: newPrice } : s,
        ),
      })),
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <Link
          to={ROUTE_NAMES.ADMIN_DASHBOARD}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Instant Ship</h1>
            <p className="text-xs text-gray-500">
              Mark individual sizes as in-hand (instant ship)
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="rounded-xl bg-teal-500 hover:bg-teal-600 text-white"
          >
            Search
          </Button>
          {query && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setSearch("");
                setQuery("");
              }}
            >
              Clear
            </Button>
          )}
        </form>

        {/* Product list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            No products found.
          </p>
        ) : (
          <div className="space-y-3">
            {products.map((product) => {
              const sizes = (product.product_listing_sizes ?? []).sort(
                (a, b) => (a.price ?? 0) - (b.price ?? 0),
              );
              const instantCount = sizes.filter((s) => s.is_instant_ship).length;

              return (
                <Card key={product.id} className="rounded-2xl shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    {/* Product header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 font-semibold capitalize">
                          {product.brand}
                        </p>
                        <p className="text-sm font-bold text-gray-800 truncate">
                          {product.title}
                        </p>
                      </div>
                      {instantCount > 0 && (
                        <Badge className="text-[10px] px-2 py-0.5 bg-teal-100 text-teal-700 border-0 rounded-lg shrink-0 ml-2 flex items-center gap-1">
                          <Zap className="h-2.5 w-2.5" />
                          {instantCount} instant
                        </Badge>
                      )}
                    </div>

                    {sizes.length === 0 ? (
                      <p className="text-xs text-gray-400">No sizes found.</p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {sizes.map((size) => (
                          <SizeListItem
                            key={size.id}
                            size={size}
                            toggling={toggling === size.id}
                            onToggle={() => toggleSize(size)}
                            onSavePrice={(newPrice) => updatePrice(size, newPrice)}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && products.length === 50 && (
          <p className="text-xs text-gray-400 text-center pt-2">
            Showing first 50 results — use search to narrow down.
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdminInstantShipPage() {
  return (
    <AdminRoute>
      <AdminInstantShip />
    </AdminRoute>
  );
}
