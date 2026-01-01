import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Camera, Layers, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: suggestions = [] } = useQuery<Suggestion[]>({
    queryKey: ["/api/search-suggestions", query],
    queryFn: async () => {
      const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
  });

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
    if (!showDropdown || suggestions.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const item = suggestions[selectedIndex];
      setQuery(item.term);
      handleSearch(item.term);
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
            if (e.target.value.length > 0) {
              setShowDropdown(true);
            }
          }}
          onFocus={() => {
            if (query.length > 0 && suggestions.length > 0) {
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

      {showDropdown && suggestions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          <div className="p-2">
            <div className="text-xs text-gray-500 px-3 py-1 font-medium">اقتراحات البحث</div>
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
          </div>
        </div>
      )}

      </form>
  );
}
