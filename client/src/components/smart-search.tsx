import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
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

const POPULAR_SEARCHES: string[] = (() => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of SEARCH_SUGGESTIONS) {
    if (!seen.has(s.category)) {
      seen.add(s.category);
      result.push(s.ar);
    }
    if (result.length >= 8) break;
  }
  return result;
})();

export function SmartSearch({ onImageSearchClick, className }: SmartSearchProps) {
  const searchString = useSearch();
  const urlQuery = useMemo(() => new URLSearchParams(searchString).get("q") || "", [searchString]);
  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

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
    enabled: debouncedQuery.length >= 1,
  });

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

  const recentSearches = (userPreferences?.recentSearches?.length
    ? userPreferences.recentSearches
    : (() => { try { return JSON.parse(localStorage.getItem("previousSearches") || "[]").slice(0, 10); } catch { return []; } })()
  ) as string[];

  const showRecentSearches = query.length === 0 && recentSearches.length > 0;
  const showPopularSearches = query.length === 0 && recentSearches.length === 0;
  const showSuggestions = debouncedQuery.length >= 1;
  const hasDropdownContent = showRecentSearches || showPopularSearches || (showSuggestions && (suggestions.length > 0 || isSuggestionsLoading));
  const dropdownItemCount = showRecentSearches
    ? recentSearches.length
    : showPopularSearches
      ? POPULAR_SEARCHES.length
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
      case "category": return "\u0641\u0626\u0629";
      case "product": return "\u0645\u0646\u062a\u062c";
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
        const term = POPULAR_SEARCHES[selectedIndex];
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
          placeholder={"\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u0646\u062a\u062c\u0627\u062a..."}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          className="w-full pr-10 pl-12 h-11 bg-blue-50 border-blue-300 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-base"
          data-testid="input-smart-search"
          autoComplete="off"
          maxLength={200}
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

      {showDropdown && hasDropdownContent && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          <div className="p-2">
            {showRecentSearches ? (
              <>
                <div className="text-xs text-gray-500 px-3 py-1 font-medium">{"\u0639\u0645\u0644\u064a\u0627\u062a \u0628\u062d\u062b \u0633\u0627\u0628\u0642\u0629"}</div>
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
                      {"\u0633\u0627\u0628\u0642"}
                    </span>
                  </button>
                ))}
              </>
            ) : showPopularSearches ? (
              <>
                <div className="text-xs text-gray-500 px-3 py-1 font-medium">{"\u0639\u0645\u0644\u064a\u0627\u062a \u0628\u062d\u062b \u0634\u0627\u0626\u0639\u0629"}</div>
                {POPULAR_SEARCHES.map((term, index) => (
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
                      {"\u0634\u0627\u0626\u0639"}
                    </span>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className="text-xs text-gray-500 px-3 py-1 font-medium">{"\u0627\u0642\u062a\u0631\u0627\u062d\u0627\u062a \u0627\u0644\u0628\u062d\u062b"}</div>
                {suggestions.length === 0 && isSuggestionsLoading ? (
                  <div className="px-3 py-3 text-sm text-gray-500 flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                    {"\u062c\u0627\u0631\u064a \u0627\u0644\u0628\u062d\u062b..."}
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
                    {"\u062c\u0627\u0631\u064a \u0627\u0644\u0628\u062d\u062b..."}
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
