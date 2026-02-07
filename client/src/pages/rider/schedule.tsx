import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Calendar, Clock, Wallet, Banknote, CheckCircle, ArrowLeft, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WalletInfo {
  mainBalance: string;
  testBalance: string;
  currencyCode: string;
  isTester: boolean;
  defaultPaymentMethod: string;
}

export default function ScheduleRide() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [confirmed, setConfirmed] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const { data: walletInfo } = useQuery<WalletInfo>({
    queryKey: ["/api/rider/wallet-info"],
  });

  const currency = walletInfo?.currencyCode || "NGN";
  const getCurrencySymbol = (c: string) => {
    const symbols: Record<string, string> = { NGN: "\u20A6", USD: "$", ZAR: "R" };
    return symbols[c] || c;
  };

  const scheduleMutation = useMutation({
    mutationFn: async (data: {
      pickupLocation: string;
      dropoffLocation: string;
      scheduledPickupAt: string;
      paymentSource: string;
    }) => {
      const res = await apiRequest("POST", "/api/trips/schedule", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/trip-history"] });
      setConfirmed(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Could not schedule ride",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const getMinDate = () => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  };

  const isInThePast = () => {
    if (!date || !time) return false;
    const selected = new Date(`${date}T${time}`);
    return selected <= new Date();
  };

  const pickupValid = pickup.trim().length > 0;
  const dropoffValid = dropoff.trim().length > 0;
  const dateValid = date.length > 0;
  const timeValid = time.length > 0;
  const notPast = !isInThePast();
  const canSubmit = pickupValid && dropoffValid && dateValid && timeValid && notPast;

  const handleSchedule = () => {
    setAttempted(true);
    if (!canSubmit) return;
    const scheduledPickupAt = new Date(`${date}T${time}`).toISOString();
    scheduleMutation.mutate({
      pickupLocation: pickup,
      dropoffLocation: dropoff,
      scheduledPickupAt,
      paymentSource: paymentMethod === "cash" ? "CASH" : "MAIN_WALLET",
    });
  };

  if (confirmed) {
    return (
      <RiderRouteGuard>
        <RiderLayout>
          <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold" data-testid="text-schedule-confirmed">Your ride has been scheduled</h1>
              <p className="text-muted-foreground">
                We'll match you with a driver closer to your pickup time.
              </p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{pickup} &rarr; {dropoff}</p>
              <p>{new Date(`${date}T${time}`).toLocaleString()}</p>
            </div>
            <Button
              onClick={() => setLocation("/rider/trips?tab=scheduled")}
              data-testid="button-view-scheduled"
            >
              View Scheduled Rides
            </Button>
          </div>
        </RiderLayout>
      </RiderRouteGuard>
    );
  }

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setLocation("/rider/home")}
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-schedule-title">Schedule a Ride</h1>
              <p className="text-sm text-muted-foreground">Book your trip in advance</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="pickup" className="text-sm font-medium">Pickup Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                  <Input
                    id="pickup"
                    placeholder="Enter pickup location"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    className={`pl-10 h-12 ${attempted && !pickupValid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    data-testid="input-schedule-pickup"
                  />
                </div>
                {attempted && !pickupValid && (
                  <p className="text-sm text-destructive flex items-center gap-1" data-testid="error-pickup">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Please enter a pickup location
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dropoff" className="text-sm font-medium">Drop-off Location</Label>
                <div className="relative">
                  <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="dropoff"
                    placeholder="Where are you going?"
                    value={dropoff}
                    onChange={(e) => setDropoff(e.target.value)}
                    className={`pl-10 h-12 ${attempted && !dropoffValid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    data-testid="input-schedule-dropoff"
                  />
                </div>
                {attempted && !dropoffValid && (
                  <p className="text-sm text-destructive flex items-center gap-1" data-testid="error-dropoff">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Please enter a drop-off location
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium">Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="date"
                      type="date"
                      min={getMinDate()}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={`pl-10 h-12 ${attempted && !dateValid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      data-testid="input-schedule-date"
                    />
                  </div>
                  {attempted && !dateValid && (
                    <p className="text-sm text-destructive flex items-center gap-1" data-testid="error-date">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Please select a date
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-sm font-medium">Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className={`pl-10 h-12 ${attempted && !timeValid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      data-testid="input-schedule-time"
                    />
                  </div>
                  {attempted && !timeValid && (
                    <p className="text-sm text-destructive flex items-center gap-1" data-testid="error-time">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Please select a time
                    </p>
                  )}
                </div>
              </div>

              {date && time && !notPast && (
                <p className="text-sm text-destructive flex items-center gap-1" data-testid="text-past-error">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  The selected date and time is in the past. Please pick a future time.
                </p>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-12" data-testid="select-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wallet">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        <span>Wallet ({getCurrencySymbol(currency)} {parseFloat(walletInfo?.mainBalance || "0").toLocaleString()})</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-emerald-600" />
                        <span>Cash</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground" data-testid="text-fare-note">
                  Fare will be confirmed closer to pickup time. You will be notified when a driver is assigned.
                </p>
              </div>

              <Button
                className="w-full h-12 text-base font-medium"
                onClick={handleSchedule}
                disabled={scheduleMutation.isPending}
                data-testid="button-confirm-schedule"
              >
                {scheduleMutation.isPending ? "Scheduling..." : "Schedule Ride"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
