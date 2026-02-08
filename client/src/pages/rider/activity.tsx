import { useState } from "react";
import { useTranslation } from "@/i18n";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Car, XCircle, AlertTriangle, Clock, MapPin, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";
import { RideClassIcon, getRideClassLabel } from "@/components/ride-class-icon";

interface Trip {
  id: string;
  pickupLocation: string;
  dropoffLocation: string;
  status: string;
  fareAmount: string | null;
  currencyCode: string;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationFeeApplied: string | null;
  cancellationFeeDeducted: boolean;
  isReserved?: boolean;
  scheduledPickupAt?: string | null;
  reservationStatus?: string | null;
  paymentSource?: string | null;
  rideClass?: string | null;
}

const formatCurrency = (amount: string | null, currency: string) => {
  if (!amount) return "\u2014";
  const symbols: Record<string, string> = { NGN: "\u20A6", USD: "$", ZAR: "R" };
  return `${symbols[currency] || currency} ${parseFloat(amount).toLocaleString()}`;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function RiderActivity() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"history" | "cancelled" | "penalties">("history");

  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/rider/trip-history"],
  });

  const historyTrips = trips?.filter((t) => t.status === "completed") || [];
  const cancelledTrips = trips?.filter((t) => t.status === "cancelled") || [];
  const penaltyTrips = trips?.filter((t) => t.cancellationFeeApplied && t.cancellationFeeDeducted) || [];

  const renderTripCard = (trip: Trip, isPenalty: boolean = false) => (
    <Card key={trip.id} className="hover-elevate cursor-pointer" data-testid={`card-trip-${trip.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 flex-1 min-w-0">
            <RideClassIcon
              rideClass={trip.rideClass || "go"}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge variant="outline" className={getStatusColor(trip.status)} data-testid={`badge-status-${trip.id}`}>
                  {trip.status}
                </Badge>
                {trip.rideClass && trip.rideClass !== "go" && (
                  <Badge variant="secondary" className="text-xs" data-testid={`badge-class-${trip.id}`}>
                    {getRideClassLabel(trip.rideClass)}
                  </Badge>
                )}
                {!isPenalty && trip.status === "cancelled" && trip.cancellationFeeApplied && (
                  <Badge variant="destructive" data-testid={`badge-fee-applied-${trip.id}`}>
                    Fee Applied
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground" data-testid={`text-date-${trip.id}`}>
                  {formatDistanceToNow(new Date(trip.createdAt), { addSuffix: true })}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="font-medium truncate" data-testid={`text-pickup-${trip.id}`}>
                      {trip.pickupLocation}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">To</p>
                    <p className="font-medium truncate" data-testid={`text-dropoff-${trip.id}`}>
                      {trip.dropoffLocation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 ml-4">
            {isPenalty && trip.cancellationFeeApplied ? (
              <>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400" data-testid={`text-penalty-amount-${trip.id}`}>
                  {formatCurrency(trip.cancellationFeeApplied, trip.currencyCode)}
                </span>
                <span className="text-xs text-muted-foreground">Penalty deducted</span>
              </>
            ) : (
              <>
                <span className="font-bold" data-testid={`text-fare-${trip.id}`}>
                  {formatCurrency(trip.fareAmount, trip.currencyCode)}
                </span>
                {trip.paymentSource && (
                  <span className="text-xs text-muted-foreground" data-testid={`text-payment-${trip.id}`}>
                    {trip.paymentSource === "CASH" ? "Cash" : "Wallet"}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmptyState = (icon: React.ReactNode, title: string, subtitle: string) => (
    <Card>
      <CardContent className="p-6 text-center">
        <div className="flex justify-center mb-3">{icon}</div>
        <p className="font-medium text-foreground" data-testid={`text-empty-title-${title.toLowerCase().replace(/\s/g, "-")}`}>
          {title}
        </p>
        <p className="text-sm text-muted-foreground mt-1" data-testid={`text-empty-subtitle-${title.toLowerCase().replace(/\s/g, "-")}`}>
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );

  const renderLoadingSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-activity-title">
              {t("activity.title")}
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-activity-subtitle">
              Your ride history and account activity
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={activeTab === "history" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("history")}
              className="gap-2"
              data-testid="button-tab-history"
            >
              <Clock className="h-4 w-4" />
              History
            </Button>
            <Button
              variant={activeTab === "cancelled" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("cancelled")}
              className="gap-2"
              data-testid="button-tab-cancelled"
            >
              <XCircle className="h-4 w-4" />
              {t("activity.cancelled")}
            </Button>
            <Button
              variant={activeTab === "penalties" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("penalties")}
              className="gap-2"
              data-testid="button-tab-penalties"
            >
              <AlertTriangle className="h-4 w-4" />
              Penalties
            </Button>
          </div>

          {isLoading ? (
            renderLoadingSkeleton()
          ) : (
            <div className="space-y-3">
              {activeTab === "history" &&
                (historyTrips.length === 0 ? (
                  renderEmptyState(
                    <Car className="h-12 w-12 text-muted-foreground mx-auto" />,
                    "No completed rides yet",
                    "Your completed trips will appear here"
                  )
                ) : (
                  historyTrips.map((trip) => renderTripCard(trip))
                ))}

              {activeTab === "cancelled" &&
                (cancelledTrips.length === 0 ? (
                  renderEmptyState(
                    <XCircle className="h-12 w-12 text-muted-foreground mx-auto" />,
                    "No cancellations",
                    "Your cancelled rides will appear here"
                  )
                ) : (
                  cancelledTrips.map((trip) => renderTripCard(trip))
                ))}

              {activeTab === "penalties" &&
                (penaltyTrips.length === 0 ? (
                  renderEmptyState(
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />,
                    "No penalties applied",
                    "Penalties will appear here when applicable"
                  )
                ) : (
                  penaltyTrips.map((trip) => renderTripCard(trip, true))
                ))}
            </div>
          )}
        </div>
        <ZibraFloatingButton />
      </RiderLayout>
    </RiderRouteGuard>
  );
}
