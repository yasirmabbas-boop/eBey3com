import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Flame, Clock, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

interface Listing {
  id: string;
  title: string;
  price: number;
  currentBid?: number;
  saleType: string;
  images: string[];
  views: number;
  totalBids?: number;
  auctionEndTime?: string;
  isFeatured?: boolean;
  sellerName: string;
  city: string;
}

function formatTimeRemaining(endTime: string): string {
  const end = new Date(endTime);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return "انتهى";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days} يوم ${hours} ساعة`;
  if (hours > 0) return `${hours} ساعة ${minutes} دقيقة`;
  return `${minutes} دقيقة`;
}

function formatPrice(price: number): string {
  return price.toLocaleString("ar-IQ") + " د.ع";
}

export function HeroBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const { data: heroListings, isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/hero-listings"],
    queryFn: async () => {
      const res = await fetch("/api/hero-listings?limit=8");
      if (!res.ok) throw new Error("Failed to fetch hero listings");
      return res.json();
    },
  });

  useEffect(() => {
    if (!heroListings || heroListings.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroListings.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [heroListings]);

  if (isLoading) {
    return (
      <div className="w-full h-[300px] md:h-[400px] bg-gradient-to-r from-muted to-muted/50 animate-pulse rounded-xl" />
    );
  }

  if (!heroListings || heroListings.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-6" data-testid="hero-banner">
      <Carousel
        opts={{
          align: "start",
          loop: true,
          direction: "rtl",
        }}
        className="w-full"
      >
        <CarouselContent className="-mr-2 md:-mr-4">
          {heroListings.map((listing) => (
            <CarouselItem key={listing.id} className="pr-2 md:pr-4 basis-full md:basis-1/2 lg:basis-1/3">
              <Link href={`/product/${listing.id}`}>
                <div 
                  className="relative group cursor-pointer rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
                  data-testid={`hero-item-${listing.id}`}
                >
                  <div className="relative h-[220px] md:h-[280px]">
                    <img
                      src={listing.images[0] || "/placeholder-image.jpg"}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    
                    <div className="absolute top-3 right-3 flex gap-2">
                      {listing.isFeatured && (
                        <Badge className="bg-purple-500/90 text-white border-0">
                          <Star className="h-3 w-3 ml-1 fill-current" />
                          مميز
                        </Badge>
                      )}
                      {listing.views > 50 && !listing.isFeatured && (
                        <Badge className="bg-orange-500/90 text-white border-0">
                          <Flame className="h-3 w-3 ml-1" />
                          رائج
                        </Badge>
                      )}
                      {listing.saleType === "auction" && (
                        <Badge className="bg-blue-500/90 text-white border-0">
                          مزاد
                        </Badge>
                      )}
                    </div>
                    
                    <div className="absolute bottom-0 right-0 left-0 p-4 text-white">
                      <h3 className="font-bold text-lg md:text-xl mb-2 line-clamp-2 drop-shadow-lg">
                        {listing.title}
                      </h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xl md:text-2xl font-bold text-primary-foreground">
                            {formatPrice(listing.currentBid || listing.price)}
                          </p>
                          {listing.saleType === "auction" && listing.totalBids && listing.totalBids > 0 && (
                            <p className="text-sm text-gray-300">
                              {listing.totalBids} مزايدة
                            </p>
                          )}
                        </div>
                        
                        {listing.saleType === "auction" && listing.auctionEndTime && (
                          <div className="flex items-center gap-1 text-sm bg-black/50 px-2 py-1 rounded">
                            <Clock className="h-4 w-4" />
                            <span>{formatTimeRemaining(listing.auctionEndTime)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-300">
                        <span>{listing.sellerName}</span>
                        <span>•</span>
                        <span>{listing.city}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        <CarouselPrevious className="hidden md:flex -right-4 bg-white/90 hover:bg-white border-0 shadow-lg" />
        <CarouselNext className="hidden md:flex -left-4 bg-white/90 hover:bg-white border-0 shadow-lg" />
      </Carousel>
      
      <div className="flex justify-center gap-2 mt-4">
        {heroListings.slice(0, 5).map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex % 5 ? "bg-primary w-6" : "bg-muted-foreground/30"
            }`}
            onClick={() => setCurrentIndex(index)}
            data-testid={`hero-indicator-${index}`}
          />
        ))}
      </div>
    </div>
  );
}
