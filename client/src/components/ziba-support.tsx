import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Headphones, Send, ArrowRight, X } from "lucide-react";

interface SupportMessage {
  id: string;
  role: "user" | "support";
  content: string;
  timestamp: Date;
}

const QUICK_TOPICS = [
  { label: "How do I book a ride?", key: "book-ride" },
  { label: "Lost item help", key: "lost-item" },
  { label: "Payment issues", key: "payment" },
  { label: "Safety concerns", key: "safety" },
  { label: "Account settings", key: "account" },
  { label: "Cancel a ride", key: "cancel" },
];

const SUPPORT_RESPONSES: Record<string, string> = {
  "book-ride": "To book a ride, go to the Home tab and enter your pickup and drop-off locations. ZIBA connects you with available drivers in your area. You can choose your preferred ride type and confirm the booking.",
  "lost-item": "If you've lost an item during a trip, go to Activity, find the trip, and tap 'Report Lost Item'. ZIBA helps facilitate communication between you and the driver. Please note that item recovery is not guaranteed, and drivers assist voluntarily.",
  "payment": "You can manage your payment methods in the Wallet section. ZIBA supports wallet credits, cash payments, and card payments. For payment disputes, please submit a support ticket and our team will review your case.",
  "safety": "Your safety is important. Use the SOS button during trips for emergencies. You can also report incidents through the Safety Hub. Remember, ZIBA facilitates safety tools, but all users are responsible for their own personal safety decisions.",
  "account": "You can update your profile, notification preferences, and privacy settings from the Account tab. For account-related issues, contact our support team through the Help Center.",
  "cancel": "You can cancel a ride before the driver arrives. Please note that cancellation fees may apply depending on timing. Check our Refund & Cancellation Policy in the Legal section for full details.",
  "default": "Thank you for reaching out to ZIBA Support. Based on your question, we recommend checking the Help Center articles for detailed guidance. If you need further assistance, you can submit a support ticket and our team will help you.",
  "greeting": "Welcome to ZIBA Support. How can we help you today? Select a topic below or type your question.",
};

function getResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("book") || lower.includes("ride") || lower.includes("request")) return SUPPORT_RESPONSES["book-ride"];
  if (lower.includes("lost") || lower.includes("item") || lower.includes("found")) return SUPPORT_RESPONSES["lost-item"];
  if (lower.includes("pay") || lower.includes("wallet") || lower.includes("charge") || lower.includes("refund")) return SUPPORT_RESPONSES["payment"];
  if (lower.includes("safe") || lower.includes("accident") || lower.includes("sos") || lower.includes("emergency")) return SUPPORT_RESPONSES["safety"];
  if (lower.includes("account") || lower.includes("profile") || lower.includes("settings") || lower.includes("password")) return SUPPORT_RESPONSES["account"];
  if (lower.includes("cancel")) return SUPPORT_RESPONSES["cancel"];
  return SUPPORT_RESPONSES["default"];
}

export function ZibaSupport({ onClose }: { onClose?: () => void }) {
  const [messages, setMessages] = useState<SupportMessage[]>([
    { id: "greeting", role: "support", content: SUPPORT_RESPONSES["greeting"], timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    const userMsg: SupportMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date(),
    };

    const responseText = text
      ? SUPPORT_RESPONSES[QUICK_TOPICS.find(t => t.label === text)?.key || "default"] || SUPPORT_RESPONSES["default"]
      : getResponse(msg);

    const supportMsg: SupportMessage = {
      id: `support-${Date.now()}`,
      role: "support",
      content: responseText,
      timestamp: new Date(Date.now() + 500),
    };

    setMessages(prev => [...prev, userMsg, supportMsg]);
    setInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <Card className="flex flex-col h-full" data-testid="card-ziba-support">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Headphones className="h-4 w-4 text-primary" />
            </div>
            ZIBA Support
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-support">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1" style={{ maxHeight: "350px" }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`message-${msg.role}-${msg.id}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-1.5 mb-3" data-testid="container-quick-topics">
            {QUICK_TOPICS.map((topic) => (
              <Badge
                key={topic.key}
                variant="outline"
                className="cursor-pointer text-xs"
                onClick={() => handleSend(topic.label)}
                data-testid={`badge-topic-${topic.key}`}
              >
                {topic.label}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 flex-shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-1"
            data-testid="input-support-message"
          />
          <Button type="submit" size="icon" disabled={!input.trim()} data-testid="button-send-support">
            <Send className="h-4 w-4" />
          </Button>
        </form>

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          ZIBA Support helps connect you with information and assistance.
        </p>
      </CardContent>
    </Card>
  );
}
