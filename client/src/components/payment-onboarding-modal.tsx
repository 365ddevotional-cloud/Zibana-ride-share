import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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

  const handleDismiss = useCallback(() => {
    markSeenMutation.mutate();
  }, [markSeenMutation]);

  const handleDetailGotIt = useCallback(() => {
    setStep("intro");
  }, []);

  if (isLoading || !onboardingStatus || onboardingStatus.seen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: "auto",
      }}
      data-testid="overlay-payment-onboarding"
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          pointerEvents: "auto",
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
        onClick={handleDismiss}
        onTouchEnd={(e) => { e.preventDefault(); handleDismiss(); }}
        data-testid="backdrop-payment-onboarding"
      />

      <div
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 100000,
          width: "calc(100% - 2rem)",
          maxWidth: "24rem",
          pointerEvents: "auto",
        }}
        className="border bg-background p-6 shadow-lg rounded-lg"
        onClick={(e) => e.stopPropagation()}
        data-testid="dialog-payment-onboarding"
      >
        <button
          type="button"
          onClick={handleDismiss}
          onTouchEnd={(e) => { e.preventDefault(); handleDismiss(); }}
          style={{
            position: "absolute",
            right: "1rem",
            top: "1rem",
            zIndex: 100001,
            pointerEvents: "auto",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            background: "none",
            border: "none",
            padding: "0.25rem",
            cursor: "pointer",
            opacity: 0.7,
          }}
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
                style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
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
                style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
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
              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium min-h-9 px-4 py-2 bg-primary text-primary-foreground border border-primary-border cursor-pointer"
                onClick={handleDismiss}
                onTouchEnd={(e) => { e.preventDefault(); handleDismiss(); }}
                style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent", position: "relative", zIndex: 10 }}
                data-testid="button-got-it"
              >
                Got it
              </button>
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
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium min-h-9 px-4 py-2 border shadow-xs cursor-pointer"
                onClick={() => setStep("intro")}
                onTouchEnd={(e) => { e.preventDefault(); setStep("intro"); }}
                style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                data-testid="button-back"
              >
                Back
              </button>
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium min-h-9 px-4 py-2 bg-primary text-primary-foreground border border-primary-border cursor-pointer"
                onClick={handleDetailGotIt}
                onTouchEnd={(e) => { e.preventDefault(); handleDetailGotIt(); }}
                style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent", position: "relative", zIndex: 10 }}
                data-testid="button-got-it-cash"
              >
                Got it
              </button>
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
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium min-h-9 px-4 py-2 border shadow-xs cursor-pointer"
                onClick={() => setStep("intro")}
                onTouchEnd={(e) => { e.preventDefault(); setStep("intro"); }}
                style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                data-testid="button-back-card"
              >
                Back
              </button>
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium min-h-9 px-4 py-2 bg-primary text-primary-foreground border border-primary-border cursor-pointer"
                onClick={handleDetailGotIt}
                onTouchEnd={(e) => { e.preventDefault(); handleDetailGotIt(); }}
                style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent", position: "relative", zIndex: 10 }}
                data-testid="button-got-it-card"
              >
                Got it
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
