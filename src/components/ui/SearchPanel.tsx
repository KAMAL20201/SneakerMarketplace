import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router";
import { ROUTE_NAMES, ROUTE_HELPERS } from "@/constants/enums";
import { supabase } from "@/lib/supabase";

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  image_url: string;
}

function buildMultiWordSearchFilter(
  rawQuery: string,
  columns: string[],
): string | null {
  const trimmed = rawQuery.trim();
  if (!trimmed) return null;
  const tokens = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[%_]/g, ""));
  if (tokens.length === 0) return null;
  if (tokens.length === 1) {
    const pat = `%${tokens[0]}%`;
    return columns.map((col) => `${col}.ilike.${pat}`).join(",");
  }
  return columns
    .map((col) => {
      const andParts = tokens.map((t) => `${col}.ilike.%${t}%`).join(",");
      return `and(${andParts})`;
    })
    .join(",");
}

export function SearchPanel({ open, onClose }: SearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Auto-focus input when panel opens
  useEffect(() => {
    if (open) {
      // Small delay to let the slide animation start before focusing
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
    // Reset state when panel closes
    setSearchTerm("");
    setResults([]);
    setIsLoading(false);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const fetchResults = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const filterStr = buildMultiWordSearchFilter(query, ["title", "brand"]);
      let q = supabase
        .from("listings_with_images")
        .select("id, slug, title, brand, price, image_url")
        .eq("status", "active");
      if (filterStr) q = q.or(filterStr);
      const { data } = await q.limit(12);

      const lq = query.trim().toLowerCase();
      const ranked = (data ?? []).sort((a, b) => {
        const aExact = a.title.toLowerCase().includes(lq) ? 0 : 1;
        const bExact = b.title.toLowerCase().includes(lq) ? 0 : 1;
        return aExact - bExact;
      });
      setResults(ranked);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(value);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      navigateToSearch(searchTerm);
    }
  };

  const navigateToSearch = (query: string) => {
    onClose();
    navigate(`${ROUTE_NAMES.BROWSE}?search=${encodeURIComponent(query)}`);
  };

  const handleResultClick = (result: SearchResult) => {
    onClose();
    navigate(ROUTE_HELPERS.PRODUCT_DETAIL(result.slug ?? result.id));
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel from right */}
      <div
        className={`fixed top-0 right-0 z-[70] h-full w-full sm:w-[420px] bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel header with search input */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="flex-1 relative flex items-center border rounded-2xl pl-3 bg-gray-50">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <Input
              ref={inputRef}
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Search sneakers, streetwear..."
              className="h-12 text-gray-700 placeholder:text-gray-400 !border-none !outline-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setResults([]);
                  inputRef.current?.focus();
                }}
                className="absolute right-3 p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results area — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Empty state */}
          {!searchTerm.trim() && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-purple-400" />
              </div>
              <p className="text-gray-800 font-semibold mb-1">
                Search Products
              </p>
              <p className="text-gray-500 text-sm">
                Find sneakers, streetwear, and more
              </p>
            </div>
          )}

          {/* Loading skeletons */}
          {searchTerm.trim() && isLoading && (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-16 h-16 bg-gray-200 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results list */}
          {searchTerm.trim() && !isLoading && results.length > 0 && (
            <div>
              <div className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {results.length} result{results.length !== 1 ? "s" : ""} found
              </div>
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left border-b border-gray-50 last:border-b-0"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    {result.image_url ? (
                      <img
                        src={result.image_url}
                        alt={result.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Search className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-purple-600 font-semibold capitalize">
                      {result.brand}
                    </p>
                    <p className="text-sm text-gray-800 font-medium line-clamp-2 leading-snug mt-0.5">
                      {result.title}
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      ₹{result.price.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </button>
              ))}

              {/* See all results */}
              <button
                onClick={() => navigateToSearch(searchTerm)}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 border-t border-gray-100 text-sm text-purple-600 font-semibold hover:bg-purple-50 transition-colors"
              >
                <Search className="w-4 h-4" />
                See all results for "{searchTerm}"
              </button>
            </div>
          )}

          {/* No results */}
          {searchTerm.trim() && !isLoading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-gray-800 font-semibold mb-1">
                No products found
              </p>
              <p className="text-gray-500 text-sm mb-4">
                No results for "{searchTerm}"
              </p>
              <button
                onClick={() => navigateToSearch(searchTerm)}
                className="text-purple-600 hover:text-purple-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-purple-50 transition-colors"
              >
                Browse all products
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
