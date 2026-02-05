import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, Package, User, Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { secureRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface SearchResult {
  products?: Array<{
    id: string;
    productCode: string;
    title: string;
    price: number;
    image?: string;
  }>;
  users?: Array<{
    id: string;
    accountCode: string;
    displayName: string;
    phone?: string;
  }>;
  transactions?: Array<{
    id: string;
    amount: number;
    status: string;
  }>;
}

export function AdminSearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const { data: searchResults, isLoading } = useQuery<SearchResult>({
    queryKey: ["/api/admin/search/by-code", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) {
        return {};
      }
      const res = await secureRequest(`/api/admin/search/by-code?code=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        throw new Error("Search failed");
      }
      return res.json();
    },
    enabled: searchQuery.trim().length > 0 && isOpen,
    staleTime: 30000,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      setIsOpen(true);
    }
  };

  const handleResultClick = () => {
    setIsOpen(false);
    setSearchQuery("");
  };

  const hasResults = searchResults && (
    (searchResults.products && searchResults.products.length > 0) ||
    (searchResults.users && searchResults.users.length > 0) ||
    (searchResults.transactions && searchResults.transactions.length > 0)
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="ابحث برمز المنتج، حساب المستخدم، أو رقم المعاملة..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim().length > 0) {
                setIsOpen(true);
              }
            }}
            className="pr-10 w-full"
            dir="rtl"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start" dir="rtl">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : hasResults ? (
          <div className="max-h-[400px] overflow-y-auto">
            {/* Products */}
            {searchResults.products && searchResults.products.length > 0 && (
              <div className="border-b">
                <div className="px-4 py-2 bg-muted/50">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4" />
                    المنتجات ({searchResults.products.length})
                  </div>
                </div>
                {searchResults.products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/admin?tab=listings&listingId=${product.id}`}
                    onClick={handleResultClick}
                  >
                    <div className="px-4 py-3 hover:bg-muted cursor-pointer border-b last:border-b-0">
                      <div className="flex items-center gap-3">
                        {product.image && (
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{product.title}</div>
                          <div className="text-sm text-muted-foreground">
                            رمز: {product.productCode} • {product.price.toLocaleString()} د.ع
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Users */}
            {searchResults.users && searchResults.users.length > 0 && (
              <div className="border-b">
                <div className="px-4 py-2 bg-muted/50">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4" />
                    المستخدمون ({searchResults.users.length})
                  </div>
                </div>
                {searchResults.users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/admin?tab=users&userId=${user.id}`}
                    onClick={handleResultClick}
                  >
                    <div className="px-4 py-3 hover:bg-muted cursor-pointer border-b last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{user.displayName}</div>
                          <div className="text-sm text-muted-foreground">
                            رمز: {user.accountCode} {user.phone && `• ${user.phone}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Transactions */}
            {searchResults.transactions && searchResults.transactions.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-muted/50">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Receipt className="h-4 w-4" />
                    المعاملات ({searchResults.transactions.length})
                  </div>
                </div>
                {searchResults.transactions.map((transaction) => (
                  <Link
                    key={transaction.id}
                    href={`/admin?tab=transactions&transactionId=${transaction.id}`}
                    onClick={handleResultClick}
                  >
                    <div className="px-4 py-3 hover:bg-muted cursor-pointer border-b last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">معاملة #{transaction.id.slice(0, 8)}</div>
                          <div className="text-sm text-muted-foreground">
                            {transaction.amount.toLocaleString()} د.ع • {transaction.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : searchQuery.trim().length > 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            لا توجد نتائج
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
