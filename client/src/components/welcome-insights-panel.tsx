import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, MousePointerClick, UserPlus, TrendingUp, Headphones, BarChart3 } from "lucide-react";

interface WelcomeInsightsData {
  totalEvents: number;
  uniqueVisitors: number;
  pageViews: number;
  cardClicks: number;
  ctaClicks: number;
  signupStarts: number;
  zibraOpens: number;
  conversionRate: number;
  topCards: Array<{ card: string; clicks: number }>;
  topIntents: Array<{ intent: string; count: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
  range: string;
}

const CARD_LABELS: Record<string, string> = {
  "verified-drivers": "Verified Drivers",
  "quick-pickup": "Quick Pickup",
  "easy-booking": "Easy Booking",
  "live-tracking": "Live Tracking",
  "flexible-payments": "Flexible Payments",
  "rate-trip": "Rate Your Trip",
  "safety-first": "Safety First",
};

const INTENT_LABELS: Record<string, string> = {
  "safety-first": "Safety Focused",
  "safety-aware": "Safety Aware",
  "cost-aware": "Cost Conscious",
  "speed-aware": "Speed Focused",
  "convenience": "Convenience Seeker",
  "quality-aware": "Quality Focused",
  "general": "General Interest",
};

export function WelcomeInsightsPanel() {
  const [range, setRange] = useState("30d");

  const { data: insights, isLoading } = useQuery<WelcomeInsightsData>({
    queryKey: ["/api/admin/welcome-insights", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/welcome-insights?range=${range}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading welcome insights...
      </div>
    );
  }

  if (!insights || insights.totalEvents === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">No welcome page activity recorded yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Data will appear as visitors interact with the welcome page.</p>
        </CardContent>
      </Card>
    );
  }

  const maxBarValue = Math.max(...(insights.dailyTrend.map(d => d.count) || [1]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-welcome-insights-title">Welcome Page Insights</h3>
          <p className="text-sm text-muted-foreground">Anonymous visitor engagement data (no personal information)</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[130px]" data-testid="select-welcome-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unique Visitors</p>
                <p className="text-xl font-bold" data-testid="text-unique-visitors">{insights.uniqueVisitors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <MousePointerClick className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Card Clicks</p>
                <p className="text-xl font-bold" data-testid="text-card-clicks">{insights.cardClicks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <UserPlus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Signup Starts</p>
                <p className="text-xl font-bold" data-testid="text-signup-starts">{insights.signupStarts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="text-xl font-bold" data-testid="text-conversion-rate">{insights.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Most Clicked Features</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.topCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No card clicks recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {insights.topCards.map((item, i) => {
                  const pct = insights.cardClicks > 0 ? Math.round((item.clicks / insights.cardClicks) * 100) : 0;
                  return (
                    <div key={item.card} className="flex items-center gap-3" data-testid={`row-top-card-${i}`}>
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{CARD_LABELS[item.card] || item.card}</span>
                          <Badge variant="secondary" className="shrink-0">{item.clicks}</Badge>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Visitor Intent Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.topIntents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No intent data recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {insights.topIntents.map((item, i) => {
                  const totalIntents = insights.topIntents.reduce((a, b) => a + b.count, 0);
                  const pct = totalIntents > 0 ? Math.round((item.count / totalIntents) * 100) : 0;
                  return (
                    <div key={item.intent} className="flex items-center gap-3" data-testid={`row-top-intent-${i}`}>
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{INTENT_LABELS[item.intent] || item.intent}</span>
                          <Badge variant="secondary" className="shrink-0">{pct}%</Badge>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500 dark:bg-green-400 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {insights.dailyTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Daily Activity (Last 14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {insights.dailyTrend.map((day) => {
                const height = maxBarValue > 0 ? Math.max((day.count / maxBarValue) * 100, 4) : 4;
                const dateLabel = new Date(day.date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1" data-testid={`bar-daily-${day.date}`}>
                    <span className="text-[10px] text-muted-foreground">{day.count}</span>
                    <div
                      className="w-full rounded-sm bg-primary/80 transition-all duration-300"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground truncate max-w-full">{dateLabel}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Page Views</p>
            <p className="text-2xl font-bold" data-testid="text-total-page-views">{insights.pageViews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">CTA Clicks</p>
            <p className="text-2xl font-bold" data-testid="text-total-cta-clicks">{insights.ctaClicks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Headphones className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Support Opens</p>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-zibra-opens">{insights.zibraOpens}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
