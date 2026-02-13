import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  BookOpen,
  AlertTriangle,
  Users,
  Activity,
  FileText,
  Pause,
  Heart,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Car,
  User,
  Play,
  Zap,
  Ban,
  Flag,
  Loader2,
  Clock,
} from "lucide-react";

interface QaItem {
  id: number;
  category: string;
  itemKey: string;
  label: string;
  passed: boolean;
  testedBy: string | null;
  testedAt: string | null;
  notes: string | null;
}

interface SimLog {
  id: number;
  simulationType: string;
  status: string;
  details: string | null;
  simulatedBy: string | null;
  createdAt: string;
}

interface Playbook {
  id: string;
  title: string;
  steps: string[];
}

const playbooks: Playbook[] = [
  {
    id: "director-suspension",
    title: "Director Suspension Playbook",
    steps: [
      "Review flagged behavior",
      "Check audit logs",
      "Issue warning or suspend",
      "Document reason",
      "Notify director",
      "Monitor for appeal",
    ],
  },
  {
    id: "mass-driver-issue",
    title: "Mass Driver Issue Playbook",
    steps: [
      "Identify scope of issue",
      "Assess impact on riders",
      "Communicate with affected drivers",
      "Implement temporary measures",
      "Resolve root cause",
      "Post-incident review",
    ],
  },
  {
    id: "lost-item-abuse",
    title: "Lost-Item Abuse Playbook",
    steps: [
      "Review claim details",
      "Check fraud detection flags",
      "Cross-reference with trip data",
      "Interview parties if needed",
      "Make determination",
      "Update fraud profile",
    ],
  },
  {
    id: "incident-response",
    title: "Incident Response Playbook",
    steps: [
      "Assess severity level",
      "Activate response team",
      "Secure evidence and logs",
      "Communicate with affected parties",
      "Execute resolution",
      "Document and close",
    ],
  },
];

const simulationTypes = [
  { key: "test_ride", label: "Simulate Test Ride", icon: Car, description: "Simulates a complete ride flow without real financial movement" },
  { key: "test_payout", label: "Simulate Payout", icon: Zap, description: "Simulates a driver payout without real money transfer" },
  { key: "test_cancellation", label: "Simulate Cancellation", icon: Ban, description: "Simulates a ride cancellation with fee calculation" },
  { key: "test_fraud_flag", label: "Simulate Fraud Flag", icon: Flag, description: "Simulates a fraud detection flag trigger" },
];

export function OperationalReadinessPanel() {
  const [expandedPlaybooks, setExpandedPlaybooks] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: qaItems, isLoading: qaLoading } = useQuery<QaItem[]>({
    queryKey: ["/api/admin/qa-checklist"],
  });

  const { data: simLogs, isLoading: logsLoading } = useQuery<SimLog[]>({
    queryKey: ["/api/admin/qa-simulation-logs"],
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/qa-checklist/seed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/qa-checklist"] });
      toast({ title: "QA checklist seeded" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (data: { itemId: number; passed: boolean }) =>
      apiRequest("POST", "/api/admin/qa-checklist/toggle", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/qa-checklist"] });
    },
  });

  const simulateMutation = useMutation({
    mutationFn: (simulationType: string) =>
      apiRequest("POST", "/api/admin/qa-simulate", { simulationType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/qa-simulation-logs"] });
      toast({ title: "Simulation completed", description: "Tagged as TEST. No real financial movement." });
    },
  });

  const togglePlaybook = (id: string) => {
    setExpandedPlaybooks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const riderItems = (qaItems || []).filter((i) => i.category === "rider");
  const driverItems = (qaItems || []).filter((i) => i.category === "driver");
  const riderPassed = riderItems.filter((i) => i.passed).length;
  const driverPassed = driverItems.filter((i) => i.passed).length;

  return (
    <div className="space-y-8" data-testid="operational-readiness-panel">
      <Tabs defaultValue="qa-checklists">
        <TabsList data-testid="tabs-ops-readiness">
          <TabsTrigger value="qa-checklists" data-testid="tab-qa-checklists">QA Checklists</TabsTrigger>
          <TabsTrigger value="simulator" data-testid="tab-simulator">Trip Simulator</TabsTrigger>
          <TabsTrigger value="playbooks" data-testid="tab-playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="emergency" data-testid="tab-emergency">Emergency</TabsTrigger>
        </TabsList>

        <TabsContent value="qa-checklists" className="space-y-6 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground" data-testid="text-qa-title">QA Checklists</h2>
              <p className="text-sm text-muted-foreground">Verify all rider and driver flows before launch</p>
            </div>
            {(!qaItems || qaItems.length === 0) && !qaLoading && (
              <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} data-testid="button-seed-qa">
                {seedMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Initialize QA Checklist
              </Button>
            )}
          </div>

          {qaLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : qaItems && qaItems.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card data-testid="card-rider-qa">
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <CardTitle className="text-base">Rider QA Checklist</CardTitle>
                  </div>
                  <Badge variant={riderPassed === riderItems.length && riderItems.length > 0 ? "default" : "secondary"} data-testid="badge-rider-qa-progress">
                    {riderPassed}/{riderItems.length} passed
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {riderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-slate-100 dark:border-slate-800"
                      data-testid={`qa-item-${item.itemKey}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {item.passed ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <span className="text-sm truncate">{item.label}</span>
                      </div>
                      <Button
                        size="sm"
                        variant={item.passed ? "outline" : "default"}
                        onClick={() => toggleMutation.mutate({ itemId: item.id, passed: !item.passed })}
                        disabled={toggleMutation.isPending}
                        data-testid={`button-toggle-${item.itemKey}`}
                      >
                        {item.passed ? "Unmark" : "Pass"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card data-testid="card-driver-qa">
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <CardTitle className="text-base">Driver QA Checklist</CardTitle>
                  </div>
                  <Badge variant={driverPassed === driverItems.length && driverItems.length > 0 ? "default" : "secondary"} data-testid="badge-driver-qa-progress">
                    {driverPassed}/{driverItems.length} passed
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {driverItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-slate-100 dark:border-slate-800"
                      data-testid={`qa-item-${item.itemKey}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {item.passed ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <span className="text-sm truncate">{item.label}</span>
                      </div>
                      <Button
                        size="sm"
                        variant={item.passed ? "outline" : "default"}
                        onClick={() => toggleMutation.mutate({ itemId: item.id, passed: !item.passed })}
                        disabled={toggleMutation.isPending}
                        data-testid={`button-toggle-${item.itemKey}`}
                      >
                        {item.passed ? "Unmark" : "Pass"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No QA checklist items yet. Click "Initialize QA Checklist" to create them.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="simulator" className="space-y-6 mt-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground" data-testid="text-simulator-title">Trip Simulator</h2>
            <p className="text-sm text-muted-foreground">Run test scenarios without affecting real data. All simulations tagged as TEST.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {simulationTypes.map((sim) => {
              const Icon = sim.icon;
              return (
                <Card key={sim.key} data-testid={`card-sim-${sim.key}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{sim.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{sim.description}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={() => simulateMutation.mutate(sim.key)}
                          disabled={simulateMutation.isPending}
                          data-testid={`button-sim-${sim.key}`}
                        >
                          {simulateMutation.isPending ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Run Simulation
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3" data-testid="text-sim-logs-title">Simulation Logs</h3>
            {logsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : simLogs && simLogs.length > 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {simLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`sim-log-${log.id}`}>
                        <Badge variant="secondary" className="shrink-0 text-xs">{log.simulationType.replace("test_", "")}</Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">{log.details}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                            </span>
                            <Badge variant="outline" className="text-xs">TEST</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No simulation logs yet. Run a simulation to see results here.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="playbooks" className="space-y-6 mt-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2" data-testid="text-playbooks-title">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              Playbooks
            </h2>
            <p className="text-sm text-muted-foreground">Standard operating procedures for critical scenarios</p>
          </div>
          <div className="space-y-3">
            {playbooks.map((playbook) => {
              const expanded = expandedPlaybooks.has(playbook.id);
              return (
                <Card key={playbook.id} data-testid={`card-playbook-${playbook.id}`}>
                  <CardHeader
                    className="cursor-pointer select-none flex flex-row items-center justify-between gap-4 flex-wrap"
                    onClick={() => togglePlaybook(playbook.id)}
                    data-testid={`button-toggle-playbook-${playbook.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{playbook.title}</CardTitle>
                      <Badge variant="secondary" data-testid={`badge-playbook-steps-${playbook.id}`}>
                        {playbook.steps.length} steps
                      </Badge>
                    </div>
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardHeader>
                  {expanded && (
                    <CardContent data-testid={`content-playbook-${playbook.id}`}>
                      <ol className="list-decimal list-inside space-y-2">
                        {playbook.steps.map((step, index) => (
                          <li key={index} className="text-sm text-muted-foreground" data-testid={`text-playbook-step-${playbook.id}-${index}`}>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-6 mt-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2" data-testid="text-emergency-controls-title">
              <Shield className="h-5 w-5 text-muted-foreground" />
              Emergency Controls
            </h2>
            <p className="text-sm text-muted-foreground">Critical actions for operational emergencies</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-total-directors">
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Directors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-directors-count">0</div>
                <p className="text-xs text-muted-foreground">Registered directors</p>
              </CardContent>
            </Card>
            <Card data-testid="card-active-directors">
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-directors-count">0</div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </CardContent>
            </Card>
            <Card data-testid="card-suspended-directors">
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suspended</CardTitle>
                <Pause className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-suspended-directors-count">0</div>
                <p className="text-xs text-muted-foreground">Under suspension</p>
              </CardContent>
            </Card>
            <Card data-testid="card-terminated-directors">
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Terminated</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-terminated-directors-count">0</div>
                <p className="text-xs text-muted-foreground">Contract ended</p>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-emergency-controls">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button variant="destructive" data-testid="button-emergency-director-suspend">
                  <Pause className="mr-1.5 h-4 w-4" />
                  Emergency Director Suspend
                </Button>
                <Button variant="default" data-testid="button-system-health-check">
                  <Heart className="mr-1.5 h-4 w-4" />
                  System Health Check
                </Button>
                <Button variant="outline" data-testid="button-view-appeal-queue">
                  <FileText className="mr-1.5 h-4 w-4" />
                  View Appeal Queue
                </Button>
                <Button variant="outline" data-testid="button-zibana-support-logs">
                  <FileText className="mr-1.5 h-4 w-4" />
                  ZIBANA Support Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}