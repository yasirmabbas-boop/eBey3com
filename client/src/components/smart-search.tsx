import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, Camera, Clock, TrendingUp, Watch, Tag, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { enhancedSearch, SearchResult } from "@/lib/search-data";

interface SmartSearchProps {
  onImageSearchClick?: () => void;
  className?: string;
}

const TRENDING_SEARCHES = [
  { term: "ساعات رولكس", category: "ساعات" },
  { term: "آيفون 15", category: "إلكترونيات" },
  { term: "بلايستيشن 5", category: "إلكترونيات" },
  { term: "سجاد فارسي", category: "تحف وأثاث" },
];

export function SmartSearch({ onImageSearchClick, className }: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length >= 1) {
      const results = enhancedSearch(query);
      setSuggestions(results);
      setShowDropdown(true);
      setSelectedIndex(-1);
    } else {
      setSuggestions([]);
      if (query.length === 0) {
        setShowDropdown(true);
      }
    }
  }, [query]);

  const getTypeIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "category": return <Layers className="h-4 w-4 text-blue-500" />;
      case "brand": return <Tag className="h-4 w-4 text-green-500" />;
      case "model": return <Watch className="h-4 w-4 text-purple-500" />;
      default: return <Search className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTypeLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "category": return "فئة";
      case "brand": return "علامة تجارية";
      case "model": return "موديل";
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
    } else {
      navigate("/search");
    }
    setShowDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    const items = suggestions.length > 0 ? suggestions : TRENDING_SEARCHES;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < items.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const item = suggestions.length > 0 ? suggestions[selectedIndex] : TRENDING_SEARCHES[selectedIndex];
      const term = 'ar' in item ? item.ar : item.term;
      setQuery(term);
      handleSearch(term);
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
          placeholder="ابحث بالعربي أو الإنجليزي... watches, ساعات, iphone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowDropdown(true)}
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

      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {suggestions.length > 0 ? (
            <div className="p-2">
              <div className="text-xs text-gray-500 px-3 py-1 font-medium">اقتراحات البحث</div>
              {suggestions.map((item, index) => (
                <button
                  key={`${item.ar}-${index}`}
                  type="button"
                  onClick={() => handleSuggestionClick(item.ar)}
                  className={`w-full text-right px-3 py-2 rounded-md flex items-center justify-between hover:bg-blue-50 transition-colors ${
                    selectedIndex === index ? "bg-blue-50" : ""
                  }`}
                  data-testid={`suggestion-${index}`}
                >
                  <div className="flex items-center gap-2">
                    {getTypeIcon(item.type)}
                    <span className="font-medium">{item.ar}</span>
                    <span className="text-gray-400 text-sm">({item.en})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.type !== "product" && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {getTypeLabel(item.type)}
                      </span>
                    )}
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length === 0 ? (
            <div className="p-2">
              <div className="text-xs text-gray-500 px-3 py-1 font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                الأكثر بحثاً
              </div>
              {TRENDING_SEARCHES.map((item, index) => (
                <button
                  key={item.term}
                  type="button"
                  onClick={() => handleSuggestionClick(item.term)}
                  className={`w-full text-right px-3 py-2 rounded-md flex items-center justify-between hover:bg-blue-50 transition-colors ${
                    selectedIndex === index ? "bg-blue-50" : ""
                  }`}
                  data-testid={`trending-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{item.term}</span>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {item.category}
                  </span>
                </button>
              ))}
            </div>
          ) : query.length < 1 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              اكتب للبحث...
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              لم يتم العثور على نتائج لـ "{query}"
            </div>
          )}
        </div>
      )}

      <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700 px-6 h-11 rounded-md font-bold">
        <Search className="h-4 w-4 ml-2" />
        بحث
      </Button>
    </form>
  );
}
