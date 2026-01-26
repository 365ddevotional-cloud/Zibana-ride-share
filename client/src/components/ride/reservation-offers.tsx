import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, DollarSign, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ReservationOffer {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledPickupAt: string;
  totalFare: string;
  reservationPremium: string;
  passengerCount: number;
}

function getTimeUntil(dateString: string): { text: string; urgent: boolean } {
  const target = new Date(dateString);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 0) return { text: "Past", urgent: true };
  if (diffMins < 60) return { text: `${diffMins} min`, urgent: true };
  if (diffHours < 24) return { text: `${diffHours}h ${diffMins % 60}m`, urgent: false };
  return { text: `${Math.floor(diffHours / 24)}d ${diffHours % 24}h`, urgent: false };
}

export function ReservationOffers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: offers, isLoading } = useQuery<ReservationOffer[]>({
    queryKey: ["/api/reservations/offers"],
    refetchInterval: 30000,
  });

  const acceptOffer = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/reservations/${id}/accept`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reservation Accepted",
        description: "You have been assigned to this reservation",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/driver/upcoming"] });
    },
    onError: (error: any) => {
      toast({
        title: "Could Not Accept",
        description: error.message || "This reservation may have been taken by another driver",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/offers"] });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Available Reservations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Available Reservations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No reservation offers available at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Available Reservations ({offers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {offers.map((offer) => {
          const scheduledDate = new Date(offer.scheduledPickupAt);
          const timeUntil = getTimeUntil(offer.scheduledPickupAt);

          return (
            <div 
              key={offer.id} 
              className="p-4 border rounded-lg space-y-3 hover-elevate"
              data-testid={`card-reservation-offer-${offer.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <Badge variant={timeUntil.urgent ? "destructive" : "secondary"}>
                  {timeUntil.text}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{offer.pickupAddress || "Pickup location"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{offer.dropoffAddress || "Destination"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">${offer.totalFare}</span>
                  </div>
                  <Badge variant="outline" className="text-green-600">
                    +${offer.reservationPremium} premium
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => acceptOffer.mutate(offer.id)}
                  disabled={acceptOffer.isPending}
                  data-testid={`button-accept-offer-${offer.id}`}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept
                </Button>
              </div>

              {offer.passengerCount > 1 && (
                <p className="text-xs text-muted-foreground">
                  {offer.passengerCount} passengers
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
