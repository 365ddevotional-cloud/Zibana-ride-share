import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Globe,
  Activity,
} from "lucide-react";
import { API_BASE } from "@/lib/apiBase";

interface ZibraInsightsData {
  totalConversations: number;
  resolvedWithoutEscalation: number;
  escalatedToHuman: number;
  autoResolutionRate: number;
  topResolvedTopics: { topic: string; count: number; resolvedCount: number; escalatedCount: number }[];
  abuseAttemptsBlocked: number;
  averageResponseTime: number;
  languageUsageStats: { language: string; conversationCount: number; percentage: number }[];
  escalationsByRole: Record<string, number>;
}

interface ResolutionStats {
  total: number;
  resolved: number;
  escalated: number;
  resolutionRate: string;
}

export function ZibraInsightsPanel() {
  const [period, setPeriod] = useState("7d");

  const { data: metrics, isLoading: metricsLoading } = useQuery<ZibraInsightsData>({
    queryKey: ["/api/admin/zibra/insights", period],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/zibra/insights?period=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: resolutionStats, isLoading: statsLoading } = useQuery<ResolutionStats>({
    queryKey: ["/api/admin/zibra/resolution-stats"],
  });

  const isLoading = metricsLoading || statsLoading;

  return (
    <div className="space-y-6" data-testid="container-zibra-insights">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-zibra-insights-title">ZIBRA Insights</h3>
          <p className="text-sm text-muted-foreground">Support performance, resolution rates, and operational intelligence</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]" data-testid="select-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-16 bg-muted animate-pulse rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-total-conversations">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.totalConversations || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Conversations</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-auto-resolution">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.autoResolutionRate ? `${(metrics.autoResolutionRate * 100).toFixed(0)}%` : "0%"}</p>
                    <p className="text-xs text-muted-foreground">Auto-Resolution Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-escalated">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-amber-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.escalatedToHuman || 0}</p>
                    <p className="text-xs text-muted-foreground">Escalated to Human</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-abuse-blocked">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-red-500/10 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.abuseAttemptsBlocked || 0}</p>
                    <p className="text-xs text-muted-foreground">Abuse Attempts Blocked</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-top-topics">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Top Resolved Topics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics?.topResolvedTopics && metrics.topResolvedTopics.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.topResolvedTopics.slice(0, 8).map((topic, idx) => (
                      <div key={topic.topic} className="flex items-center justify-between gap-2" data-testid={`row-topic-${idx}`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                          <span className="text-sm truncate">{topic.topic}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="secondary" className="text-[10px]">{topic.count}</Badge>
                          {topic.escalatedCount > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                              {topic.escalatedCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No topic data available for this period</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-resolution-overview">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Resolution Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">All-time Conversations</span>
                    <span className="text-sm font-medium">{resolutionStats?.total || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Resolved Without Escalation</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">{resolutionStats?.resolved || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Escalated to Human</span>
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{resolutionStats?.escalated || 0}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Resolution Rate</span>
                      <span className="text-lg font-bold">{resolutionStats?.resolutionRate || "0"}%</span>
                    </div>
                    <div className="mt-2 w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all duration-500"
                        style={{ width: `${Math.min(parseFloat(resolutionStats?.resolutionRate || "0"), 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">Target: Rider 70% | Driver 60% | Director 50%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-language-usage">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Language Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics?.languageUsageStats && metrics.languageUsageStats.length > 0 ? (
                  <div className="space-y-2">
                    {metrics.languageUsageStats.map((lang) => (
                      <div key={lang.language} className="flex items-center justify-between" data-testid={`row-lang-${lang.language}`}>
                        <span className="text-sm">{lang.language}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{lang.conversationCount}</span>
                          <Badge variant="secondary" className="text-[10px]">{lang.percentage.toFixed(0)}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No language data available</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-system-health">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Voice Module</span>
                    <Badge variant="outline" className="text-[10px]">Foundation Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Proactive Engine</span>
                    <Badge variant="outline" className="text-[10px]">Foundation Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Legal Guard</span>
                    <Badge variant="secondary" className="text-[10px]">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Director Coaching</span>
                    <Badge variant="outline" className="text-[10px]">Foundation Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Trust Assistance</span>
                    <Badge variant="outline" className="text-[10px]">Foundation Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Auto-Resolution</span>
                    <Badge variant="secondary" className="text-[10px]">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
