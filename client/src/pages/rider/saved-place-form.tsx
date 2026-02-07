import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Home, Briefcase, Save } from "lucide-react";

interface SavedPlace {
  id: string;
  riderId: string;
  type: string;
  address: string;
  notes: string | null;
  lat: string | null;
  lng: string | null;
}

export default function SavedPlaceForm() {
  const [, setLocation] = useLocation();
  const params = useParams<{ type: string }>();
  const placeType = params.type || "home";
  const { toast } = useToast();

  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const { data: savedPlaces } = useQuery<SavedPlace[]>({
    queryKey: ["/api/rider/saved-places"],
  });

  const existing = savedPlaces?.find((p) => p.type === placeType);

  useEffect(() => {
    if (existing) {
      setAddress(existing.address || "");
      setNotes(existing.notes || "");
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/rider/saved-places/${placeType}`, {
        address,
        notes: notes || null,
      });
    },
    onSuccess: () => {
      toast({ title: `${placeType === "home" ? "Home" : "Work"} address saved` });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/saved-places"] });
      setLocation("/rider/home");
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to save address", variant: "destructive" });
    },
  });

  const isHome = placeType === "home";
  const TypeIcon = isHome ? Home : Briefcase;
  const label = isHome ? "Home" : "Work";

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/rider/home")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              {existing ? `Edit ${label} Address` : `Add ${label} Address`}
            </h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="text-card-title">
                <TypeIcon className="h-5 w-5" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type" data-testid="label-type">Type</Label>
                <Input
                  id="type"
                  value={label}
                  readOnly
                  className="bg-muted"
                  data-testid="input-type"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" data-testid="label-address">Address</Label>
                <Input
                  id="address"
                  placeholder={`Enter your ${placeType} address`}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  data-testid="input-address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" data-testid="label-notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Gate code, landmark, floor number"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  data-testid="input-notes"
                />
              </div>

              <Button
                className="w-full"
                disabled={!address.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
