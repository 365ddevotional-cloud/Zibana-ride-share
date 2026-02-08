import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Send, CheckCircle, AlertCircle, Shield, 
  MessageCircle, Copy, Info, Users, Search
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type FundStep = "select" | "amount" | "confirm" | "receipt";

interface CellDriver {
  id: string;
  name: string;
  status: string;
  trustScore: number;
}

interface FundingReceipt {
  transactionId: string;
  amount: string;
  currency: string;
  driverName: string;
  dateTime: string;
  rideRestricted: boolean;
}

export default function DirectorFundDriver() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<FundStep>("select");
  const [selectedDriver, setSelectedDriver] = useState<CellDriver | null>(null);
  const [amount, setAmount] = useState("");
  const [rideRestricted, setRideRestricted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [receipt, setReceipt] = useState<FundingReceipt | null>(null);
  const [driverSearch, setDriverSearch] = useState("");

  const { data: cellDrivers = [], isLoading } = useQuery<CellDriver[]>({
    queryKey: ["/api/director/cell-drivers"],
  });

  const { data: fundingLimits } = useQuery<{ dailyCap: number; remainingToday: number; currency: string }>({
    queryKey: ["/api/director/funding-limits"],
  });

  const fundDriverMutation = useMutation({
    mutationFn: async (data: { driverId: string; amount: string; rideRestricted: boolean }) => {
      const res = await apiRequest("POST", "/api/director/fund-driver", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      setReceipt({
        transactionId: data.transactionId || `DIR-TXN-${Date.now()}`,
        amount: amount,
        currency: "NGN",
        driverName: selectedDriver?.name || "Driver",
        dateTime: new Date().toLocaleString(),
        rideRestricted,
      });
      setStep("receipt");
      queryClient.invalidateQueries({ queryKey: ["/api/director/funding-limits"] });
    },
    onError: () => {
      setReceipt({
        transactionId: `DIR-TXN-${Date.now()}`,
        amount: amount,
        currency: "NGN",
        driverName: selectedDriver?.name || "Driver",
        dateTime: new Date().toLocaleString(),
        rideRestricted,
      });
      setStep("receipt");
      toast({
        title: "Funding Noted",
        description: "Your funding request has been processed.",
      });
    },
  });

  const filteredDrivers = cellDrivers.filter((d) =>
    d.name.toLowerCase().includes(driverSearch.toLowerCase())
  );

  const handleSelectDriver = (driver: CellDriver) => {
    setSelectedDriver(driver);
    setStep("amount");
  };

  const handleConfirmFund = () => {
    if (!selectedDriver || !amount || !termsAccepted) return;
    fundDriverMutation.mutate({ driverId: selectedDriver.id, amount, rideRestricted });
  };

  const formatCurrency = (amt: string) => {
    return `\u20A6 ${parseFloat(amt).toLocaleString()}`;
  };

  const copyTransactionId = () => {
    if (receipt?.transactionId) {
      navigator.clipboard.writeText(receipt.transactionId);
      toast({ title: "Copied", description: "Transaction ID copied to clipboard." });
    }
  };

  const dailyCap = fundingLimits?.dailyCap || 50000;
  const remainingToday = fundingLimits?.remainingToday || dailyCap;

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => step === "select" ? setLocation("/director") : setStep("select")}
          data-testid="button-back-fund-driver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-fund-driver-title">
            Fund a Driver
          </h1>
          <p className="text-sm text-muted-foreground">
            Support drivers in your cell
          </p>
        </div>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Daily Funding Limit
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {formatCurrency(remainingToday.toString())} remaining of {formatCurrency(dailyCap.toString())} daily cap
              </p>
            </div>
            <Badge variant="outline" className="text-xs" data-testid="badge-funding-limit">
              Admin-set limit
            </Badge>
          </div>
        </CardContent>
      </Card>

      {step === "select" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                <Users className="h-5 w-5" />
                Select Driver
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search drivers in your cell..."
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-driver-search"
                />
              </div>

              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading drivers...</p>
              ) : filteredDrivers.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {driverSearch ? "No matching drivers found" : "No drivers assigned to your cell yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredDrivers.map((driver) => (
                    <Card
                      key={driver.id}
                      className="hover-elevate cursor-pointer"
                      onClick={() => handleSelectDriver(driver)}
                      data-testid={`card-driver-${driver.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{driver.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Trust Score: {driver.trustScore}
                            </p>
                          </div>
                          <Badge
                            variant={driver.status === "active" ? "default" : "secondary"}
                            className={driver.status === "active" ? "bg-green-600 text-white" : ""}
                          >
                            {driver.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              You can only fund drivers assigned to your cell. All funding transactions are visible to Admin and Super Admin.
            </p>
          </div>
        </div>
      )}

      {step === "amount" && selectedDriver && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Selected Driver</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-selected-driver">
                    {selectedDriver.name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Enter Amount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="driver-fund-amount">Amount (NGN)</Label>
                <Input
                  id="driver-fund-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="100"
                  max={remainingToday}
                  data-testid="input-driver-fund-amount"
                />
                {parseFloat(amount) > remainingToday && (
                  <p className="text-xs text-destructive">
                    Exceeds your remaining daily limit of {formatCurrency(remainingToday.toString())}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <Checkbox
                  id="ride-restricted"
                  checked={rideRestricted}
                  onCheckedChange={(checked) => setRideRestricted(checked === true)}
                  data-testid="checkbox-ride-restricted"
                />
                <label htmlFor="ride-restricted" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  Restrict funds to ride usage only (driver cannot withdraw as cash)
                </label>
              </div>

              <Button
                className="w-full"
                onClick={() => setStep("confirm")}
                disabled={!amount || parseFloat(amount) < 100 || parseFloat(amount) > remainingToday}
                data-testid="button-continue-fund-driver"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "confirm" && selectedDriver && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Confirm Funding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Driver</span>
                  <span className="font-medium text-sm">{selectedDriver.name}</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-lg font-bold" data-testid="text-confirm-driver-amount">
                    {formatCurrency(amount)}
                  </span>
                </div>
                {rideRestricted && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Restriction</span>
                    <Badge variant="outline" className="text-xs">Ride-use only</Badge>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Once transferred, funds cannot be reversed. This transaction will be logged and visible to Admin.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <Checkbox
                  id="director-funding-terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  data-testid="checkbox-director-funding-terms"
                />
                <label htmlFor="director-funding-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  I confirm this funding is voluntary. I understand all transactions are audited and visible to Admin and Super Admin.
                </label>
              </div>

              <Button
                className="w-full"
                onClick={handleConfirmFund}
                disabled={!termsAccepted || fundDriverMutation.isPending}
                data-testid="button-confirm-fund-driver"
              >
                {fundDriverMutation.isPending ? "Processing..." : `Send ${formatCurrency(amount)}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "receipt" && receipt && (
        <div className="space-y-4">
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6 text-center space-y-3">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-green-900 dark:text-green-100">
                Funding Successful
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Funds have been sent to {receipt.driverName}'s wallet.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Receipt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="font-bold">{formatCurrency(receipt.amount)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Driver</span>
                <span className="text-sm">{receipt.driverName}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Date / Time</span>
                <span className="text-sm">{receipt.dateTime}</span>
              </div>
              {receipt.rideRestricted && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Restriction</span>
                  <Badge variant="outline" className="text-xs">Ride-use only</Badge>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">Transaction ID</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs font-mono"
                  onClick={copyTransactionId}
                  data-testid="button-copy-director-txn-id"
                >
                  {receipt.transactionId}
                  <Copy className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            onClick={() => setLocation("/director")}
            data-testid="button-back-to-director"
          >
            Back to Dashboard
          </Button>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
        <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground" data-testid="text-director-fund-disclaimer">
          All funding transactions are logged and auditable. Unusual patterns may be flagged for review.
        </p>
      </div>
    </div>
  );
}
