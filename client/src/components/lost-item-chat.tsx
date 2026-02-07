import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Send, Phone, MessageCircle, Lock } from "lucide-react";

interface LostItemMessage {
  id: string;
  lostItemReportId: string;
  senderId: string;
  senderRole: string;
  message: string;
  isSystemMessage: boolean;
  readAt: string | null;
  createdAt: string;
}

interface PhoneResponse {
  phone: string | null;
  role: string;
  message?: string;
}

interface LostItemChatProps {
  reportId: string;
  currentUserId: string;
  communicationUnlocked: boolean;
  userRole: "rider" | "driver";
}

export function LostItemChat({ reportId, currentUserId, communicationUnlocked, userRole }: LostItemChatProps) {
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [phoneVisible, setPhoneVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<LostItemMessage[]>({
    queryKey: ["/api/lost-items", reportId, "messages"],
    enabled: communicationUnlocked,
    refetchInterval: communicationUnlocked ? 10000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", `/api/lost-items/${reportId}/messages`, { message });
      return res.json();
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/lost-items", reportId, "messages"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    },
  });

  const phoneMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/lost-items/${reportId}/phone`);
      return res.json() as Promise<PhoneResponse>;
    },
    onSuccess: (data: PhoneResponse) => {
      if (data.phone) {
        setPhoneNumber(data.phone);
        setPhoneVisible(true);
      } else {
        toast({ title: "Phone not available", description: data.message || "Phone number is not available", variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to retrieve phone", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card data-testid="card-lost-item-chat">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <CardTitle className="text-base" data-testid="text-chat-title">Messages</CardTitle>
          </div>
          {communicationUnlocked && (
            <div className="flex items-center gap-2">
              {phoneVisible && phoneNumber ? (
                <span className="text-sm font-medium" data-testid="text-phone-number">
                  <Phone className="h-3 w-3 inline mr-1" />
                  {phoneNumber}
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => phoneMutation.mutate()}
                  disabled={phoneMutation.isPending}
                  data-testid="button-view-phone"
                >
                  <Phone className="h-3 w-3 mr-1" />
                  {phoneMutation.isPending ? "Loading..." : "View Phone"}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!communicationUnlocked ? (
          <div className="h-80 flex items-center justify-center bg-muted/50 rounded-md" data-testid="container-chat-locked">
            <div className="text-center space-y-2 p-4">
              <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground" data-testid="text-chat-locked">
                Chat unlocked after driver confirms item
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="h-80 space-y-3 p-3" data-testid="container-chat-loading">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-8 w-1/2 ml-auto" />
            <Skeleton className="h-8 w-3/5" />
            <Skeleton className="h-8 w-2/5 ml-auto" />
          </div>
        ) : (
          <>
            <div className="h-80 overflow-y-auto bg-muted/30 rounded-md p-3 space-y-2" data-testid="container-messages">
              {(!messages || messages.length === 0) ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground" data-testid="text-no-messages">
                    No messages yet. Start the conversation.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  if (msg.isSystemMessage) {
                    return (
                      <div key={msg.id} className="text-center py-1" data-testid={`message-system-${msg.id}`}>
                        <span className="text-muted-foreground text-xs italic">{msg.message}</span>
                      </div>
                    );
                  }

                  const isCurrentUser = msg.senderId === currentUserId;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                      data-testid={`message-${msg.id}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-md px-3 py-2 ${
                          isCurrentUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm break-words" data-testid={`text-message-content-${msg.id}`}>{msg.message}</p>
                        <p className={`text-xs mt-1 ${isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                disabled={sendMutation.isPending}
                className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={sendMutation.isPending || !messageText.trim()}
                data-testid="button-send-message"
              >
                <Send />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
