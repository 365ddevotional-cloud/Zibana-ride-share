import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MessageCircle,
  Search,
  Trash2,
  Loader2,
  Filter,
  User,
  Car,
  Calendar,
} from "lucide-react";
import { API_BASE } from "@/lib/apiBase";

interface ChatLogEntry {
  id: number;
  tripId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  riderName: string;
  driverName: string;
  message: string;
  createdAt: string;
}

export default function ChatLogsPanel() {
  const { toast } = useToast();
  const [tripIdFilter, setTripIdFilter] = useState("");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [appliedTripId, setAppliedTripId] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");

  const queryParams = new URLSearchParams();
  if (appliedTripId) queryParams.set("tripId", appliedTripId);
  if (appliedKeyword) queryParams.set("keyword", appliedKeyword);
  queryParams.set("limit", "100");

  const { data: logs = [], isLoading } = useQuery<ChatLogEntry[]>({
    queryKey: ["/api/admin/chat-logs", appliedTripId, appliedKeyword],
    queryFn: () => fetch(`${API_BASE}/api/admin/chat-logs?${queryParams.toString()}`, { credentials: "include" }).then(r => r.json()),
  });

  const cleanupMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/chat-logs/cleanup"),
    onSuccess: (data: any) => {
      toast({ title: "Cleanup Complete", description: data.message || "Old messages cleaned up." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat-logs"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to run cleanup.", variant: "destructive" });
    },
  });

  const applyFilters = () => {
    setAppliedTripId(tripIdFilter.trim());
    setAppliedKeyword(keywordFilter.trim());
  };

  const clearFilters = () => {
    setTripIdFilter("");
    setKeywordFilter("");
    setAppliedTripId("");
    setAppliedKeyword("");
  };

  const hasFilters = appliedTripId || appliedKeyword;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Trip Chat Logs
          </CardTitle>
          <CardDescription>
            Read-only view of all in-app trip messages. Filter by Trip ID or search by keyword.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Trip ID</label>
              <Input
                placeholder="Filter by Trip ID..."
                value={tripIdFilter}
                onChange={(e) => setTripIdFilter(e.target.value)}
                className="w-56"
                data-testid="input-filter-trip-id"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Keyword</label>
              <Input
                placeholder="Search messages..."
                value={keywordFilter}
                onChange={(e) => setKeywordFilter(e.target.value)}
                className="w-56"
                data-testid="input-filter-keyword"
              />
            </div>
            <Button onClick={applyFilters} data-testid="button-apply-filters">
              <Search className="mr-1.5 h-4 w-4" />
              Search
            </Button>
            {hasFilters && (
              <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
                <Filter className="mr-1.5 h-4 w-4" />
                Clear
              </Button>
            )}
            <div className="ml-auto">
              <Button
                variant="outline"
                onClick={() => cleanupMutation.mutate()}
                disabled={cleanupMutation.isPending}
                data-testid="button-cleanup-old-messages"
              >
                {cleanupMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-4 w-4" />
                )}
                Cleanup 30+ days
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && logs.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {hasFilters ? "No messages match your filters." : "No trip chat messages yet."}
              </p>
            </div>
          )}

          {!isLoading && logs.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Trip ID</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Rider</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Driver</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Sender</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Message</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-b-0" data-testid={`chat-log-row-${log.id}`}>
                        <td className="px-3 py-2 font-mono text-xs max-w-[120px] truncate" title={log.tripId}>
                          {log.tripId.substring(0, 8)}...
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{log.riderName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Car className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{log.driverName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={log.senderRole === "rider" ? "secondary" : "outline"} className="text-xs">
                            {log.senderRole === "rider" ? "Rider" : "Driver"}: {log.senderName}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 max-w-[300px]">
                          <p className="text-xs break-words line-clamp-2">{log.message}</p>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!isLoading && logs.length > 0 && (
            <p className="text-xs text-muted-foreground text-right" data-testid="text-log-count">
              Showing {logs.length} message{logs.length !== 1 ? "s" : ""}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
