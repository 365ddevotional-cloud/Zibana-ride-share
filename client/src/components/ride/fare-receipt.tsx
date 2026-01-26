import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Receipt, MapPin, Clock, Navigation, DollarSign } from "lucide-react";

interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  waitingFee: number;
  trafficFee: number;
  totalFare: number;
  driverEarning: number;
  platformFee: number;
  currency: string;
}

interface FareReceiptProps {
  receiptId?: string;
  fareBreakdown: FareBreakdown;
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: number;
  durationMin: number;
  driverName?: string;
  completedAt?: Date;
  showDriverEarnings?: boolean;
}

export function FareReceipt({
  receiptId,
  fareBreakdown,
  pickupAddress,
  dropoffAddress,
  distanceKm,
  durationMin,
  driverName,
  completedAt,
  showDriverEarnings = false,
}: FareReceiptProps) {
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <Card data-testid="fare-receipt">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <span>Trip Receipt</span>
          </div>
          {receiptId && (
            <span className="text-xs font-mono text-muted-foreground">
              {receiptId}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="text-sm">{pickupAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Dropoff</p>
              <p className="text-sm">{dropoffAddress}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            <span>{distanceKm.toFixed(1)} km</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{Math.round(durationMin)} min</span>
          </div>
        </div>

        {(driverName || completedAt) && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              {driverName && (
                <span className="text-muted-foreground">Driver: {driverName}</span>
              )}
              {completedAt && (
                <span className="text-muted-foreground">{formatDate(completedAt)}</span>
              )}
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Base fare</span>
            <span>{formatCurrency(fareBreakdown.baseFare)}</span>
          </div>
          
          {fareBreakdown.distanceFare > 0 && (
            <div className="flex justify-between text-sm">
              <span>Distance ({distanceKm.toFixed(1)} km)</span>
              <span>{formatCurrency(fareBreakdown.distanceFare)}</span>
            </div>
          )}
          
          {fareBreakdown.timeFare > 0 && (
            <div className="flex justify-between text-sm">
              <span>Time ({Math.round(durationMin)} min)</span>
              <span>{formatCurrency(fareBreakdown.timeFare)}</span>
            </div>
          )}
          
          {fareBreakdown.waitingFee > 0 && (
            <div className="flex justify-between text-sm">
              <span>Waiting time</span>
              <span>{formatCurrency(fareBreakdown.waitingFee)}</span>
            </div>
          )}
          
          {fareBreakdown.trafficFee > 0 && (
            <div className="flex justify-between text-sm">
              <span>Traffic adjustment</span>
              <span>{formatCurrency(fareBreakdown.trafficFee)}</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between font-semibold">
          <span className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Total
          </span>
          <span className="text-lg" data-testid="text-total-fare">
            {formatCurrency(fareBreakdown.totalFare)}
          </span>
        </div>

        {showDriverEarnings && (
          <>
            <Separator />
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Platform fee (20%)</span>
                <span>-{formatCurrency(fareBreakdown.platformFee)}</span>
              </div>
              <div className="flex justify-between font-medium text-foreground">
                <span>Your earnings</span>
                <span className="text-green-600 dark:text-green-400" data-testid="text-driver-earnings">
                  {formatCurrency(fareBreakdown.driverEarning)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
