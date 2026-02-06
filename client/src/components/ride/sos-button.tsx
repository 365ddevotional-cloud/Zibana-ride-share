import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Shield, AlertTriangle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SOSButtonProps {
  tripId: string;
  role: "rider" | "driver";
  riderId: string;
  driverId?: string;
}

export function SOSButton({ tripId, role, riderId, driverId }: SOSButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const { toast } = useToast();

  const sosMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/safety/sos", {
        tripId,
        triggeredByRole: role.toUpperCase(),
        isSilentMode,
        riderId,
        driverId,
      });
    },
    onSuccess: () => {
      setTriggered(true);
      queryClient.invalidateQueries({ queryKey: ["/api/safety"] });
      toast({
        title: "SOS Alert Sent",
        description: "Emergency services have been notified. Help is on the way.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "SOS Failed",
        description: error.message || "Failed to send SOS alert. Please call emergency services directly.",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Button
        variant="destructive"
        size="icon"
        className="w-14 h-14 rounded-full"
        onClick={() => setDialogOpen(true)}
        data-testid="button-sos"
      >
        <Shield className="h-6 w-6" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-sos">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Emergency SOS
            </DialogTitle>
            <DialogDescription>
              {triggered
                ? "Your SOS alert has been sent successfully."
                : "Are you sure you want to trigger SOS?"}
            </DialogDescription>
          </DialogHeader>

          {triggered ? (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                  <Shield className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Emergency alert has been sent. Stay calm and stay in a safe location.
                </p>
              </div>

              <a
                href="tel:911"
                className="block"
                data-testid="link-emergency-call"
              >
                <Button variant="destructive" className="w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  Call 911
                </Button>
              </a>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setDialogOpen(false);
                }}
                data-testid="button-sos-close"
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="silent-mode" data-testid="label-silent-mode">
                  Silent Mode
                </Label>
                <Switch
                  id="silent-mode"
                  checked={isSilentMode}
                  onCheckedChange={setIsSilentMode}
                  data-testid="switch-silent-mode"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Silent mode sends the alert without notifying the other party.
              </p>

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => sosMutation.mutate()}
                disabled={sosMutation.isPending}
                data-testid="button-sos-confirm"
              >
                {sosMutation.isPending ? "Sending SOS..." : "Confirm SOS"}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setDialogOpen(false)}
                data-testid="button-sos-cancel"
              >
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
