import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  route?: string;
}

interface AiResponse {
  response: string;
  environment: string;
  isLive: boolean;
}

function extractRoute(text: string): string | null {
  const match = text.match(/\/admin\/[a-z/-]+/);
  return match ? match[0] : null;
}

export function ZibanaAiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [displayedResponse, setDisplayedResponse] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const { data: platformData } = useQuery<{ isLive: boolean; environment: string }>({
    queryKey: ["/api/admin/platform-settings"],
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/admin/zibana-ai/chat", { message });
      return res.json() as Promise<AiResponse>;
    },
    onSuccess: (data) => {
      const route = extractRoute(data.response);
      const cleanResponse = route ? data.response.replace(route, "").replace("Navigate to ", "Go to ").trim() : data.response;
      setIsTyping(true);
      setDisplayedResponse("");

      let i = 0;
      const fullText = cleanResponse;
      const interval = setInterval(() => {
        i += 2;
        if (i >= fullText.length) {
          setDisplayedResponse(fullText);
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: fullText, timestamp: new Date(), route: route || undefined },
          ]);
          clearInterval(interval);
        } else {
          setDisplayedResponse(fullText.slice(0, i));
        }
      }, 15);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, displayedResponse]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending || isTyping) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed, timestamp: new Date() }]);
    setInput("");
    chatMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const env = platformData?.environment ?? "PRE_LAUNCH";

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
          size="icon"
          data-testid="button-zibana-ai-open"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] flex flex-col shadow-2xl rounded-xl border border-slate-200 dark:border-slate-700 bg-background overflow-hidden" style={{ height: "min(600px, calc(100vh - 120px))" }} data-testid="panel-zibana-ai">
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-slate-900 dark:bg-slate-950 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">ZIBANA AI</p>
                <p className="text-[10px] text-slate-300">Operational Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300" data-testid="badge-ai-env">
                {env}
              </Badge>
              <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)} className="h-7 w-7 text-white hover:text-white" data-testid="button-zibana-ai-close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 && !isTyping && (
              <div className="text-center py-8" data-testid="zibana-ai-welcome">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 mb-3">
                  <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-medium">Welcome to ZIBANA AI</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {env === "PRE_LAUNCH"
                    ? "Platform is in pre-launch mode. Ask me about launch readiness, QA status, or driver registrations."
                    : "Ask me about platform operations, metrics, or navigate to any section."}
                </p>
                <div className="mt-4 space-y-2">
                  {["What's our launch status?", "How many drivers do we have?", "Show me the QA checklist"].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q);
                        setTimeout(() => {
                          setMessages((prev) => [...prev, { role: "user", content: q, timestamp: new Date() }]);
                          setInput("");
                          chatMutation.mutate(q);
                        }, 50);
                      }}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      data-testid={`button-suggested-${q.slice(0, 10).replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`chat-message-${idx}`}>
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Bot className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-foreground"}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.route && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 text-xs"
                      onClick={() => navigate(msg.route!)}
                      data-testid={`button-navigate-${idx}`}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Open Section
                    </Button>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                    <User className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 justify-start" data-testid="zibana-ai-typing">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Bot className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800">
                  <p className="whitespace-pre-wrap">{displayedResponse}<span className="inline-block w-1.5 h-4 bg-blue-600 dark:bg-blue-400 animate-pulse ml-0.5 align-middle" /></p>
                </div>
              </div>
            )}

            {chatMutation.isPending && !isTyping && (
              <div className="flex gap-2 justify-start" data-testid="zibana-ai-loading">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Bot className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 p-3 shrink-0">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask ZIBANA AI..."
                className="flex-1 text-sm"
                disabled={chatMutation.isPending || isTyping}
                data-testid="input-zibana-ai"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || chatMutation.isPending || isTyping}
                data-testid="button-zibana-ai-send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}