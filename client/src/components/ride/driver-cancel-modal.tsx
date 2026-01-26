import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, XCircle, Car, Shield, Phone, Clock } from "lucide-react";

type DriverCancelReason = 
  | "rider_requested"
  | "safety_concern"
  | "vehicle_issue"
  | "emergency"
  | "rider_no_show"
  | "other";

interface DriverCancelModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: DriverCancelReason, details?: string) => void;
  isLoading?: boolean;
  rideStatus: string;
}

const CANCEL_REASONS: { value: DriverCancelReason; label: string; description: string; icon: typeof AlertTriangle }[] = [
  {
    value: "rider_requested",
    label: "Rider Requested Cancellation",
    description: "The rider asked you to cancel the ride",
    icon: Phone,
  },
  {
    value: "rider_no_show",
    label: "Rider No-Show",
    description: "Rider didn't appear after waiting period",
    icon: Clock,
  },
  {
    value: "safety_concern",
    label: "Safety Concern",
    description: "You feel unsafe continuing this ride",
    icon: Shield,
  },
  {
    value: "vehicle_issue",
    label: "Vehicle Issue",
    description: "Your vehicle has a mechanical problem",
    icon: Car,
  },
  {
    value: "emergency",
    label: "Personal Emergency",
    description: "You have a personal emergency",
    icon: AlertTriangle,
  },
  {
    value: "other",
    label: "Other Reason",
    description: "Another reason not listed above",
    icon: XCircle,
  },
];

export function DriverCancelModal({
  open,
  onClose,
  onConfirm,
  isLoading = false,
  rideStatus,
}: DriverCancelModalProps) {
  const [selectedReason, setSelectedReason] = useState<DriverCancelReason | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState("");

  const handleConfirm = () => {
    if (!selectedReason) return;
    onConfirm(selectedReason, additionalDetails || undefined);
  };

  const handleClose = () => {
    setSelectedReason(null);
    setAdditionalDetails("");
    onClose();
  };

  const isInProgress = rideStatus === "in_progress";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Cancel Ride
          </DialogTitle>
          <DialogDescription>
            {isInProgress
              ? "This ride is in progress. Please select a reason for cancellation."
              : "Please select a reason for cancelling this ride."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedReason || ""}
            onValueChange={(value) => setSelectedReason(value as DriverCancelReason)}
            className="space-y-3"
          >
            {CANCEL_REASONS.map((reason) => {
              const Icon = reason.icon;
              return (
                <div
                  key={reason.value}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedReason === reason.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedReason(reason.value)}
                >
                  <RadioGroupItem
                    value={reason.value}
                    id={reason.value}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={reason.value}
                      className="flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {reason.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {reason.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>

          {selectedReason === "other" && (
            <div className="mt-4">
              <Label htmlFor="details">Please provide details:</Label>
              <Textarea
                id="details"
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder="Explain why you need to cancel..."
                className="mt-2"
                rows={3}
              />
            </div>
          )}

          {isInProgress && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Cancelling an in-progress ride may affect your driver rating.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            data-testid="button-cancel-modal-close"
          >
            Go Back
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!selectedReason || isLoading}
            data-testid="button-confirm-cancellation"
          >
            {isLoading ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
