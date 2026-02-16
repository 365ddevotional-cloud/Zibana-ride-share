import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { DollarSign, Percent, Shield, Save } from "lucide-react";

interface FeeSettings {
  bookingFee: string;
  governmentLevy: string;
  vatPercentage: string;
  vatEnabled: boolean;
}

export default function AdminFeeSettings() {
  const { toast } = useToast();
  const [localFees, setLocalFees] = useState<FeeSettings>({
    bookingFee: "0",
    governmentLevy: "0",
    vatPercentage: "7.50",
    vatEnabled: false,
  });

  const { data: fees, isLoading } = useQuery<FeeSettings>({
    queryKey: ["/api/admin/platform-fee-settings"],
  });

  useEffect(() => {
    if (fees) {
      setLocalFees(fees);
    }
  }, [fees]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<FeeSettings>) => {
      const res = await apiRequest("PATCH", "/api/admin/platform-fee-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-fee-settings"] });
      toast({ title: "Fee settings saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save fee settings", variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      bookingFee: localFees.bookingFee,
      governmentLevy: localFees.governmentLevy,
      vatPercentage: localFees.vatPercentage,
      vatEnabled: localFees.vatEnabled,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-800 dark:text-slate-100" data-testid="text-fee-settings-title">
            Platform Financial Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure booking fees, government levies, and VAT for all trips.
          </p>
        </div>
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 no-default-hover-elevate no-default-active-elevate" data-testid="badge-super-admin-only">
          <Shield className="h-3.5 w-3.5 mr-1" />
          Super Admin Only
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="gap-2">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2" data-testid="text-fees-title">
              <DollarSign className="h-5 w-5 text-blue-500" />
              Trip Fees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Booking Fee (NGN)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={localFees.bookingFee}
                onChange={(e) => setLocalFees(prev => ({ ...prev, bookingFee: e.target.value }))}
                data-testid="input-booking-fee"
              />
              <p className="text-xs text-slate-400">Fixed fee applied to every trip</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Government Levy (NGN)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={localFees.governmentLevy}
                onChange={(e) => setLocalFees(prev => ({ ...prev, governmentLevy: e.target.value }))}
                data-testid="input-government-levy"
              />
              <p className="text-xs text-slate-400">Regulatory charge per trip</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-amber-500">
          <CardHeader className="gap-2">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2" data-testid="text-vat-title">
              <Percent className="h-5 w-5 text-amber-500" />
              VAT Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Enable VAT</p>
                <p className="text-xs text-slate-400">Toggle VAT calculation on/off</p>
              </div>
              <Switch
                checked={localFees.vatEnabled}
                onCheckedChange={(checked) => setLocalFees(prev => ({ ...prev, vatEnabled: checked }))}
                data-testid="switch-vat-enabled"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">VAT Percentage (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={localFees.vatPercentage}
                onChange={(e) => setLocalFees(prev => ({ ...prev, vatPercentage: e.target.value }))}
                disabled={!localFees.vatEnabled}
                data-testid="input-vat-percentage"
              />
              <p className="text-xs text-slate-400">Applied to subtotal (fare + booking fee + levy)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-fee-settings">
          <Save className="h-4 w-4 mr-1.5" />
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
