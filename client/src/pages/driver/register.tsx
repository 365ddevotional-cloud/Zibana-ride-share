import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Shield, Wallet, Clock, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FullPageLoading } from "@/components/loading-spinner";

export default function DriverRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [termsAccepted, setTermsAccepted] = useState(false);

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/driver/register", {});
      return response.json();
    },
    onSuccess: (data) => {
      apiRequest("POST", "/api/legal/acknowledge", {
        acknowledgementType: "DRIVER_REGISTRATION_TERMS",
        metadata: { formType: "driver_registration" },
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["/api/user/role"] });
      toast({
        title: "Welcome to ZIBA Driver!",
        description: "Your driver account has been created.",
      });
      setLocation("/driver/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register as driver",
        variant: "destructive",
      });
    },
  });

  if (registerMutation.isPending) {
    return <FullPageLoading text="Creating your driver account..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-emerald-800 text-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-4xl font-bold tracking-tight">ZIBA</span>
            <span className="text-lg font-medium opacity-80">Driver</span>
          </div>
          <h1 className="text-2xl font-bold mb-3">Become a ZIBA Driver</h1>
          <p className="text-emerald-100">
            Start earning money by driving with ZIBA. Join thousands of drivers across our network.
          </p>
        </div>

        <Card className="bg-white/10 border-white/20 mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg">Driver Benefits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Keep 80% of every fare</p>
                <p className="text-sm text-emerald-200">Industry-leading commission rates</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Flexible schedule</p>
                <p className="text-sm text-emerald-200">Drive when it suits you</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">24/7 support</p>
                <p className="text-sm text-emerald-200">We've got your back</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white text-foreground mb-8">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Car className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle>Create Driver Account</CardTitle>
            <CardDescription>
              By registering, you agree to our Terms of Service and Driver Agreement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Complete your profile after registration
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Add your vehicle details
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Start accepting ride requests
              </li>
            </ul>
            <div className="rounded-md border border-emerald-200 p-3 space-y-2 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-800" data-testid="card-terms-acceptance">
              <p className="text-xs text-muted-foreground leading-relaxed">
                By registering, you acknowledge that you are an independent contractor. ZIBA is a technology platform that connects riders with drivers. ZIBA does not employ drivers, control trip outcomes, or provide transportation services. All trips are undertaken at your own risk.
              </p>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms-acceptance"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  data-testid="checkbox-terms-acceptance"
                  className="border-emerald-400 data-[state=checked]:bg-emerald-600"
                />
                <label htmlFor="terms-acceptance" className="text-xs font-medium cursor-pointer leading-tight">
                  I accept the Terms of Service and Driver Agreement
                </label>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending || !termsAccepted}
              data-testid="button-register-driver"
            >
              {registerMutation.isPending ? "Creating Account..." : "Register as Driver"}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-emerald-200">
          <p>Already a rider? Your rider account is separate from your driver account.</p>
        </div>
      </div>
    </div>
  );
}
