import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Headphones, Send, ArrowRight, X, Lightbulb } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useTranslation } from "@/i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getTemplateResponse, type ZibraRole, ZIBRA_LANGUAGE_CONFIG } from "@shared/zibra-templates";

type UserRole = ZibraRole;

interface SupportMessage {
  id: string;
  role: "user" | "support";
  content: string;
  timestamp: Date;
}

interface QuickTopic {
  label: string;
  key: string;
}

const RIDER_TOPICS: QuickTopic[] = [
  { label: "How do I book a ride?", key: "book-ride" },
  { label: "Lost item help", key: "lost-item" },
  { label: "Payment issues", key: "payment" },
  { label: "Safety concerns", key: "safety" },
  { label: "Cancel a ride", key: "cancel" },
  { label: "Account settings", key: "account" },
  { label: "Scheduled rides", key: "schedule" },
  { label: "Talk to Support", key: "escalate" },
];

const DRIVER_TOPICS: QuickTopic[] = [
  { label: "How do I go online?", key: "go-online" },
  { label: "Earnings & payouts", key: "earnings" },
  { label: "Lost item process", key: "lost-item-driver" },
  { label: "Accident reporting", key: "accident" },
  { label: "Trust score", key: "trust-score" },
  { label: "Wallet & withdrawals", key: "wallet-driver" },
  { label: "Training modules", key: "training" },
  { label: "Talk to Support", key: "escalate" },
];

const ADMIN_TOPICS: QuickTopic[] = [
  { label: "Dashboard overview", key: "admin-dashboard" },
  { label: "Driver approvals", key: "admin-approvals" },
  { label: "Dispute management", key: "admin-disputes" },
  { label: "Fraud flags", key: "admin-fraud" },
  { label: "Trust scores explained", key: "admin-trust" },
  { label: "User management", key: "admin-users" },
  { label: "Financial reports", key: "admin-finance" },
  { label: "Safety incidents", key: "admin-safety" },
];

const SUPER_ADMIN_TOPICS: QuickTopic[] = [
  { label: "System configuration", key: "sa-config" },
  { label: "Country management", key: "sa-countries" },
  { label: "Kill switches", key: "sa-killswitch" },
  { label: "Compliance audit", key: "sa-compliance" },
  { label: "Abuse patterns", key: "sa-abuse" },
  { label: "Feature flags", key: "sa-flags" },
  { label: "Legal considerations", key: "sa-legal" },
  { label: "Risk assessment", key: "sa-risk" },
];

const DIRECTOR_TOPICS: QuickTopic[] = [
  { label: "Cell overview", key: "cell-overview" },
  { label: "Commission eligibility", key: "commission-how" },
  { label: "My drivers", key: "my-drivers" },
  { label: "Recruiting drivers", key: "recruit" },
  { label: "Driver performance", key: "driver-performance" },
  { label: "Caps and limits", key: "caps" },
  { label: "Authority and permissions", key: "authority" },
  { label: "Talk to Support", key: "escalate" },
];

const GREETINGS: Record<string, string> = {
  "rider": "Hi, I'm ZIBA Support. I'm here to help. Select a topic below or type your question.",
  "driver": "Hi, I'm ZIBA Support. I'm here to help. Select a topic below or type your question.",
  "admin": "ZIBA Support. I can help you navigate dashboard functions, review processes, and administrative actions. Select a topic or ask a question.",
  "super_admin": "ZIBA Support. I can assist with configuration, compliance, risk assessment, and operational oversight. Select a topic or ask a question.",
  "director": "ZIBA Support. I can help with cell management, driver oversight, and eligibility questions. Select a topic or ask a question.",
  "general": "Hi, I'm ZIBA Support. I'm here to help. Select a topic below or type your question.",
};

function detectRole(pathname: string, userRoles?: string[]): UserRole {
  if (pathname.startsWith("/admin")) {
    if (userRoles?.includes("super_admin")) return "super_admin";
    if (userRoles?.includes("director")) return "director";
    if (userRoles?.includes("admin")) return "admin";
    return "admin";
  }
  if (pathname.startsWith("/driver")) return "driver";
  if (pathname.startsWith("/rider")) return "rider";
  return "general";
}

function getTopics(role: UserRole): QuickTopic[] {
  switch (role) {
    case "super_admin": return SUPER_ADMIN_TOPICS;
    case "admin": return ADMIN_TOPICS;
    case "director": return DIRECTOR_TOPICS;
    case "driver": return DRIVER_TOPICS;
    case "rider": return RIDER_TOPICS;
    default: return RIDER_TOPICS;
  }
}

function getScreenContext(pathname: string): string {
  if (pathname.includes("/wallet")) return "wallet";
  if (pathname.includes("/earnings")) return "earnings";
  if (pathname.includes("/safety")) return "safety";
  if (pathname.includes("/trips") || pathname.includes("/activity")) return "trips";
  if (pathname.includes("/training")) return "training";
  if (pathname.includes("/account") || pathname.includes("/settings")) return "account";
  if (pathname.includes("/help") || pathname.includes("/help-center")) return "help";
  if (pathname.includes("/inbox")) return "inbox";
  if (pathname.includes("/services")) return "services";
  return "home";
}

function getContextHint(screen: string, role: UserRole): string | null {
  if (role === "rider") {
    if (screen === "wallet") return "I see you're in your Wallet. I can help with payments, top-ups, or balance questions. Let me know what you need.";
    if (screen === "safety") return "I see you're in the Safety Hub. I can help with incident reporting, SOS, or lost items. Let me know what you need.";
    if (screen === "trips") return "I see you're viewing your trip activity. I can help with trip details, cancellations, or reports. Let me know what you need.";
  }
  if (role === "driver") {
    if (screen === "wallet") return "I see you're in your Wallet. I can help with withdrawals, payout methods, or balance inquiries. Let me know what you need.";
    if (screen === "earnings") return "I see you're viewing Earnings. I can help with trip income, bonuses, or incentives. Let me know what you need.";
    if (screen === "training") return "I see you're in Training. I can help with any training module or platform procedure. Let me know what you need.";
    if (screen === "safety") return "I see you're in the Safety Hub. I can help with accident reporting, incident documentation, or emergency features. Let me know what you need.";
  }
  return null;
}

function logSupportInteraction(userMessage: string, supportResponse: string, role: UserRole, screen: string) {
  fetch("/api/support/log-interaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      userMessage,
      supportResponse: supportResponse.substring(0, 500),
      userRole: role,
      currentScreen: screen,
    }),
  }).catch(() => {});
}

interface ZibaSupportProps {
  onClose?: () => void;
  forceRole?: UserRole;
}

export function ZibaSupport({ onClose, forceRole }: ZibaSupportProps) {
  const { user } = useAuth();
  const [pathname] = useLocation();
  const { t, language } = useTranslation();
  const detectedRole = forceRole || detectRole(pathname, (user as any)?.roles);
  const screen = getScreenContext(pathname);

  const greeting = GREETINGS[detectedRole] || GREETINGS["general"];

  const contextHint = getContextHint(screen, detectedRole);
  const initialMessages: SupportMessage[] = [
    { id: "greeting", role: "support", content: greeting, timestamp: new Date() },
  ];
  if (contextHint) {
    initialMessages.push({ id: "context-hint", role: "support", content: contextHint, timestamp: new Date(Date.now() + 100) });
  }

  const [messages, setMessages] = useState<SupportMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topics = getTopics(detectedRole);

  const { data: proactiveSignals = [] } = useQuery<any[]>({
    queryKey: ["/api/zibra/proactive-signals"],
    enabled: !!user,
  });

  const dismissSignalMutation = useMutation({
    mutationFn: async (signalId: string) => {
      await apiRequest("POST", "/api/zibra/proactive-signals/dismiss", { signalId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zibra/proactive-signals"] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || escalated) return;

    const userMsg: SupportMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Check for language-related keywords and provide auto-response
    const languageKeywords = ["language", "english", "reset", "help me", "can't read", "cant read", "don't understand", "dont understand", "لغة", "langue", "idioma", "lingua"];
    const isLanguageHelp = languageKeywords.some(kw => msg.toLowerCase().includes(kw));

    if (isLanguageHelp) {
      const roleSettingsPath = detectedRole === "driver" ? "Settings → Language" : detectedRole === "director" ? "Dashboard → Settings tab → Language" : "Settings → Language";
      const langHelpMsg = t("support.helpReset") + `\n\nTo reset: ${roleSettingsPath} → English`;
      const supportMsg: SupportMessage = {
        id: `support-${Date.now()}`,
        role: "support",
        content: langHelpMsg,
        timestamp: new Date(Date.now() + 300),
      };
      setMessages(prev => [...prev, supportMsg]);
      logSupportInteraction(msg, langHelpMsg, detectedRole, screen);
      return;
    }

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: msg, conversationId, currentScreen: screen, userLanguage: language }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversationId) setConversationId(data.conversationId);
        if (data.escalated) setEscalated(true);
        const supportMsg: SupportMessage = {
          id: `support-${Date.now()}`,
          role: "support",
          content: data.response,
          timestamp: new Date(Date.now() + 300),
        };
        setMessages(prev => [...prev, supportMsg]);
        return;
      }
    } catch {}

    const responseText = getTemplateResponse(msg, detectedRole, screen);
    const supportMsg: SupportMessage = {
      id: `support-${Date.now()}`,
      role: "support",
      content: responseText,
      timestamp: new Date(Date.now() + 300),
    };
    setMessages(prev => [...prev, supportMsg]);
    logSupportInteraction(msg, responseText, detectedRole, screen);
  }, [input, detectedRole, screen, conversationId, escalated, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const isPrivateMode = detectedRole === "admin" || detectedRole === "super_admin";
  const headerLabel = isPrivateMode ? "Z-Assist" : "ZIBA Support";

  return (
    <Card className="flex flex-col h-full" data-testid="card-ziba-support">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Headphones className="h-4 w-4 text-primary" />
            </div>
            {headerLabel}
            {isPrivateMode && (
              <Badge variant="secondary" className="text-[10px]">Internal</Badge>
            )}
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
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-line ${
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

        {proactiveSignals.length > 0 && messages.length <= (contextHint ? 2 : 1) && (
          <div className="space-y-2 mb-3" data-testid="container-proactive-signals">
            {proactiveSignals.slice(0, 2).map((signal: any) => (
              <div key={signal.id} className="flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/10" data-testid={`signal-${signal.id}`}>
                <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{signal.title}</p>
                  <p className="text-xs text-muted-foreground">{signal.message}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 flex-shrink-0"
                  onClick={() => dismissSignalMutation.mutate(signal.id)}
                  data-testid={`button-dismiss-signal-${signal.id}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {messages.length <= (contextHint ? 2 : 1) && (
          <div className="flex flex-wrap gap-1.5 mb-3" data-testid="container-quick-topics">
            {topics.map((topic) => (
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
            placeholder={isPrivateMode ? "Ask about platform operations..." : "Type your question..."}
            className="flex-1"
            disabled={escalated}
            data-testid="input-support-message"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || escalated} data-testid="button-send-support">
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {!isPrivateMode && !escalated && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={async () => {
              if (!conversationId) {
                handleSend("Talk to Support");
                return;
              }
              setEscalating(true);
              try {
                const res = await fetch("/api/support/escalate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ conversationId, currentScreen: screen }),
                });
                if (res.ok) {
                  const data = await res.json();
                  setEscalated(true);
                  setMessages(prev => [...prev, {
                    id: `support-escalated-${Date.now()}`,
                    role: "support",
                    content: data.message || "A support agent will review this as soon as possible.",
                    timestamp: new Date(),
                  }]);
                }
              } catch {}
              setEscalating(false);
            }}
            disabled={escalating}
            data-testid="button-escalate-support"
          >
            <Headphones className="h-3 w-3 mr-2" />
            {escalating ? "Connecting..." : "Talk to Support Team"}
          </Button>
        )}
        {escalated && (
          <div className="text-center mt-2 p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground">A support agent will review this as soon as possible.</p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          {isPrivateMode
            ? "Z-Assist provides advisory guidance. Verify critical actions independently."
            : "ZIBA Support helps connect you with information and assistance."
          }
        </p>
      </CardContent>
    </Card>
  );
}
