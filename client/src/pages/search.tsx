import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { PRODUCTS } from "@/lib/mock-data";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { Clock } from "lucide-react";

export default function SearchPage() {
  const [location] = useLocation();
  const query = new URLSearchParams(window.location.search).get("c");

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-primary">
          {query === "watches" ? "ساعات" : 
           query === "clothing" ? "ملابس" : 
           "نتائج البحث"}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h3 className="font-bold mb-4">السعر</h3>
              <Slider defaultValue={[50]} max={100} step={1} className="mb-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>0 د.ع</span>
                <span>1,000,000 د.ع</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h3 className="font-bold mb-4">الحالة</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox id="new" />
                  <Label htmlFor="new">جديد</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox id="used" />
                  <Label htmlFor="used">مستعمل</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox id="vintage" />
                  <Label htmlFor="vintage">فينتاج / أنتيك</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="md:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {PRODUCTS.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-muted">
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      <img 
                        src={product.image} 
                        alt={product.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {product.currentBid && (
                        <Badge className="absolute top-2 right-2 bg-primary text-white">
                          مزاد
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">{product.category}</div>
                      <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                        {product.title}
                      </h3>
                      <div className="flex justify-between items-center mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">السعر الحالي</p>
                          <p className="font-bold text-xl text-primary">
                            {product.currentBid ? product.currentBid.toLocaleString() : product.price.toLocaleString()} د.ع
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    {product.timeLeft && (
                      <CardFooter className="px-4 py-2 bg-red-50 text-red-600 text-xs font-medium flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        ينتهي خلال {product.timeLeft}
                      </CardFooter>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
