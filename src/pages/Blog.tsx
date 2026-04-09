import { createClient } from "@supabase/supabase-js";
import { data, Link } from "react-router";
import { useLoaderData } from "react-router";
import { Helmet } from "react-helmet-async";
import { Calendar, Clock, Tag, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Route } from "./+types/Blog";

export async function loader(_: Route.LoaderArgs) {
  const ssrSupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  const { data: posts } = await ssrSupabase
    .from("blog_posts")
    .select(
      "id, title, slug, excerpt, cover_image_url, author, tags, published_at, read_time_minutes"
    )
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  return data(
    { posts: posts ?? [] },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

interface BlogPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  author: string;
  tags: string[];
  published_at: string;
  read_time_minutes: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Blog() {
  const { posts } = useLoaderData<typeof loader>() as {
    posts: BlogPostSummary[];
  };

  const [featured, ...rest] = posts;

  return (
    <>
      <Helmet>
        <title>Blog — The Plug Market | Sneaker Culture, Guides & Drops</title>
        <meta
          name="description"
          content="Explore sneaker history, authentication guides, and the latest drop news on The Plug Market blog. Your source for authentic sneaker culture in India."
        />
        <link rel="canonical" href="https://theplugmarket.in/blog" />
        <meta property="og:title" content="Blog — The Plug Market" />
        <meta
          property="og:description"
          content="Sneaker culture, authentication guides, and drop news from The Plug Market."
        />
        <meta property="og:url" content="https://theplugmarket.in/blog" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Hero header */}
        <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white py-14 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-extrabold mb-3 tracking-tight">
              The Plug Journal
            </h1>
            <p className="text-gray-300 text-base md:text-lg max-w-xl mx-auto">
              Sneaker history, cop guides, authentication tips &amp; culture
              drops — all from India's most trusted sneaker market.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-10">
          {posts.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <p className="text-xl font-semibold mb-2">No posts yet</p>
              <p className="text-sm">Check back soon — content is coming.</p>
            </div>
          ) : (
            <>
              {/* Featured post */}
              {featured && (
                <Link
                  to={`/blog/${featured.slug}`}
                  className="group block mb-10 rounded-3xl overflow-hidden shadow-md bg-white hover:shadow-xl transition-shadow"
                >
                  {featured.cover_image_url && (
                    <div className="aspect-[2/1] overflow-hidden bg-gray-100">
                      <img
                        src={featured.cover_image_url}
                        alt={featured.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-6 md:p-8">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {featured.tags?.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="text-gray-500 text-sm md:text-base mb-4 line-clamp-3">
                        {featured.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(featured.published_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {featured.read_time_minutes} min read
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-purple-600 font-medium">
                        Read more <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              {/* Rest of posts grid */}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((post) => (
                    <Link
                      key={post.id}
                      to={`/blog/${post.slug}`}
                      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col"
                    >
                      {post.cover_image_url ? (
                        <div className="aspect-[16/9] overflow-hidden bg-gray-100">
                          <img
                            src={post.cover_image_url}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[16/9] bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                          <Tag className="h-8 w-8 text-purple-300" />
                        </div>
                      )}
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {post.tags?.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              className="bg-purple-50 text-purple-600 hover:bg-purple-50 text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm md:text-base mb-1 group-hover:text-purple-700 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-gray-400 text-xs line-clamp-2 flex-1 mb-3">
                            {post.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-auto">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(post.published_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {post.read_time_minutes} min
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
