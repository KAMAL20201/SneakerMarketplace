import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { AdminRoute } from "@/components/AdminRoute";
import { BrandPagination } from "@/components/HomeBrandSections";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ROUTE_NAMES } from "@/constants/enums";
import { fetchBrandSections, SECTION_PAGE_SIZE } from "@/lib/homeBrandSections";
import type { HomeBrandSection } from "@/lib/homeBrandSections";
import { supabase } from "@/lib/supabase";

function AdminBrandSections() {
  const [result, setResult] = useState<{ sections: HomeBrandSection[]; count: number }>({ sections: [], count: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [brand, setBrand] = useState("");
  const [title, setTitle] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [active, setActive] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  const refresh = useCallback(async (nextPage: number) => {
    setLoading(true);
    setFailed(false);
    try {
      const next = await fetchBrandSections(supabase, nextPage, true);
      if (!next.sections.length && nextPage > 1) {
        const lastPage = Math.max(1, Math.ceil(next.count / SECTION_PAGE_SIZE));
        setResult(await fetchBrandSections(supabase, lastPage, true));
        setPage(lastPage);
      } else {
        setResult(next);
        setPage(nextPage);
      }
    } catch {
      setFailed(true);
      toast.error("Could not load brand sections. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(1); }, [refresh]);

  function resetForm() {
    setEditingId(null);
    setBrand("");
    setTitle("");
    setSortOrder("0");
    setActive(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanBrand = brand.trim();
    const order = Number(sortOrder);
    if (!cleanBrand || /[%,_\\]/.test(cleanBrand) || !Number.isSafeInteger(order) || Math.abs(order) > 2147483647) {
      toast.error("Enter a brand without commas, %, _ or backslashes, and a valid whole number for display order.");
      return;
    }
    setSaving(true);
    try {
      const values = { brand: cleanBrand, title: title.trim(), sort_order: order, is_active: active };
      const query = editingId
        ? supabase.from("home_brand_sections").update(values).eq("id", editingId)
        : supabase.from("home_brand_sections").insert(values);
      const { data, error } = await query.select("id").single();
      if (error || !data) {
        toast.error(error?.code === "23505" ? "A section for this brand already exists." : "Could not save the section. Please try again.");
        return;
      }
      toast.success("Brand section saved.");
      resetForm();
      await refresh(page);
    } catch {
      toast.error("Could not save the section. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(section: HomeBrandSection) {
    setSaving(true);
    try {
      const { data, error } = await supabase.from("home_brand_sections").delete().eq("id", section.id).select("id").single();
      if (error || !data) throw error;
      if (editingId === section.id) resetForm();
      toast.success("Brand section removed.");
      await refresh(page);
    } catch {
      toast.error("Could not remove the section. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Button asChild variant="ghost" className="min-h-11"><Link to={ROUTE_NAMES.ADMIN_DASHBOARD}>Back to dashboard</Link></Button>
        <div>
          <h1 className="text-2xl font-bold">Home Brand Sections</h1>
          <p className="mt-2 text-sm text-gray-600">Enter the brand name used on your products. Its newest active products appear automatically. Empty sections stay hidden.</p>
        </div>
        <Card><CardContent className="pt-6">
          <form ref={formRef} onSubmit={save} className="space-y-4">
            <h2 className="font-semibold">{editingId ? "Edit section" : "Add section"}</h2>
            <div className="space-y-2"><Label htmlFor="brand-name">Brand name</Label><Input id="brand-name" className="min-h-11" value={brand} onChange={(event) => setBrand(event.target.value)} maxLength={100} placeholder="e.g. Nike" required disabled={saving} /></div>
            <div className="space-y-2"><Label htmlFor="section-title">Section title (optional)</Label><Input id="section-title" className="min-h-11" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder={brand || "Defaults to brand name"} disabled={saving} /></div>
            <div className="space-y-2"><Label htmlFor="section-order">Display order</Label><Input id="section-order" className="min-h-11" type="number" step="1" min={-2147483647} max={2147483647} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} required disabled={saving} /><p className="text-xs text-gray-500">Lower numbers appear first.</p></div>
            <div className="flex min-h-11 items-center gap-3"><Checkbox id="section-active" checked={active} onCheckedChange={(checked) => setActive(checked === true)} disabled={saving} /><Label htmlFor="section-active" className="flex min-h-11 cursor-pointer items-center">Show on home page</Label></div>
            <div className="flex flex-wrap gap-3"><Button className="min-h-11" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Add section"}</Button>{editingId && <Button className="min-h-11" type="button" variant="outline" onClick={resetForm} disabled={saving}>Cancel</Button>}</div>
          </form>
        </CardContent></Card>
        <div className="space-y-3" aria-busy={loading}>
          <h2 className="font-semibold">Saved sections ({result.count})</h2>
          {loading ? <p role="status">Loading sections…</p> : failed ? <Button className="min-h-11" onClick={() => refresh(page)}>Retry loading sections</Button> : result.sections.length === 0 ? <p className="text-sm text-gray-500">No sections yet. Add a brand above to get started.</p> : result.sections.map((section) => (
            <Card key={section.id}><CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><h3 className="break-words font-semibold">{section.title || section.brand}</h3><p className="break-words text-sm text-gray-500">{section.brand} · Order {section.sort_order} · {section.is_active ? "Visible" : "Hidden"}</p></div>
              <div className="flex shrink-0 gap-2">
                <Button className="min-h-11" variant="outline" disabled={saving || loading} onClick={() => {
                  setEditingId(section.id); setBrand(section.brand); setTitle(section.title); setSortOrder(String(section.sort_order)); setActive(section.is_active);
                  formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  formRef.current?.querySelector("input")?.focus({ preventScroll: true });
                }} aria-label={`Edit ${section.brand} section`}>Edit</Button>
                <Button className="min-h-11" variant="destructive" disabled={saving || loading} onClick={() => remove(section)} aria-label={`Remove ${section.brand} section`}>Remove</Button>
              </div>
            </CardContent></Card>
          ))}
          <BrandPagination page={page} pages={Math.ceil(result.count / SECTION_PAGE_SIZE)} loading={loading || saving} label="Saved brand sections" onChange={refresh} />
        </div>
      </div>
    </div>
  );
}

export default function AdminBrandSectionsPage() {
  return <AdminRoute><AdminBrandSections /></AdminRoute>;
}
