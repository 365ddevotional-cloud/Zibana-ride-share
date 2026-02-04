import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, Calendar, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DriverEarnings() {
  const { user } = useAuth();

  const { data: earnings } = useQuery({
    queryKey: ["/api/driver/earnings"],
    enabled: !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ["/api/driver/wallet"],
    enabled: !!user,
  });

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
            <p className="text-3xl font-bold">₦0.00</p>
            <Button 
              variant="secondary" 
              size="sm" 
              className="mt-4"
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
              <p className="text-lg font-bold mt-1">₦0</p>
            </CardContent>
          </Card>

          <Card data-testid="card-week-earnings">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">This Week</p>
              <p className="text-lg font-bold mt-1">₦0</p>
            </CardContent>
          </Card>

          <Card data-testid="card-month-earnings">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-lg font-bold mt-1">₦0</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history" data-testid="tab-earnings-history">History</TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="tab-withdrawals">Withdrawals</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-4 space-y-4">
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
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-4 space-y-4">
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
          </TabsContent>
        </Tabs>
      </div>
    </DriverLayout>
  );
}
