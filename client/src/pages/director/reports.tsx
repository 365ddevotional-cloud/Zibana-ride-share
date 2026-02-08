import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Users, Activity, TrendingUp, TrendingDown, Minus, BarChart3,
  Calendar, Shield, CheckCircle, XCircle, ArrowLeft, Clock,
  AlertTriangle
} from "lucide-react";

export default function DirectorReportsPage() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("daily");

  const { data: daily, isLoading: loadingDaily } = useQuery<any>({
    queryKey: ["/api/director/reports/daily"],
  });

  const { data: weekly, isLoading: loadingWeekly } = useQuery<any>({
    queryKey: ["/api/director/reports/weekly"],
  });

  const { data: monthly, isLoading: loadingMonthly } = useQuery<any>({
    queryKey: ["/api/director/reports/monthly"],
  });

  if (daily?.readOnly) {
    return (
      <div className="p-6 space-y-4" data-testid="director-reports-readonly">
        <Button variant="ghost" onClick={() => navigate("/director/dashboard")} data-testid="button-back-dashboard">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Dashboard Read-Only</h2>
            <p className="text-muted-foreground">Your account is currently {daily.status}. Reports are unavailable.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="director-reports-page">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" onClick={() => navigate("/director/dashboard")} data-testid="button-back-dashboard">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-reports-title">Director Reports</h1>
          <p className="text-sm text-muted-foreground">Performance summaries — counts and ratios only, no financial data</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList data-testid="tabs-report-period">
          <TabsTrigger value="daily" data-testid="tab-daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly" data-testid="tab-weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4 mt-4">
          {loadingDaily ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : daily ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-drivers">{daily.totalDrivers}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Today</CardTitle>
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-active-today">{daily.activeDriversToday}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Commissionable</CardTitle>
                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-commissionable">{daily.commissionableDrivers}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Activity Ratio</CardTitle>
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-activity-ratio">{daily.activityRatio}%</div>
                    <Progress value={daily.activityRatio} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Lifecycle</span>
                      <Badge variant={daily.lifecycleStatus === "active" ? "default" : "destructive"} data-testid="badge-lifecycle">
                        {daily.lifecycleStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Activation Threshold</span>
                      <Badge variant={daily.meetsActivationThreshold ? "default" : "secondary"} data-testid="badge-threshold">
                        {daily.meetsActivationThreshold ? "Met" : "Not Met"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Suspended Drivers</span>
                      <span className="text-sm font-medium" data-testid="text-suspended">{daily.suspendedDrivers}</span>
                    </div>
                    {daily.lifespanEndDate && (
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm text-muted-foreground">Lifespan Ends</span>
                        <span className="text-sm font-medium" data-testid="text-lifespan-end">
                          {new Date(daily.lifespanEndDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {daily.cellSummaries && daily.cellSummaries.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Cell Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {daily.cellSummaries.map((cell: any) => (
                        <div key={cell.id} className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-sm">{cell.name || `Cell ${cell.id}`}</span>
                          <span className="text-sm text-muted-foreground" data-testid={`text-cell-${cell.id}`}>
                            {cell.driverCount} / {cell.maxCapacity} drivers
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4 mt-4">
          {loadingWeekly ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : weekly ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Active Drivers</CardTitle>
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-avg-active">{weekly.avgActiveDrivers}</div>
                    <p className="text-xs text-muted-foreground mt-1">Over {weekly.daysReported} days</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Commissionable</CardTitle>
                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-avg-commissionable">{weekly.avgCommissionable}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
                    <Shield className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-compliance-rate">{weekly.complianceRate}%</div>
                    <Progress value={weekly.complianceRate} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Growth Indicator</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  {weekly.growthIndicator > 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : weekly.growthIndicator < 0 ? (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  ) : (
                    <Minus className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="font-medium" data-testid="text-growth">
                    {weekly.growthIndicator > 0 ? `+${weekly.growthIndicator}` : weekly.growthIndicator} drivers this week
                  </span>
                </CardContent>
              </Card>

              {weekly.dailyTrend && weekly.dailyTrend.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Daily Activity Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {weekly.dailyTrend.map((day: any, i: number) => (
                        <div key={i} className="flex items-center justify-between flex-wrap gap-2 py-1 border-b last:border-b-0">
                          <span className="text-sm" data-testid={`text-trend-date-${i}`}>{day.date}</span>
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-xs text-muted-foreground">Active: {day.activeDrivers}/{day.totalDrivers}</span>
                            <span className="text-xs text-muted-foreground">Comm: {day.commissionableDrivers}</span>
                            <Badge variant={day.meetsThreshold ? "default" : "secondary"} className="text-xs">
                              {day.meetsThreshold ? "Eligible" : "Below Threshold"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4 mt-4">
          {loadingMonthly ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : monthly ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-perf-score">
                      {monthly.performanceScore !== null ? monthly.performanceScore : "N/A"}
                    </div>
                    {monthly.performanceTier && (
                      <Badge variant="outline" className="mt-1" data-testid="badge-perf-tier">{monthly.performanceTier}</Badge>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
                    {monthly.trendDirection === "growing" ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : monthly.trendDirection === "declining" ? (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    ) : (
                      <Minus className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-monthly-growth">
                      {monthly.monthlyGrowth > 0 ? `+${monthly.monthlyGrowth}` : monthly.monthlyGrowth} drivers
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{monthly.trendDirection}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Days Reported</CardTitle>
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-days-reported">{monthly.daysReported}</div>
                  </CardContent>
                </Card>
              </div>

              {monthly.weeklyBuckets && monthly.weeklyBuckets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Weekly Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {monthly.weeklyBuckets.map((w: any) => (
                        <div key={w.week} className="space-y-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-sm font-medium" data-testid={`text-week-${w.week}`}>Week {w.week}</span>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xs text-muted-foreground">Avg Active: {w.avgActive}/{w.avgTotal}</span>
                              <Badge variant={w.complianceRate >= 80 ? "default" : w.complianceRate >= 50 ? "secondary" : "destructive"} className="text-xs">
                                {w.complianceRate}% compliant
                              </Badge>
                            </div>
                          </div>
                          <Progress value={w.complianceRate} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground" data-testid="text-disclaimer">
            Reports show operational counts and ratios only. No revenue, per-driver earnings, or financial data is displayed. 
            All metrics are estimates based on platform activity and subject to administrative review.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}