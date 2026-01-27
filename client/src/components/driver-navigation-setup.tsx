import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  NavigationProvider, 
  getNavigationProviderName, 
  getTestNavigationUrl,
  openNavigationWithProvider 
} from "@/lib/navigation";
import { 
  MapPin, 
  Navigation, 
  Check, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  CheckCircle2
} from "lucide-react";

interface SetupStatus {
  setupCompleted: boolean;
  locationPermissionStatus: string;
  navigationProvider: NavigationProvider | null;
  navigationVerified: boolean;
  missingFields: string[];
}

export function DriverNavigationSetup({ onComplete }: { onComplete?: () => void }) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<NavigationProvider | null>(null);
  const [testingNav, setTestingNav] = useState(false);

  const { data: setupStatus, refetch: refetchStatus } = useQuery<SetupStatus>({
    queryKey: ["/api/driver/setup-status"],
  });

  useEffect(() => {
    if (setupStatus) {
      if (setupStatus.locationPermissionStatus === "granted") {
        setCurrentStep(prev => Math.max(prev, 2));
      }
      if (setupStatus.navigationProvider) {
        setSelectedProvider(setupStatus.navigationProvider);
        setCurrentStep(prev => Math.max(prev, 3));
      }
      if (setupStatus.navigationVerified) {
        setCurrentStep(4);
      }
    }
  }, [setupStatus]);

  const updateLocationPermission = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PATCH", "/api/driver/setup/location-permission", { status });
      return response.json();
    },
    onSuccess: () => {
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/driver/profile"] });
      setCurrentStep(2);
      toast({ title: "Location permission granted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateNavigationProvider = useMutation({
    mutationFn: async (provider: NavigationProvider) => {
      const response = await apiRequest("PATCH", "/api/driver/setup/navigation-provider", { provider });
      return response.json();
    },
    onSuccess: () => {
      refetchStatus();
      setCurrentStep(3);
      toast({ title: "Navigation app selected" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const verifyNavigation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/driver/setup/verify-navigation", {});
      return response.json();
    },
    onSuccess: (data) => {
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/driver/profile"] });
      setCurrentStep(4);
      toast({ title: "Navigation verified!", description: "Setup complete. You can now go online." });
      if (data.setupCompleted && onComplete) {
        onComplete();
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const requestLocationPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      
      if (result.state === "granted") {
        updateLocationPermission.mutate("granted");
      } else if (result.state === "denied") {
        updateLocationPermission.mutate("denied");
        toast({ 
          title: "Location denied", 
          description: "Please enable location in your browser/device settings", 
          variant: "destructive" 
        });
      } else {
        navigator.geolocation.getCurrentPosition(
          () => updateLocationPermission.mutate("granted"),
          () => {
            updateLocationPermission.mutate("denied");
            toast({ 
              title: "Location required", 
              description: "Please allow location access to continue", 
              variant: "destructive" 
            });
          },
          { enableHighAccuracy: true }
        );
      }
    } catch (error) {
      navigator.geolocation.getCurrentPosition(
        () => updateLocationPermission.mutate("granted"),
        () => {
          toast({ 
            title: "Location required", 
            description: "Please allow location access to continue", 
            variant: "destructive" 
          });
        }
      );
    }
  };

  const handleProviderSelect = (provider: NavigationProvider) => {
    setSelectedProvider(provider);
    updateNavigationProvider.mutate(provider);
  };

  const handleTestNavigation = () => {
    if (!selectedProvider) return;
    setTestingNav(true);
    
    openNavigationWithProvider(selectedProvider, 6.5244, 3.3792, "Test Location");
    
    setTimeout(() => {
      setTestingNav(false);
    }, 3000);
  };

  const handleConfirmNavigation = () => {
    verifyNavigation.mutate();
  };

  const isStepComplete = (step: number) => {
    switch (step) {
      case 1:
        return setupStatus?.locationPermissionStatus === "granted";
      case 2:
        return !!setupStatus?.navigationProvider;
      case 3:
        return setupStatus?.navigationVerified === true;
      default:
        return false;
    }
  };

  const providers: { id: NavigationProvider; name: string; description: string }[] = [
    { id: "google_maps", name: "Google Maps", description: "Best for Android devices" },
    { id: "apple_maps", name: "Apple Maps", description: "Best for iPhone/iPad" },
    { id: "waze", name: "Waze", description: "Community-driven navigation" },
    { id: "other", name: "Default GPS", description: "Use device default" },
  ];

  if (setupStatus?.setupCompleted) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-300">Setup Complete</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Navigation: {setupStatus.navigationProvider ? getNavigationProviderName(setupStatus.navigationProvider) : "Default"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          GPS & Navigation Setup
        </CardTitle>
        <CardDescription>
          Complete these steps before you can go online and accept rides
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${currentStep === 1 ? "border-primary bg-primary/5" : isStepComplete(1) ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" : "border-muted"}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isStepComplete(1) ? "bg-green-600" : "bg-muted"}`}>
                {isStepComplete(1) ? <Check className="h-4 w-4 text-white" /> : <span className="text-sm font-medium">1</span>}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Location Permission</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Allow ZIBA to access your GPS for navigation and ride tracking
                </p>
                {!isStepComplete(1) && currentStep === 1 && (
                  <Button 
                    onClick={requestLocationPermission} 
                    className="mt-3"
                    disabled={updateLocationPermission.isPending}
                    data-testid="button-grant-location"
                  >
                    {updateLocationPermission.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Requesting...</>
                    ) : (
                      <><MapPin className="mr-2 h-4 w-4" /> Grant Location Access</>
                    )}
                  </Button>
                )}
                {isStepComplete(1) && (
                  <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
                    <Check className="mr-1 h-3 w-3" /> Granted
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${currentStep === 2 ? "border-primary bg-primary/5" : isStepComplete(2) ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" : "border-muted"}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isStepComplete(2) ? "bg-green-600" : "bg-muted"}`}>
                {isStepComplete(2) ? <Check className="h-4 w-4 text-white" /> : <span className="text-sm font-medium">2</span>}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Select Navigation App</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose your preferred navigation app for driving directions
                </p>
                {!isStepComplete(2) && currentStep >= 2 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {providers.map((provider) => (
                      <Button
                        key={provider.id}
                        variant={selectedProvider === provider.id ? "default" : "outline"}
                        className="justify-start h-auto py-2"
                        onClick={() => handleProviderSelect(provider.id)}
                        disabled={updateNavigationProvider.isPending || currentStep < 2}
                        data-testid={`button-select-${provider.id}`}
                      >
                        <div className="text-left">
                          <div className="font-medium">{provider.name}</div>
                          <div className="text-xs opacity-70">{provider.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
                {isStepComplete(2) && (
                  <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
                    <Check className="mr-1 h-3 w-3" /> {setupStatus?.navigationProvider ? getNavigationProviderName(setupStatus.navigationProvider) : "Selected"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${currentStep === 3 ? "border-primary bg-primary/5" : isStepComplete(3) ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" : "border-muted"}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isStepComplete(3) ? "bg-green-600" : "bg-muted"}`}>
                {isStepComplete(3) ? <Check className="h-4 w-4 text-white" /> : <span className="text-sm font-medium">3</span>}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Verify Navigation Works</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Test that your navigation app opens correctly
                </p>
                {!isStepComplete(3) && currentStep >= 3 && selectedProvider && (
                  <div className="mt-3 space-y-2">
                    <Button 
                      variant="outline" 
                      onClick={handleTestNavigation}
                      disabled={testingNav}
                      data-testid="button-test-navigation"
                    >
                      {testingNav ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening...</>
                      ) : (
                        <><ExternalLink className="mr-2 h-4 w-4" /> Open Test Navigation</>
                      )}
                    </Button>
                    <Button 
                      onClick={handleConfirmNavigation}
                      disabled={verifyNavigation.isPending}
                      data-testid="button-confirm-navigation"
                    >
                      {verifyNavigation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                      ) : (
                        <><Check className="mr-2 h-4 w-4" /> Confirm It Worked</>
                      )}
                    </Button>
                  </div>
                )}
                {isStepComplete(3) && (
                  <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
                    <Check className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {setupStatus && !setupStatus.setupCompleted && setupStatus.missingFields.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Setup Required</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Complete all steps above to go online and accept rides
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
