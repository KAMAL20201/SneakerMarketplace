import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, XCircle, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase, supabaseUrl } from "@/lib/supabase";

// ── Types ────────────────────────────────────────────────────────────────────

interface SizeEntry {
  size_value: string; // e.g. "uk 8.5"
  price: number;      // INR
  ukLabel: string;    // e.g. "UK8.5" — for display only
}

interface ParsedRow {
  title: string;
  brand: string;
  model: string;
  goat_url: string;
  image_urls: string[];

  // ── Single-size (old format) ──
  size_value: string;
  price: number;
  raw_landed_inr: string;
  raw_size_us: string;

  // ── Multi-size (new format) — empty array = single-size ──
  sizes: SizeEntry[];

  // ── Retail price in INR (converted from Retail $ using usdToInr rate) ──
  retail_price: number | null;

  // display / control
  selected: boolean;
  sizeValid: boolean;
}

interface RowResult {
  title: string;
  size_value: string | null;
  status: "imported" | "skipped" | "error";
  reason?: string;
  listing_id?: string;
  sizes_imported?: number;
}

interface ImportSummary {
  imported: number;
  skipped: number;
  errors: number;
}

// ── UK size column map (for "all sizes" CSV format) ──────────────────────────
// The CSV has columns like "UK6 INR", "UK8.5 INR", etc.
// size_value is stored as plain UK label (brand-safe — no brand-specific US/EU mapping).

const UK_SIZE_COLS: { col: string; size_value: string }[] = [
  { col: "UK6",    size_value: "uk 6"    },
  { col: "UK6.5",  size_value: "uk 6.5"  },
  { col: "UK7",    size_value: "uk 7"    },
  { col: "UK7.5",  size_value: "uk 7.5"  },
  { col: "UK8",    size_value: "uk 8"    },
  { col: "UK8.5",  size_value: "uk 8.5"  },
  { col: "UK9",    size_value: "uk 9"    },
  { col: "UK9.5",  size_value: "uk 9.5"  },
  { col: "UK10",   size_value: "uk 10"   },
  { col: "UK10.5", size_value: "uk 10.5" },
  { col: "UK11",   size_value: "uk 11"   },
  { col: "UK11.5", size_value: "uk 11.5" },
  { col: "UK12",   size_value: "uk 12"   },
  { col: "UK12.5", size_value: "uk 12.5" },
  { col: "UK13",   size_value: "uk 13"   },
  { col: "UK13.5", size_value: "uk 13.5" },
  { col: "UK14",   size_value: "uk 14"   },
  { col: "UK15",   size_value: "uk 15"   },
  { col: "UK16",   size_value: "uk 16"   },
  { col: "UK17",   size_value: "uk 17"   },
  { col: "UK19",   size_value: "uk 19"   },
];

// ── Single-size US→UK/US/EU mapping (for old format) ─────────────────────────

const US_SIZE_MAP: Record<number, string> = {
  6:    "uk 5",
  6.5:  "uk 5.5",
  7:    "uk 6",
  7.5:  "uk 6.5",
  8:    "uk 7",
  8.5:  "uk 7.5",
  9:    "uk 8",
  9.5:  "uk 8.5",
  10:   "uk 9",
  10.5: "uk 9.5",
  11:   "uk 10",
  11.5: "uk 10.5",
  12:   "uk 11",
  13:   "uk 12",
  14:   "uk 13",
  15:   "uk 14",
};

function mapUsSize(sizeUs: number): string | null {
  return US_SIZE_MAP[sizeUs] ?? null;
}

// ── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string, usdToInr: number): ParsedRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  // Parse header
  const rawHeader = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

  const indexOf = (name: string) =>
    rawHeader.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  // Detect format: "all sizes" CSV has UK-size price columns (UK6 $, UK6 INR, …)
  const isAllSizes = rawHeader.some((h) => /^UK\d/.test(h));

  // Shared columns (both formats)
  const sneakerIdx    = indexOf("Sneaker");
  const brandIdx      = indexOf("Brand");
  const silhouetteIdx = indexOf("Silhouette");
  const urlIdx        = indexOf("URL");
  const retailIdx     = indexOf("Retail $");
  // Accept "image_urls" (enriched CSV) or "image" (raw GOAT export)
  const imageUrlsIdx  = [indexOf("image_urls"), indexOf("image")].find(i => i >= 0) ?? -1;

  // Single-size only
  const landedInrIdx  = indexOf("Landed INR");
  const sizeUsIdx     = indexOf("Size US");

  // All-sizes: pre-compute INR column indices for each UK size
  const ukInrIndices: { col: string; size_value: string; inrIdx: number }[] = isAllSizes
    ? UK_SIZE_COLS
        .map((s) => ({ ...s, inrIdx: indexOf(`${s.col} INR`) }))
        .filter((s) => s.inrIdx >= 0)
    : [];

  // Helper: split one CSV line respecting quoted fields
  function splitLine(line: string): string[] {
    const cols: string[] = [];
    let inQuote = false;
    let cell = "";
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cell); cell = ""; continue; }
      cell += ch;
    }
    cols.push(cell);
    return cols;
  }

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = splitLine(line);
    const raw = (idx: number) => (cols[idx] ?? "").trim();

    const title    = raw(sneakerIdx);
    const brand    = raw(brandIdx).toLowerCase();
    const model    = raw(silhouetteIdx);
    const goat_url = raw(urlIdx);

    if (!title || !goat_url) continue;

    const imageUrlRaw = imageUrlsIdx >= 0 ? raw(imageUrlsIdx) : "";
    const image_urls  = imageUrlRaw
      ? imageUrlRaw.split("|").map((u) => u.trim()).filter(Boolean)
      : [];

    // ── Retail price conversion (shared by both formats) ─────────────────
    const retailUsd   = retailIdx >= 0 ? parseFloat(raw(retailIdx)) : NaN;
    const retail_price = !isNaN(retailUsd) && retailUsd > 0
      ? Math.round(retailUsd * usdToInr)
      : null;

    if (isAllSizes) {
      // ── All-sizes format ─────────────────────────────────────────────────
      // Collect sizes that have a non-zero INR price
      const sizes: SizeEntry[] = [];
      for (const { col, size_value, inrIdx } of ukInrIndices) {
        const inrStr = raw(inrIdx);
        const price  = parseFloat(inrStr);
        if (!inrStr || isNaN(price) || price <= 0) continue;
        sizes.push({ ukLabel: col, size_value, price });
      }

      if (sizes.length === 0) continue; // no valid sizes — skip row

      const minPrice = Math.min(...sizes.map((s) => s.price));
      const firstUk  = sizes[0].ukLabel;
      const lastUk   = sizes[sizes.length - 1].ukLabel;

      rows.push({
        title,
        brand,
        model,
        goat_url,
        image_urls,
        sizes,
        retail_price,
        // Single-size fields not used in this format
        size_value:     "",
        price:          minPrice,
        raw_landed_inr: minPrice.toString(),
        raw_size_us:    `${sizes.length} sizes (${firstUk}–${lastUk})`,
        selected:       true,
        sizeValid:      true,
      });

    } else {
      // ── Single-size format (existing) ────────────────────────────────────
      const landedInr = raw(landedInrIdx);
      const sizeUsRaw = raw(sizeUsIdx);

      const price   = parseFloat(landedInr) || 0;
      const size_us = parseFloat(sizeUsRaw);
      const mapped  = mapUsSize(size_us);

      rows.push({
        title,
        brand,
        model,
        goat_url,
        image_urls,
        sizes:          [],
        retail_price,
        size_value:     mapped ?? sizeUsRaw,
        price,
        raw_landed_inr: landedInr,
        raw_size_us:    sizeUsRaw,
        selected:       mapped !== null && price > 0,
        sizeValid:      mapped !== null,
      });
    }
  }

  return rows;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows]               = useState<ParsedRow[]>([]);
  const [importing, setImporting]     = useState(false);
  const [results, setResults]         = useState<RowResult[] | null>(null);
  const [summary, setSummary]         = useState<ImportSummary | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [usdToInr, setUsdToInr]       = useState<number>(84);

  // ── File upload ─────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text, usdToInr);
      if (parsed.length === 0) {
        toast.error("No valid rows found in CSV");
        return;
      }
      setRows(parsed);
      setResults(null);
      setSummary(null);
      setShowPreview(true);
      toast.success(`Parsed ${parsed.length} rows from CSV`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Select / deselect ───────────────────────────────────────────────────

  const toggleRow = (idx: number) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)));

  const toggleAll = (checked: boolean) =>
    setRows((prev) => prev.map((r) => ({ ...r, selected: r.sizeValid && r.price > 0 ? checked : false })));

  const selectedRows = rows.filter((r) => r.selected);

  // ── Import — one row per edge function call ─────────────────────────────

  const handleImport = async () => {
    if (selectedRows.length === 0) { toast.error("No rows selected"); return; }

    setImporting(true);
    setResults(null);
    setSummary(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Not authenticated"); setImporting(false); return; }

    const edgeFnUrl   = `${supabaseUrl}/functions/v1/bulk-import-products`;
    const accumulated: RowResult[] = [];

    try {
      for (let i = 0; i < selectedRows.length; i++) {
        const r = selectedRows[i];
        const isMulti = r.sizes.length > 0;
        toast.info(`Processing ${i + 1}/${selectedRows.length}: ${r.title}${isMulti ? ` (${r.sizes.length} sizes)` : ` (${r.size_value})`}`);

        try {
          const resp = await fetch(edgeFnUrl, {
            method: "POST",
            headers: {
              "Content-Type":  "application/json",
              Authorization:   `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              row: {
                title:        r.title,
                brand:        r.brand,
                model:        r.model,
                goat_url:     r.goat_url,
                retail_price: r.retail_price ?? null,
                ...(r.image_urls.length > 0 ? { image_urls: r.image_urls } : {}),
                // Multi-size vs single-size payload
                ...(isMulti
                  ? { sizes: r.sizes.map(s => ({ size_value: s.size_value, price: s.price })) }
                  : { size_value: r.size_value, price: r.price }),
              },
            }),
          });

          const data = await resp.json();

          if (!resp.ok) {
            accumulated.push({ title: r.title, size_value: r.size_value || null, status: "error", reason: data.error ?? `HTTP ${resp.status}` });
          } else {
            accumulated.push({
              title:          data.title          ?? r.title,
              size_value:     (data.size_value ?? r.size_value) || null,
              status:         data.status,
              reason:         data.reason,
              listing_id:     data.listing_id,
              sizes_imported: data.sizes_imported,
            });
          }
        } catch (rowErr) {
          accumulated.push({ title: r.title, size_value: r.size_value || null, status: "error", reason: rowErr instanceof Error ? rowErr.message : "Network error" });
        }

        setResults([...accumulated]);
      }

      const imported = accumulated.filter((r) => r.status === "imported").length;
      const skipped  = accumulated.filter((r) => r.status === "skipped").length;
      const errors   = accumulated.filter((r) => r.status === "error").length;
      setSummary({ imported, skipped, errors });
      toast.success(`Done: ${imported} imported, ${skipped} skipped, ${errors} errors`);

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <div className="px-4 py-6 max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <Card className="glass-card border-0 rounded-3xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="p-2 md:p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl">
                <Upload className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              Bulk Import Products
            </CardTitle>
            <p className="text-sm text-gray-600">
              Supports two CSV formats: <strong>single-size</strong> (one row = one size) and{" "}
              <strong>all-sizes</strong> (one row = one sneaker with UK size columns). For images, run{" "}
              <code className="bg-gray-100 px-1 rounded text-xs">node scraper/enrich-images.mjs your.csv</code>{" "}
              first to add an <code className="bg-gray-100 px-1 rounded text-xs">image_urls</code> column.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload area */}
            <div
              className="border-2 border-dashed border-purple-200 rounded-2xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="h-10 w-10 text-purple-400 mx-auto mb-3" />
              <p className="font-semibold text-gray-700">
                {rows.length > 0 ? `${rows.length} rows loaded — click to replace` : "Click to upload CSV"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Single-size columns: Sneaker, Brand, Silhouette, Landed INR, Size US, URL
              </p>
              <p className="text-xs text-gray-500">
                All-sizes columns: Sneaker, Brand, Silhouette, Retail $, UK6 $, UK6 INR, UK6.5 $, UK6.5 INR … URL
              </p>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </div>

            {/* USD → INR rate input */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-amber-50/60 rounded-xl text-sm">
              <span className="text-amber-800 font-semibold whitespace-nowrap">USD → INR rate:</span>
              <span className="text-amber-600">1 USD =</span>
              <input
                type="number"
                min={1}
                step={0.01}
                value={usdToInr}
                onChange={(e) => setUsdToInr(parseFloat(e.target.value) || 84)}
                className="w-24 px-2 py-1 border border-amber-200 rounded-lg text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
              />
              <span className="text-amber-600">INR</span>
              <span className="text-amber-500 text-xs">(used to convert <code className="font-mono bg-amber-100 px-1 rounded">Retail $</code> column to INR)</span>
            </div>

            {/* Column mapping hint */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-blue-50/60 rounded-xl p-3 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">Single-size format mapping:</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                  <li><span className="font-mono">Sneaker</span> → title</li>
                  <li><span className="font-mono">Brand</span> → brand</li>
                  <li><span className="font-mono">Silhouette</span> → model</li>
                  <li><span className="font-mono">Landed INR</span> → price</li>
                  <li><span className="font-mono">Size US</span> → mapped to UK/US/EU</li>
                  <li><span className="font-mono">URL</span> → GOAT link</li>
                  <li><span className="font-mono">image_urls</span> → pipe-separated (optional)</li>
                </ul>
              </div>
              <div className="bg-purple-50/60 rounded-xl p-3 text-xs text-purple-700 space-y-1">
                <p className="font-semibold">All-sizes format mapping:</p>
                <ul className="list-disc list-inside space-y-0.5 text-purple-600">
                  <li><span className="font-mono">Sneaker / Brand / Silhouette / URL</span> → same</li>
                  <li><span className="font-mono">UK6 INR, UK6.5 INR … UK17 INR</span> → per-size price</li>
                  <li>1 listing per sneaker, sizes stored separately</li>
                  <li>Browse shows lowest price across all sizes</li>
                  <li><span className="font-mono">image_urls</span> → shared across all sizes</li>
                </ul>
                <p className="text-purple-500 mt-1">
                  Sizes stored as <span className="font-mono">"uk 8.5"</span> — brand-safe (no US/EU mapping needed).
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              All imports set to <strong>active</strong>, condition <strong>new</strong>, category <strong>sneakers</strong>.
            </p>
          </CardContent>
        </Card>

        {/* Preview table */}
        {rows.length > 0 && showPreview && (
          <Card className="glass-card border-0 rounded-3xl shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-500" />
                  Preview — {selectedRows.length} of {rows.length} selected
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="rounded-xl border-0 glass-button text-gray-600 text-xs" onClick={() => toggleAll(true)}>
                    Select valid
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl border-0 glass-button text-gray-600 text-xs" onClick={() => toggleAll(false)}>
                    Deselect all
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={importing || selectedRows.length === 0}
                    className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-sm"
                  >
                    {importing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing…</>
                    ) : (
                      `Import ${selectedRows.length} listings`
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-2xl border border-white/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/30 text-gray-600 text-left">
                      <th className="px-3 py-2 font-semibold w-8">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selectedRows.length === rows.filter(r => r.sizeValid && r.price > 0).length && selectedRows.length > 0}
                          onChange={(e) => toggleAll(e.target.checked)}
                        />
                      </th>
                      <th className="px-3 py-2 font-semibold">Title</th>
                      <th className="px-3 py-2 font-semibold">Brand</th>
                      <th className="px-3 py-2 font-semibold">Size / Sizes</th>
                      <th className="px-3 py-2 font-semibold">Price (INR)</th>
                      <th className="px-3 py-2 font-semibold">Retail (INR)</th>
                      <th className="px-3 py-2 font-semibold">Images</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const rowResult = results?.find((r) => r.title === row.title);
                      const isMulti   = row.sizes.length > 0;

                      return (
                        <tr
                          key={idx}
                          className={`border-t border-white/10 transition-colors ${
                            row.selected ? "bg-purple-50/30" : "hover:bg-white/20"
                          } ${!row.sizeValid || row.price === 0 ? "opacity-50" : ""}`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={row.selected}
                              disabled={!row.sizeValid || row.price === 0}
                              onChange={() => toggleRow(idx)}
                            />
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-800 max-w-[200px] truncate">
                            {row.title}
                          </td>
                          <td className="px-3 py-2 text-gray-600 capitalize">{row.brand}</td>
                          <td className="px-3 py-2 text-gray-600 text-xs">
                            {isMulti ? (
                              <span
                                className="text-purple-600 font-medium cursor-help"
                                title={row.sizes.map(s => `${s.ukLabel}: ₹${s.price.toLocaleString("en-IN")}`).join("\n")}
                              >
                                {row.raw_size_us}
                              </span>
                            ) : row.sizeValid ? (
                              row.size_value
                            ) : (
                              <span className="text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Unmapped
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-700 font-medium">
                            {row.price > 0 ? (
                              <>
                                ₹{row.price.toLocaleString("en-IN")}
                                {isMulti && <span className="text-gray-400 text-xs ml-1">(lowest)</span>}
                              </>
                            ) : (
                              <span className="text-red-500 text-xs">Missing</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">
                            {row.retail_price
                              ? `₹${row.retail_price.toLocaleString("en-IN")}`
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {row.image_urls.length > 0 ? (
                              <span className="text-green-600 font-medium">✓ {row.image_urls.length}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {rowResult ? (
                              rowResult.status === "imported" ? (
                                <Badge className="bg-green-100 text-green-700 border-0 rounded-lg text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {rowResult.sizes_imported != null
                                    ? `Imported (${rowResult.sizes_imported} sizes)`
                                    : "Imported"}
                                </Badge>
                              ) : rowResult.status === "skipped" ? (
                                <Badge className="bg-yellow-100 text-yellow-700 border-0 rounded-lg text-xs" title={rowResult.reason}>
                                  <AlertCircle className="h-3 w-3 mr-1" /> Skipped
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700 border-0 rounded-lg text-xs" title={rowResult.reason}>
                                  <XCircle className="h-3 w-3 mr-1" /> Error
                                </Badge>
                              )
                            ) : (
                              <Badge className={`border-0 rounded-lg text-xs ${row.selected ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
                                {row.selected ? "Queued" : "Skipped"}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {summary && (
          <Card className="glass-card border-0 rounded-3xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-800">Import Complete</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50/60 rounded-2xl">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-700">{summary.imported}</div>
                  <div className="text-xs text-green-600">Imported</div>
                </div>
                <div className="text-center p-4 bg-yellow-50/60 rounded-2xl">
                  <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-700">{summary.skipped}</div>
                  <div className="text-xs text-yellow-600">Skipped (duplicates)</div>
                </div>
                <div className="text-center p-4 bg-red-50/60 rounded-2xl">
                  <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-700">{summary.errors}</div>
                  <div className="text-xs text-red-600">Errors</div>
                </div>
              </div>

              {results && results.filter(r => r.status === "error").length > 0 && (
                <div className="mt-4 p-3 bg-red-50/50 rounded-xl text-xs text-red-700 space-y-1">
                  <p className="font-semibold">Failed rows:</p>
                  {results.filter(r => r.status === "error").map((r, i) => (
                    <p key={i}>{r.title}: {r.reason}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
