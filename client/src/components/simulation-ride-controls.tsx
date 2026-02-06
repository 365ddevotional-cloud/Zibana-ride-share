import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useSimulation } from "@/context/SimulationContext";
import {
  Play,
  Navigation,
  MapPin,
  Clock,
  CheckCircle,
  Car,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

interface SimulatedRide {
  id: string;
  pickupLocation: string;
  dropoffLocation: string;
  fareAmount: string;
  paymentSource: string;
  passengerCount?: number;
  riderName?: string;
  driverName?: string;
  estimatedDuration?: string;
  estimatedDistance?: string;
  estimatedArrival?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  licensePlate?: string;
  driverRating?: string;
  status?: string;
}

const STATE_LABELS: Record<string, string> = {
  accepted: "Ride Accepted",
  driver_en_route: "Heading to Pickup",
  arrived: "Arrived at Pickup",
  waiting: "Waiting for Rider",
  in_progress: "Trip in Progress",
  completed: "Trip Completed",
};

const STATE_ICONS: Record<string, typeof Play> = {
  accepted: CheckCircle,
  driver_en_route: Navigation,
  arrived: MapPin,
  waiting: Clock,
  in_progress: Car,
  completed: CheckCircle,
};

export function DriverSimulationControls() {
  const { isSimulating, simulationRole } = useSimulation();
  const { toast } = useToast();
  const [currentRide, setCurrentRide] = useState<SimulatedRide | null>(null);
  const [rideState, setRideState] = useState<string>("none");
  const [loading, setLoading] = useState(false);

  if (!isSimulating || simulationRole !== "driver") return null;

  const generateRide = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/simulation/generate-ride", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.rideRequest) {
        setCurrentRide(data.rideRequest);
        setRideState("accepted");
        toast({ title: "New ride request!", description: `Pickup: ${data.rideRequest.pickupLocation}` });
      }
    } catch {
      toast({ title: "Failed to generate ride", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const progressRide = async () => {
    if (!currentRide) return;
    setLoading(true);
    try {
      const res = await fetch("/api/simulation/progress-ride", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentState: rideState, rideId: currentRide.id }),
      });
      const data = await res.json();
      if (data.state) {
        setRideState(data.state);
        toast({ title: data.message });
        if (data.state === "completed") {
          setTimeout(() => {
            setCurrentRide(null);
            setRideState("none");
          }, 3000);
        }
      }
    } catch {
      toast({ title: "Failed to progress ride", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const StateIcon = rideState !== "none" ? STATE_ICONS[rideState] || Play : Play;

  return (
    <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20" data-testid="card-driver-simulation">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Play className="h-4 w-4 text-amber-600" />
          Simulation Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!currentRide ? (
          <Button
            onClick={generateRide}
            disabled={loading}
            className="w-full"
            data-testid="button-generate-ride"
          >
            {loading ? "Generating..." : "Generate Simulated Ride Request"}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StateIcon className="h-5 w-5 text-amber-600" />
              <span className="font-medium">{STATE_LABELS[rideState] || rideState}</span>
              <Badge variant="outline" className="text-xs">{currentRide.paymentSource}</Badge>
            </div>

            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Pickup:</span> {currentRide.pickupLocation}</p>
              <p><span className="text-muted-foreground">Dropoff:</span> {currentRide.dropoffLocation}</p>
              <p><span className="text-muted-foreground">Fare:</span> {currentRide.fareAmount}</p>
              {currentRide.estimatedDistance && (
                <p><span className="text-muted-foreground">Distance:</span> {currentRide.estimatedDistance}</p>
              )}
            </div>

            {rideState !== "completed" ? (
              <Button
                onClick={progressRide}
                disabled={loading}
                className="w-full"
                data-testid="button-progress-ride"
              >
                {loading ? "Processing..." : (
                  <span className="flex items-center gap-2">
                    Next Step <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => { setCurrentRide(null); setRideState("none"); }}
                variant="outline"
                className="w-full"
                data-testid="button-new-ride"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Generate Another Ride
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RiderSimulationControls() {
  const { isSimulating, simulationRole } = useSimulation();
  const { toast } = useToast();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [currentRide, setCurrentRide] = useState<SimulatedRide | null>(null);
  const [rideState, setRideState] = useState<string>("none");
  const [loading, setLoading] = useState(false);

  if (!isSimulating || simulationRole !== "rider") return null;

  const requestRide = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/simulation/rider-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pickup: pickup || undefined,
          dropoff: dropoff || undefined,
          paymentMethod: "CARD",
        }),
      });
      const data = await res.json();
      if (data.ride) {
        setCurrentRide(data.ride);
        setRideState("accepted");
        toast({ title: "Driver matched!", description: `${data.ride.driverName} is on the way.` });
      }
    } catch {
      toast({ title: "Failed to request ride", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const progressRide = async () => {
    if (!currentRide) return;
    setLoading(true);
    try {
      const res = await fetch("/api/simulation/progress-ride", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentState: rideState, rideId: currentRide.id }),
      });
      const data = await res.json();
      if (data.state) {
        setRideState(data.state);
        toast({ title: data.message });
        if (data.state === "completed") {
          setTimeout(() => {
            setCurrentRide(null);
            setRideState("none");
            setPickup("");
            setDropoff("");
          }, 3000);
        }
      }
    } catch {
      toast({ title: "Failed to progress ride", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const StateIcon = rideState !== "none" ? STATE_ICONS[rideState] || Play : Play;

  return (
    <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20" data-testid="card-rider-simulation">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Play className="h-4 w-4 text-amber-600" />
          Simulation Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!currentRide ? (
          <div className="space-y-3">
            <Input
              placeholder="Pickup location (optional)"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              data-testid="input-sim-pickup"
            />
            <Input
              placeholder="Dropoff location (optional)"
              value={dropoff}
              onChange={(e) => setDropoff(e.target.value)}
              data-testid="input-sim-dropoff"
            />
            <Button
              onClick={requestRide}
              disabled={loading}
              className="w-full"
              data-testid="button-sim-request-ride"
            >
              {loading ? "Finding driver..." : "Request Simulated Ride"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StateIcon className="h-5 w-5 text-amber-600" />
              <span className="font-medium">{STATE_LABELS[rideState] || rideState}</span>
            </div>

            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Driver:</span> {currentRide.driverName}</p>
              <p><span className="text-muted-foreground">Vehicle:</span> {currentRide.vehicleMake} {currentRide.vehicleModel}</p>
              <p><span className="text-muted-foreground">Plate:</span> {currentRide.licensePlate}</p>
              <p><span className="text-muted-foreground">Fare:</span> {currentRide.fareAmount}</p>
              {currentRide.estimatedArrival && rideState === "accepted" && (
                <p><span className="text-muted-foreground">ETA:</span> {currentRide.estimatedArrival}</p>
              )}
            </div>

            {rideState !== "completed" ? (
              <Button
                onClick={progressRide}
                disabled={loading}
                className="w-full"
                data-testid="button-sim-progress"
              >
                {loading ? "Processing..." : (
                  <span className="flex items-center gap-2">
                    Next Step <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => { setCurrentRide(null); setRideState("none"); setPickup(""); setDropoff(""); }}
                variant="outline"
                className="w-full"
                data-testid="button-sim-new-ride"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Request Another Ride
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
