import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Gavel, TrendingUp, Wifi, WifiOff, Loader2, MapPin, AlertTriangle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBidWebSocket } from "@/hooks/use-bid-websocket";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { AddressSelectionModal } from "./address-selection-modal";
import { hapticSuccess, hapticError, hapticLight } from "@/lib/despia";
import { useLocation } from "wouter";
import type { BuyerAddress } from "@shared/schema";
import { authFetch } from "@/lib/api";

type BidUpdateEvent = {
  currentBid: number;
  totalBids: number;
  bidderName: string;
  bidderId: string;
  auctionEndTime?: string;
};

interface BiddingWindowProps {
  listingId: string;
  userId?: string;
  currentBid: number;
  totalBids: number;
  minimumBid: number;
  timeLeft?: string;
  auctionEndTime?: string | null;
  onBidSuccess?: (bidAmount: number) => void;
  onRequireAuth?: () => boolean;
  onRequirePhoneVerification?: () => void;
  isWinning?: boolean;
  isAuthLoading?: boolean;
  phoneVerified?: boolean;
  allowedBidderType?: string;
}

const BID_INCREMENT = 1000;
const MAX_BID_LIMIT = 1000000000;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-IQ').format(amount) + ' د.ع';
}

function sanitizeBidInput(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function parseBidAmount(value: string): number {
  const sanitized = sanitizeBidInput(value);
  const parsed = parseInt(sanitized, 10);
  return isNaN(parsed) ? 0 : parsed;
}

interface BidMutationParams {
  amount: number;
  shippingAddressId: string;
}

function useBidMutation(
  listingId: string,
  userId: string | undefined,
  onSuccess: (amount: number) => void,
  onError: (error: Error) => void
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ amount, shippingAddressId }: BidMutationParams) => {
      const authToken = localStorage.getItem("authToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      
      const res = await fetch("/api/bids", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          listingId,
          userId: userId || "guest",
          amount,
          shippingAddressId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit bid");
      }
      return res.json();
    },
    onSuccess: (_, { amount }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings", listingId] });
      onSuccess(amount);
    },
    onError,
  });
}

export function BiddingWindow({
  listingId,
  userId,
  currentBid: initialCurrentBid,
  totalBids: initialTotalBids,
  minimumBid: initialMinimumBid,
  timeLeft,
  onBidSuccess,
  onRequireAuth,
  onRequirePhoneVerification,
  isWinning = false,
  isAuthLoading = false,
  phoneVerified = false,
  allowedBidderType = "verified_only",
}: BiddingWindowProps) {
  const [currentBid, setCurrentBid] = useState(initialCurrentBid);
  const [totalBids, setTotalBids] = useState(initialTotalBids);
  const [bidAmount, setBidAmount] = useState("");
  const [lastBidder, setLastBidder] = useState<string | null>(null);
  const [priceHighlight, setPriceHighlight] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<BuyerAddress | null>(null);
  const [showInlineAddressForm, setShowInlineAddressForm] = useState(false);
  const [inlineAddressData, setInlineAddressData] = useState({
    city: "",
    addressLine1: "",
  });
  const isTypingRef = useRef(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Fetch addresses upfront
  const { data: addresses, isLoading: addressesLoading } = useQuery<BuyerAddress[]>({
    queryKey: ["/api/account/addresses"],
    queryFn: async () => {
      if (!userId) return [];
      const res = await authFetch("/api/account/addresses");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userId,
  });

  // Initialize selectedAddress with default address
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddress) {
      const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddress(defaultAddress);
    }
  }, [addresses, selectedAddress]);

  const minimumBid = useMemo(() => {
    return Math.max(initialMinimumBid, currentBid + BID_INCREMENT);
  }, [initialMinimumBid, currentBid]);

  const suggestedBid = useMemo(() => currentBid + 5000, [currentBid]);

  useEffect(() => {
    if (!isTypingRef.current) {
      setCurrentBid(initialCurrentBid);
      setTotalBids(initialTotalBids);
    }
  }, [initialCurrentBid, initialTotalBids]);

  useEffect(() => {
    if (!isTypingRef.current && !bidAmount) {
      setBidAmount(suggestedBid.toString());
    }
  }, [suggestedBid, bidAmount]);

  const handleBidSuccess = useCallback((amount: number) => {
    hapticSuccess();
    toast({
      title: "تم تقديم سومتك بنجاح! ✅",
      description: `سومتك: ${formatCurrency(amount)}`,
    });
    onBidSuccess?.(amount);
    setBidAmount("");
    isTypingRef.current = false;
  }, [toast, onBidSuccess]);

  const handleBidError = useCallback((error: Error) => {
    hapticError();
    toast({
      title: "فشل في تقديم المزايدة",
      description: error.message,
      variant: "destructive",
    });
  }, [toast]);

  const bidMutation = useBidMutation(listingId, userId, handleBidSuccess, handleBidError);

  const handleBidUpdate = useCallback((update: BidUpdateEvent) => {
    hapticLight();
    setCurrentBid(update.currentBid);
    setTotalBids(update.totalBids);
    setLastBidder(update.bidderName);
    
    setPriceHighlight(true);
    setTimeout(() => setPriceHighlight(false), 1500);
    
    if (!isTypingRef.current) {
      setBidAmount((update.currentBid + 5000).toString());
    }
    
    toast({
      title: "مزايدة جديدة! 🔔",
      description: `تم رفع السعر إلى ${formatCurrency(update.currentBid)}`,
    });
  }, [toast]);

  const { isConnected } = useBidWebSocket({
    listingId,
    onBidUpdate: handleBidUpdate,
  });

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    isTypingRef.current = true;
    const sanitized = sanitizeBidInput(e.target.value);
    setBidAmount(sanitized);
  }, []);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      isTypingRef.current = false;
    }, 500);
  }, []);

  const validateBid = useCallback((amount: number): { valid: boolean; error?: string } => {
    if (isNaN(amount) || amount <= 0) {
      return { valid: false, error: "يرجى إدخال مبلغ صحيح" };
    }
    if (amount < minimumBid) {
      return { valid: false, error: `يجب أن تكون المزايدة على الأقل ${formatCurrency(minimumBid)}` };
    }
    if (amount > MAX_BID_LIMIT) {
      return { valid: false, error: `المبلغ المدخل كبير جداً. الحد الأقصى هو ${formatCurrency(MAX_BID_LIMIT)}` };
    }
    return { valid: true };
  }, [minimumBid]);

  const handleAddressSelected = useCallback((addressId: string) => {
    const address = addresses?.find((a) => a.id === addressId);
    if (address) {
      setSelectedAddress(address);
      setShowAddressModal(false);
      
      // If there was a pending bid, submit it now
      const bid = parseBidAmount(bidAmount);
      const validation = validateBid(bid);
      if (validation.valid && bid > 0) {
        bidMutation.mutate({ amount: bid, shippingAddressId: addressId });
      }
    }
  }, [addresses, bidAmount, bidMutation, validateBid]);

  // Create address mutation for inline form
  const createAddressMutation = useMutation({
    mutationFn: async (data: { city: string; addressLine1: string }) => {
      const res = await authFetch("/api/account/addresses", {
        method: "POST",
        body: JSON.stringify({
          label: "المنزل",
          recipientName: "",
          phone: "",
          city: data.city,
          addressLine1: data.addressLine1,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "فشل في إضافة العنوان");
      }
      return res.json();
    },
    onSuccess: (newAddress) => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/addresses"] });
      setSelectedAddress(newAddress);
      setShowInlineAddressForm(false);
      setInlineAddressData({ city: "", addressLine1: "" });
      
      // Submit bid with new address
      const bid = parseBidAmount(bidAmount);
      const validation = validateBid(bid);
      if (validation.valid && bid > 0) {
        bidMutation.mutate({ amount: bid, shippingAddressId: newAddress.id });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "فشل في إضافة العنوان",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitBid = useCallback(() => {
    if (bidMutation.isPending) return;
    
    if (onRequireAuth && !onRequireAuth()) {
      return;
    }

    const bid = parseBidAmount(bidAmount);
    const validation = validateBid(bid);

    if (!validation.valid) {
      toast({
        title: "مزايدة غير صحيحة",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // If no address selected, open address modal
    if (!selectedAddress) {
      setShowAddressModal(true);
      return;
    }

    // If inline form is filled but no address selected yet, create address first
    if (showInlineAddressForm && inlineAddressData.city && inlineAddressData.addressLine1) {
      createAddressMutation.mutate(inlineAddressData);
      return;
    }

    // Address is selected - bid immediately
    if (selectedAddress) {
      bidMutation.mutate({ amount: bid, shippingAddressId: selectedAddress.id });
    }
  }, [bidAmount, bidMutation, onRequireAuth, toast, validateBid, selectedAddress, showInlineAddressForm, inlineAddressData, createAddressMutation]);

  const handleAddressSelected = useCallback((addressId: string) => {
    if (pendingBidAmount === null) return;
    
    bidMutation.mutate({ amount: pendingBidAmount, shippingAddressId: addressId });
    setPendingBidAmount(null);
    setShowInlineAddressForm(false);
    setInlineAddressData({ city: "", addressLine1: "" });
  }, [pendingBidAmount, bidMutation]);

  const handleQuickBid = useCallback((amount: number) => {
    isTypingRef.current = false;
    setBidAmount(amount.toString());
  }, []);

  const needsVerification = !phoneVerified;
  const isSubmitDisabled = bidMutation.isPending || isWinning || isAuthLoading || (!!userId && needsVerification);
  const currentBidValue = parseBidAmount(bidAmount);
  const isValidBid = currentBidValue >= minimumBid && currentBidValue <= MAX_BID_LIMIT;

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gavel className="h-6 w-6 text-primary" />
          نافذة المزاد
        </h3>
        <div className="flex items-center gap-1 text-xs">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-green-600">مباشر</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400">غير متصل</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div 
          className={`bg-white p-4 rounded-lg border transition-all duration-300 ${
            priceHighlight 
              ? 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-300' 
              : 'border-blue-100'
          }`}
        >
          <p className="text-sm text-muted-foreground mb-1">السعر الحالي</p>
          <p className={`text-2xl font-bold text-primary transition-all duration-300 ${
            priceHighlight ? 'scale-105' : ''
          }`}>
            {formatCurrency(currentBid).replace(' د.ع', '')}
            <span className="text-xs ml-1">د.ع</span>
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-blue-100">
          <p className="text-sm text-muted-foreground mb-1">عدد المزايدات</p>
          <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
            <TrendingUp className="h-5 w-5" />
            {totalBids}
          </p>
        </div>
      </div>

      {timeLeft && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-6 text-sm text-red-700 font-medium">
          ⏰ ينتهي المزاد خلال: <strong>{timeLeft}</strong>
        </div>
      )}

      {isWinning && (
        <div className="bg-green-50 border border-green-300 p-3 rounded-lg mb-6 text-sm text-green-700 font-medium text-center">
          ✅ أنت صاحب أعلى مزايدة حالياً - لا يمكنك المزايدة على نفسك
        </div>
      )}

      {!!userId && needsVerification && (
        <div 
          className="bg-yellow-50 border border-yellow-300 p-3 rounded-lg mb-6 text-sm text-yellow-700 font-medium text-center cursor-pointer hover:bg-yellow-100 transition-colors"
          onClick={onRequirePhoneVerification}
        >
          ⚠️ يجب التحقق من رقم هاتفك للمزايدة في هذا المزاد. <span className="underline">اضغط هنا للتحقق عبر واتساب</span>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            أدخل سومتك:
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              value={bidAmount}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder="0"
              className={`text-lg font-bold ${
                bidAmount && !isValidBid ? 'border-red-300 focus:ring-red-300' : ''
              }`}
              dir="ltr"
              disabled={isSubmitDisabled}
              data-testid="input-bid-amount"
            />
            <span className="flex items-center text-muted-foreground font-semibold">د.ع</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            الحد الأدنى للمزايدة: {formatCurrency(minimumBid)}
          </p>
          {bidAmount && currentBidValue > 0 && currentBidValue < minimumBid && (
            <p className="text-xs text-red-500 mt-1">
              المبلغ أقل من الحد الأدنى المطلوب
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">مزايدات مقترحة:</p>
          <div className="flex gap-2 flex-wrap">
            {[suggestedBid, suggestedBid + 5000, suggestedBid + 10000].map((amount) => {
              const isSelected = bidAmount === amount.toString();
              return (
                <Button
                  key={amount}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickBid(amount)}
                  disabled={isSubmitDisabled}
                  className={`text-xs ${isSelected ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" : "border-blue-200 hover:bg-blue-50"}`}
                  data-testid={`button-quick-bid-${amount}`}
                >
                  {formatCurrency(amount).replace(' د.ع', '')}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Address Summary Section - Inline Confirmation */}
      {userId && !addressesLoading && (
        <div className="mb-4">
          {selectedAddress ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-green-700 font-semibold mb-1">📍 Ship to:</p>
                  <p className="text-sm text-green-800 truncate">
                    {selectedAddress.city} - {selectedAddress.addressLine1}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowAddressModal(true);
                }}
                className="text-xs h-8 px-2 text-green-700 hover:text-green-800 hover:bg-green-100 shrink-0"
                data-testid="button-change-address"
              >
                (Change)
              </Button>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">
                    ⚠️ No shipping address selected
                  </p>
                  <p className="text-xs text-yellow-700">
                    يجب إضافة عنوان الشحن قبل المزايدة في هذا المزاد
                  </p>
                </div>
              </div>
              {!showInlineAddressForm ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/my-account?tab=addresses")}
                    className="flex-1 text-xs"
                    data-testid="button-go-to-addresses"
                  >
                    <ExternalLink className="h-3 w-3 ml-1" />
                    إضافة عنوان
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInlineAddressForm(true)}
                    className="flex-1 text-xs"
                    data-testid="button-add-inline-address"
                  >
                    إضافة هنا
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 pt-2 border-t border-yellow-200">
                  <div>
                    <Label htmlFor="inline-city" className="text-xs text-yellow-800">
                      المحافظة *
                    </Label>
                    <Input
                      id="inline-city"
                      value={inlineAddressData.city}
                      onChange={(e) =>
                        setInlineAddressData({ ...inlineAddressData, city: e.target.value })
                      }
                      placeholder="بغداد، البصرة..."
                      className="mt-1 text-sm"
                      data-testid="input-inline-city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="inline-address" className="text-xs text-yellow-800">
                      العنوان التفصيلي *
                    </Label>
                    <Input
                      id="inline-address"
                      value={inlineAddressData.addressLine1}
                      onChange={(e) =>
                        setInlineAddressData({ ...inlineAddressData, addressLine1: e.target.value })
                      }
                      placeholder="الشارع، رقم المنزل..."
                      className="mt-1 text-sm"
                      data-testid="input-inline-address"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowInlineAddressForm(false);
                        setInlineAddressData({ city: "", addressLine1: "" });
                      }}
                      className="flex-1 text-xs"
                    >
                      إلغاء
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (inlineAddressData.city && inlineAddressData.addressLine1) {
                          const bid = parseBidAmount(bidAmount);
                          const validation = validateBid(bid);
                          if (!validation.valid) {
                            toast({
                              title: "مزايدة غير صحيحة",
                              description: validation.error,
                              variant: "destructive",
                            });
                            return;
                          }
                          setPendingBidAmount(bid);
                          createAddressMutation.mutate(inlineAddressData);
                        } else {
                          toast({
                            title: "يرجى إدخال جميع الحقول المطلوبة",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={
                        !inlineAddressData.city ||
                        !inlineAddressData.addressLine1 ||
                        createAddressMutation.isPending
                      }
                      className="flex-1 text-xs"
                      data-testid="button-continue-inline-address"
                    >
                      {createAddressMutation.isPending ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin ml-1" />
                          جاري الحفظ...
                        </>
                      ) : (
                        "حفظ والمزايدة"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Button
        onClick={handleSubmitBid}
        disabled={
          isSubmitDisabled ||
          !isValidBid ||
          (userId && showInlineAddressForm && (!inlineAddressData.city || !inlineAddressData.addressLine1))
        }
        className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-3 text-lg disabled:opacity-50"
        data-testid="button-submit-bid"
      >
        {isAuthLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin ml-2" />
            جاري التحميل...
          </>
        ) : bidMutation.isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin ml-2" />
            جاري المعالجة...
          </>
        ) : userId && !selectedAddress && !showInlineAddressForm ? (
          "Add Address to Bid"
        ) : (
          "Place Bid"
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground mt-4">
        بوضع مزايدة، فإنك توافق على شراء المنتج إذا فزت بالمزاد.
      </p>

      <AddressSelectionModal
        open={showAddressModal}
        onOpenChange={(open) => {
          setShowAddressModal(open);
          if (!open) setPendingBidAmount(null);
        }}
        onSelect={handleAddressSelected}
      />
    </Card>
  );
}
