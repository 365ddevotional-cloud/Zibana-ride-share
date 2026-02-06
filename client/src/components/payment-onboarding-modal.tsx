import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Banknote, CreditCard, ChevronRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function PaymentOnboardingModal() {
  const [step, setStep] = useState<"intro" | "cash" | "card">("intro");

  const { data: onboardingStatus, isLoading } = useQuery<{
    seen: boolean;
    cashAccessRestricted: boolean;
  }>({
    queryKey: ["/api/rider/payment-onboarding"],
  });

  const markSeenMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/rider/payment-onboarding/seen"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/payment-onboarding"] });
    },
  });

  if (isLoading || !onboardingStatus || onboardingStatus.seen) return null;

  const handleDismiss = () => {
    markSeenMutation.mutate();
  };

  return (
    <Dialog open={!onboardingStatus.seen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="max-w-sm" data-testid="dialog-payment-onboarding">
        {step === "intro" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">How payments work on ZIBA</DialogTitle>
              <DialogDescription className="text-base pt-2">
                You can pay for trips using a card in the app or by paying the driver in cash.
                Choose the option that works best for you.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <button
                className="w-full flex items-center gap-3 p-3 rounded-md hover-elevate text-left"
                onClick={() => setStep("cash")}
                data-testid="button-learn-cash"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <Banknote className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Paying with cash</p>
                  <p className="text-sm text-muted-foreground">Learn more</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                className="w-full flex items-center gap-3 p-3 rounded-md hover-elevate text-left"
                onClick={() => setStep("card")}
                data-testid="button-learn-card"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Paying with card</p>
                  <p className="text-sm text-muted-foreground">Learn more</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={handleDismiss} data-testid="button-got-it">
                Got it
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "cash" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Paying with cash</DialogTitle>
              <DialogDescription className="text-base pt-2">
                When you choose cash, you'll pay the driver directly at the end of the trip.
                Please have the correct amount ready.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Banknote className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("intro")} data-testid="button-back">
                Back
              </Button>
              <Button onClick={handleDismiss} data-testid="button-got-it-cash">
                Got it
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "card" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Paying with card</DialogTitle>
              <DialogDescription className="text-base pt-2">
                When you choose card, payment is handled securely in the app.
                You don't need to exchange cash.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("intro")} data-testid="button-back-card">
                Back
              </Button>
              <Button onClick={handleDismiss} data-testid="button-got-it-card">
                Got it
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
