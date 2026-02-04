import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, Calendar, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import type { DriverProfile, Trip } from "@shared/schema";

export default function DriverEarnings() {
  const { user } = useAuth();
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

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const completedTrips = tripHistory?.filter(t => t.status === "completed") || [];
  
  const todayEarnings = completedTrips
    .filter(t => t.completedAt && new Date(t.completedAt).toDateString() === today.toDateString())
    .reduce((sum, t) => sum + parseFloat(t.driverPayout || "0"), 0);

  const weekEarnings = completedTrips
    .filter(t => t.completedAt && new Date(t.completedAt) >= startOfWeek)
    .reduce((sum, t) => sum + parseFloat(t.driverPayout || "0"), 0);

  const monthEarnings = completedTrips
    .filter(t => t.completedAt && new Date(t.completedAt) >= startOfMonth)
    .reduce((sum, t) => sum + parseFloat(t.driverPayout || "0"), 0);

  const walletBalance = profile?.walletBalance ? parseFloat(profile.walletBalance) : 0;

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
        <h1 className="text-xl font-bold" data-testid="text-earnings-title">Earnings</h1>

        <Card className="bg-emerald-600 text-white" data-testid="card-wallet-balance">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ₦{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <Button 
              variant="secondary" 
              size="sm" 
              className="mt-4"
              onClick={() => setLocation("/driver/settings")}
              data-testid="button-withdraw"
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card data-testid="card-today-earnings">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="text-lg font-bold mt-1">
                ₦{todayEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-week-earnings">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">This Week</p>
              <p className="text-lg font-bold mt-1">
                ₦{weekEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-month-earnings">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-lg font-bold mt-1">
                ₦{monthEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history" data-testid="tab-earnings-history">Trip History</TabsTrigger>
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
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm truncate max-w-[200px]">
                          {trip.dropoffLocation}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(trip.completedAt)}
                        </p>
                      </div>
                      <p className="font-bold text-emerald-600">
                        +₦{parseFloat(trip.driverPayout || "0").toLocaleString()}
                      </p>
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
                    <div className="flex items-center justify-between">
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
                        ₦{parseFloat(withdrawal.amount || "0").toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DriverLayout>
  );
}
