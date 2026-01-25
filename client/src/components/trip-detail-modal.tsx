import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, User, Car, Clock, DollarSign } from "lucide-react";

interface TripDetailModalProps {
  trip: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleString();
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case "in_progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    case "accepted":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    case "requested":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
  }
}

export function TripDetailModal({ trip, open, onOpenChange }: TripDetailModalProps) {
  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="modal-trip-detail">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Trip Details
            <Badge className={getStatusColor(trip.status)} data-testid="badge-trip-status">
              {trip.status?.replace("_", " ")}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Pickup</p>
                  <p className="font-medium" data-testid="text-pickup-location">{trip.pickupLocation}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Dropoff</p>
                  <p className="font-medium" data-testid="text-dropoff-location">{trip.dropoffLocation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Rider</p>
                  <p className="font-medium" data-testid="text-rider-name">{trip.riderName || "Unknown"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Car className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Driver</p>
                  <p className="font-medium" data-testid="text-driver-name">{trip.driverName || "Not assigned"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Passengers</p>
                  <p className="font-medium" data-testid="text-passenger-count">{trip.passengerCount || 1}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {(trip.fareAmount || trip.status === "completed") && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Total Fare</p>
                    <p className="font-medium text-lg" data-testid="text-fare-amount">
                      ${trip.fareAmount || "0.00"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pl-8">
                  <div>
                    <p className="text-sm text-muted-foreground">ZIBA Commission (20%)</p>
                    <p className="font-medium" data-testid="text-commission-amount">
                      ${trip.commissionAmount || "0.00"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Driver Earnings (80%)</p>
                    <p className="font-medium" data-testid="text-driver-payout">
                      ${trip.driverPayout || "0.00"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Requested</p>
                  <p className="font-medium" data-testid="text-created-at">{formatDate(trip.createdAt)}</p>
                </div>
              </div>
              {trip.acceptedAt && (
                <div className="flex items-center gap-3 pl-8">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Accepted</p>
                    <p className="font-medium" data-testid="text-accepted-at">{formatDate(trip.acceptedAt)}</p>
                  </div>
                </div>
              )}
              {trip.completedAt && (
                <div className="flex items-center gap-3 pl-8">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="font-medium" data-testid="text-completed-at">{formatDate(trip.completedAt)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground text-center pt-2">
            Trip ID: <span data-testid="text-trip-id">{trip.id}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
