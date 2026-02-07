import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Download, Users, MessageSquare, AlertTriangle, CheckCircle, ArrowUpRight, Shield } from "lucide-react";

interface ZibraAnalytics {
  totalConversations: number;
  conversationsByRole: Record<string, number>;
  escalatedCount: number;
  resolvedWithoutHumanCount: number;
  resolvedWithoutHumanPercent: number;
  topCategories: Array<{ category: string; count: number }>;
  topUnresolvedCategories: Array<{ category: string; count: number }>;
  abuseFlags: { lostItem: number; paymentDispute: number; threats: number };
  languageDistribution: Record<string, number>;
}

export function ZibraInsightsPanel() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);
  if (roleFilter && roleFilter !== "all") queryParams.set("role", roleFilter);

  const { data: analytics, isLoading } = useQuery<ZibraAnalytics>({
    queryKey: ["/api/admin/zibra/analytics", startDate, endDate, roleFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/zibra/analytics?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/admin/zibra/analytics/export?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "zibra-analytics.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  const totalAbuse = analytics ? analytics.abuseFlags.lostItem + analytics.abuseFlags.paymentDispute + analytics.abuseFlags.threats : 0;

  return (
    <div className="space-y-6" data-testid="container-zibra-insights">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">ZIBRA Insights</h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Start Date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" data-testid="input-start-date" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">End Date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" data-testid="input-end-date" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Role</label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36" data-testid="select-role-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="rider">Rider</SelectItem>
              <SelectItem value="driver">Driver</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i}><CardContent className="p-6"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-total-conversations">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Conversations</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-conversations">{analytics.totalConversations}</div>
              </CardContent>
            </Card>

            <Card data-testid="card-resolution-rate">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Resolved Without Human</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-resolution-rate">{analytics.resolvedWithoutHumanPercent}%</div>
                <p className="text-xs text-muted-foreground">{analytics.resolvedWithoutHumanCount} of {analytics.totalConversations}</p>
              </CardContent>
            </Card>

            <Card data-testid="card-escalated">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Escalated</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-escalated">{analytics.escalatedCount}</div>
              </CardContent>
            </Card>

            <Card data-testid="card-abuse-flags">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Abuse Flags</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-abuse-total">{totalAbuse}</div>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">Lost: {analytics.abuseFlags.lostItem}</Badge>
                  <Badge variant="secondary" className="text-[10px]">Payment: {analytics.abuseFlags.paymentDispute}</Badge>
                  <Badge variant="secondary" className="text-[10px]">Threats: {analytics.abuseFlags.threats}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-role-distribution">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Conversations by Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.conversationsByRole).map(([role, cnt]) => {
                    const pct = analytics.totalConversations > 0 ? Math.round((cnt / analytics.totalConversations) * 100) : 0;
                    return (
                      <div key={role} className="flex items-center justify-between gap-2" data-testid={`row-role-${role}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-xs capitalize">{role.replace("_", " ")}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{cnt}</span>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(analytics.conversationsByRole).length === 0 && (
                    <p className="text-sm text-muted-foreground">No conversations recorded yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-top-categories">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Top Question Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {analytics.topCategories.length > 0 ? analytics.topCategories.map((cat, idx) => (
                    <div key={cat.category} className="flex items-center justify-between gap-2 text-sm" data-testid={`row-category-${idx}`}>
                      <span className="text-muted-foreground capitalize">{cat.category.replace(/_/g, " ")}</span>
                      <Badge variant="secondary" className="text-xs">{cat.count}</Badge>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No category data available yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-language-distribution">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Language Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                {Object.entries(analytics.languageDistribution).map(([lang, cnt]) => (
                  <div key={lang} className="flex items-center gap-1.5" data-testid={`row-lang-${lang}`}>
                    <Badge variant="outline" className="text-xs uppercase">{lang}</Badge>
                    <span className="text-sm text-muted-foreground">{cnt}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No analytics data available.</CardContent></Card>
      )}
    </div>
  );
}