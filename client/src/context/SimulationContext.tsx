import { createContext, useContext, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface SimulationStatusResponse {
  active: boolean;
  sessionId?: number;
  role?: string;
  countryCode?: string;
  config?: any;
  expiresAt?: string;
}

interface SimulationContextType {
  isSimulating: boolean;
  simulationRole: string | null;
  simulationCountry: string | null;
  simulationConfig: any;
  sessionId: number | null;
  exitSimulation: () => Promise<void>;
}

const SimulationContext = createContext<SimulationContextType>({
  isSimulating: false,
  simulationRole: null,
  simulationCountry: null,
  simulationConfig: null,
  sessionId: null,
  exitSimulation: async () => {},
});

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery<SimulationStatusResponse>({
    queryKey: ["/api/simulation/status"],
    refetchInterval: 30000,
    retry: false,
  });

  useEffect(() => {
    const pendingCode = sessionStorage.getItem("ziba-sim-code");
    if (pendingCode && data && !data.active) {
      sessionStorage.removeItem("ziba-sim-code");
      fetch("/api/simulation/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: pendingCode }),
      })
        .then((res) => {
          if (res.ok) {
            queryClient.invalidateQueries({ queryKey: ["/api/simulation/status"] });
          }
        })
        .catch(() => {});
    }
  }, [data]);

  const exitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/simulation/exit");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulation/status"] });
      window.location.href = "/";
    },
  });

  const exitSimulation = useCallback(async () => {
    await exitMutation.mutateAsync();
  }, [exitMutation]);

  const value: SimulationContextType = {
    isSimulating: data?.active ?? false,
    simulationRole: data?.role ?? null,
    simulationCountry: data?.countryCode ?? null,
    simulationConfig: data?.config ?? null,
    sessionId: data?.sessionId ?? null,
    exitSimulation,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationContextType {
  return useContext(SimulationContext);
}

export function SimulationBanner() {
  const { isSimulating, simulationRole, simulationCountry, exitSimulation } = useSimulation();

  if (!isSimulating) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-2 px-4 py-1.5 bg-amber-400 dark:bg-amber-600 text-black dark:text-white"
      data-testid="banner-simulation"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-semibold text-sm" data-testid="text-simulation-mode">SIMULATION MODE</span>
        {simulationRole && (
          <Badge variant="outline" className="text-xs" data-testid="badge-simulation-role">
            {simulationRole}
          </Badge>
        )}
        {simulationCountry && (
          <Badge variant="outline" className="text-xs" data-testid="badge-simulation-country">
            {simulationCountry}
          </Badge>
        )}
      </div>
      <Button
        size="sm"
        variant="destructive"
        onClick={exitSimulation}
        data-testid="button-exit-simulation"
      >
        Exit Simulation
      </Button>
    </div>
  );
}
