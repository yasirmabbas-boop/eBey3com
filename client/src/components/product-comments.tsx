import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trash2, Send, MessageSquare } from "lucide-react";
import { secureRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ListingComment = {
  id: string;
  listingId: string;
  userId: string;
  content: string;
  parentId?: string | null;
  createdAt: string | Date;
  userName: string;
  userAvatar?: string | null;
};

function formatTimestamp(createdAt: string | Date, language: string): string {
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  const locale = language === "ar" ? "ar-IQ" : language === "ku" ? "ckb-IQ" : "en-US";
  return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

export function ProductComments({ listingId, hideComposer = false }: { listingId: string; hideComposer?: boolean }) {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ["/api/comments", listingId], [listingId]);

  const { data: comments = [], isLoading } = useQuery<ListingComment[]>({
    queryKey,
    queryFn: async () => {
      const res = await secureRequest(`/api/comments/${listingId}`, { method: "GET" });
      if (!res.ok) {
        // Comments are non-critical UI; fail soft.
        return [];
      }
      return res.json();
    },
    enabled: !!listingId,
  });

  const [draft, setDraft] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const content = draft.trim();
      const res = await secureRequest("/api/comments", {
        method: "POST",
        body: JSON.stringify({ listingId, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create comment");
      }
      return data as ListingComment;
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      toast({
        title: t("error"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await secureRequest(`/api/comments/${commentId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete comment");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      toast({
        title: t("error"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="py-4 border-t" data-testid="product-comments">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          {t("comments")}
        </h2>
        <span className="text-sm text-muted-foreground">
          {comments.length}
        </span>
      </div>

      {/* Composer */}
      {!hideComposer && isAuthenticated ? (
        <div className="space-y-2 mb-4">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("writeComment")}
            rows={3}
            className="resize-none"
            data-testid="input-comment"
            onFocus={(e) => {
              setTimeout(() => {
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 300);
            }}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (!draft.trim()) return;
                createMutation.mutate();
              }}
              disabled={!draft.trim() || createMutation.isPending}
              data-testid="button-submit-comment"
            >
              <Send className="h-4 w-4 ml-2" />
              {language === "ar" ? "نشر" : language === "ku" ? "بڵاوکردنەوە" : "Post"}
            </Button>
          </div>
        </div>
      ) : !hideComposer ? (
        <div className="bg-muted/40 border rounded-lg p-3 mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {language === "ar"
              ? "سجّل الدخول لكتابة تعليق."
              : language === "ku"
                ? "بۆ نووسینی سەرنج بچۆ ژوورەوە."
                : "Sign in to write a comment."}
          </p>
          <Link href="/signin">
            <Button size="sm" variant="outline" data-testid="button-signin-to-comment">
              {language === "ar" ? "تسجيل الدخول" : language === "ku" ? "چوونە ژوورەوە" : "Sign in"}
            </Button>
          </Link>
        </div>
      ) : null}

      {/* List */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">
          {language === "ar" ? "جارٍ تحميل التعليقات..." : language === "ku" ? "سەرنجەکان بار دەبن..." : "Loading comments..."}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          <div className="font-medium">{t("noComments")}</div>
          <div>{t("beFirstToComment")}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => {
            const isMine = !!user?.id && c.userId === user.id;
            return (
              <div key={c.id} className="flex items-start gap-3" data-testid={`comment-${c.id}`}>
                {c.userAvatar ? (
                  <img
                    src={c.userAvatar}
                    alt={c.userName}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold">
                    {(c.userName || "U").trim().charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{c.userName}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimestamp(c.createdAt, language)}
                      </div>
                    </div>

                    {isMine && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(c.id)}
                        disabled={deleteMutation.isPending}
                        aria-label="Delete comment"
                        data-testid={`button-delete-comment-${c.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>

                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

