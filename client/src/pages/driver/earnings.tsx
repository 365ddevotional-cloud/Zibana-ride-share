import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, Calendar, ArrowUpRight, Star, CheckCircle, Lightbulb, FileText, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useTranslation } from "@/i18n";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";
import type { DriverProfile, Trip } from "@shared/schema";

interface CancellationMetrics {
  cancellationRate: number;
  recentCancellations: number;
  totalTrips: number;
}

export default function DriverEarnings() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const { data: profile } = useQuery<DriverProfile>({
    queryKey: ["/api/driver/profile"],
    enabled: !!user,
  });

  const { data: tripHistory } = useQuery<Trip[]>({
    queryKey: ["/api/driver/trip-history"],
    enabled: !!user,
  });

  const { data: withdrawals } = useQuery<any[]>({
    queryKey: ["/api/driver/withdrawals"],
    enabled: !!user,
  });

  const { data: cancellationMetrics } = useQuery<CancellationMetrics>({
    queryKey: ["/api/driver/cancellation-metrics"],
    enabled: !!user,
  });

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const completedTrips = tripHistory?.filter(t => t.status === "completed") || [];
  const allTrips = tripHistory || [];
  
  const todayCompletedTrips = completedTrips.filter(t => t.completedAt && new Date(t.completedAt).toDateString() === today.toDateString());
  const weekCompletedTrips = completedTrips.filter(t => t.completedAt && new Date(t.completedAt) >= startOfWeek);
  const monthCompletedTrips = completedTrips.filter(t => t.completedAt && new Date(t.completedAt) >= thirtyDaysAgo);

  const getEarning = (t: Trip) => t.paymentSource === "CASH" ? parseFloat(t.fareAmount || "0") : parseFloat(t.driverPayout || "0");
  const todayEarnings = todayCompletedTrips.reduce((sum, t) => sum + getEarning(t), 0);
  const weekEarnings = weekCompletedTrips.reduce((sum, t) => sum + getEarning(t), 0);
  const monthEarnings = monthCompletedTrips.reduce((sum, t) => sum + getEarning(t), 0);

  const todayCashEarnings = todayCompletedTrips.filter(t => t.paymentSource === "CASH").reduce((sum, t) => sum + parseFloat(t.fareAmount || "0"), 0);
  const weekCashEarnings = weekCompletedTrips.filter(t => t.paymentSource === "CASH").reduce((sum, t) => sum + parseFloat(t.fareAmount || "0"), 0);
  const monthCashEarnings = monthCompletedTrips.filter(t => t.paymentSource === "CASH").reduce((sum, t) => sum + parseFloat(t.fareAmount || "0"), 0);

  const todayTips = 0;
  const weekTips = 0;
  const monthTips = 0;
  const avgTip = 0;

  const acceptedCount = allTrips.filter(t => t.status === "completed" || t.status === "in_progress" || t.status === "accepted").length;
  const acceptanceRate = allTrips.length > 0 ? Math.round((acceptedCount / allTrips.length) * 100) : 100;
  const cancellationRate = cancellationMetrics?.cancellationRate ?? 0;

  const walletBalance = profile?.walletBalance ? parseFloat(profile.walletBalance) : 0;

  const insights: { message: string; type: "positive" | "neutral" | "improvement" }[] = [];
  
  if (acceptanceRate >= 80) {
    insights.push({ message: "Great work! Your reliability keeps riders coming back.", type: "positive" });
  } else if (acceptanceRate < 50) {
    insights.push({ message: "Accepting more trips can boost your earnings potential.", type: "improvement" });
  }
  
  if (cancellationRate <= 5) {
    insights.push({ message: "Consistent driving builds your reputation.", type: "positive" });
  } else if (cancellationRate > 10) {
    insights.push({ message: "Every completed trip strengthens your standing. You've got this!", type: "improvement" });
  }
  
  if (avgTip > 0) {
    insights.push({ message: "Riders appreciate your service!", type: "positive" });
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DriverLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl font-bold" data-testid="text-earnings-title">{t("driver.earnings")}</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/driver/statements")}
            data-testid="button-earnings-statements"
          >
            <FileText className="h-4 w-4 mr-2" />
            {t("driver.statements")}
          </Button>
        </div>

        <Card className="bg-emerald-600 text-white" data-testid="card-wallet-balance">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {"\u20A6"}{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <Button 
              variant="secondary" 
              size="sm" 
              className="mt-4"
              onClick={() => setLocation("/driver/wallet")}
              data-testid="button-view-wallet"
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              View Wallet
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today" data-testid="tab-today">{t("driver.todayEarnings")}</TabsTrigger>
            <TabsTrigger value="week" data-testid="tab-week">{t("driver.weeklyEarnings")}</TabsTrigger>
            <TabsTrigger value="month" data-testid="tab-month">{t("driver.monthlyEarnings")}</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-4 space-y-3">
            <EarningsPeriodSummary 
              earnings={todayEarnings} 
              cashEarnings={todayCashEarnings}
              tips={todayTips} 
              tripCount={todayCompletedTrips.length} 
              testPrefix="today"
            />
          </TabsContent>

          <TabsContent value="week" className="mt-4 space-y-3">
            <EarningsPeriodSummary 
              earnings={weekEarnings} 
              cashEarnings={weekCashEarnings}
              tips={weekTips} 
              tripCount={weekCompletedTrips.length} 
              testPrefix="week"
            />
          </TabsContent>

          <TabsContent value="month" className="mt-4 space-y-3">
            <EarningsPeriodSummary 
              earnings={monthEarnings} 
              cashEarnings={monthCashEarnings}
              tips={monthTips} 
              tripCount={monthCompletedTrips.length} 
              testPrefix="month"
            />
          </TabsContent>
        </Tabs>

        <Card data-testid="card-performance-metrics">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("driver.acceptanceRate")}</span>
              <span className="font-medium" data-testid="text-acceptance-rate">{acceptanceRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cancellation Rate</span>
              <span className="font-medium" data-testid="text-cancellation-rate">{cancellationRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Average Tip</span>
              <span className="font-medium" data-testid="text-avg-tip">
                {"\u20A6"}{avgTip.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        {insights.length > 0 && (
          <Card data-testid="card-insights">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2" data-testid={`insight-${idx}`}>
                  {insight.type === "positive" ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Star className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  )}
                  <p className="text-sm text-muted-foreground">{insight.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history" data-testid="tab-earnings-history">{t("driver.tripHistory")}</TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="tab-withdrawals">Withdrawals</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-4 space-y-4">
            {completedTrips.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <TrendingUp className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">No earnings yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete trips to start earning
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedTrips.slice(0, 20).map((trip) => (
                <Card key={trip.id} data-testid={`card-earning-${trip.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate max-w-[200px]">
                          {trip.dropoffLocation}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(trip.completedAt)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {trip.paymentSource === "CASH" ? (
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1">
                              <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                              <p className="font-bold text-emerald-600" data-testid={`text-cash-earning-${trip.id}`}>
                                {"\u20A6"}{parseFloat(trip.fareAmount || "0").toLocaleString()}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">Cash Trip</span>
                          </div>
                        ) : (
                          <p className="font-bold text-emerald-600">
                            +{"\u20A6"}{parseFloat(trip.driverPayout || "0").toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-4 space-y-4">
            {!withdrawals || withdrawals.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">No withdrawals yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your withdrawal history will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              withdrawals.map((withdrawal: any) => (
                <Card key={withdrawal.id} data-testid={`card-withdrawal-${withdrawal.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">
                          {withdrawal.status === "completed" ? "Completed" : 
                           withdrawal.status === "pending" ? "Pending" : "Failed"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(withdrawal.createdAt)}
                        </p>
                      </div>
                      <p className="font-bold">
                        {"\u20A6"}{parseFloat(withdrawal.amount || "0").toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
      <ZibraFloatingButton />
    </DriverLayout>
  );
}

function EarningsPeriodSummary({ 
  earnings, 
  cashEarnings,
  tips, 
  tripCount,
  testPrefix 
}: { 
  earnings: number; 
  cashEarnings: number;
  tips: number; 
  tripCount: number;
  testPrefix: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Card data-testid={`card-${testPrefix}-earnings`}>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Earnings</p>
            <p className="text-lg font-bold mt-1">
              {"\u20A6"}{earnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card data-testid={`card-${testPrefix}-tips`}>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Tips</p>
            <p className="text-lg font-bold mt-1">
              {"\u20A6"}{tips.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card data-testid={`card-${testPrefix}-trips`}>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Trips</p>
            <p className="text-lg font-bold mt-1">{tripCount}</p>
          </CardContent>
        </Card>
      </div>
      {cashEarnings > 0 && (
        <Card className="border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20" data-testid={`card-${testPrefix}-cash-earnings`}>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200" data-testid={`text-${testPrefix}-cash-total`}>
                  Cash earnings {testPrefix === "today" ? "today" : "this period"}: {"\u20A6"}{cashEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Cash payments are collected directly from riders.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
