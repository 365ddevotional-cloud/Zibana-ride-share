import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Brain,
  X,
  Send,
  AlertTriangle,
  BarChart3,
  FileText,
  Lightbulb,
  TrendingUp,
  Shield,
  Clock,
  Loader2,
  Power,
  ChevronRight,
  Activity,
  Users,
  Car,
  Zap,
} from "lucide-react";

interface AiCommandPanelProps {
  open: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
}

type TabKey = "ask" | "risk" | "report" | "founder" | "promo";

const TABS: { key: TabKey; label: string; icon: typeof Brain }[] = [
  { key: "ask", label: "Ask ZIBA", icon: Brain },
  { key: "risk", label: "Risk Alerts", icon: AlertTriangle },
  { key: "report", label: "Weekly Report", icon: FileText },
  { key: "founder", label: "Founder Mode", icon: Lightbulb },
  { key: "promo", label: "Promotion Advisor", icon: TrendingUp },
];

const QUICK_PROMPTS: Record<TabKey, string[]> = {
  ask: [
    "What is the current platform health summary?",
    "Show me the key performance indicators.",
    "Any anomalies detected in operations?",
  ],
  risk: [
    "Analyze cancellation trends this week.",
    "Which areas have declining activity?",
    "Are there any wallet anomalies?",
  ],
  report: [
    "Generate a weekly executive summary.",
    "Summarize revenue and trip trends for the past 7 days.",
    "What are the top operational risks this week?",
  ],
  founder: [
    "Are we ready to scale to new markets?",
    "What is the driver churn risk?",
    "Financial health summary and growth outlook.",
  ],
  promo: [
    "Should we run rider promotions this week?",
    "Suggest driver incentive ideas based on current data.",
    "What promotion strategy would reduce cancellations?",
  ],
};

export function AiCommandPanel({ open, onClose, isSuperAdmin }: AiCommandPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("ask");
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<{ role: string; content: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: aiStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/admin/ai/status"],
    refetchInterval: 30000,
  });

  const { data: dataContext } = useQuery<any>({
    queryKey: ["/api/admin/ai/data-context"],
    enabled: aiStatus?.enabled === true,
  });

  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/ai/audit-log"],
    enabled: activeTab === "ask",
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("POST", "/api/admin/ai/toggle", { enabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/audit-log"] });
    },
    onError: () => {
      toast({ title: "Failed to toggle AI", variant: "destructive" });
    },
  });

  const queryMutation = useMutation({
    mutationFn: async ({ q, type }: { q: string; type: string }) => {
      const res = await apiRequest("POST", "/api/admin/ai/query", { question: q, queryType: type });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.status === "AI_DISABLED") {
        setConversation((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
      } else if (data.status === "AI_TEMPORARILY_UNAVAILABLE") {
        setConversation((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
      } else {
        setConversation((prev) => [
          ...prev,
          { role: "assistant", content: data.answer },
        ]);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/audit-log"] });
    },
    onError: () => {
      setConversation((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleSend = () => {
    if (!question.trim()) return;
    const q = question.trim();
    setConversation((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    queryMutation.mutate({ q, type: activeTab });
  };

  const handleQuickPrompt = (prompt: string) => {
    setConversation((prev) => [...prev, { role: "user", content: prompt }]);
    queryMutation.mutate({ q: prompt, type: activeTab });
  };

  const isEnabled = aiStatus?.enabled ?? false;

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg z-50 flex" data-testid="ai-command-panel">
      <div className="absolute inset-0 -left-full bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg bg-background border-l shadow-2xl flex flex-col h-full">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-600 text-white">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight" data-testid="text-ai-panel-title">ZIBA AI</h2>
              <p className="text-xs text-muted-foreground">Command Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEnabled ? (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" data-testid="badge-ai-online">
                Online
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-testid="badge-ai-offline">
                Offline
              </Badge>
            )}
            <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-ai-panel">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Power className="h-3.5 w-3.5" />
              <span>AI Command Layer</span>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => toggleMutation.mutate(checked)}
              disabled={toggleMutation.isPending}
              data-testid="switch-ai-toggle"
            />
          </div>
        )}

        <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto">
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setActiveTab(tab.key);
                setConversation([]);
              }}
              className="shrink-0"
              data-testid={`tab-ai-${tab.key}`}
            >
              <tab.icon className="h-3.5 w-3.5 mr-1" />
              {tab.label}
            </Button>
          ))}
        </div>

        {!isEnabled ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <Card className="w-full">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-muted">
                  <Brain className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium" data-testid="text-ai-offline-message">ZIBA AI is currently offline.</p>
                <p className="text-xs text-muted-foreground">
                  {isSuperAdmin
                    ? "Use the toggle above to enable the AI Command Layer."
                    : "Contact your Super Admin to enable the AI Command Layer."}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {dataContext && (
              <div className="px-4 py-2 border-b bg-muted/10">
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Activity className="h-3 w-3 text-blue-500" />
                      <span className="text-xs font-semibold" data-testid="text-trips-7d">{dataContext.trips?.total_7d ?? 0}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Trips 7d</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Car className="h-3 w-3 text-emerald-500" />
                      <span className="text-xs font-semibold" data-testid="text-active-drivers">{dataContext.users?.active_drivers ?? 0}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Drivers</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3 w-3 text-violet-500" />
                      <span className="text-xs font-semibold" data-testid="text-active-riders">{dataContext.users?.active_riders ?? 0}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Riders</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Shield className="h-3 w-3 text-amber-500" />
                      <span className="text-xs font-semibold" data-testid="text-open-disputes">{dataContext.disputes?.open_count ?? 0}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Disputes</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {conversation.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Quick prompts for <span className="font-medium">{TABS.find((t) => t.key === activeTab)?.label}</span>:</p>
                  {QUICK_PROMPTS[activeTab].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="w-full text-left text-sm p-3 rounded-md border hover-elevate flex items-center gap-2"
                      data-testid={`button-quick-prompt-${i}`}
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {conversation.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                    data-testid={`message-${msg.role}-${i}`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}

              {queryMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-sm text-muted-foreground">Analyzing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t px-4 py-3">
              <div className="flex gap-2">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask ZIBA AI anything about operations..."
                  className="resize-none text-sm min-h-[40px] max-h-[100px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  data-testid="input-ai-question"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!question.trim() || queryMutation.isPending}
                  data-testid="button-ai-send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                AI is advisory only. All actions require manual approval.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
