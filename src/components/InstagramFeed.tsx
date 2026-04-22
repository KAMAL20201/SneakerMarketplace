import { useEffect, useRef, useState } from "react";
import { Instagram, X } from "lucide-react";

interface InstagramPost {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  instagramUrl?: string;
}

const INSTAGRAM_POSTS: InstagramPost[] = [
  {
    id: "1",
    videoUrl:
      "https://vojwfupyoathhvujwaqh.supabase.co/storage/v1/object/public/static-assets/instagram-reel-1.mp4",
    instagramUrl: "https://instagram.com/the.plugmarket",
  },
  {
    id: "2",
    videoUrl:
      "https://vojwfupyoathhvujwaqh.supabase.co/storage/v1/object/public/static-assets/instagram-reel-evosl-dynafish.mp4",
    instagramUrl: "https://instagram.com/the.plugmarket",
  },
];

const VideoCard = ({
  post,
  onOpen,
}: {
  post: InstagramPost;
  onOpen: (post: InstagramPost) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.muted = true;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="relative flex-shrink-0 w-48 h-72 rounded-2xl overflow-hidden bg-gray-100 shadow-sm cursor-pointer"
      onClick={() => onOpen(post)}
    >
      <video
        ref={videoRef}
        src={post.videoUrl}
        poster={post.thumbnailUrl}
        muted
        playsInline
        loop
        preload="auto"
        className="w-full h-full object-cover pointer-events-none"
      />

      {post.caption && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
          <p className="text-white text-xs line-clamp-2">{post.caption}</p>
        </div>
      )}
    </div>
  );
};

const VideoModal = ({
  post,
  onClose,
}: {
  post: InstagramPost;
  onClose: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-0 sm:px-4 pt-12"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm mx-auto bg-black rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
      style={{ maxHeight: "calc(100dvh - 48px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Video */}
        <video
          ref={videoRef}
          src={post.videoUrl}
          poster={post.thumbnailUrl}
          playsInline
          loop
          controls
          className="w-full flex-1 min-h-0 object-cover"
        />

        {/* CTA */}
        <div className="p-4 bg-black">
          {post.caption && (
            <p className="text-white text-sm mb-3">{post.caption}</p>
          )}
          <a
            href={post.instagramUrl ?? "https://instagram.com/the.plugmarket"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white font-semibold text-sm"
          >
            <Instagram className="h-4 w-4" />
            View on Instagram
          </a>
        </div>
      </div>
    </div>
  );
};

const InstagramFeed = () => {
  const isEmpty = INSTAGRAM_POSTS.length === 0;
  const [activePost, setActivePost] = useState<InstagramPost | null>(null);

  return (
    <section className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-100">
            <Instagram className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-800 leading-tight">
              Follow us on Instagram
            </p>
            <p className="text-xs text-gray-500">@the.plugmarket</p>
          </div>
        </div>
        <a
          href="https://instagram.com/the.plugmarket"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-full border border-purple-300 bg-white text-purple-600 text-xs font-semibold hover:bg-purple-600 hover:text-white transition-colors duration-200"
        >
          Follow
        </a>
      </div>

      {isEmpty ? (
        <a
          href="https://instagram.com/the.plugmarket"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-4 rounded-2xl border border-purple-100 bg-purple-50 hover:border-purple-300 hover:bg-purple-100 transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100">
              <Instagram className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-800 leading-tight">
                Follow us on Instagram
              </p>
              <p className="text-xs text-gray-500">
                @the.plugmarket · Latest drops & restocks
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 px-4 py-1.5 rounded-full border border-purple-300 bg-white text-purple-600 text-sm font-semibold hover:bg-purple-600 hover:text-white transition-colors duration-200">
            Follow
          </div>
        </a>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {INSTAGRAM_POSTS.map((post) => (
            <VideoCard key={post.id} post={post} onOpen={setActivePost} />
          ))}
        </div>
      )}

      {activePost && (
        <VideoModal post={activePost} onClose={() => setActivePost(null)} />
      )}
    </section>
  );
};

export default InstagramFeed;
