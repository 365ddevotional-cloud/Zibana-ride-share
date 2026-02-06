import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Banknote, CheckCircle, AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface CashTripConfirmationProps {
  tripId: string;
  role: "rider" | "driver";
  fareAmount?: string;
  currencyCode?: string;
}

export function CashTripConfirmation({ tripId, role, fareAmount, currencyCode = "NGN" }: CashTripConfirmationProps) {
  const { toast } = useToast();
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);

  const endpoint = role === "rider"
    ? `/api/rider/trip/${tripId}/cash-status`
    : `/api/driver/trip/${tripId}/cash-status`;

  const { data: cashStatus, isLoading } = useQuery<{
    riderConfirmedCash: boolean;
    driverConfirmedCash: boolean;
    cashDisputeFlag: boolean;
    cashAccessRestricted?: boolean;
  }>({
    queryKey: [endpoint],
    refetchInterval: 5000,
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      const confirmEndpoint = role === "rider"
        ? `/api/rider/trip/${tripId}/confirm-cash`
        : `/api/driver/trip/${tripId}/confirm-cash`;
      return apiRequest("POST", confirmEndpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({
        title: role === "rider" ? "Payment confirmed" : "Cash received confirmed",
        description: role === "rider"
          ? "You've confirmed paying the driver."
          : "You've confirmed receiving the cash payment.",
      });
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const disputeMutation = useMutation({
    mutationFn: () => {
      const disputeEndpoint = role === "rider"
        ? `/api/rider/trip/${tripId}/dispute-cash`
        : `/api/driver/trip/${tripId}/dispute-cash`;
      return apiRequest("POST", disputeEndpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      setShowDisputeDialog(false);
      toast({
        title: "Dispute filed",
        description: "Our team will review this trip and get back to you.",
      });
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !cashStatus) return null;

  const myConfirmed = role === "rider" ? cashStatus.riderConfirmedCash : cashStatus.driverConfirmedCash;
  const otherConfirmed = role === "rider" ? cashStatus.driverConfirmedCash : cashStatus.riderConfirmedCash;
  const bothConfirmed = cashStatus.riderConfirmedCash && cashStatus.driverConfirmedCash;

  if (bothConfirmed) {
    return (
      <Card data-testid="card-cash-confirmed">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium">Cash payment confirmed</p>
              <p className="text-sm text-muted-foreground">
                Both parties have confirmed this cash payment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cashStatus.cashDisputeFlag) {
    return (
      <Card data-testid="card-cash-disputed">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-medium">Under review</p>
              <p className="text-sm text-muted-foreground">
                This trip is being reviewed by our team. We'll update you once resolved.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (myConfirmed && !otherConfirmed) {
    return (
      <Card data-testid="card-cash-waiting">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Waiting for confirmation</p>
              <p className="text-sm text-muted-foreground">
                {role === "rider"
                  ? "Waiting for the driver to confirm they received the cash."
                  : "Waiting for the rider to confirm they paid."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="card-cash-confirm-action">
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Banknote className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {role === "rider" ? "Confirm your payment" : "Confirm cash received"}
              </p>
              <p className="text-sm text-muted-foreground">
                {role === "rider"
                  ? "Tap below to confirm you've paid the driver."
                  : "Tap below to confirm you received the cash payment."}
              </p>
              {fareAmount && (
                <p className="text-lg font-semibold mt-1" data-testid="text-cash-amount">
                  {currencyCode} {parseFloat(fareAmount).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending}
            data-testid="button-confirm-cash"
          >
            {confirmMutation.isPending ? "Confirming..." : (
              role === "rider" ? "I've paid the driver" : "Cash received"
            )}
          </Button>

          {otherConfirmed && !myConfirmed && (
            <button
              className="w-full text-sm text-muted-foreground underline mt-2"
              onClick={() => setShowDisputeDialog(true)}
              data-testid="button-open-dispute"
            >
              {role === "rider" ? "I didn't pay for this trip" : "I didn't receive cash"}
            </button>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
            <DialogDescription>
              {role === "rider"
                ? "The driver has confirmed receiving cash, but you believe this is incorrect. Our team will review this."
                : "The rider has confirmed paying, but you did not receive the cash. Our team will review this."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDisputeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disputeMutation.mutate()}
              disabled={disputeMutation.isPending}
              data-testid="button-confirm-dispute"
            >
              {disputeMutation.isPending ? "Submitting..." : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
