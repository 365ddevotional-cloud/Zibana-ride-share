import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Lock, Unlock, RotateCcw, AlertTriangle, Filter } from "lucide-react";

export function AdminDriverPreferencesPanel() {
  const { toast } = useToast();
  const [confirmAction, setConfirmAction] = useState<{
    type: "lock" | "unlock" | "reset";
    userId: string;
    name: string;
  } | null>(null);

  const { data, isLoading } = useQuery<{ drivers: any[] }>({
    queryKey: ["/api/admin/driver-preferences"],
  });

  const lockMutation = useMutation({
    mutationFn: async ({ userId, lock }: { userId: string; lock: boolean }) => {
      await apiRequest("POST", `/api/admin/driver-preferences/${userId}/lock`, { lock });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/driver-preferences"] });
      toast({ title: confirmAction?.type === "lock" ? "Preferences locked" : "Preferences unlocked" });
      setConfirmAction(null);
    },
    onError: () => {
      toast({ title: "Failed to update preference lock", variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/admin/driver-preferences/${userId}/reset`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/driver-preferences"] });
      toast({ title: "Preferences reset to defaults" });
      setConfirmAction(null);
    },
    onError: () => {
      toast({ title: "Failed to reset preferences", variant: "destructive" });
    },
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "lock") {
      lockMutation.mutate({ userId: confirmAction.userId, lock: true });
    } else if (confirmAction.type === "unlock") {
      lockMutation.mutate({ userId: confirmAction.userId, lock: false });
    } else if (confirmAction.type === "reset") {
      resetMutation.mutate(confirmAction.userId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const drivers = data?.drivers || [];
  const warningDrivers = drivers.filter((d: any) => (d.preferenceWarnings || 0) > 0 || d.preferenceRestricted);
  const lockedDrivers = drivers.filter((d: any) => d.preferencesLockedBy);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-total-drivers">{drivers.length}</p>
            <p className="text-xs text-muted-foreground">Total Drivers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600" data-testid="text-warning-drivers">{warningDrivers.length}</p>
            <p className="text-xs text-muted-foreground">With Warnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive" data-testid="text-locked-drivers">{lockedDrivers.length}</p>
            <p className="text-xs text-muted-foreground">Locked</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            All Driver Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          {drivers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-admin-driver-prefs">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-2 font-medium">Driver</th>
                    <th className="pb-2 pr-2 font-medium">Rating</th>
                    <th className="pb-2 pr-2 font-medium">Classes</th>
                    <th className="pb-2 pr-2 font-medium">Distance</th>
                    <th className="pb-2 pr-2 font-medium">Cash</th>
                    <th className="pb-2 pr-2 font-medium">Declines</th>
                    <th className="pb-2 pr-2 font-medium">Warnings</th>
                    <th className="pb-2 pr-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((d: any, idx: number) => {
                    const classCount = (d.acceptedRideClasses || ["go"]).length;
                    const distPrefs = d.tripDistancePreference || ["short", "medium", "long"];
                    const isLocked = !!d.preferencesLockedBy;
                    return (
                      <tr key={d.userId || idx} className="border-b last:border-0" data-testid={`row-admin-pref-${idx}`}>
                        <td className="py-2 pr-2 font-medium">{d.fullName || "Unknown"}</td>
                        <td className="py-2 pr-2">{d.averageRating || "N/A"}</td>
                        <td className="py-2 pr-2">{classCount}/6</td>
                        <td className="py-2 pr-2">{distPrefs.join(", ")}</td>
                        <td className="py-2 pr-2">{d.cashAcceptance !== false ? "Yes" : "No"}</td>
                        <td className="py-2 pr-2">{d.declineCount || 0}</td>
                        <td className="py-2 pr-2">{d.preferenceWarnings || 0}</td>
                        <td className="py-2 pr-2">
                          {isLocked ? (
                            <Badge variant="destructive">Locked</Badge>
                          ) : d.preferenceRestricted ? (
                            <Badge variant="secondary">Restricted</Badge>
                          ) : (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            {isLocked ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmAction({ type: "unlock", userId: d.userId, name: d.fullName || "this driver" })}
                                data-testid={`button-unlock-${idx}`}
                              >
                                <Unlock className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmAction({ type: "lock", userId: d.userId, name: d.fullName || "this driver" })}
                                data-testid={`button-lock-${idx}`}
                              >
                                <Lock className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmAction({ type: "reset", userId: d.userId, name: d.fullName || "this driver" })}
                              data-testid={`button-reset-${idx}`}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No driver profiles found.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "lock" && "Lock Driver Preferences?"}
              {confirmAction?.type === "unlock" && "Unlock Driver Preferences?"}
              {confirmAction?.type === "reset" && "Reset Driver Preferences?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "lock" && `This will prevent ${confirmAction?.name} from changing their ride preferences. They will need to contact support to make changes.`}
              {confirmAction?.type === "unlock" && `This will allow ${confirmAction?.name} to change their ride preferences again.`}
              {confirmAction?.type === "reset" && `This will reset all preferences for ${confirmAction?.name} to default values (all ride classes, all distances, cash enabled, no preferred areas).`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-action">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={lockMutation.isPending || resetMutation.isPending}
              data-testid="button-confirm-action"
            >
              {lockMutation.isPending || resetMutation.isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
