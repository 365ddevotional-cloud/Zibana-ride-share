import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Headphones, Send, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

type UserRole = "rider" | "driver" | "admin" | "super_admin" | "general";

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

const RIDER_RESPONSES: Record<string, string> = {
  "book-ride": "To book a ride:\n1. Go to the Home tab.\n2. Enter your pickup and drop-off locations.\n3. Choose your preferred ride type and confirm.\n\nZIBA helps connect you with available drivers in your area. Let me know if you'd like help with the next step.",
  "lost-item": "ZIBA can help connect you with the driver to coordinate next steps.\n1. Go to Activity and find the trip.\n2. Tap 'Report Lost Item' and provide details.\n\nDrivers are not required to return items, but many choose to. You may also arrange pickup at a Safe Return Hub if available. Let me know if you need further guidance.",
  "payment": "You can manage your payment methods in the Wallet section. ZIBA supports wallet credits, cash payments, and card payments. Your charges are shown in your trip summary. For payment concerns, we recommend submitting a support ticket for review. I can guide you through this if you want.",
  "safety": "If there's an emergency, please contact local emergency services first. During an active trip, you can use the SOS button for immediate assistance. You can also report incidents through the Safety Hub. ZIBA facilitates safety tools designed to assist you. Let me know if you'd like help with the next step.",
  "account": "You can update your profile, notification preferences, and privacy settings from the Account tab. I can guide you through this if you want.",
  "cancel": "You can cancel a ride before the driver arrives. Cancellation fees may apply depending on timing. You may choose to review our policies in the Legal section for details. Let me know if you need further guidance.",
  "schedule": "To schedule a ride in advance:\n1. Go to Services.\n2. Select 'Scheduled Rides'.\n3. Set your pickup time (up to 7 days ahead).\n\nZIBA will help match you with an available driver at the scheduled time. Let me know if you'd like help with the next step.",
  "escalate": "I can forward this to our support team for review. Go to Help Center and tap 'Submit a Ticket'. A support agent will look into this. For urgent safety matters, please use the SOS button during an active trip.",
};

const DRIVER_RESPONSES: Record<string, string> = {
  "go-online": "To start accepting rides:\n1. Go to your Driver Home.\n2. Toggle the 'Go Online' switch.\n3. Make sure your GPS is enabled and you have an active internet connection.\n\nZIBA connects you with riders based on proximity and availability. Let me know if you'd like help with the next step.",
  "earnings": "Your earnings and charges are shown in your trip summary. View details in the Earnings tab, including trip income, bonuses, and incentives. Payouts are processed through your configured payment method in the Wallet section. I can guide you through this if you want.",
  "lost-item-driver": "If a rider reports a lost item from your trip, you'll receive a notification. You can confirm or deny finding the item. If found, you may choose to return it directly or through a Safe Return Hub. Drivers are not required to return items, but many choose to. Hub drop-offs may earn a bonus reward.",
  "accident": "If there's an emergency, please contact local emergency services first. You can submit a report so the incident is documented:\n1. Open the Accident Report feature in your Safety Hub.\n2. Document the incident with photos and details.\n\nZIBA facilitates documentation and may connect you with relief fund resources based on eligibility.",
  "trust-score": "Your trust score reflects your overall reliability on the platform. It considers ratings, trip completion, behavior signals, and safety record. Maintaining consistent, professional service helps build your trust score over time. Let me know if you'd like more details.",
  "wallet-driver": "Manage your wallet and withdrawal methods in the Wallet tab. You can set up bank or mobile money details for payouts. Identity verification may be required for withdrawals based on your country's requirements. I can guide you through this if you want.",
  "training": "Access training modules from the Help tab. These cover lost item protocol, Safe Return Hubs, accident reporting, and trust score management. Completing training helps you understand platform features and best practices. Let me know if you'd like help with the next step.",
  "escalate": "I can forward this to our support team for review. Go to Help and tap 'Submit a Ticket'. A support agent will look into this. For urgent safety matters during a trip, use the SOS button.",
};

const ADMIN_RESPONSES: Record<string, string> = {
  "admin-dashboard": "The Admin Dashboard provides an overview of platform operations. The tabs at the top organize management areas: Drivers, Riders, Trips, Payouts, Disputes, and more. Use the tab navigation to access specific management functions. Let me know if you need guidance on a specific section.",
  "admin-approvals": "Driver approvals are managed in the Drivers tab.\n1. Filter by 'Pending Approval' to see new applications.\n2. Review submitted documents and vehicle information.\n3. Approve or reject based on verification status.\n\nAll actions are logged for audit purposes.",
  "admin-disputes": "Dispute management is in the Disputes tab. Review filed disputes, examine evidence from both parties, and make resolution decisions. You can issue refunds, apply penalties, or escalate to senior review. All actions are logged for audit purposes.",
  "admin-fraud": "Fraud detection flags appear in the Fraud tab. The system generates signals based on behavioral patterns like unusual trip frequency, GPS mismatches, or suspicious financial activity. Review flagged items, adjust risk scores, and take appropriate action.",
  "admin-trust": "Trust scores are calculated from multiple signals: ratings, trip completion rates, incident history, and behavior patterns. The system applies anti-manipulation guards to prevent gaming. You can view detailed breakdowns in user profiles.",
  "admin-users": "User management allows you to search, view, and manage all platform users. You can view profiles, trip history, wallet status, and compliance records. Administrative actions include role assignment, status changes, and account restrictions.",
  "admin-finance": "Financial reports cover trip revenue, driver payouts, wallet balances, and settlement records. The Payouts tab manages pending and completed driver payments. The Cash Settlement section handles cash trip reconciliation.",
  "admin-safety": "Safety management includes incident reports, SOS events, accident records, and the relief fund. Review reported incidents, process insurance referrals, and manage safety-related escalations. All safety actions maintain an audit trail.",
};

const SUPER_ADMIN_RESPONSES: Record<string, string> = {
  "sa-config": "System configuration controls platform-wide settings, including production switches, test mode, simulation settings, and feature flags. Changes here affect all users. We recommend reviewing dependencies before modifying critical settings.",
  "sa-countries": "Country management controls operational regions. Each country has its own currency, tax rules, identity requirements, and compliance settings. We recommend using Launch Readiness to verify all configurations before enabling a new market.",
  "sa-killswitch": "Kill switches allow immediate feature disabling per country. These are safety controls for emergencies. Disabling a feature is instant, but re-enabling should be done with verification. We recommend checking dependent features before toggling.",
  "sa-compliance": "Compliance audits track legal acknowledgements, user consents, and regulatory adherence. The Compliance Logs panel shows timestamped acceptance records. We recommend reviewing these regularly to ensure platform-wide compliance coverage.",
  "sa-abuse": "Abuse patterns are detected through the fraud engine. Look for recurring signals: frequent reporters, GPS mismatches, unusual financial patterns, and coordinated behavior. The system aggregates signals into risk profiles for investigation.",
  "sa-flags": "Feature flags control which capabilities are active per country. Flags allow gradual rollout and quick rollback. We recommend reviewing the monitoring dashboard for flag impact metrics before making changes to production flags.",
  "sa-legal": "Legal considerations include country-specific arbitration requirements, class action waivers, consumer protection compliance, and platform liability positioning. ZIBA operates as a technology marketplace. All communications should reinforce this positioning.",
  "sa-risk": "Risk assessment involves reviewing fraud profiles, dispute trends, financial anomalies, and safety incident patterns. Use the monitoring dashboard to track KPIs and set up alerts for significant deviations from baselines.",
};

const COMMON_RESPONSES: Record<string, string> = {
  "default": "Based on your question, we recommend checking the Help Center for detailed guidance. If you need further assistance, you can submit a support ticket and our team will review your case. Let me know if you'd like help with the next step.",
  "greeting-rider": "Hi, I'm ZIBA Support. I'm here to help. Select a topic below or type your question.",
  "greeting-driver": "Hi, I'm ZIBA Support. I'm here to help. Select a topic below or type your question.",
  "greeting-admin": "ZIBA Support. I can help you navigate dashboard functions, review processes, and administrative actions. Select a topic or ask a question.",
  "greeting-super_admin": "ZIBA Support. I can assist with configuration, compliance, risk assessment, and operational oversight. Select a topic or ask a question.",
  "greeting-general": "Hi, I'm ZIBA Support. I'm here to help. Select a topic below or type your question.",
};

function detectRole(pathname: string, userRoles?: string[]): UserRole {
  if (pathname.startsWith("/admin")) {
    if (userRoles?.includes("super_admin")) return "super_admin";
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
    case "driver": return DRIVER_TOPICS;
    case "rider": return RIDER_TOPICS;
    default: return RIDER_TOPICS;
  }
}

function getResponseMap(role: UserRole): Record<string, string> {
  switch (role) {
    case "super_admin": return { ...SUPER_ADMIN_RESPONSES, ...ADMIN_RESPONSES };
    case "admin": return ADMIN_RESPONSES;
    case "driver": return DRIVER_RESPONSES;
    case "rider": return RIDER_RESPONSES;
    default: return RIDER_RESPONSES;
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

function getResponse(input: string, role: UserRole): string {
  const lower = input.toLowerCase();
  const responses = getResponseMap(role);

  if (lower.includes("are you ai") || lower.includes("are you a bot") || lower.includes("are you real") || lower.includes("are you human") || lower.includes("what are you")) {
    return "I'm ZIBA Support. I'm here to help you navigate ZIBA.";
  }

  if (lower.includes("angry") || lower.includes("frustrat") || lower.includes("furious") || lower.includes("upset") || lower.includes("terrible") || lower.includes("worst") || lower.includes("horrible") || lower.includes("hate") || lower.includes("unacceptable") || lower.includes("disgusting") || lower.includes("ridiculous")) {
    return "I understand this is frustrating. I can help explain the options available. Based on your situation, would you like me to guide you through the next steps, or would you prefer to submit a support ticket for a detailed review?";
  }

  if (lower.includes("sorry") && (lower.includes("fault") || lower.includes("blame") || lower.includes("responsible"))) {
    return "I understand your concern. I can help explain the options available to you. Would you like me to walk you through the relevant steps, or would you prefer to connect with our support team?";
  }

  if (lower.includes("thank") || lower.includes("thanks")) {
    return "Thanks for reaching out. Let me know if you'd like help with anything else.";
  }

  if (role === "rider" || role === "general") {
    if (lower.includes("book") || lower.includes("ride") || lower.includes("request")) return responses["book-ride"] || RIDER_RESPONSES["book-ride"];
    if (lower.includes("lost") || lower.includes("item") || lower.includes("found")) return responses["lost-item"] || RIDER_RESPONSES["lost-item"];
    if (lower.includes("pay") || lower.includes("wallet") || lower.includes("charge") || lower.includes("refund") || lower.includes("money")) return responses["payment"] || RIDER_RESPONSES["payment"];
    if (lower.includes("safe") || lower.includes("accident") || lower.includes("sos") || lower.includes("emergency") || lower.includes("incident")) return responses["safety"] || RIDER_RESPONSES["safety"];
    if (lower.includes("account") || lower.includes("profile") || lower.includes("settings") || lower.includes("password")) return responses["account"] || RIDER_RESPONSES["account"];
    if (lower.includes("cancel")) return responses["cancel"] || RIDER_RESPONSES["cancel"];
    if (lower.includes("schedule") || lower.includes("advance") || lower.includes("later")) return responses["schedule"] || RIDER_RESPONSES["schedule"];
  }

  if (role === "driver") {
    if (lower.includes("online") || lower.includes("go online") || lower.includes("start driving") || lower.includes("accept")) return responses["go-online"];
    if (lower.includes("earn") || lower.includes("income") || lower.includes("payout") || lower.includes("commission")) return responses["earnings"];
    if (lower.includes("lost") || lower.includes("item") || lower.includes("found") || lower.includes("hub")) return responses["lost-item-driver"];
    if (lower.includes("accident") || lower.includes("crash") || lower.includes("collision")) return responses["accident"];
    if (lower.includes("trust") || lower.includes("score") || lower.includes("rating")) return responses["trust-score"];
    if (lower.includes("wallet") || lower.includes("withdraw") || lower.includes("bank") || lower.includes("mobile money")) return responses["wallet-driver"];
    if (lower.includes("training") || lower.includes("module") || lower.includes("learn")) return responses["training"];
    if (lower.includes("pay") || lower.includes("money") || lower.includes("charge")) return responses["earnings"];
    if (lower.includes("safe") || lower.includes("sos") || lower.includes("emergency") || lower.includes("incident")) return responses["accident"];
  }

  if (role === "admin") {
    if (lower.includes("dashboard") || lower.includes("overview") || lower.includes("home")) return responses["admin-dashboard"];
    if (lower.includes("approv") || lower.includes("pending") || lower.includes("verify") || lower.includes("registration")) return responses["admin-approvals"];
    if (lower.includes("dispute") || lower.includes("resolution") || lower.includes("complain")) return responses["admin-disputes"];
    if (lower.includes("fraud") || lower.includes("suspicious") || lower.includes("flag") || lower.includes("signal")) return responses["admin-fraud"];
    if (lower.includes("trust") || lower.includes("score") || lower.includes("rating")) return responses["admin-trust"];
    if (lower.includes("user") || lower.includes("manage") || lower.includes("account") || lower.includes("profile")) return responses["admin-users"];
    if (lower.includes("financ") || lower.includes("revenue") || lower.includes("payout") || lower.includes("commission") || lower.includes("money")) return responses["admin-finance"];
    if (lower.includes("safe") || lower.includes("incident") || lower.includes("sos") || lower.includes("accident") || lower.includes("relief")) return responses["admin-safety"];
  }

  if (role === "super_admin") {
    if (lower.includes("config") || lower.includes("setting") || lower.includes("system") || lower.includes("production switch")) return responses["sa-config"];
    if (lower.includes("country") || lower.includes("market") || lower.includes("launch") || lower.includes("region")) return responses["sa-countries"];
    if (lower.includes("kill") || lower.includes("switch") || lower.includes("disable") || lower.includes("emergency")) return responses["sa-killswitch"];
    if (lower.includes("compliance") || lower.includes("consent") || lower.includes("audit") || lower.includes("log")) return responses["sa-compliance"];
    if (lower.includes("abuse") || lower.includes("pattern") || lower.includes("fraud") || lower.includes("manipulation")) return responses["sa-abuse"];
    if (lower.includes("flag") || lower.includes("feature") || lower.includes("rollout") || lower.includes("toggle")) return responses["sa-flags"];
    if (lower.includes("legal") || lower.includes("liability") || lower.includes("arbitration") || lower.includes("waiver")) return responses["sa-legal"];
    if (lower.includes("risk") || lower.includes("assess") || lower.includes("trend") || lower.includes("anomal")) return responses["sa-risk"];
    if (lower.includes("dashboard") || lower.includes("overview")) return responses["admin-dashboard"] || ADMIN_RESPONSES["admin-dashboard"];
    if (lower.includes("dispute")) return responses["admin-disputes"] || ADMIN_RESPONSES["admin-disputes"];
    if (lower.includes("user") || lower.includes("manage")) return responses["admin-users"] || ADMIN_RESPONSES["admin-users"];
    if (lower.includes("safe") || lower.includes("incident")) return responses["admin-safety"] || ADMIN_RESPONSES["admin-safety"];
  }

  if (lower.includes("human") || lower.includes("agent") || lower.includes("support") || lower.includes("escalat") || lower.includes("talk") || lower.includes("ticket") || lower.includes("help")) {
    if (role === "admin" || role === "super_admin") {
      return "For complex operational issues, check the relevant dashboard tab or escalate through internal channels. The compliance logs and audit trails provide detailed records for investigation.";
    }
    return role === "driver" ? DRIVER_RESPONSES["escalate"] : RIDER_RESPONSES["escalate"];
  }

  return "Based on your question, we recommend checking the Help Center for detailed guidance. I can guide you through this if you want, or you can submit a support ticket for a detailed review.";
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
  const detectedRole = forceRole || detectRole(pathname, (user as any)?.roles);
  const screen = getScreenContext(pathname);

  const greetingKey = `greeting-${detectedRole}` as keyof typeof COMMON_RESPONSES;
  const greeting = COMMON_RESPONSES[greetingKey] || COMMON_RESPONSES["greeting-general"];

  const contextHint = getContextHint(screen, detectedRole);
  const initialMessages: SupportMessage[] = [
    { id: "greeting", role: "support", content: greeting, timestamp: new Date() },
  ];
  if (contextHint) {
    initialMessages.push({ id: "context-hint", role: "support", content: contextHint, timestamp: new Date(Date.now() + 100) });
  }

  const [messages, setMessages] = useState<SupportMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const topics = getTopics(detectedRole);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback((text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    const userMsg: SupportMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date(),
    };

    const responseMap = getResponseMap(detectedRole);
    const matchedTopic = topics.find(t => t.label === text);
    const responseText = matchedTopic
      ? (responseMap[matchedTopic.key] || getResponse(msg, detectedRole))
      : getResponse(msg, detectedRole);

    const supportMsg: SupportMessage = {
      id: `support-${Date.now()}`,
      role: "support",
      content: responseText,
      timestamp: new Date(Date.now() + 300),
    };

    setMessages(prev => [...prev, userMsg, supportMsg]);
    setInput("");

    logSupportInteraction(msg, responseText, detectedRole, screen);
  }, [input, detectedRole, topics, screen]);

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
            data-testid="input-support-message"
          />
          <Button type="submit" size="icon" disabled={!input.trim()} data-testid="button-send-support">
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {!isPrivateMode && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => handleSend("Talk to Support")}
            data-testid="button-escalate-support"
          >
            <Headphones className="h-3 w-3 mr-2" />
            Talk to Support Team
          </Button>
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
