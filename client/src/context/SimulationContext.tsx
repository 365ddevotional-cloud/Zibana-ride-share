import { createContext, useContext, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { API_BASE } from "@/lib/apiBase";

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
    if (data?.active && data.expiresAt) {
      const expiresAt = new Date(data.expiresAt).getTime();
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/simulation/status"] });
        return;
      }

      const timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/simulation/status"] });
      }, Math.min(remaining, 60000));

      return () => clearTimeout(timer);
    }
  }, [data?.active, data?.expiresAt]);

  const exitMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${API_BASE}/api/simulation/exit`, {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulation/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/role"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/simulation";
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
