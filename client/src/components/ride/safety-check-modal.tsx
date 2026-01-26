import { useState } from "react";
import { AlertTriangle, Shield, Phone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SafetyCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSafe: () => void;
  onNeedHelp: () => void;
  role: "rider" | "driver";
}

export function SafetyCheckModal({ 
  open, 
  onOpenChange, 
  onSafe, 
  onNeedHelp,
  role 
}: SafetyCheckModalProps) {
  const [responded, setResponded] = useState(false);

  const handleSafe = () => {
    setResponded(true);
    onSafe();
    setTimeout(() => {
      onOpenChange(false);
      setResponded(false);
    }, 1500);
  };

  const handleNeedHelp = () => {
    onNeedHelp();
    onOpenChange(false);
  };

  const emergencyCall = () => {
    window.location.href = "tel:911";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="safety-check-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Safety Check
          </DialogTitle>
          <DialogDescription>
            We noticed the vehicle hasn't moved in a while. Is everything okay?
          </DialogDescription>
        </DialogHeader>

        {responded ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-center text-muted-foreground">
              Thank you for confirming. Stay safe!
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Button
              className="w-full h-14 text-lg"
              onClick={handleSafe}
              data-testid="button-im-safe"
            >
              <Shield className="h-5 w-5 mr-2" />
              I'm Safe
            </Button>

            <Button
              variant="destructive"
              className="w-full h-14 text-lg"
              onClick={handleNeedHelp}
              data-testid="button-need-help"
            >
              <AlertTriangle className="h-5 w-5 mr-2" />
              I Need Help
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Emergency
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={emergencyCall}
              data-testid="button-emergency-call"
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Emergency Services
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
