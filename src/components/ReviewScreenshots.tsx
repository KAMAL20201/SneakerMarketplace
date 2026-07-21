import { useState, useEffect } from "react";
import { X, MessageCircle, Users } from "lucide-react";

const BASE = "https://vojwfupyoathhvujwaqh.supabase.co/storage/v1/object/public/static-assets/reviews";

// ─── Add your screenshot URLs here ───────────────────────────────────────────
const REVIEW_SCREENSHOTS = [
  `${BASE}/review-1.jpeg`,
  `${BASE}/review-2.jpg`,
  `${BASE}/review-3.jpg`,
  `${BASE}/review-4.jpg`,
  `${BASE}/review-5.jpg`,
  `${BASE}/review-6.png`,
  `${BASE}/review-7.jpg`,
  `${BASE}/review-8.jpg`,
  `${BASE}/review-9.jpg`,
];

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close preview"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white shadow-lg text-gray-800 hover:bg-gray-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <img
          src={src}
          alt="Customer review"
          className="w-full max-h-[85dvh] object-contain rounded-2xl shadow-2xl"
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReviewScreenshots() {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (REVIEW_SCREENSHOTS.length === 0) return null;

  // Triple the list so the seamless loop always has enough content
  const items = [
    ...REVIEW_SCREENSHOTS,
    ...REVIEW_SCREENSHOTS,
    ...REVIEW_SCREENSHOTS,
  ];

  // ~35 px/s — adjust the divisor to speed up / slow down
  const totalWidthPx = REVIEW_SCREENSHOTS.length * (208 + 16);
  const durationSec = Math.round(totalWidthPx / 35);

  return (
    <>
      <section
        className="py-8 overflow-hidden"
        aria-label="Customer review screenshots"
      >
        {/* Header */}
        <div className="px-4 lg:px-8 mb-5 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-purple-600 flex-shrink-0" />
          <h2 className="text-xl font-bold text-gray-800">
            What Buyers Are Saying
          </h2>
        </div>

        {/* Marquee wrapper — hover pauses via CSS */}
        <div
          className="review-marquee-wrapper relative"
          style={{ "--marquee-duration": `${durationSec}s` } as React.CSSProperties}
        >
          {/* Fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-white to-transparent" />

          {/* Scrolling track */}
          <div className="review-marquee-track flex gap-4 w-max">
            {items.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightbox(url)}
                className="flex-shrink-0 w-44 sm:w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-zoom-in"
                aria-label="View review screenshot"
              >
                <img
                  src={url}
                  alt="Customer review"
                  className="w-full h-auto object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        </div>

        {/* WhatsApp community CTA */}
        <div className="px-4 lg:px-8 mt-6 flex justify-center">
          <a
            href="https://chat.whatsapp.com/DqDlG8APM0BFjKRmAI8Eb5"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#25D366] text-white font-semibold text-sm shadow-md hover:shadow-lg hover:brightness-105 active:scale-95 transition-all duration-200"
          >
            {/* WhatsApp SVG icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5 flex-shrink-0"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <Users className="h-4 w-4 flex-shrink-0" />
            Join our WhatsApp Community
          </a>
        </div>
      </section>

      {lightbox && (
        <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}
