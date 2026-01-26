import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, CheckCircle, Navigation } from "lucide-react";

interface EarlyStopModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (isEarlyStop: boolean) => void;
  isLoading?: boolean;
  originalDestination?: string;
  currentLocation?: string;
}

export function EarlyStopModal({
  open,
  onClose,
  onConfirm,
  isLoading = false,
  originalDestination = "Original destination",
  currentLocation = "Current location",
}: EarlyStopModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Confirm Destination
          </DialogTitle>
          <DialogDescription>
            Is this the final destination for this ride?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Navigation className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Original Destination</p>
                <p className="font-medium">{originalDestination}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Location</p>
                <p className="font-medium">{currentLocation}</p>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              If the rider has requested to stop before the original destination, 
              the fare will be recalculated based on the actual distance and time traveled.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            onClick={() => onConfirm(false)}
            disabled={isLoading}
            data-testid="button-confirm-original-destination"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Yes, This is the Final Destination
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onConfirm(true)}
            disabled={isLoading}
            data-testid="button-confirm-early-stop"
          >
            <MapPin className="h-4 w-4 mr-2" />
            No, Rider Stopped Early
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={onClose}
            disabled={isLoading}
            data-testid="button-cancel-destination-modal"
          >
            Cancel - Continue Trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
