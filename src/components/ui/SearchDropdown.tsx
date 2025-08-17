import React, { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router";
import { ROUTE_NAMES } from "@/constants/enums";

interface SearchDropdownProps {
  placeholder?: string;
  className?: string;
  showRecentSearches?: boolean;
}

export function SearchDropdown({
  placeholder = "Search sneakers, streetwear, collectibles...",
  className = "",
  showRecentSearches = true,
}: SearchDropdownProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // For now, we don't show product results in the dropdown
  // All search will redirect to Browse page

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);
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
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Search prompt */}
          {searchTerm.trim() && (
            <div className="p-4 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <div className="text-sm mb-2">
                Press Enter to search for "{searchTerm}"
              </div>
              <button
                onClick={() => handleSearch(searchTerm)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Go to Browse page
              </button>
            </div>
          )}

          {/* Empty state when no search term */}
          {!searchTerm.trim() && showRecentSearches && (
            <div className="p-4 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <div className="text-sm">Start typing to search products...</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
