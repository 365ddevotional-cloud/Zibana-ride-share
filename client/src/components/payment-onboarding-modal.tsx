import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Banknote, CreditCard, ChevronRight, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

  const handleDetailGotIt = () => {
    setStep("intro");
  };

  return (
    <div
      className="fixed inset-0 z-[9998]"
      style={{ pointerEvents: "auto" }}
      data-testid="overlay-payment-onboarding"
    >
      <div
        className="absolute inset-0 bg-black/80"
        onClick={handleDismiss}
        style={{ pointerEvents: "auto", touchAction: "manipulation" }}
        data-testid="backdrop-payment-onboarding"
      />

      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-sm border bg-background p-6 shadow-lg sm:rounded-lg"
        style={{ pointerEvents: "auto" }}
        data-testid="dialog-payment-onboarding"
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={handleDismiss}
          style={{ pointerEvents: "auto", touchAction: "manipulation", zIndex: 10 }}
          data-testid="button-close-payment-modal"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {step === "intro" && (
          <>
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h2 className="text-xl font-semibold leading-none tracking-tight">How payments work on ZIBA</h2>
              <p className="text-base text-muted-foreground pt-2">
                You can pay for trips using a card in the app or by paying the driver in cash.
                Choose the option that works best for you.
              </p>
            </div>
            <div className="space-y-3 py-2">
              <button
                type="button"
                className="w-full flex items-center gap-3 p-3 rounded-md text-left border border-transparent hover:border-border"
                onClick={() => setStep("cash")}
                style={{ pointerEvents: "auto", touchAction: "manipulation" }}
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
                type="button"
                className="w-full flex items-center gap-3 p-3 rounded-md text-left border border-transparent hover:border-border"
                onClick={() => setStep("card")}
                style={{ pointerEvents: "auto", touchAction: "manipulation" }}
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
            <div className="pt-2">
              <Button
                type="button"
                className="w-full"
                onClick={handleDismiss}
                style={{ pointerEvents: "auto", touchAction: "manipulation", position: "relative", zIndex: 10 }}
                data-testid="button-got-it"
              >
                Got it
              </Button>
            </div>
          </>
        )}

        {step === "cash" && (
          <>
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h2 className="text-xl font-semibold leading-none tracking-tight">Paying with cash</h2>
              <p className="text-base text-muted-foreground pt-2">
                When you choose cash, you'll pay the driver directly at the end of the trip.
                Please have the correct amount ready.
              </p>
            </div>
            <div className="flex justify-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Banknote className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("intro")}
                style={{ pointerEvents: "auto", touchAction: "manipulation" }}
                data-testid="button-back"
              >
                Back
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleDetailGotIt}
                style={{ pointerEvents: "auto", touchAction: "manipulation", position: "relative", zIndex: 10 }}
                data-testid="button-got-it-cash"
              >
                Got it
              </Button>
            </div>
          </>
        )}

        {step === "card" && (
          <>
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h2 className="text-xl font-semibold leading-none tracking-tight">Paying with card</h2>
              <p className="text-base text-muted-foreground pt-2">
                When you choose card, payment is handled securely in the app.
                You don't need to exchange cash.
              </p>
            </div>
            <div className="flex justify-center py-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("intro")}
                style={{ pointerEvents: "auto", touchAction: "manipulation" }}
                data-testid="button-back-card"
              >
                Back
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleDetailGotIt}
                style={{ pointerEvents: "auto", touchAction: "manipulation", position: "relative", zIndex: 10 }}
                data-testid="button-got-it-card"
              >
                Got it
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
