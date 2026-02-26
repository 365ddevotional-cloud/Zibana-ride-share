import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Headphones, Search } from "lucide-react";
import { API_BASE } from "@/lib/apiBase";

const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "rider", label: "Rider" },
  { value: "driver", label: "Driver" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

interface SupportInteraction {
  id: string;
  userId: string | null;
  userRole: string;
  currentScreen: string | null;
  userMessage: string;
  supportResponse: string;
  createdAt: string;
}

export function SupportLogsPanel() {
  const [filterRole, setFilterRole] = useState("all");
  const [filterUserId, setFilterUserId] = useState("");
  const [searchUserId, setSearchUserId] = useState("");

  const queryParams = new URLSearchParams();
  if (filterRole !== "all") queryParams.set("role", filterRole);
  if (searchUserId) queryParams.set("userId", searchUserId);
  const queryString = queryParams.toString();

  const { data: logs, isLoading } = useQuery<SupportInteraction[]>({
    queryKey: ["/api/admin/support-interactions", filterRole, searchUserId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/support-interactions${queryString ? `?${queryString}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const handleSearch = () => {
    setSearchUserId(filterUserId.trim());
  };

  return (
    <Card data-testid="card-support-logs">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg" data-testid="text-support-logs-title">
          <Headphones className="h-5 w-5" />
          Support Interaction Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1 flex-1 min-w-[150px]">
            <label className="text-xs text-muted-foreground">Role</label>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger data-testid="select-filter-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} data-testid={`option-role-${r.value}`}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 flex-1 min-w-[150px]">
            <label className="text-xs text-muted-foreground">User ID</label>
            <div className="flex gap-1">
              <Input
                placeholder="Filter by user ID"
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                data-testid="input-filter-support-user-id"
              />
              <Button size="icon" variant="outline" onClick={handleSearch} data-testid="button-search-support-logs">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !logs || logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-support-logs">
            No support interactions found
          </p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-md border text-sm space-y-1"
                data-testid={`row-support-log-${log.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]" data-testid={`badge-role-${log.id}`}>
                      {log.userRole}
                    </Badge>
                    {log.currentScreen && (
                      <Badge variant="outline" className="text-[10px]" data-testid={`badge-screen-${log.id}`}>
                        {log.currentScreen}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground truncate" data-testid={`text-user-${log.id}`}>
                      {log.userId}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-date-${log.id}`}>
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs">
                  <span className="font-medium">Q:</span>{" "}
                  <span className="text-muted-foreground">{log.userMessage}</span>
                </div>
                <div className="text-xs">
                  <span className="font-medium">A:</span>{" "}
                  <span className="text-muted-foreground line-clamp-2">{log.supportResponse}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
