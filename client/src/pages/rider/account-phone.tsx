import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Phone } from "lucide-react";
import { useLocation } from "wouter";

interface RiderProfile {
  phone?: string;
  rating: number | null;
  totalTrips: number;
  savedLocations: { name: string; address: string }[];
}

export default function AccountPhone() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { data: profile, isLoading } = useQuery<RiderProfile>({
    queryKey: ["/api/rider/profile"],
    enabled: !!user,
  });

  if (profile && !initialized) {
    setPhone(profile.phone || "");
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async (newPhone: string) => {
      await apiRequest("PUT", "/api/rider/profile", { phone: newPhone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/profile"] });
      toast({ title: "Phone updated", description: "Your phone number has been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update phone", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const trimmed = phone.trim();
    if (!trimmed || trimmed.length < 7) {
      toast({ title: "Invalid phone number", description: "Please enter a valid phone number (at least 7 characters).", variant: "destructive" });
      return;
    }
    saveMutation.mutate(trimmed);
  };

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/rider/account")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Phone</h1>
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">Phone Number</p>
                  <p className="text-xs text-muted-foreground">Used for ride communication</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-input">Phone number</Label>
                <Input
                  id="phone-input"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  data-testid="input-phone"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSave}
                disabled={saveMutation.isPending || isLoading}
                data-testid="button-save-phone"
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
