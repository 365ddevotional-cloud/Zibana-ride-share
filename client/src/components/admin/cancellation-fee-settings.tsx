import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save } from "lucide-react";

interface CancellationFeeConfigData {
  id: string;
  countryCode: string;
  cancellationFeeAmount: string;
  scheduledPenaltyAmount: string;
  gracePeriodMinutes: number;
  scheduledCancelWindowMinutes: number;
  arrivedCancellationFeeAmount: string;
  isActive: boolean;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export function AdminCancellationFeeSettings() {
  const { toast } = useToast();

  const [countryCode, setCountryCode] = useState("NG");
  const [cancellationFeeAmount, setCancellationFeeAmount] = useState("");
  const [arrivedCancellationFeeAmount, setArrivedCancellationFeeAmount] = useState("");
  const [scheduledPenaltyAmount, setScheduledPenaltyAmount] = useState("");
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState("");
  const [scheduledCancelWindowMinutes, setScheduledCancelWindowMinutes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data: configs, isLoading } = useQuery<CancellationFeeConfigData[]>({
    queryKey: ["/api/admin/cancellation-fee-config"],
  });

  const existingConfig = configs?.find(
    (c) => c.countryCode === countryCode
  );

  useEffect(() => {
    if (existingConfig) {
      setCancellationFeeAmount(existingConfig.cancellationFeeAmount);
      setArrivedCancellationFeeAmount(existingConfig.arrivedCancellationFeeAmount);
      setScheduledPenaltyAmount(existingConfig.scheduledPenaltyAmount);
      setGracePeriodMinutes(String(existingConfig.gracePeriodMinutes));
      setScheduledCancelWindowMinutes(String(existingConfig.scheduledCancelWindowMinutes));
      setIsActive(existingConfig.isActive);
    } else {
      setCancellationFeeAmount("");
      setArrivedCancellationFeeAmount("");
      setScheduledPenaltyAmount("");
      setGracePeriodMinutes("");
      setScheduledCancelWindowMinutes("");
      setIsActive(true);
    }
  }, [existingConfig]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/admin/cancellation-fee-config", {
        countryCode,
        cancellationFeeAmount,
        arrivedCancellationFeeAmount,
        scheduledPenaltyAmount,
        gracePeriodMinutes: Number(gracePeriodMinutes),
        scheduledCancelWindowMinutes: Number(scheduledCancelWindowMinutes),
        isActive,
      });
    },
    onSuccess: () => {
      toast({
        title: "Saved",
        description: "Cancellation fee configuration updated successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/cancellation-fee-config"],
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to save cancellation fee config",
        variant: "destructive",
      });
    },
  });

  return (
    <Card data-testid="cancellation-fee-settings-card">
      <CardHeader>
        <CardTitle
          className="flex items-center gap-2"
          data-testid="text-cancellation-fee-settings-title"
        >
          <Settings className="h-5 w-5" />
          Cancellation Fee Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="text-loading-config"
          >
            Loading configuration...
          </p>
        ) : (
          <>
            {!existingConfig && (
              <p
                className="text-sm text-muted-foreground"
                data-testid="text-no-config"
              >
                No configuration found for country code "{countryCode}". Fill in
                the fields below to create one.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cfg-country-code">Country Code</Label>
                <Input
                  id="cfg-country-code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                  maxLength={3}
                  data-testid="input-country-code"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cfg-cancellation-fee">
                  Cancellation Fee Amount
                </Label>
                <Input
                  id="cfg-cancellation-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cancellationFeeAmount}
                  onChange={(e) => setCancellationFeeAmount(e.target.value)}
                  data-testid="input-cancellation-fee-amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cfg-arrived-fee">
                  Arrived Cancellation Fee Amount
                </Label>
                <Input
                  id="cfg-arrived-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={arrivedCancellationFeeAmount}
                  onChange={(e) =>
                    setArrivedCancellationFeeAmount(e.target.value)
                  }
                  data-testid="input-arrived-cancellation-fee-amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cfg-scheduled-penalty">
                  Scheduled Penalty Amount
                </Label>
                <Input
                  id="cfg-scheduled-penalty"
                  type="number"
                  min="0"
                  step="0.01"
                  value={scheduledPenaltyAmount}
                  onChange={(e) => setScheduledPenaltyAmount(e.target.value)}
                  data-testid="input-scheduled-penalty-amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cfg-grace-period">Grace Period Minutes</Label>
                <Input
                  id="cfg-grace-period"
                  type="number"
                  min="0"
                  step="1"
                  value={gracePeriodMinutes}
                  onChange={(e) => setGracePeriodMinutes(e.target.value)}
                  data-testid="input-grace-period-minutes"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cfg-scheduled-window">
                  Scheduled Cancel Window Minutes
                </Label>
                <Input
                  id="cfg-scheduled-window"
                  type="number"
                  min="0"
                  step="1"
                  value={scheduledCancelWindowMinutes}
                  onChange={(e) =>
                    setScheduledCancelWindowMinutes(e.target.value)
                  }
                  data-testid="input-scheduled-cancel-window-minutes"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="cfg-active"
                checked={isActive}
                onCheckedChange={setIsActive}
                data-testid="switch-is-active"
              />
              <Label htmlFor="cfg-active">Active</Label>
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="button-save-cancellation-fee-config"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
