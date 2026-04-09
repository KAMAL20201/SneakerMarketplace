import { createClient } from "@supabase/supabase-js";
import { data, redirect, Link } from "react-router";
import { useLoaderData } from "react-router";
import { Calendar, Clock, ArrowLeft, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Route } from "./+types/BlogPost";

// ---------- types ----------

type BlockType = "paragraph" | "heading" | "image" | "quote" | "list";

interface Block {
  type: BlockType;
  content?: string; // paragraph, heading, quote
  url?: string; // image
  alt?: string; // image
  caption?: string; // image
  items?: string[]; // list
}

interface BlogPostFull {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  content: Block[];
  author: string;
  tags: string[];
  published_at: string;
  updated_at: string | null;
  read_time_minutes: number;
  meta_title: string | null;
  meta_description: string | null;
}

// ---------- loader ----------

export async function loader({ params }: Route.LoaderArgs) {
  const ssrSupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  const { data: post } = await ssrSupabase
    .from("blog_posts")
    .select("*")
    .eq("slug", params.slug)
    .eq("is_published", true)
    .single();

  if (!post) throw redirect("/blog");

  return data(
    { post },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
      },
    },
  );
}

// ---------- meta (SSR — replaces Helmet) ----------

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData?.post) {
    return [{ title: "Post Not Found | The Plug Market Blog" }];
  }
  const post = loaderData.post as BlogPostFull;
  const pageTitle = (post.meta_title ?? post.title) + " — The Plug Market Blog";
  const pageDesc =
    post.meta_description ??
    post.excerpt ??
    `Read "${post.title}" on The Plug Market blog.`;
  const canonicalUrl = `https://theplugmarket.in/blog/${post.slug}`;
  const image = post.cover_image_url ?? "https://theplugmarket.in/og-image.jpg";

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: pageDesc,
    image: post.cover_image_url ?? undefined,
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "The Plug Market",
      url: "https://theplugmarket.in",
      logo: {
        "@type": "ImageObject",
        url: "https://theplugmarket.in/logo-192.png",
      },
    },
    datePublished: post.published_at,
    dateModified: post.updated_at ?? post.published_at,
    mainEntityOfPage: canonicalUrl,
  });

  return [
    { title: pageTitle },
    { name: "description", content: pageDesc },
    { tagName: "link", rel: "canonical", href: canonicalUrl },
    { property: "og:type", content: "article" },
    { property: "og:url", content: canonicalUrl },
    { property: "og:title", content: pageTitle },
    { property: "og:description", content: pageDesc },
    { property: "og:image", content: image },
    { property: "article:published_time", content: post.published_at },
    {
      property: "article:modified_time",
      content: post.updated_at ?? post.published_at,
    },
    { property: "article:author", content: post.author },
    ...(post.tags?.map((tag: string) => ({
      property: "article:tag",
      content: tag,
    })) ?? []),
    { property: "twitter:card", content: "summary_large_image" },
    { property: "twitter:title", content: pageTitle },
    { property: "twitter:description", content: pageDesc },
    { property: "twitter:image", content: image },
    { "script:ld+json": jsonLd },
  ];
}

// ---------- helpers ----------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ---------- block renderers ----------

function RenderBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-8 mb-3">
          {block.content}
        </h2>
      );

    case "paragraph":
      return (
        <p className="text-gray-700 leading-relaxed text-base md:text-lg mb-4">
          {block.content}
        </p>
      );

    case "image":
      return (
        <figure className="my-6">
          <div className="rounded-2xl overflow-hidden bg-gray-100">
            <img
              src={block.url}
              alt={block.alt ?? ""}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
          {block.caption && (
            <figcaption className="text-center text-xs text-gray-400 mt-2 italic">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "quote":
      return (
        <blockquote className="border-l-4 border-purple-500 pl-4 md:pl-6 py-1 my-5 italic text-gray-600 text-base md:text-lg bg-purple-50 rounded-r-xl">
          {block.content}
        </blockquote>
      );

    case "list":
      return (
        <ul className="list-disc list-inside space-y-1 mb-4 text-gray-700 text-base md:text-lg">
          {(block.items ?? []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );

    default:
      return null;
  }
}

// ---------- component ----------

export default function BlogPost() {
  const { post } = useLoaderData<typeof loader>() as { post: BlogPostFull };

  return (
    <div className="min-h-screen bg-white">
      {/* Cover image
      {post.cover_image_url && (
        <div className="w-full aspect-[2.5/1] md:aspect-[3/1] overflow-hidden bg-gray-100">
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
            fetchPriority="high"
          />
        </div>
      )} */}

      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        {/* Back link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-purple-600 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          All posts
        </Link>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <Badge
                key={tag}
                className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
          {post.title}
        </h1>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-gray-400 mb-8 pb-6 border-b border-gray-100">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(post.published_at)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.read_time_minutes} min read
          </span>
          <span className="text-gray-500">By {post.author}</span>
        </div>

        {/* Excerpt as lead paragraph */}
        {post.excerpt && (
          <p className="text-lg md:text-xl text-gray-500 font-medium mb-6 leading-relaxed">
            {post.excerpt}
          </p>
        )}

        {/* Content blocks */}
        <div>
          {(post.content as Block[]).map((block, i) => (
            <RenderBlock key={i} block={block} />
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-12 p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl text-center border border-purple-100">
          <p className="font-bold text-gray-900 text-lg mb-1">
            Shop Authentic Sneakers
          </p>
          <p className="text-gray-500 text-sm mb-4">
            Every sneaker on The Plug Market is 100% verified authentic.
          </p>
          <Link
            to="/browse"
            className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            Browse Collection
          </Link>
        </div>
      </div>
    </div>
  );
}
