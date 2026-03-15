import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Plus, Trash2, Eye, EyeOff, ArrowLeft, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router";
import { ROUTE_NAMES } from "@/constants/enums";

interface Banner {
  id: string;
  image_url: string;
  cta_url: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  created_at: string;
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    image_url: "",
    cta_url: "",
    is_active: true,
    start_date: "",
    end_date: "",
    sort_order: 0,
  });

  const fetchBanners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error("Failed to load banners");
    else setBanners(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("banners")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("banners").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: publicUrl }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const handleSave = async () => {
    if (!form.image_url) {
      toast.error("Please upload or paste an image URL");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("banners").insert({
      image_url: form.image_url,
      cta_url: form.cta_url.trim() || null,
      is_active: form.is_active,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      sort_order: form.sort_order,
    });

    if (error) {
      toast.error("Failed to save banner");
    } else {
      toast.success("Banner added");
      setShowForm(false);
      setForm({ image_url: "", cta_url: "", is_active: true, start_date: "", end_date: "", sort_order: 0 });
      fetchBanners();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Deleted"); fetchBanners(); }
  };

  const toggleActive = async (banner: Banner) => {
    const { error } = await supabase
      .from("banners")
      .update({ is_active: !banner.is_active })
      .eq("id", banner.id);
    if (error) toast.error("Failed to update");
    else fetchBanners();
  };

  const updateSortOrder = async (id: string, order: number) => {
    await supabase.from("banners").update({ sort_order: order }).eq("id", id);
    fetchBanners();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Helmet><title>Admin — Banners</title></Helmet>

      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={ROUTE_NAMES.HOME} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Homepage Banners</h1>
            <p className="text-xs text-gray-500">Image carousel shown at the top of the homepage</p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Banner
        </Button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

        {/* Add form */}
        {showForm && (
          <Card className="rounded-2xl border-purple-200 shadow-sm">
            <CardContent className="pt-5 space-y-4">
              <p className="font-semibold text-gray-800">New Banner</p>

              {/* Image upload area */}
              <div>
                <Label className="mb-2 block">Banner Image *</Label>
                {form.image_url ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-[2/1] bg-gray-100">
                    <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                      className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-2xl aspect-[2/1] flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Click to upload image</p>
                        <p className="text-xs text-gray-400 mt-1">Recommended: 2912×1440px (2:1 ratio)</p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                {/* Or paste URL */}
                {!form.image_url && (
                  <div className="mt-2">
                    <Input
                      placeholder="Or paste image URL…"
                      onChange={(e) => {
                        if (e.target.value) setForm((f) => ({ ...f, image_url: e.target.value }));
                      }}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <Label>Link on tap (optional)</Label>
                  <Input
                    value={form.cta_url}
                    onChange={(e) => setForm((f) => ({ ...f, cta_url: e.target.value }))}
                    placeholder="/sneakers or /browse?brand=nike"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.is_active ? "bg-purple-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        form.is_active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-600">
                    {form.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  onClick={handleSave}
                  disabled={saving || uploading}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {saving ? "Saving…" : "Add Banner"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setForm({ image_url: "", cta_url: "", is_active: true, start_date: "", end_date: "", sort_order: 0 });
                  }}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Banner list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : banners.length === 0 && !showForm ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium mb-1">No banners yet</p>
            <p className="text-sm">Click "Add Banner" to upload your first banner image.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {banners.map((banner) => (
              <Card key={banner.id} className="rounded-2xl overflow-hidden shadow-sm">
                <CardContent className="p-0">
                  <div className="aspect-[2/1] bg-gray-100">
                    <img
                      src={banner.image_url}
                      alt="Banner"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        className={`text-xs shrink-0 ${
                          banner.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {banner.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {banner.cta_url && (
                        <span className="text-xs text-gray-400 truncate">
                          → {banner.cta_url}
                        </span>
                      )}
                      {(banner.start_date || banner.end_date) && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {banner.start_date && banner.end_date
                            ? `${banner.start_date} → ${banner.end_date}`
                            : banner.start_date
                            ? `From ${banner.start_date}`
                            : `Until ${banner.end_date}`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <div className="flex items-center gap-1 mr-1">
                        <button
                          onClick={() => updateSortOrder(banner.id, banner.sort_order - 1)}
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <span className="text-xs text-gray-400 w-4 text-center">{banner.sort_order}</span>
                        <button
                          onClick={() => updateSortOrder(banner.id, banner.sort_order + 1)}
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        onClick={() => toggleActive(banner)}
                        title={banner.is_active ? "Deactivate" : "Activate"}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        {banner.is_active
                          ? <Eye className="h-4 w-4 text-green-600" />
                          : <EyeOff className="h-4 w-4 text-gray-400" />
                        }
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="p-2 rounded-xl hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
