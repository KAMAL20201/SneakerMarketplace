import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { ArrowLeft, CalendarClock, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminRoute } from "@/components/AdminRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PRICE_SCHEDULE_STATUSES, ROUTE_NAMES } from "@/constants/enums";
import {
  cancelPriceSchedule, createPriceSchedule, fetchPriceSchedules,
  formatScheduleDate, isoToIstInput, istInputToIso, PRICE_SCHEDULE_PAGE_SIZE,
  searchPriceScheduleProducts, updatePriceSchedule,
} from "@/lib/priceScheduleService";
import type { PriceSchedule, PriceScheduleProduct, PriceScheduleStatus } from "@/types/priceSchedule";

const STATUS_LABELS: Record<PriceScheduleStatus, string> = {
  pending: "Pending", applied: "Applied", cancelled: "Cancelled", failed: "Failed",
};
const STATUS_CLASSES: Record<PriceScheduleStatus, string> = {
  pending: "bg-amber-100 text-amber-900", applied: "bg-green-100 text-green-900",
  cancelled: "bg-gray-100 text-gray-600", failed: "bg-red-100 text-red-900",
};
const formatPrice = (price: number): string => `₹${price.toLocaleString("en-IN")}`;

interface PageControlsProps {
  page: number;
  count: number;
  onChange: (page: number) => void;
  label: string;
}

function PageControls({ page, count, onChange, label }: PageControlsProps) {
  const pages = Math.max(1, Math.ceil(count / PRICE_SCHEDULE_PAGE_SIZE));
  if (pages === 1) return null;
  return (
    <nav aria-label={label} className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
      <span className="text-sm text-gray-600">Page {page} of {pages}</span>
      <Button type="button" variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</Button>
    </nav>
  );
}

function AdminPriceSchedules() {
  const [schedules, setSchedules] = useState<PriceSchedule[]>([]);
  const [scheduleCount, setScheduleCount] = useState(0);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [searchRevision, setSearchRevision] = useState(0);
  const [products, setProducts] = useState<PriceScheduleProduct[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<PriceScheduleProduct | null>(null);
  const [price, setPrice] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<PriceSchedule | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDateTime, setEditDateTime] = useState("");
  const [updating, setUpdating] = useState(false);

  const refresh = (): void => setRevision((current) => current + 1);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    fetchPriceSchedules(page, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setSchedules(result.schedules);
        setScheduleCount(result.count);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Could not load schedules");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, revision]);

  useEffect(() => {
    if (!search) return;
    const controller = new AbortController();
    setSearching(true);
    setSearchError(null);
    searchPriceScheduleProducts(search, searchPage, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setProducts(result.products);
        setProductCount(result.count);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setSearchError(error instanceof Error ? error.message : "Search failed");
      })
      .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    return () => controller.abort();
  }, [search, searchPage, searchRevision]);

  const handleSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setSearchPage(1);
    setSearchRevision((current) => current + 1);
    setProducts([]);
    setProductCount(0);
  };

  const handleSchedule = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!selectedProduct || saving) return;
    setSaving(true);
    try {
      await createPriceSchedule(selectedProduct.id, Number(price), istInputToIso(dateTime));
      toast.success("Price change scheduled");
      setPrice("");
      setDateTime("");
      setSelectedProduct(null);
      setPage(1);
      refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not schedule price change");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (schedule: PriceSchedule): Promise<void> => {
    setCancelling(schedule.id);
    try {
      await cancelPriceSchedule(schedule.id);
      toast.success("Scheduled price change cancelled");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not cancel schedule");
    } finally {
      setCancelling(null);
      refresh();
    }
  };

  const handleOpenEdit = (schedule: PriceSchedule): void => {
    setEditPrice(String(schedule.new_price));
    setEditDateTime(isoToIstInput(schedule.effective_at));
    setEditingSchedule(schedule);
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!editingSchedule || updating) return;
    setUpdating(true);
    try {
      await updatePriceSchedule(editingSchedule, Number(editPrice), istInputToIso(editDateTime));
      toast.success("Scheduled price change updated");
      setEditingSchedule(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not update schedule");
    } finally {
      setUpdating(false);
      refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="flex items-center gap-3 border-b bg-white px-4 py-4">
        <Button asChild variant="ghost" className="min-h-11 min-w-11" aria-label="Back to admin dashboard">
          <Link to={ROUTE_NAMES.ADMIN_DASHBOARD}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <CalendarClock className="h-6 w-6 shrink-0 text-purple-600" aria-hidden="true" />
        <div>
          <h1 className="text-lg font-bold text-gray-900">Scheduled price changes</h1>
          <p className="text-xs text-gray-500">Set a new selling price for a future date</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-6 px-4 pt-6">
        <Card className="rounded-2xl">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <h2 className="font-semibold text-gray-900">Schedule a price change</h2>
            <form onSubmit={handleSearch} className="space-y-2">
              <Label htmlFor="price-product-search">Find a product</Label>
              <div className="flex gap-2">
                <Input id="price-product-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search product title" className="min-h-11" required />
                <Button type="submit" variant="outline" className="min-h-11" disabled={searching}><Search aria-hidden="true" />Search</Button>
              </div>
            </form>
            {search && (
              <div aria-live="polite">
                {searching ? <p className="text-sm text-gray-500">Searching…</p> : searchError ? <p role="alert" className="text-sm text-red-700">{searchError}</p> : (
                  <>
                    {products.length === 0 ? <p className="text-sm text-gray-500">No matching products.</p> : (
                      <ul className="space-y-2">
                        {products.map((product) => (
                          <li key={product.id}>
                            <button type="button" aria-pressed={selectedProduct?.id === product.id}
                              onClick={() => setSelectedProduct(product)}
                              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm ${selectedProduct?.id === product.id ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:bg-gray-50"}`}>
                              <span className="min-w-0 break-words">{product.title}</span>
                              <span className="shrink-0 font-medium">{formatPrice(product.price)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <PageControls page={searchPage} count={productCount} onChange={setSearchPage} label="Product search pages" />
                  </>
                )}
              </div>
            )}
            {selectedProduct && (
              <form onSubmit={handleSchedule} className="space-y-4 border-t pt-4">
                <p className="text-sm font-semibold text-purple-800">{selectedProduct.title}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-price">New price (₹)</Label>
                    <Input id="scheduled-price" type="number" inputMode="decimal" min="0.01" max="99999999.99" step="0.01" required value={price} onChange={(event) => setPrice(event.target.value)} className="min-h-11" />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="scheduled-date">Effective date &amp; time (IST)</Label>
                    <Input id="scheduled-date" type="datetime-local" required value={dateTime} onChange={(event) => setDateTime(event.target.value)} className="min-h-11 max-w-full" />
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">
                  This sets the same selling price for every size and colour, including any pre-order price. Stock quantities, retail prices and existing orders stay unchanged.
                </p>
                <p className="text-xs leading-relaxed text-gray-500">All times use India Standard Time. Changes run automatically within about a minute of the selected time, even when this page is closed.</p>
                <Button type="submit" disabled={saving} className="min-h-11 w-full sm:w-auto">
                  {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
                  {saving ? "Scheduling…" : "Schedule price change"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <section aria-labelledby="price-schedule-history">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="price-schedule-history" className="font-semibold text-gray-900">Schedule history</h2>
            <Button type="button" variant="outline" onClick={refresh} disabled={loading} className="min-h-11"><RefreshCw aria-hidden="true" />Refresh</Button>
          </div>
          <div aria-live="polite" aria-busy={loading}>
            {loading ? <p className="py-8 text-center text-sm text-gray-500">Loading schedules…</p> : loadError ? (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</p>
            ) : schedules.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">No price changes scheduled yet.</p>
            ) : (
              <ul className="space-y-3">
                {schedules.map((schedule) => (
                  <li key={schedule.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="min-w-0 break-words text-sm font-semibold text-gray-900">{schedule.product_title}</h3>
                      <Badge className={STATUS_CLASSES[schedule.status]}>{STATUS_LABELS[schedule.status]}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium">{formatPrice(schedule.previous_price)} → {formatPrice(schedule.new_price)}</p>
                    <p className="mt-1 text-sm text-gray-600">{formatScheduleDate(schedule.effective_at)} IST</p>
                    {schedule.completed_at && <p className="mt-1 text-xs text-gray-500">{STATUS_LABELS[schedule.status]} {formatScheduleDate(schedule.completed_at)} IST</p>}
                    {schedule.error_message && <p className="mt-2 text-sm text-red-700">{schedule.error_message}</p>}
                    {schedule.status === PRICE_SCHEDULE_STATUSES.PENDING && (
                      <>
                        {Date.parse(schedule.effective_at) < Date.now() - 120000 && <p className="mt-2 text-sm text-amber-800">Overdue — not applied yet. Refresh to check for updates.</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button type="button" variant="outline" className="min-h-11" disabled={cancelling !== null || updating} onClick={() => handleOpenEdit(schedule)}>Edit</Button>
                          <Button type="button" variant="outline" className="min-h-11" disabled={cancelling !== null || updating} onClick={() => handleCancel(schedule)}>
                            {cancelling === schedule.id ? "Cancelling…" : "Cancel scheduled change"}
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {!loading && !loadError && <PageControls page={page} count={scheduleCount} onChange={setPage} label="Price schedule history pages" />}
        </section>
      </div>
      <Dialog open={editingSchedule !== null} onOpenChange={(open) => { if (!open && !updating) setEditingSchedule(null); }}>
        <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit scheduled price change</DialogTitle>
            <DialogDescription>{editingSchedule?.product_title}. Update the price or effective time before this change is applied. Times are in IST.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="min-w-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-scheduled-price">New price (₹)</Label>
              <Input id="edit-scheduled-price" type="number" inputMode="decimal" min="0.01" max="99999999.99" step="0.01" required disabled={updating} value={editPrice} onChange={(event) => setEditPrice(event.target.value)} className="min-h-11" />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="edit-scheduled-date">Effective date &amp; time (IST)</Label>
              <Input id="edit-scheduled-date" type="datetime-local" required disabled={updating} value={editDateTime} onChange={(event) => setEditDateTime(event.target.value)} className="min-h-11 max-w-full" />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" className="min-h-11" disabled={updating} onClick={() => setEditingSchedule(null)}>Close</Button>
              <Button type="submit" className="min-h-11" disabled={updating}>{updating ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminPriceSchedulesPage() {
  return <AdminRoute><AdminPriceSchedules /></AdminRoute>;
}
