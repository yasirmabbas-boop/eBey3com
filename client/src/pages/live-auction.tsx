import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, Gavel, Heart, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LIVE_AUCTIONS = [
  {
    id: 1,
    title: "ساعة أوميغا سيماستر أصلية",
    image: "https://images.unsplash.com/photo-1523170335684-f42f53bba104?w=500&h=500&fit=crop",
    currentBid: 380000,
    viewers: 24,
    bidsCount: 45,
    timeLeft: "45 دقيقة",
    seller: "أحمد العراقي",
    description: "ساعة أوميغا نادرة جداً من الستينات مع ضمان أصالة",
  },
  {
    id: 2,
    title: "ساعة رولكس ذهبية كلاسيكية",
    image: "https://images.unsplash.com/photo-1579836343264-8b5a5bac4fdf?w=500&h=500&fit=crop",
    currentBid: 520000,
    viewers: 38,
    bidsCount: 62,
    timeLeft: "2 ساعة",
    seller: "محمود البصري",
    description: "ساعة رولكس فينتاج بحالة ممتازة",
  },
  {
    id: 3,
    title: "جاكيت جلد إيطالي فينتاج",
    image: "https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=500&h=500&fit=crop",
    currentBid: 95000,
    viewers: 15,
    bidsCount: 18,
    timeLeft: "30 دقيقة",
    seller: "فاطمة الموصلية",
    description: "جاكيت جلد طبيعي إيطالي الصنع من الثمانينات",
  },
];

export default function LiveAuction() {
  const { toast } = useToast();
  const [selectedAuction, setSelectedAuction] = useState(LIVE_AUCTIONS[0]);
  const [bidAmount, setBidAmount] = useState("");
  const [chatMessage, setChatMessage] = useState("");

  const handleBid = () => {
    const bid = parseInt(bidAmount);
    if (isNaN(bid) || bid <= selectedAuction.currentBid) {
      toast({
        title: "مزايدة غير صحيحة",
        description: `يجب أن تكون المزايدة أكبر من ${selectedAuction.currentBid.toLocaleString()} د.ع`,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "تم تقديم سومتك! ✅",
      description: `سومتك: ${bid.toLocaleString()} د.ع`,
    });
    setBidAmount("");
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      toast({
        title: "تم إرسال الرسالة",
        description: chatMessage,
      });
      setChatMessage("");
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">🔴 المزادات الحية</h1>
          <p className="text-gray-600">شاهد وشارك في المزادات الحية الآن</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Auction Display */}
          <div className="lg:col-span-2 space-y-6">
            {/* Large Display */}
            <Card className="overflow-hidden border-2 border-red-500">
              <div className="relative">
                <img
                  src={selectedAuction.image}
                  alt={selectedAuction.title}
                  className="w-full h-96 object-cover"
                />
                <Badge className="absolute top-4 right-4 bg-red-600 text-white border-0 animate-pulse">
                  🔴 بث مباشر
                </Badge>
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedAuction.title}
                </h2>
                <p className="text-gray-600 mb-4">{selectedAuction.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">السعر الحالي</p>
                    <p className="text-xl font-bold text-primary">
                      {selectedAuction.currentBid.toLocaleString()}
                      <span className="text-sm ml-1">د.ع</span>
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">عدد المزايدات</p>
                    <p className="text-xl font-bold text-green-600 flex items-center gap-1">
                      <Gavel className="h-4 w-4" />
                      {selectedAuction.bidsCount}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">المتفرجون</p>
                    <p className="text-xl font-bold text-orange-600 flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {selectedAuction.viewers}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">الوقت المتبقي</p>
                    <p className="text-xl font-bold text-red-600 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {selectedAuction.timeLeft}
                    </p>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Bidding Section */}
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <h3 className="font-bold text-lg mb-4">ضع سومتك الآن</h3>
                  <div className="flex gap-2 mb-4">
                    <Input
                      type="number"
                      placeholder="أدخل المبلغ"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="flex-1"
                      dir="ltr"
                    />
                    <span className="flex items-center text-gray-700 font-semibold px-3">د.ع</span>
                  </div>
                  <Button
                    onClick={handleBid}
                    className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-3 text-lg"
                  >
                    <Gavel className="h-5 w-5 ml-2" />
                    خلي سومتك
                  </Button>

                  {/* Quick Bid Buttons */}
                  <div className="mt-4">
                    <p className="text-xs text-gray-600 mb-2">مزايدات مقترحة:</p>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        selectedAuction.currentBid + 5000,
                        selectedAuction.currentBid + 10000,
                        selectedAuction.currentBid + 25000,
                      ].map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          size="sm"
                          onClick={() => setBidAmount(amount.toString())}
                          className="text-xs"
                        >
                          +{((amount - selectedAuction.currentBid) / 1000).toFixed(0)}k
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  البائع: <strong>{selectedAuction.seller}</strong>
                </p>
              </div>
            </Card>

            {/* Live Chat */}
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">💬 الدردشة المباشرة</h3>
              <div className="bg-gray-50 rounded-lg p-4 h-48 overflow-y-auto mb-4 border space-y-3">
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-lg max-w-xs">
                    <p className="text-sm text-gray-700">هذه ساعة نادرة جداً!</p>
                    <p className="text-xs text-gray-500 mt-1">علي - الآن</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-blue-100 p-3 rounded-lg max-w-xs">
                    <p className="text-sm text-gray-700">أنا مهتم جداً بشرائها</p>
                    <p className="text-xs text-gray-500 mt-1">أنت - قبل دقيقة</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="أرسل رسالة..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} size="icon" className="bg-primary">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar - Other Live Auctions */}
          <div className="lg:col-span-1">
            <h3 className="font-bold text-lg mb-4">مزادات أخرى حية</h3>
            <div className="space-y-4">
              {LIVE_AUCTIONS.map((auction) => (
                <Card
                  key={auction.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                    selectedAuction.id === auction.id
                      ? "ring-2 ring-primary border-primary"
                      : ""
                  }`}
                  onClick={() => setSelectedAuction(auction)}
                >
                  <div className="flex gap-3">
                    <img
                      src={auction.image}
                      alt={auction.title}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm line-clamp-2">
                        {auction.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {auction.currentBid.toLocaleString()} د.ع
                      </p>
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {auction.timeLeft}
                        </span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {auction.viewers} متفرج
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Info Card */}
            <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
              <h4 className="font-bold text-sm mb-2">💡 نصيحة</h4>
              <p className="text-xs text-gray-700">
                شارك في المزادات الحية للحصول على أفضل الفرص! المزادات الحية توفر تجربة تفاعلية حقيقية.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
