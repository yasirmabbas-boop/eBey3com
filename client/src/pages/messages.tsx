import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, Send, ArrowRight, User, Package } from "lucide-react";
import type { Message } from "@shared/schema";

interface ConversationMessage extends Message {
  senderName?: string;
}

interface ConversationPartner {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

export default function MessagesPage() {
  const [match, params] = useRoute("/messages/:partnerId");
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const partnerId = params?.partnerId;

  const { data: allMessages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/messages/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: conversation = [], isLoading: conversationLoading } = useQuery<ConversationMessage[]>({
    queryKey: ["/api/conversation", user?.id, partnerId],
    queryFn: async () => {
      if (!user?.id || !partnerId) return [];
      const res = await fetch(`/api/messages/${user.id}/${partnerId}`);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      const messages = await res.json();
      const partnerRes = await fetch(`/api/users/${partnerId}`);
      const partnerData = partnerRes.ok ? await partnerRes.json() : null;
      return messages.map((msg: Message) => ({
        ...msg,
        senderName: msg.senderId === user.id ? "أنت" : (partnerData?.displayName || partnerData?.username || "مستخدم"),
      }));
    },
    enabled: !!user?.id && !!partnerId,
  });

  const { data: partnerInfo } = useQuery({
    queryKey: ["/api/users", partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const res = await fetch(`/api/users/${partnerId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!partnerId,
  });

  const uniquePartnerIds = Array.from(new Set(allMessages.map(msg => 
    msg.senderId === user?.id ? msg.receiverId : msg.senderId
  )));

  const { data: partnerUsers = {} } = useQuery({
    queryKey: ["/api/users/batch", uniquePartnerIds.join(",")],
    queryFn: async () => {
      const userMap: Record<string, { displayName?: string; phone?: string }> = {};
      await Promise.all(uniquePartnerIds.map(async (id) => {
        try {
          const res = await fetch(`/api/users/${id}`);
          if (res.ok) {
            userMap[id] = await res.json();
          }
        } catch {}
      }));
      return userMap;
    },
    enabled: uniquePartnerIds.length > 0,
  });

  const conversations: ConversationPartner[] = [];
  const partnerMap = new Map<string, ConversationPartner>();
  
  allMessages.forEach(msg => {
    const pId = msg.senderId === user?.id ? msg.receiverId : msg.senderId;
    const partnerData = partnerUsers[pId];
    if (!partnerMap.has(pId)) {
      partnerMap.set(pId, {
        id: pId,
        name: partnerData?.displayName || partnerData?.phone || "مستخدم",
        lastMessage: msg.content,
        lastMessageTime: new Date(msg.createdAt),
        unreadCount: msg.receiverId === user?.id && !msg.isRead ? 1 : 0,
      });
    } else {
      const existing = partnerMap.get(pId)!;
      if (!existing.name || existing.name === "مستخدم") {
        existing.name = partnerData?.displayName || partnerData?.phone || "مستخدم";
      }
      if (msg.receiverId === user?.id && !msg.isRead) {
        existing.unreadCount = (existing.unreadCount || 0) + 1;
      }
    }
  });
  
  partnerMap.forEach(partner => conversations.push(partner));

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          senderId: user?.id,
          receiverId: partnerId,
          content,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversation", user?.id, partnerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages", user?.id] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في إرسال الرسالة",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  useEffect(() => {
    if (partnerId && conversation.length > 0) {
      conversation.forEach(async (msg) => {
        if (msg.receiverId === user?.id && !msg.isRead) {
          await fetch(`/api/messages/${msg.id}/read`, { method: "PATCH" });
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seller-messages"] });
    }
  }, [partnerId, conversation, user?.id]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <MessageSquare className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">تسجيل الدخول مطلوب</h2>
          <p className="text-muted-foreground mb-4">يجب تسجيل الدخول لعرض رسائلك</p>
          <Link href="/signin">
            <Button className="elev-1">تسجيل الدخول</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (partnerId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => navigate("/messages")} data-testid="button-back">
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  {partnerInfo?.displayName || partnerInfo?.username || "مستخدم"}
                </h1>
                <p className="text-sm text-muted-foreground">محادثة خاصة</p>
              </div>
            </div>
          </div>

          <Card className="h-[60vh] flex flex-col soft-border elev-1">
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : conversation.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">لا توجد رسائل بعد</p>
                  <p className="text-sm text-muted-foreground/70">ابدأ المحادثة بإرسال رسالة</p>
                </div>
              ) : (
                <>
                  {conversation.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === user?.id ? "justify-start" : "justify-end"}`}
                      data-testid={`message-bubble-${msg.id}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          msg.senderId === user?.id
                            ? "bg-primary text-primary-foreground rounded-bl-none"
                            : "bg-muted/60 text-foreground rounded-br-none"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.senderId === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString("ar-IQ", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </CardContent>

            <div className="p-4 border-t border-border/60">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="اكتب رسالتك..."
                  className="min-h-[50px] max-h-[100px] text-right soft-border"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  data-testid="textarea-new-message"
                />
                <Button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="elev-1"
                  data-testid="button-send"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          رسائلي
        </h1>

        <Card className="soft-border elev-1">
          <CardContent className="p-0">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">لا توجد رسائل</p>
                <p className="text-sm text-muted-foreground/70 mt-2">عندما تتواصل مع البائعين أو المشترين، ستظهر محادثاتك هنا</p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => navigate(`/messages/${conv.id}`)}
                    className="p-4 hover:bg-muted/40 cursor-pointer transition-colors flex items-center gap-4"
                    data-testid={`conversation-${conv.id}`}
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{conv.name}</p>
                        {conv.lastMessageTime && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(conv.lastMessageTime).toLocaleDateString("ar-IQ")}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                      )}
                    </div>
                    {conv.unreadCount && conv.unreadCount > 0 && (
                      <Badge className="bg-rose-500 text-white">{conv.unreadCount}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
