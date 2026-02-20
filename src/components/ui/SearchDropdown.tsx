import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router";
import { ROUTE_NAMES, ROUTE_HELPERS } from "@/constants/enums";
import { supabase } from "@/lib/supabase";

interface SearchDropdownProps {
  placeholder?: string;
  className?: string;
  showRecentSearches?: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  brand: string;
  price: number;
  image_url: string;
}

export function SearchDropdown({
  placeholder = "Search sneakers, streetwear, collectibles...",
  className = "",
  showRecentSearches = true,
}: SearchDropdownProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchResults = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("listings_with_images")
        .select("id, title, brand, price, image_url")
        .eq("status", "active")
        .or(`title.ilike.%${query}%,brand.ilike.%${query}%`)
        .limit(5);

      setResults(data ?? []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(value);
    }, 300);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      handleSearch(searchTerm);
    }
  };

  const handleSearch = (query: string) => {
    setIsOpen(false);
    navigate(`${ROUTE_NAMES.BROWSE}?search=${encodeURIComponent(query)}`);
  };

  const handleResultClick = (id: string) => {
    setIsOpen(false);
    setSearchTerm("");
    navigate(ROUTE_HELPERS.PRODUCT_DETAIL(id));
  };

  const showDropdown = isOpen && searchTerm.trim().length > 0;

  return (
    <div ref={searchRef} className={`relative w-full ${className}`}>
      {/* Search Input */}
      <div className="relative flex items-center justify-center border rounded-2xl pl-3 bg-white">
        <Search className="h-5 w-5 text-gray-600" />
        <Input
          value={searchTerm}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="h-12 text-gray-700 placeholder:text-gray-500 !border-none !outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 overflow-hidden">
          {/* Loading skeletons */}
          {isLoading && (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && (
            <>
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    {result.image_url ? (
                      <img
                        src={result.image_url}
                        alt={result.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Search className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-purple-600 font-semibold capitalize">
                      {result.brand}
                    </p>
                    <p className="text-sm text-gray-800 font-medium line-clamp-1">
                      {result.title}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      ₹{result.price.toLocaleString("en-IN")}
                    </p>
                  </div>
                </button>
              ))}

              {/* See all results */}
              <button
                onClick={() => handleSearch(searchTerm)}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 border-t border-gray-100 text-sm text-purple-600 font-semibold hover:bg-purple-50 transition-colors"
              >
                <Search className="w-4 h-4" />
                See all results for "{searchTerm}"
              </button>
            </>
          )}

          {/* No results */}
          {!isLoading && results.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <div className="text-sm mb-2">No products found for "{searchTerm}"</div>
              <button
                onClick={() => handleSearch(searchTerm)}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                Browse all products
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state when no search term and focused */}
      {isOpen && !searchTerm.trim() && showRecentSearches && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 p-4 text-center text-gray-500">
          <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <div className="text-sm">Start typing to search products...</div>
        </div>
      )}
    </div>
  );
}
