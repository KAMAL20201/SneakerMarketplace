import { Link } from "react-router";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface BlogPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  published_at: string;
  read_time_minutes: number | null;
}

interface BlogTeaserProps {
  posts: BlogPostSummary[];
  heading?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BlogTeaser({
  posts,
  heading = "From The Plug Journal",
}: BlogTeaserProps) {
  if (posts.length === 0) return null;

  return (
    <section className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">{heading}</h2>
        <Link
          to="/blog"
          className="text-sm text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
        >
          All posts <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/blog/${post.slug}`}
            className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col border border-gray-100"
          >
            {post.cover_image_url ? (
              <div className="aspect-video overflow-hidden bg-gray-100">
                <img
                  src={post.cover_image_url}
                  alt={post.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ) : (
              <div className="aspect-video bg-linear-to-br from-purple-100 to-blue-100" />
            )}

            <div className="p-3 flex flex-col flex-1">
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {post.tags.slice(0, 2).map((tag) => (
                    <Badge
                      key={tag}
                      className="bg-purple-50 text-purple-600 hover:bg-purple-50 text-xs font-medium"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2 group-hover:text-purple-700 transition-colors flex-1">
                {post.title}
              </h3>

              {post.excerpt && (
                <p className="text-gray-400 text-xs line-clamp-2 mb-2">
                  {post.excerpt}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-gray-400 mt-auto pt-2 border-t border-gray-50">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(post.published_at)}
                </span>
                {post.read_time_minutes != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.read_time_minutes} min
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
