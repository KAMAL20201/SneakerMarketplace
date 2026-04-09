import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  Pencil,
  GripVertical,
  Image,
  Quote,
  List,
  Type,
  AlignLeft,
  ChevronUp,
  ChevronDown,
  X,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router";
import { ROUTE_NAMES } from "@/constants/enums";

// ---------- types ----------

type BlockType = "paragraph" | "heading" | "image" | "quote" | "list";

interface Block {
  type: BlockType;
  content?: string;  // paragraph, heading, quote
  url?: string;      // image
  alt?: string;      // image
  caption?: string;  // image
  items?: string[];  // list (newline-separated in editor)
  _listText?: string; // editor-only helper for list textarea
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  content: Block[];
  author: string;
  tags: string[];
  is_published: boolean;
  published_at: string | null;
  read_time_minutes: number;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
}

const EMPTY_FORM = {
  title: "",
  slug: "",
  excerpt: "",
  cover_image_url: "",
  author: "The Plug Market Team",
  tags: "",
  is_published: false,
  read_time_minutes: 5,
  meta_title: "",
  meta_description: "",
};

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// ---------- BlockEditor ----------

const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
  paragraph: <AlignLeft className="h-4 w-4" />,
  heading: <Type className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  quote: <Quote className="h-4 w-4" />,
  list: <List className="h-4 w-4" />,
};

const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: "Paragraph",
  heading: "Heading",
  image: "Image",
  quote: "Quote",
  list: "Bullet List",
};

function ImageBlock({
  block,
  onUpdate,
  onUploadImage,
}: {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
  onUploadImage: (file: File) => Promise<string | null>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setUploading(true);
    const url = await onUploadImage(file);
    if (url) onUpdate({ url });
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      {block.url ? (
        <div className="relative rounded-xl overflow-hidden bg-gray-50">
          <img
            src={block.url}
            alt="preview"
            className="w-full h-auto max-h-56 object-contain"
          />
          <button
            onClick={() => onUpdate({ url: "" })}
            className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg hover:bg-black/70"
          >
            Remove
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl h-28 flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
          ) : (
            <>
              <Upload className="h-5 w-5 text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">Click to upload image</p>
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
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {/* Or paste URL */}
      {!block.url && (
        <Input
          placeholder="Or paste image URL…"
          onBlur={(e) => { if (e.target.value) onUpdate({ url: e.target.value }); }}
          className="text-sm"
        />
      )}

      <Input
        placeholder="Alt text (describe the image for SEO)…"
        value={block.alt ?? ""}
        onChange={(e) => onUpdate({ alt: e.target.value })}
        className="text-sm"
      />
      <Input
        placeholder="Caption (optional)…"
        value={block.caption ?? ""}
        onChange={(e) => onUpdate({ caption: e.target.value })}
        className="text-sm"
      />
    </div>
  );
}

function BlockEditor({
  blocks,
  onChange,
  onUploadImage,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  onUploadImage: (file: File) => Promise<string | null>;
}) {
  const update = (i: number, patch: Partial<Block>) => {
    const next = blocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b));
    onChange(next);
  };

  const remove = (i: number) => onChange(blocks.filter((_, idx) => idx !== i));

  const moveUp = (i: number) => {
    if (i === 0) return;
    const next = [...blocks];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  };

  const moveDown = (i: number) => {
    if (i === blocks.length - 1) return;
    const next = [...blocks];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  };

  const addBlock = (type: BlockType) => {
    const block: Block =
      type === "list"
        ? { type, items: [], _listText: "" }
        : { type, content: "" };
    onChange([...blocks, block]);
  };

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <Card key={i} className="rounded-xl border-gray-200 shadow-sm">
          <CardContent className="p-3 space-y-2">
            {/* Block header */}
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
              <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">
                {BLOCK_ICONS[block.type]}
                {BLOCK_LABELS[block.type]}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
                </button>
                <button
                  onClick={() => moveDown(i)}
                  disabled={i === blocks.length - 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                </button>
                <button
                  onClick={() => remove(i)}
                  className="p-1 rounded hover:bg-red-50"
                >
                  <X className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </div>

            {/* Block content fields */}
            {block.type === "paragraph" && (
              <Textarea
                placeholder="Write your paragraph here…"
                value={block.content ?? ""}
                onChange={(e) => update(i, { content: e.target.value })}
                rows={4}
                className="text-sm resize-y"
              />
            )}

            {block.type === "heading" && (
              <Input
                placeholder="Section heading…"
                value={block.content ?? ""}
                onChange={(e) => update(i, { content: e.target.value })}
                className="text-sm font-semibold"
              />
            )}

            {block.type === "quote" && (
              <Textarea
                placeholder="Quote text…"
                value={block.content ?? ""}
                onChange={(e) => update(i, { content: e.target.value })}
                rows={2}
                className="text-sm italic"
              />
            )}

            {block.type === "list" && (
              <div>
                <Textarea
                  placeholder={"One item per line:\nItem 1\nItem 2\nItem 3"}
                  value={block._listText ?? (block.items ?? []).join("\n")}
                  onChange={(e) =>
                    update(i, {
                      _listText: e.target.value,
                      items: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  rows={4}
                  className="text-sm"
                />
              </div>
            )}

            {block.type === "image" && (
              <ImageBlock
                block={block}
                onUpdate={(patch) => update(i, patch)}
                onUploadImage={onUploadImage}
              />
            )}
          </CardContent>
        </Card>
      ))}

      {/* Add block buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        {(["paragraph", "heading", "image", "quote", "list"] as BlockType[]).map(
          (type) => (
            <button
              key={type}
              onClick={() => addBlock(type)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-dashed border-gray-300 text-gray-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
            >
              <Plus className="h-3 w-3" />
              {BLOCK_LABELS[type]}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ---------- main component ----------

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "new" | "edit">("list");
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [blocks, setBlocks] = useState<Block[]>([]);

  // ---------- fetch ----------

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, title, slug, excerpt, cover_image_url, author, tags, is_published, published_at, read_time_minutes, meta_title, meta_description, content, created_at"
      )
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load posts");
    else setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // ---------- form helpers ----------

  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setBlocks([]);
    setEditingPost(null);
    setView("new");
  };

  const openEdit = (post: BlogPost) => {
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      cover_image_url: post.cover_image_url ?? "",
      author: post.author,
      tags: post.tags?.join(", ") ?? "",
      is_published: post.is_published,
      read_time_minutes: post.read_time_minutes,
      meta_title: post.meta_title ?? "",
      meta_description: post.meta_description ?? "",
    });
    // Hydrate _listText for list blocks
    const hydratedBlocks = (post.content as Block[]).map((b) =>
      b.type === "list" ? { ...b, _listText: (b.items ?? []).join("\n") } : b
    );
    setBlocks(hydratedBlocks);
    setEditingPost(post);
    setView("edit");
  };

  const handleTitleChange = (val: string) => {
    setForm((f) => ({
      ...f,
      title: val,
      // Only auto-generate slug if it hasn't been manually edited
      slug: editingPost ? f.slug : slugify(val),
    }));
  };

  // ---------- image upload ----------

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("blog-images")
      .upload(path, file, { upsert: false });
    if (error) {
      toast.error("Upload failed: " + error.message);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage
      .from("blog-images")
      .getPublicUrl(path);
    toast.success("Image uploaded");
    return publicUrl;
  };

  // ---------- save ----------

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.slug.trim()) {
      toast.error("Slug is required");
      return;
    }

    setSaving(true);

    // Strip editor-only fields from blocks before saving
    const cleanBlocks = blocks.map(({ _listText: _lt, ...rest }) => rest);

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim() || null,
      cover_image_url: form.cover_image_url.trim() || null,
      author: form.author.trim() || "The Plug Market Team",
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      is_published: form.is_published,
      published_at:
        form.is_published
          ? editingPost?.published_at ?? new Date().toISOString()
          : null,
      read_time_minutes: form.read_time_minutes || 5,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      content: cleanBlocks,
    };

    let error;
    if (editingPost) {
      ({ error } = await supabase
        .from("blog_posts")
        .update(payload)
        .eq("id", editingPost.id));
    } else {
      ({ error } = await supabase.from("blog_posts").insert(payload));
    }

    setSaving(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingPost ? "Post updated" : "Post created");
      setView("list");
      fetchPosts();
    }
  };

  // ---------- toggle publish ----------

  const togglePublish = async (post: BlogPost) => {
    const nowPublished = !post.is_published;
    const { error } = await supabase
      .from("blog_posts")
      .update({
        is_published: nowPublished,
        published_at: nowPublished
          ? post.published_at ?? new Date().toISOString()
          : null,
      })
      .eq("id", post.id);
    if (error) toast.error("Failed to update");
    else {
      toast.success(nowPublished ? "Post published" : "Post unpublished");
      fetchPosts();
    }
  };

  // ---------- delete ----------

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Deleted");
      fetchPosts();
    }
  };

  // ---------- render ----------

  const isFormView = view === "new" || view === "edit";

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {isFormView ? (
            <button
              onClick={() => setView("list")}
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <Link to={ROUTE_NAMES.HOME} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-800">
              {isFormView
                ? view === "new"
                  ? "New Blog Post"
                  : "Edit Post"
                : "Blog Posts"}
            </h1>
            <p className="text-xs text-gray-500">
              {isFormView ? "Fill in the content below" : "Manage your blog content"}
            </p>
          </div>
        </div>
        {!isFormView && (
          <Button
            onClick={openNew}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Post
          </Button>
        )}
        {isFormView && (
          <div className="flex items-center gap-2">
            {/* Publish toggle */}
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_published: !f.is_published }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.is_published ? "bg-green-500" : "bg-gray-300"
              }`}
              title={form.is_published ? "Published" : "Draft"}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.is_published ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-xs text-gray-500 hidden sm:block">
              {form.is_published ? "Published" : "Draft"}
            </span>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="max-w-3xl mx-auto px-4 pt-5 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="font-medium mb-1">No posts yet</p>
              <p className="text-sm">Click "New Post" to write your first blog post.</p>
            </div>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="rounded-2xl shadow-sm overflow-hidden">
                <CardContent className="p-0 flex gap-0">
                  {/* Thumbnail */}
                  {post.cover_image_url ? (
                    <div className="w-24 h-24 shrink-0 bg-gray-100 hidden sm:block">
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 shrink-0 bg-gradient-to-br from-purple-100 to-blue-100 hidden sm:flex items-center justify-center">
                      <Type className="h-6 w-6 text-purple-300" />
                    </div>
                  )}
                  <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className={`text-xs shrink-0 ${
                            post.is_published
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                          }`}
                        >
                          {post.is_published ? "Published" : "Draft"}
                        </Badge>
                        {post.tags?.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            className="text-xs bg-gray-100 text-gray-500 hover:bg-gray-100"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {post.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        /{post.slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => openEdit(post)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => togglePublish(post)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                      >
                        {post.is_published ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                        {post.is_published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg hover:bg-red-50 text-red-500 transition-colors ml-auto"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* FORM VIEW (new / edit) */}
      {isFormView && (
        <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
          {/* Basic info */}
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-5 space-y-4">
              <p className="font-semibold text-gray-800 text-sm">Post Details</p>

              <div className="space-y-1">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Air Max CLOT History: Every Collab Explained"
                />
              </div>

              <div className="space-y-1">
                <Label>Slug (URL) *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 shrink-0">/blog/</span>
                  <Input
                    value={form.slug}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                    }
                    placeholder="air-max-clot-history"
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Excerpt (shown on blog list)</Label>
                <Textarea
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  placeholder="1–2 sentences summarising the post…"
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <Label>Cover Image URL</Label>
                <Input
                  value={form.cover_image_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cover_image_url: e.target.value }))
                  }
                  placeholder="https://... or Supabase storage URL"
                />
                {form.cover_image_url && (
                  <div className="rounded-xl overflow-hidden aspect-[2/1] bg-gray-100 mt-1">
                    <img
                      src={form.cover_image_url}
                      alt="cover preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Author</Label>
                  <Input
                    value={form.author}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, author: e.target.value }))
                    }
                    placeholder="The Plug Market Team"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Read time (minutes)</Label>
                  <Input
                    type="number"
                    value={form.read_time_minutes}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        read_time_minutes: parseInt(e.target.value) || 5,
                      }))
                    }
                    min={1}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="Nike, Air Max, CLOT, Collab History"
                />
              </div>
            </CardContent>
          </Card>

          {/* Content blocks */}
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-5">
              <p className="font-semibold text-gray-800 text-sm mb-3">
                Content Blocks
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Build the post by adding blocks — paragraphs, headings, images,
                quotes, or lists. You can drop images anywhere between text blocks.
              </p>
              <BlockEditor blocks={blocks} onChange={setBlocks} onUploadImage={uploadImage} />
            </CardContent>
          </Card>

          {/* SEO */}
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-5 space-y-4">
              <p className="font-semibold text-gray-800 text-sm">
                SEO (optional overrides)
              </p>
              <div className="space-y-1">
                <Label>Meta Title</Label>
                <Input
                  value={form.meta_title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, meta_title: e.target.value }))
                  }
                  placeholder="Leave blank to use post title"
                  maxLength={70}
                />
                <p className="text-xs text-gray-400">
                  {form.meta_title.length}/70 chars
                </p>
              </div>
              <div className="space-y-1">
                <Label>Meta Description</Label>
                <Textarea
                  value={form.meta_description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, meta_description: e.target.value }))
                  }
                  placeholder="Leave blank to use excerpt"
                  rows={2}
                  maxLength={160}
                />
                <p className="text-xs text-gray-400">
                  {form.meta_description.length}/160 chars
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save button (bottom) */}
          <div className="flex gap-3 pb-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex-1"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {saving ? "Saving…" : view === "new" ? "Create Post" : "Update Post"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setView("list")}
              className="rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
