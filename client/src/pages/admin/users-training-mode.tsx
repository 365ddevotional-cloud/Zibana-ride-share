import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, GraduationCap, CreditCard, TestTube, Plus } from "lucide-react";

export default function UsersTrainingModePage() {
  const { toast } = useToast();
  const [trainingUserId, setTrainingUserId] = useState("");

  const { data: drivers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/drivers"],
  });

  const trainingDrivers = useMemo(() => {
    return drivers.filter((d: any) => d.is_training === true || d.isTraining === true);
  }, [drivers]);

  const totalCreditsUsed = useMemo(() => {
    return trainingDrivers.reduce((sum: number, d: any) => {
      return sum + (d.trainingCredits || d.training_credits || 0);
    }, 0);
  }, [trainingDrivers]);

  const assignTrainingMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/driver/${userId}/training`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "Training mode assigned successfully" });
      setTrainingUserId("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign training", description: error.message, variant: "destructive" });
    },
  });

  const metrics = [
    { label: "Total Drivers", value: drivers.length, icon: Users, accent: "text-blue-600 dark:text-blue-400" },
    { label: "In Training", value: trainingDrivers.length, icon: GraduationCap, accent: "text-green-600 dark:text-green-400" },
    { label: "Training Credits Used", value: totalCreditsUsed, icon: CreditCard, accent: "text-purple-600 dark:text-purple-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="training-metrics-row">
        {metrics.map((m) => (
          <Card key={m.label} className="rounded-xl border-slate-200 dark:border-slate-700" data-testid={`metric-${m.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className={`h-4 w-4 shrink-0 ${m.accent}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.label}</span>
              </div>
              {isLoading ? (
                <p className="text-lg font-semibold text-slate-400">--</p>
              ) : (
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100" data-testid={`value-${m.label.toLowerCase().replace(/\s+/g, "-")}`}>{m.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="card-assign-training">
        <CardHeader className="gap-2">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-600 dark:text-green-400" />
            <CardTitle className="text-base">Assign Training</CardTitle>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enable training mode for a driver by entering their user ID.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px] space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Driver User ID</label>
              <Input
                placeholder="Enter driver user ID..."
                value={trainingUserId}
                onChange={(e) => setTrainingUserId(e.target.value)}
                data-testid="input-training-user-id"
              />
            </div>
            <Button
              onClick={() => assignTrainingMutation.mutate(trainingUserId)}
              disabled={!trainingUserId.trim() || assignTrainingMutation.isPending}
              data-testid="button-assign-training"
            >
              {assignTrainingMutation.isPending ? "Assigning..." : "Assign Training"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="card-training-drivers">
        <CardHeader className="pb-3 gap-2">
          <div className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <CardTitle className="text-base">Training Mode Drivers</CardTitle>
            <Badge variant="secondary">{trainingDrivers.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400" data-testid="loading-training">
              Loading driver data...
            </div>
          ) : trainingDrivers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400" data-testid="empty-training">
              No drivers currently in training mode. Use the form above to assign training.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-training-drivers">
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Training Started</TableHead>
                    <TableHead>Training Credits</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainingDrivers.map((driver: any, index: number) => (
                    <TableRow key={driver.id || index} data-testid={`row-training-driver-${driver.id || index}`}>
                      <TableCell>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {driver.fullName || driver.full_name || "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {driver.status || "training"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {driver.trainingStarted || driver.training_started
                            ? new Date(driver.trainingStarted || driver.training_started).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {driver.trainingCredits || driver.training_credits || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-view-training-${driver.id || index}`}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
