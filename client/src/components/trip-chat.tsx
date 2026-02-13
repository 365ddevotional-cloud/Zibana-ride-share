import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, X, Shield, Loader2 } from "lucide-react";
import type { TripMessage } from "@shared/schema";

interface TripChatProps {
  tripId: string;
  tripStatus: string;
  currentUserId: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
}

export function TripChat({ tripId, tripStatus, currentUserId, completedAt, cancelledAt }: TripChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isActive = tripStatus === "in_progress" || tripStatus === "accepted";

  const endTime = completedAt || cancelledAt;
  let isWithin24Hours = false;
  if (endTime) {
    const hoursSinceEnd = (Date.now() - new Date(endTime).getTime()) / (1000 * 60 * 60);
    isWithin24Hours = hoursSinceEnd <= 24;
  }

  const canView = isActive || isWithin24Hours;
  const canSend = isActive;

  const { data: messages = [], isLoading } = useQuery<TripMessage[]>({
    queryKey: ["/api/trips", tripId, "messages"],
    queryFn: () => fetch(`/api/trips/${tripId}/messages`, { credentials: "include" }).then(r => r.json()),
    enabled: isOpen && canView,
    refetchInterval: isOpen && canView ? 5000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest("POST", `/api/trips/${tripId}/messages`, { message }),
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "messages"] });
    },
  });

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed || !canSend) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!canView) return null;

  if (!isOpen) {
    return (
      <Button
        size="icon"
        className="fixed bottom-20 right-4 z-50 rounded-full h-12 w-12 shadow-lg bg-blue-600 hover:bg-blue-700"
        onClick={() => setIsOpen(true)}
        data-testid="button-open-trip-chat"
      >
        <MessageCircle className="h-5 w-5 text-white" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96" data-testid="trip-chat-panel">
      <Card className="shadow-xl border flex flex-col max-h-[70vh]">
        <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Trip Chat
          </CardTitle>
          <div className="flex items-center gap-2">
            {!canSend && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-chat-readonly">
                Read Only
              </Badge>
            )}
            <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)} data-testid="button-close-chat">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <div className="px-3 py-2 bg-muted/30 border-b">
          <div className="flex items-start gap-2">
            <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-tight" data-testid="text-privacy-banner">
              For your privacy and security, please communicate through the ZIBANA app.
              If you choose to share your phone number, you do so at your own discretion.
            </p>
          </div>
        </div>

        <CardContent className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[400px]">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && messages.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No messages yet</p>
            </div>
          )}
          {messages.map((msg) => {
            const isMine = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                data-testid={`chat-message-${msg.id}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    isMine
                      ? "bg-blue-600 text-white"
                      : "bg-muted"
                  }`}
                >
                  <p className="break-words">{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-blue-200" : "text-muted-foreground"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </CardContent>

        {canSend ? (
          <div className="p-3 border-t flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              maxLength={1000}
              disabled={sendMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!messageText.trim() || sendMutation.isPending}
              data-testid="button-send-message"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
          <div className="p-3 border-t text-center">
            <p className="text-xs text-muted-foreground" data-testid="text-chat-disabled">
              Messaging is available during active trips only.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
