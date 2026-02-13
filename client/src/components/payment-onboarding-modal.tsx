import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Banknote, CreditCard, ChevronRight, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function PaymentOnboardingModal() {
  const [step, setStep] = useState<"intro" | "cash" | "card">("intro");
  const [dismissed, setDismissed] = useState(false);
  const gotItRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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
    setDismissed(true);
    markSeenMutation.mutate();
  }, [markSeenMutation]);

  const handleDetailGotIt = useCallback(() => {
    setStep("intro");
  }, []);

  useEffect(() => {
    if (!gotItRef.current) return;
    const btn = gotItRef.current;
    const handler = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleDismiss();
    };
    btn.addEventListener("touchstart", handler, { passive: false });
    return () => btn.removeEventListener("touchstart", handler);
  }, [handleDismiss, step]);

  useEffect(() => {
    if (!closeRef.current) return;
    const btn = closeRef.current;
    const handler = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleDismiss();
    };
    btn.addEventListener("touchstart", handler, { passive: false });
    return () => btn.removeEventListener("touchstart", handler);
  }, [handleDismiss]);

  if (dismissed || isLoading || !onboardingStatus || onboardingStatus.seen) return null;

  const modalContent = (
    <div
      id="payment-onboarding-root"
      data-testid="overlay-payment-onboarding"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        isolation: "isolate",
      }}
    >
      <div
        data-testid="backdrop-payment-onboarding"
        onClick={handleDismiss}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          zIndex: 0,
          cursor: "pointer",
        }}
      />

      <div
        data-testid="dialog-payment-onboarding"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "24rem",
          padding: "1.5rem",
          borderRadius: "0.5rem",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
        className="border bg-background"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={handleDismiss}
          data-testid="button-close-payment-modal"
          style={{
            position: "absolute",
            right: "1rem",
            top: "1rem",
            zIndex: 2,
            background: "none",
            border: "none",
            padding: "8px",
            margin: "-4px",
            cursor: "pointer",
            opacity: 0.7,
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {step === "intro" && (
          <>
            <div style={{ textAlign: "center" }}>
              <h2 className="text-xl font-semibold leading-none tracking-tight">How payments work on ZIBANA</h2>
              <p className="text-base text-muted-foreground" style={{ paddingTop: "0.5rem" }}>
                You can pay for trips using a card in the app or by paying the driver in cash.
                Choose the option that works best for you.
              </p>
            </div>
            <div style={{ paddingTop: "0.75rem", paddingBottom: "0.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setStep("cash")}
                data-testid="button-learn-cash"
                className="rounded-md border border-transparent hover:border-border"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  textAlign: "left",
                  background: "none",
                  cursor: "pointer",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <Banknote className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div style={{ flex: 1 }}>
                  <p className="font-medium">Paying with cash</p>
                  <p className="text-sm text-muted-foreground">Learn more</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => setStep("card")}
                data-testid="button-learn-card"
                className="rounded-md border border-transparent hover:border-border"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  textAlign: "left",
                  background: "none",
                  cursor: "pointer",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div style={{ flex: 1 }}>
                  <p className="font-medium">Paying with card</p>
                  <p className="text-sm text-muted-foreground">Learn more</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div style={{ paddingTop: "0.5rem" }}>
              <button
                ref={gotItRef}
                type="button"
                onClick={handleDismiss}
                data-testid="button-got-it"
                className="bg-primary text-primary-foreground border border-primary-border rounded-md"
                style={{
                  width: "100%",
                  minHeight: "2.25rem",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                  WebkitAppearance: "none",
                  appearance: "none",
                }}
              >
                Got it
              </button>
            </div>
          </>
        )}

        {step === "cash" && (
          <>
            <div style={{ textAlign: "center" }}>
              <h2 className="text-xl font-semibold leading-none tracking-tight">Paying with cash</h2>
              <p className="text-base text-muted-foreground" style={{ paddingTop: "0.5rem" }}>
                When you choose cash, you'll pay the driver directly at the end of the trip.
                Please have the correct amount ready.
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", padding: "1rem 0" }}>
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Banknote className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", paddingTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setStep("intro")}
                data-testid="button-back"
                className="border rounded-md"
                style={{
                  minHeight: "2.25rem",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  background: "none",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleDetailGotIt}
                data-testid="button-got-it-cash"
                className="bg-primary text-primary-foreground border border-primary-border rounded-md"
                style={{
                  flex: 1,
                  minHeight: "2.25rem",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                  WebkitAppearance: "none",
                  appearance: "none",
                }}
              >
                Got it
              </button>
            </div>
          </>
        )}

        {step === "card" && (
          <>
            <div style={{ textAlign: "center" }}>
              <h2 className="text-xl font-semibold leading-none tracking-tight">Paying with card</h2>
              <p className="text-base text-muted-foreground" style={{ paddingTop: "0.5rem" }}>
                When you choose card, payment is handled securely in the app.
                You don't need to exchange cash.
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", padding: "1rem 0" }}>
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", paddingTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setStep("intro")}
                data-testid="button-back-card"
                className="border rounded-md"
                style={{
                  minHeight: "2.25rem",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  background: "none",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleDetailGotIt}
                data-testid="button-got-it-card"
                className="bg-primary text-primary-foreground border border-primary-border rounded-md"
                style={{
                  flex: 1,
                  minHeight: "2.25rem",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                  WebkitAppearance: "none",
                  appearance: "none",
                }}
              >
                Got it
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
