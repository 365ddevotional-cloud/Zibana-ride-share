import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2, CheckCircle } from "lucide-react";

interface SystemStatus {
  enabled: boolean;
  codeLength: number;
  expiresMinutes: number;
}

interface ValidateResponse {
  valid: boolean;
  role: string;
  countryCode: string;
  city?: string;
  cashEnabled: boolean;
}

function getRoleDashboardPath(role: string): string {
  if (role === "driver") return "/driver";
  if (role === "admin" || role === "director" || role === "super_admin") return "/admin";
  return "/";
}

export default function SimulationEntryPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [activating, setActivating] = useState(false);
  const [, navigate] = useLocation();

  const { data: systemStatus, isLoading: statusLoading } = useQuery<SystemStatus>({
    queryKey: ["/api/simulation/system-status"],
  });

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const isLoggedIn = !!currentUser?.id;

  const validateMutation = useMutation({
    mutationFn: async (simulationCode: string) => {
      const res = await fetch("/api/simulation/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: simulationCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Invalid code");
      }
      return res.json() as Promise<ValidateResponse>;
    },
    onSuccess: async (data) => {
      setError(null);
      setValidated(true);

      if (isLoggedIn) {
        setActivating(true);
        try {
          const enterRes = await fetch("/api/simulation/enter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ code: code.trim() }),
          });

          if (enterRes.ok) {
            queryClient.invalidateQueries({ queryKey: ["/api/simulation/status"] });
            queryClient.invalidateQueries({ queryKey: ["/api/user/role"] });

            setTimeout(() => {
              const dashboardPath = getRoleDashboardPath(data.role);
              window.location.href = dashboardPath;
            }, 800);
          } else {
            const errData = await enterRes.json();
            setError(errData.message || "Failed to activate simulation");
            setValidated(false);
            setActivating(false);
          }
        } catch {
          setError("Failed to activate simulation. Please try again.");
          setValidated(false);
          setActivating(false);
        }
      } else {
        sessionStorage.setItem("ziba-sim-code", code.trim());
        sessionStorage.setItem("ziba-sim-role", data.role);

        setTimeout(() => {
          const loginRole = data.role === "admin" || data.role === "director" ? "admin" : data.role;
          window.location.href = `/api/login?role=${loginRole}`;
        }, 1200);
      }
    },
    onError: (err: Error) => {
      setError(err.message);
      setValidated(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Please enter a simulation code");
      return;
    }
    setError(null);
    validateMutation.mutate(trimmed);
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!systemStatus?.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Simulation mode is currently disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-sm w-full">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <CardTitle className="text-lg" data-testid="text-simulation-entry-title">
            Enter Simulation Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          {validated ? (
            <div className="text-center py-4" data-testid="text-simulation-validated">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium">Code verified</p>
              <p className="text-xs text-muted-foreground mt-1">
                {activating ? "Activating simulation..." : "Redirecting to login..."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={systemStatus?.codeLength || 6}
                  placeholder={`${systemStatus?.codeLength || 6}-digit code`}
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setCode(val);
                    if (error) setError(null);
                  }}
                  autoFocus
                  className="text-center text-lg tracking-widest font-mono"
                  data-testid="input-simulation-code"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center" data-testid="text-simulation-error">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={validateMutation.isPending || code.trim().length === 0}
                data-testid="button-start-simulation"
              >
                {validateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Start Simulation"
                )}
              </Button>
            </form>
          )}

          <div className="mt-4 pt-3 border-t text-center">
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Authorized access only
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
