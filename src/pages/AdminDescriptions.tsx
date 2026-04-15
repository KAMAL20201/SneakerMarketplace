import { AdminRoute } from "@/components/AdminRoute";
import { useState, useEffect } from "react";
import {
  Wand2,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  condition: string | null;
  color: string | null;
  price: number | null;
  description: string | null;
}

type ProductFilter = "missing" | "all" | "done";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function callGenerateApi(product: Product): Promise<string> {
  const res = await fetch("/api/generate-description", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: product.title,
      brand: product.brand,
      model: product.model,
      category: product.category,
      condition: product.condition,
      color: product.color,
    }),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error ?? "Generation failed");
  return json.description as string;
}

async function saveDescription(id: string, description: string) {
  const { error } = await supabase
    .from("product_listings")
    .update({ description })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Main Component ────────────────────────────────────────────────────────────

function AdminDescriptions() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProductFilter>("missing");

  // Per-row state: { [id]: { draft, saving, generating, expanded, error } }
  const [rowState, setRowState] = useState<
    Record<
      string,
      {
        draft: string;
        saving: boolean;
        generating: boolean;
        expanded: boolean;
        error: string | null;
      }
    >
  >({});

  // Server-side batch state
  const [serverBatchRunning, setServerBatchRunning] = useState(false);
  const [serverBatchResult, setServerBatchResult] = useState<string | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    // Load all active products — paginate in case there are > 1000
    const PAGE = 1000;
    let offset = 0;
    const all: Product[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("product_listings")
        .select("id, slug, title, brand, model, category, condition, color, price, description")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE - 1);

      if (error) {
        toast.error("Failed to load products: " + error.message);
        break;
      }
      all.push(...(data ?? []));
      if ((data ?? []).length < PAGE) break;
      offset += PAGE;
    }

    setProducts(all);

    // Initialise row state for products that already have descriptions
    const initial: typeof rowState = {};
    for (const p of all) {
      initial[p.id] = {
        draft: p.description ?? "",
        saving: false,
        generating: false,
        expanded: false,
        error: null,
      };
    }
    setRowState(initial);
    setLoading(false);
  }

  // ── Row-level helpers ───────────────────────────────────────────────────────

  function patchRow(id: string, patch: Partial<(typeof rowState)[string]>) {
    setRowState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function generateOne(product: Product) {
    patchRow(product.id, { generating: true, error: null });
    try {
      const description = await callGenerateApi(product);
      patchRow(product.id, { generating: false, draft: description, expanded: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      patchRow(product.id, { generating: false, error: msg });
      toast.error(`Failed to generate for "${product.title}": ${msg}`);
    }
  }

  async function saveOne(product: Product) {
    const draft = rowState[product.id]?.draft ?? "";
    if (!draft.trim()) {
      toast.error("Description is empty");
      return;
    }
    patchRow(product.id, { saving: true, error: null });
    try {
      await saveDescription(product.id, draft.trim());
      // Update products list in memory
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, description: draft.trim() } : p)),
      );
      toast.success("Saved!");
      patchRow(product.id, { saving: false, expanded: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      patchRow(product.id, { saving: false, error: msg });
      toast.error("Save failed: " + msg);
    }
  }

  // ── Server-side batch generation ────────────────────────────────────────────

  async function startServerBatch() {
    if (missing === 0) {
      toast.info("All products already have descriptions!");
      return;
    }
    setServerBatchRunning(true);
    setServerBatchResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-descriptions");
      if (error) throw new Error(error.message);
      const msg = `Done! Generated ${data.generated} descriptions${data.errors ? `, ${data.errors} errors` : ""}.`;
      setServerBatchResult(msg);
      toast.success(msg);
      // Refresh the product list to show new descriptions
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setServerBatchResult("Error: " + msg);
      toast.error("Batch failed: " + msg);
    } finally {
      setServerBatchRunning(false);
    }
  }

  // ── Derived stats ───────────────────────────────────────────────────────────

  const total = products.length;
  const withDesc = products.filter((p) => p.description).length;
  const missing = total - withDesc;
  const pct = total > 0 ? Math.round((withDesc / total) * 100) : 0;

  const filtered =
    filter === "missing"
      ? products.filter((p) => !p.description)
      : filter === "done"
        ? products.filter((p) => p.description)
        : products;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Descriptions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Unique descriptions improve Google indexing and organic traffic.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-sm text-gray-500">Total active products</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600">{withDesc}</p>
              <p className="text-sm text-gray-500">Have description ({pct}%)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-red-500">{missing}</p>
              <p className="text-sm text-gray-500">Missing description</p>
            </CardContent>
          </Card>
        </div>

        {/* Batch generation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Batch AI Generation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Runs on the server — <span className="font-semibold">you can close this tab</span> after clicking.
              Processes <span className="font-semibold text-red-500">{missing}</span> missing products
              in parallel batches of 20 using Claude AI.
            </p>

            {serverBatchRunning && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Running on server… this may take a minute for large batches.
              </div>
            )}

            {serverBatchResult && (
              <p className="text-sm font-medium text-green-700 bg-green-50 px-3 py-2 rounded-md">
                {serverBatchResult}
              </p>
            )}

            <Button
              onClick={startServerBatch}
              disabled={serverBatchRunning || missing === 0 || loading}
              className="gap-2"
            >
              {serverBatchRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              {serverBatchRunning
                ? "Running on server…"
                : `Generate All Missing (${missing})`}
            </Button>

            <p className="text-xs text-gray-400">
              Requires <code>ANTHROPIC_API_KEY</code> added to your Supabase project secrets.
              Safe to run multiple times — skips products that already have descriptions.
            </p>
          </CardContent>
        </Card>

        {/* Product list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Products</CardTitle>
              <div className="flex gap-1">
                {(["missing", "all", "done"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(f)}
                  >
                    {f === "missing" ? `Missing (${missing})` : f === "done" ? `Done (${withDesc})` : `All (${total})`}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No products in this filter.</p>
            ) : (
              <div className="divide-y">
                {filtered.map((product) => {
                  const rs = rowState[product.id];
                  const isDone = !!product.description;

                  return (
                    <div key={product.id} className="py-3 space-y-2">
                      {/* Row header */}
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-gray-900 truncate">
                              {product.title}
                            </span>
                            {product.brand && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {product.brand}
                              </Badge>
                            )}
                            {product.category && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {product.category}
                              </Badge>
                            )}
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                          </div>

                          {/* Existing description preview */}
                          {product.description && !rs?.expanded && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            disabled={rs?.generating}
                            onClick={() => generateOne(product)}
                          >
                            {rs?.generating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isDone ? (
                              <RefreshCw className="w-3 h-3" />
                            ) : (
                              <Wand2 className="w-3 h-3" />
                            )}
                            {isDone ? "Regen" : "Generate"}
                          </Button>

                          {isDone && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() =>
                                patchRow(product.id, { expanded: !rs?.expanded })
                              }
                            >
                              {rs?.expanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Error */}
                      {rs?.error && (
                        <p className="text-xs text-red-500">{rs.error}</p>
                      )}

                      {/* Editable draft (shown after generation or when expanded) */}
                      {rs?.expanded && (
                        <div className="space-y-2 pl-1">
                          <Textarea
                            className="text-sm min-h-[80px] resize-y"
                            value={rs.draft}
                            onChange={(e) =>
                              patchRow(product.id, { draft: e.target.value })
                            }
                            placeholder="Description…"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1"
                              disabled={rs.saving}
                              onClick={() => saveOne(product)}
                            >
                              {rs.saving ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() =>
                                patchRow(product.id, {
                                  draft: product.description ?? "",
                                  expanded: false,
                                })
                              }
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Show edit area for newly generated (not yet in product.description) */}
                      {!isDone && rs?.draft && !rs.expanded && (
                        <div className="space-y-2 pl-1">
                          <Textarea
                            className="text-sm min-h-[80px] resize-y"
                            value={rs.draft}
                            onChange={(e) =>
                              patchRow(product.id, { draft: e.target.value })
                            }
                            placeholder="Description…"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1"
                              disabled={rs.saving}
                              onClick={() => saveOne(product)}
                            >
                              {rs.saving ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => patchRow(product.id, { draft: "" })}
                            >
                              Discard
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDescriptionsPage() {
  return (
    <AdminRoute>
      <AdminDescriptions />
    </AdminRoute>
  );
}
