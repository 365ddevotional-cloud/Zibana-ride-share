import { useState, useEffect } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";
import {
  ArrowLeft, Route, Banknote, MapPin, AlertTriangle,
  Lock, Info, RotateCcw, Save, Layers,
} from "lucide-react";
import { RideClassIcon } from "@/components/ride-class-icon";
import type { RideClassDefinition } from "@shared/ride-classes";

interface DriverPreferences {
  tripDistancePreference: string[];
  cashAcceptance: boolean;
  preferredAreas: string[];
  acceptedRideClasses: string[];
  preferencesLocked: boolean;
  preferencesLockedBy: string | null;
  declineCount: number;
  preferenceWarnings: number;
  preferenceRestricted: boolean;
  preferenceRestrictedUntil: string | null;
}

const DISTANCE_OPTIONS = [
  { id: "short", label: "Short Trips", description: "Under 5 km", icon: "S" },
  { id: "medium", label: "Medium Trips", description: "5-15 km", icon: "M" },
  { id: "long", label: "Long Trips", description: "Over 15 km", icon: "L" },
];

export default function DriverPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [newArea, setNewArea] = useState("");
  const [localPrefs, setLocalPrefs] = useState<DriverPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: prefs, isLoading } = useQuery<DriverPreferences>({
    queryKey: ["/api/driver/preferences"],
    enabled: !!user,
  });

  const { data: rideClassPrefs } = useQuery<{
    acceptedClasses: string[];
    eligibleClasses: RideClassDefinition[];
  }>({
    queryKey: ["/api/driver/ride-class-preferences"],
    enabled: !!user,
  });

  useEffect(() => {
    if (prefs && !localPrefs) {
      setLocalPrefs({ ...prefs });
    }
  }, [prefs]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<DriverPreferences>) => {
      await apiRequest("PUT", "/api/driver/preferences", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/preferences"] });
      toast({ title: "Preferences saved successfully" });
      setHasChanges(false);
    },
    onError: (error: any) => {
      const msg = error?.message || "Failed to save preferences";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const toggleClassMutation = useMutation({
    mutationFn: async (newAccepted: string[]) => {
      await apiRequest("POST", "/api/driver/ride-class-preferences", { acceptedClasses: newAccepted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/ride-class-preferences"] });
      toast({ title: "Ride class preferences updated" });
    },
    onError: () => {
      toast({ title: "Failed to update ride class preferences", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!localPrefs) return;
    saveMutation.mutate({
      tripDistancePreference: localPrefs.tripDistancePreference,
      cashAcceptance: localPrefs.cashAcceptance,
      preferredAreas: localPrefs.preferredAreas,
    });
  };

  const handleRevert = () => {
    if (prefs) {
      setLocalPrefs({ ...prefs });
      setHasChanges(false);
      toast({ title: "Changes reverted" });
    }
  };

  const toggleDistance = (id: string) => {
    if (!localPrefs || localPrefs.preferencesLocked) return;
    const current = localPrefs.tripDistancePreference;
    if (current.includes(id) && current.length <= 1) {
      toast({ title: "You must accept at least one distance category", variant: "destructive" });
      return;
    }
    const updated = current.includes(id)
      ? current.filter(d => d !== id)
      : [...current, id];
    setLocalPrefs({ ...localPrefs, tripDistancePreference: updated });
    setHasChanges(true);
  };

  const addArea = () => {
    if (!localPrefs || !newArea.trim() || localPrefs.preferencesLocked) return;
    if (localPrefs.preferredAreas.length >= 5) {
      toast({ title: "Maximum 5 preferred areas allowed", variant: "destructive" });
      return;
    }
    if (localPrefs.preferredAreas.includes(newArea.trim())) {
      toast({ title: "Area already added", variant: "destructive" });
      return;
    }
    setLocalPrefs({
      ...localPrefs,
      preferredAreas: [...localPrefs.preferredAreas, newArea.trim()],
    });
    setNewArea("");
    setHasChanges(true);
  };

  const removeArea = (area: string) => {
    if (!localPrefs || localPrefs.preferencesLocked) return;
    setLocalPrefs({
      ...localPrefs,
      preferredAreas: localPrefs.preferredAreas.filter(a => a !== area),
    });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <DriverLayout>
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </DriverLayout>
    );
  }

  const isLocked = localPrefs?.preferencesLocked || false;
  const isRestricted = localPrefs?.preferenceRestricted || false;

  return (
    <DriverLayout>
      <div className="p-4 space-y-4 pb-24">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground"
          onClick={() => setLocation("/driver/account")}
          data-testid="button-back-account"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Account
        </button>

        <div>
          <h1 className="text-xl font-semibold" data-testid="text-preferences-title">Driver Preferences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preferences guide matching but do not guarantee trips.
          </p>
        </div>

        {isLocked && (
          <Card className="border-destructive/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Lock className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Preferences Locked</p>
                <p className="text-xs text-muted-foreground">
                  Your preferences have been locked by an administrator. Contact support if you need changes.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isRestricted && localPrefs?.preferenceRestrictedUntil && (
          <Card className="border-amber-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Temporarily Restricted</p>
                <p className="text-xs text-muted-foreground">
                  Preference changes restricted until {new Date(localPrefs.preferenceRestrictedUntil).toLocaleString()} due to excessive ride declines.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {(localPrefs?.declineCount || 0) >= 3 && (localPrefs?.declineCount || 0) < 5 && (
          <Card className="border-amber-500/20">
            <CardContent className="p-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-xs text-muted-foreground">
                You have declined {localPrefs?.declineCount} rides recently. Excessive declines may affect your matching priority.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="h-4 w-4" />
              Trip Distance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {DISTANCE_OPTIONS.map((opt) => {
              const isSelected = localPrefs?.tripDistancePreference?.includes(opt.id) ?? true;
              return (
                <div
                  key={opt.id}
                  className="flex items-center gap-3 p-3 rounded-md border"
                  data-testid={`pref-distance-${opt.id}`}
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                    {opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                  <Switch
                    checked={isSelected}
                    disabled={isLocked || isRestricted}
                    onCheckedChange={() => toggleDistance(opt.id)}
                    data-testid={`switch-distance-${opt.id}`}
                  />
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground pt-1">
              Select which trip distances you prefer. Distance ranges may be adjusted by your region administrator.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Payment Acceptance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-md border" data-testid="pref-cash">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Banknote className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Accept Cash Payments</p>
                <p className="text-xs text-muted-foreground">Toggle off to only accept wallet payments</p>
              </div>
              <Switch
                checked={localPrefs?.cashAcceptance ?? true}
                disabled={isLocked || isRestricted}
                onCheckedChange={(checked) => {
                  if (!localPrefs) return;
                  setLocalPrefs({ ...localPrefs, cashAcceptance: checked });
                  setHasChanges(true);
                }}
                data-testid="switch-cash-acceptance"
              />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md border opacity-70" data-testid="pref-wallet">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Banknote className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Wallet Payments</p>
                <p className="text-xs text-muted-foreground">Always accepted (cannot be disabled)</p>
              </div>
              <Switch checked={true} disabled={true} data-testid="switch-wallet" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Preferred Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Add up to 5 preferred areas. This increases your matching priority in those areas but does not block rides from other areas.
            </p>
            {localPrefs?.preferredAreas && localPrefs.preferredAreas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localPrefs.preferredAreas.map((area) => (
                  <Badge key={area} variant="secondary" className="gap-1" data-testid={`badge-area-${area}`}>
                    <MapPin className="h-3 w-3" />
                    {area}
                    {!isLocked && !isRestricted && (
                      <button
                        className="ml-1 text-muted-foreground"
                        onClick={() => removeArea(area)}
                        data-testid={`button-remove-area-${area}`}
                      >
                        x
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
            {!isLocked && !isRestricted && (localPrefs?.preferredAreas?.length || 0) < 5 && (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter area name (e.g., Victoria Island)"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addArea()}
                  className="flex-1"
                  data-testid="input-area"
                />
                <Button
                  variant="outline"
                  onClick={addArea}
                  disabled={!newArea.trim()}
                  data-testid="button-add-area"
                >
                  Add
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Ride Classes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rideClassPrefs && rideClassPrefs.eligibleClasses.length > 0 ? (
              <>
                {rideClassPrefs.eligibleClasses.map((rc) => {
                  const isAccepted = rideClassPrefs.acceptedClasses.includes(rc.id);
                  const isGoClass = rc.id === "go";
                  return (
                    <div
                      key={rc.id}
                      className="flex items-center gap-3 p-3 rounded-md border"
                      data-testid={`pref-class-${rc.id}`}
                    >
                      <RideClassIcon rideClass={rc.id} size="sm" color={rc.color} bgLight={rc.bgLight} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{rc.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{rc.description}</p>
                      </div>
                      <Switch
                        checked={isAccepted}
                        disabled={isGoClass || isLocked || isRestricted || toggleClassMutation.isPending}
                        onCheckedChange={(checked) => {
                          const newAccepted = checked
                            ? [...rideClassPrefs.acceptedClasses, rc.id]
                            : rideClassPrefs.acceptedClasses.filter(c => c !== rc.id);
                          toggleClassMutation.mutate(newAccepted);
                        }}
                        data-testid={`switch-class-${rc.id}`}
                      />
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground pt-1">
                  Only classes you are approved for are shown. Go is always enabled.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                You are currently eligible for ZIBA Go only. Improve your rating or upgrade your vehicle to unlock more classes.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-muted">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <Info className="h-3 w-3 inline mr-1 relative -top-px" />
              Preferences guide ride matching but do not guarantee specific trips or earnings. 
              Platform rules and safety requirements always take priority. 
              Overly restrictive settings may reduce the number of ride requests you receive.
            </p>
          </CardContent>
        </Card>

        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-50">
            <div className="max-w-lg mx-auto flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleRevert}
                data-testid="button-revert-prefs"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Revert
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save-prefs"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <ZibraFloatingButton />
    </DriverLayout>
  );
}
