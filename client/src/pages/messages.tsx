import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { 
  MessageSquare, 
  Send, 
  ArrowRight, 
  Loader2, 
  User,
  Clock,
  Check,
  CheckCheck
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import type { Message, User as UserType } from "@shared/schema";

interface ConversationPreview {
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  listingId?: string;
}

export default function MessagesPage() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "يرجى تسجيل الدخول",
        description: "يجب تسجيل الدخول لعرض الرسائل",
        variant: "destructive",
      });
      navigate("/register?redirect=/messages");
    }
  }, [authLoading, isAuthenticated, navigate, toast]);

  // Fetch all messages for the user
  const { data: allMessages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/messages/${user.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  // Get unique conversation partners
  const conversations: ConversationPreview[] = (() => {
    if (!user?.id || !allMessages.length) return [];
    
    const partnerMap = new Map<string, ConversationPreview>();
    
    allMessages.forEach((msg) => {
      const partnerId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
      const existing = partnerMap.get(partnerId);
      
      if (!existing || new Date(msg.createdAt) > new Date(existing.lastMessageTime)) {
        const unreadCount = allMessages.filter(
          m => m.senderId === partnerId && m.receiverId === user.id && !m.isRead
        ).length;
        
        partnerMap.set(partnerId, {
          partnerId,
          partnerName: partnerId.slice(0, 8) + "...",
          lastMessage: msg.content,
          lastMessageTime: new Date(msg.createdAt),
          unreadCount,
          listingId: msg.listingId || undefined,
        });
      }
    });
    
    return Array.from(partnerMap.values()).sort(
      (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
    );
  })();

  // Fetch partner details for each conversation
  const { data: partnerDetails } = useQuery({
    queryKey: ["/api/users/batch", conversations.map(c => c.partnerId)],
    queryFn: async () => {
      const details: Record<string, UserType> = {};
      for (const conv of conversations) {
        try {
          const res = await fetch(`/api/users/${conv.partnerId}`, { credentials: "include" });
          if (res.ok) {
            details[conv.partnerId] = await res.json();
          }
        } catch (e) {
          // Skip failed fetches
        }
      }
      return details;
    },
    enabled: conversations.length > 0,
  });

  // Fetch conversation messages when a conversation is selected
  const { data: conversationMessages = [], isLoading: conversationLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/conversation", user?.id, selectedConversation],
    queryFn: async () => {
      if (!user?.id || !selectedConversation) return [];
      const res = await fetch(`/api/messages/${user.id}/${selectedConversation}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return res.json();
    },
    enabled: !!user?.id && !!selectedConversation,
    refetchInterval: 3000,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: string; content: string; listingId?: string }) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          senderId: user?.id,
          receiverId: data.receiverId,
          content: data.content,
          listingId: data.listingId || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في إرسال الرسالة",
        variant: "destructive",
      });
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({
      receiverId: selectedConversation,
      content: newMessage.trim(),
    });
  };

  const selectedPartner = selectedConversation ? partnerDetails?.[selectedConversation] : null;

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          الرسائل
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[70vh]">
          {/* Conversations List */}
          <Card className="md:col-span-1 overflow-hidden">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-lg">المحادثات</CardTitle>
            </CardHeader>
            <ScrollArea className="h-[calc(70vh-60px)]">
              {messagesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                  <p>لا توجد محادثات حتى الآن</p>
                  <p className="text-sm mt-2">ابدأ محادثة من صفحة المنتج</p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => {
                    const partner = partnerDetails?.[conv.partnerId];
                    return (
                      <button
                        key={conv.partnerId}
                        className={`w-full p-4 text-right hover:bg-muted/50 transition-colors ${
                          selectedConversation === conv.partnerId ? "bg-primary/10" : ""
                        }`}
                        onClick={() => setSelectedConversation(conv.partnerId)}
                        data-testid={`conversation-${conv.partnerId}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={partner?.avatar || undefined} />
                            <AvatarFallback>
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate">
                                {partner?.displayName || partner?.username || conv.partnerName}
                              </span>
                              {conv.unreadCount > 0 && (
                                <Badge variant="default" className="shrink-0">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {conv.lastMessage}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(conv.lastMessageTime, { locale: ar, addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Conversation View */}
          <Card className="md:col-span-2 flex flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <CardHeader className="py-3 px-4 border-b flex flex-row items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedPartner?.avatar || undefined} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {selectedPartner?.displayName || selectedPartner?.username || "مستخدم"}
                    </CardTitle>
                    {selectedPartner?.accountType && (
                      <Badge variant="outline" className="text-xs">
                        {selectedPartner.accountType === "seller" ? "بائع" : "مشتري"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {conversationLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : conversationMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <p>ابدأ المحادثة بإرسال رسالة</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {conversationMessages.map((msg) => {
                        const isMe = msg.senderId === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? "justify-start" : "justify-end"}`}
                            data-testid={`message-${msg.id}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-muted rounded-bl-sm"
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <div className={`text-xs mt-1 flex items-center gap-1 ${
                                isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}>
                                {formatDistanceToNow(new Date(msg.createdAt), { locale: ar, addSuffix: true })}
                                {isMe && (
                                  msg.isRead ? (
                                    <CheckCheck className="h-3 w-3" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="اكتب رسالتك..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                      data-testid="button-send-message"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg">اختر محادثة للبدء</p>
                <p className="text-sm mt-2">أو ابدأ محادثة جديدة من صفحة المنتج</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
