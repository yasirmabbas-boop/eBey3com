import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Camera, Layers, Tag, Clock, TrendingUp } from "lucide-react";
import { SEARCH_SUGGESTIONS } from "@/lib/search-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface SmartSearchProps {
  onImageSearchClick?: () => void;
  className?: string;
}

interface Suggestion {
  term: string;
  category: string;
  type: "category" | "product";
}

export function SmartSearch({ onImageSearchClick, className }: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Debounce the query to avoid firing on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: suggestions = [], isFetching: isSuggestionsLoading } = useQuery<Suggestion[]>({
    queryKey: ["/api/search-suggestions", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(debouncedQuery)}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
    enabled: debouncedQuery.length >= 2, // Only fetch when at least 2 chars typed
  });

  // Fetch recent searches from server preferences (for logged-in users)
  const { data: userPreferences } = useQuery<{
    topCategories: string[];
    recentSearches: string[];
    priceRange: { low: number; high: number } | null;
    topBrands: string[];
  }>({
    queryKey: ["/api/account/preferences"],
    queryFn: async () => {
      const res = await fetch("/api/account/preferences", {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id,
  });

  // Server preferences for logged-in users, localStorage fallback for anonymous
  const recentSearches = (userPreferences?.recentSearches?.length
    ? userPreferences.recentSearches
    : (() => { try { return JSON.parse(localStorage.getItem("previousSearches") || "[]").slice(0, 10); } catch { return []; } })()
  ) as string[];
  const popularSearches = SEARCH_SUGGESTIONS.slice(0, 8).map((s) => s.ar);
  const showRecentSearches = query.length === 0 && recentSearches.length > 0;
  const showPopularSearches = query.length === 0 && recentSearches.length === 0;
  const showSuggestions = debouncedQuery.length >= 2;
  const dropdownItemCount = showRecentSearches
    ? recentSearches.length
    : showPopularSearches
      ? popularSearches.length
      : suggestions.length;

  const getTypeIcon = (type: Suggestion["type"]) => {
    switch (type) {
      case "category": return <Layers className="h-4 w-4 text-blue-500" />;
      case "product": return <Tag className="h-4 w-4 text-green-500" />;
      default: return <Search className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTypeLabel = (type: Suggestion["type"]) => {
    switch (type) {
      case "category": return "فئة";
      case "product": return "منتج";
      default: return "";
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (searchTerm?: string) => {
    const term = searchTerm || query;
    if (term.trim()) {
      navigate(`/search?q=${encodeURIComponent(term.trim())}`);
      setShowDropdown(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      handleSearch();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || dropdownItemCount === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < dropdownItemCount - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      if (showRecentSearches) {
        const term = recentSearches[selectedIndex];
        setQuery(term);
        handleSearch(term);
      } else if (showPopularSearches) {
        const term = popularSearches[selectedIndex];
        setQuery(term);
        handleSearch(term);
      } else {
        const item = suggestions[selectedIndex];
        setQuery(item.term);
        handleSearch(item.term);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleSuggestionClick = (term: string) => {
    setQuery(term);
    handleSearch(term);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input 
          ref={inputRef}
          type="search" 
          placeholder="ابحث عن منتجات..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
            // Show dropdown when typing (for suggestions) or when empty (for recent searches)
            if (e.target.value.length > 0 || recentSearches.length > 0 || popularSearches.length > 0) {
              setShowDropdown(true);
            }
          }}
          onFocus={() => {
            if (
              (query.length > 0 && suggestions.length > 0) ||
              (query.length === 0 && (recentSearches.length > 0 || popularSearches.length > 0))
            ) {
              setShowDropdown(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className="w-full pr-10 pl-12 h-11 bg-blue-50 border-blue-300 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-base"
          data-testid="input-smart-search"
          autoComplete="off"
        />
        {onImageSearchClick && (
          <Button 
            type="button"
            size="icon" 
            variant="ghost" 
            className="absolute left-1 top-1 bottom-1 h-auto w-10 text-gray-500 hover:text-primary hover:bg-transparent"
            onClick={onImageSearchClick}
            data-testid="button-image-search"
          >
            <Camera className="h-5 w-5" />
          </Button>
        )}
      </div>

      {showDropdown && (dropdownItemCount > 0 || (showSuggestions && isSuggestionsLoading)) && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          <div className="p-2">
            {showRecentSearches ? (
              <>
                <div className="text-xs text-gray-500 px-3 py-1 font-medium">عمليات بحث سابقة</div>
                {recentSearches.map((term, index) => (
                  <button
                    key={`recent-${term}-${index}`}
                    type="button"
                    onClick={() => handleSuggestionClick(term)}
                    className={`w-full text-right px-3 py-2 rounded-md flex items-center justify-between hover:bg-blue-50 transition-colors ${
                      selectedIndex === index ? "bg-blue-50" : ""
                    }`}
                    data-testid={`recent-search-${index}`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium line-clamp-1">{term}</span>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      سابق
                    </span>
                  </button>
                ))}
              </>
            ) : showPopularSearches ? (
              <>
                <div className="text-xs text-gray-500 px-3 py-1 font-medium">عمليات بحث شائعة</div>
                {popularSearches.map((term, index) => (
                  <button
                    key={`popular-${term}-${index}`}
                    type="button"
                    onClick={() => handleSuggestionClick(term)}
                    className={`w-full text-right px-3 py-2 rounded-md flex items-center justify-between hover:bg-blue-50 transition-colors ${
                      selectedIndex === index ? "bg-blue-50" : ""
                    }`}
                    data-testid={`popular-search-${index}`}
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                      <span className="font-medium line-clamp-1">{term}</span>
                    </div>
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                      شائع
                    </span>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className="text-xs text-gray-500 px-3 py-1 font-medium">اقتراحات البحث</div>
                {suggestions.length === 0 && isSuggestionsLoading ? (
                  <div className="px-3 py-3 text-sm text-gray-500 flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                    جاري البحث...
                  </div>
                ) : null}
                {suggestions.map((item, index) => (
                  <button
                    key={`${item.term}-${index}`}
                    type="button"
                    onClick={() => handleSuggestionClick(item.term)}
                    className={`w-full text-right px-3 py-2 rounded-md flex items-center justify-between hover:bg-blue-50 transition-colors ${
                      selectedIndex === index ? "bg-blue-50" : ""
                    }`}
                    data-testid={`suggestion-${index}`}
                  >
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.type)}
                      <span className="font-medium line-clamp-1">{item.term}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {getTypeLabel(item.type)}
                      </span>
                      {item.category && item.type !== "category" && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
                {suggestions.length > 0 && isSuggestionsLoading && (
                  <div className="px-3 py-2 text-xs text-gray-500 flex items-center gap-2 border-t border-gray-100">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                    جاري البحث...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      </form>
  );
}

