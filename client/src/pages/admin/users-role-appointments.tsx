import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserMinus, Shield } from "lucide-react";

const ROLES = [
  { value: "rider", label: "Rider" },
  { value: "driver", label: "Driver" },
  { value: "director", label: "Director" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
  { value: "support_agent", label: "Support Agent" },
  { value: "finance", label: "Finance" },
];

export default function UsersRoleAppointmentsPage() {
  const { toast } = useToast();
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState("");
  const [removeUserId, setRemoveUserId] = useState("");
  const [removeRole, setRemoveRole] = useState("");

  const assignMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest("POST", "/api/admin/assign-role", { userId, role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Role assigned successfully" });
      setAssignUserId("");
      setAssignRole("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign role", description: error.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest("POST", "/api/admin/remove-role", { userId, role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Role removed successfully" });
      setRemoveUserId("");
      setRemoveRole("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove role", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="card-assign-role">
          <CardHeader className="gap-2">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-600 dark:text-green-400" />
              <CardTitle className="text-base">Assign Role</CardTitle>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Grant a new role to a user by entering their user ID and selecting the role.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">User ID</label>
              <Input
                placeholder="Enter user ID..."
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                data-testid="input-assign-user-id"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
              <Select value={assignRole} onValueChange={setAssignRole}>
                <SelectTrigger data-testid="select-assign-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value} data-testid={`option-assign-${r.value}`}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => assignMutation.mutate({ userId: assignUserId, role: assignRole })}
              disabled={!assignUserId.trim() || !assignRole || assignMutation.isPending}
              className="w-full"
              data-testid="button-assign-role"
            >
              {assignMutation.isPending ? "Assigning..." : "Assign Role"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="card-remove-role">
          <CardHeader className="gap-2">
            <div className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-red-600 dark:text-red-400" />
              <CardTitle className="text-base">Remove Role</CardTitle>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Revoke a role from a user by entering their user ID and selecting the role to remove.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">User ID</label>
              <Input
                placeholder="Enter user ID..."
                value={removeUserId}
                onChange={(e) => setRemoveUserId(e.target.value)}
                data-testid="input-remove-user-id"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
              <Select value={removeRole} onValueChange={setRemoveRole}>
                <SelectTrigger data-testid="select-remove-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value} data-testid={`option-remove-${r.value}`}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="destructive"
              onClick={() => removeMutation.mutate({ userId: removeUserId, role: removeRole })}
              disabled={!removeUserId.trim() || !removeRole || removeMutation.isPending}
              className="w-full"
              data-testid="button-remove-role"
            >
              {removeMutation.isPending ? "Removing..." : "Remove Role"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="card-role-reference">
        <CardHeader className="gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <CardTitle className="text-base">Available Roles</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <Badge key={r.value} variant="secondary" data-testid={`badge-role-${r.value}`}>
                {r.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
