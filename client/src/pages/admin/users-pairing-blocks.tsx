import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Ban,
  ShieldCheck,
  Clock,
  Search,
  Trash2,
} from "lucide-react";

interface PairingBlock {
  id: string | number;
  riderId: string;
  driverId: string;
  riderName?: string;
  riderEmail?: string;
  driverName?: string;
  driverEmail?: string;
  reason?: string;
  createdAt?: string;
  blockedBy?: string;
  [key: string]: any;
}

export default function UsersPairingBlocksPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: blocks = [], isLoading } = useQuery<PairingBlock[]>({
    queryKey: ["/api/admin/pairing-blocks"],
  });

  const removeMutation = useMutation({
    mutationFn: async ({ riderId, driverId }: { riderId: string; driverId: string }) => {
      const response = await apiRequest("POST", "/api/admin/pairing-blocks/remove", {
        riderId,
        driverId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pairing-blocks"] });
      toast({ title: "Block removed", description: "Pairing block has been removed successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove block", description: error.message, variant: "destructive" });
    },
  });

  const filteredBlocks = useMemo(() => {
    if (!searchQuery) return blocks;
    const q = searchQuery.toLowerCase();
    return blocks.filter((b) => {
      const riderMatch = b.riderName?.toLowerCase().includes(q) || b.riderEmail?.toLowerCase().includes(q);
      const driverMatch = b.driverName?.toLowerCase().includes(q) || b.driverEmail?.toLowerCase().includes(q);
      return riderMatch || driverMatch;
    });
  }, [blocks, searchQuery]);

  const totalBlocks = blocks.length;
  const activeBlocks = blocks.length;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentBlocks = blocks.filter((b) => {
    if (!b.createdAt) return false;
    return new Date(b.createdAt) >= sevenDaysAgo;
  }).length;

  const metrics = [
    { label: "Total Blocks", value: totalBlocks, icon: Ban, accent: "text-red-600 dark:text-red-400" },
    { label: "Active", value: activeBlocks, icon: ShieldCheck, accent: "text-blue-600 dark:text-blue-400" },
    { label: "Recent (7 days)", value: recentBlocks, icon: Clock, accent: "text-amber-600 dark:text-amber-400" },
  ];

  function formatDate(dateStr?: string) {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3" data-testid="pairing-blocks-metrics">
        {metrics.map((m) => (
          <Card key={m.label} className="rounded-xl border-slate-200 dark:border-slate-700" data-testid={`metric-${m.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className={`h-4 w-4 shrink-0 ${m.accent}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.label}</span>
              </div>
              {isLoading ? (
                <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">--</p>
              ) : (
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100" data-testid={`value-${m.label.toLowerCase().replace(/\s+/g, "-")}`}>{m.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="pairing-blocks-filter-bar">
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <Input
                placeholder="Search by rider or driver name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-pairing-search"
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                data-testid="button-clear-search"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="pairing-blocks-table-card">
        <CardHeader className="pb-3 gap-2">
          <CardTitle className="text-base text-slate-800 dark:text-slate-100">
            {isLoading ? "Loading..." : `${filteredBlocks.length} block${filteredBlocks.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400" data-testid="loading-blocks">Loading pairing blocks...</div>
          ) : filteredBlocks.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400" data-testid="empty-blocks">
              {blocks.length === 0
                ? "No pairing blocks recorded yet."
                : "No blocks match the current search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rider</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Blocked By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBlocks.map((block, idx) => (
                    <TableRow key={block.id || idx} data-testid={`row-block-${block.id || idx}`}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate" data-testid={`rider-name-${block.id || idx}`}>
                            {block.riderName || block.riderId}
                          </p>
                          {block.riderEmail && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{block.riderEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate" data-testid={`driver-name-${block.id || idx}`}>
                            {block.driverName || block.driverId}
                          </p>
                          {block.driverEmail && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{block.driverEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-800 dark:text-slate-100" data-testid={`reason-${block.id || idx}`}>
                          {block.reason || "No reason provided"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500 dark:text-slate-400" data-testid={`date-${block.id || idx}`}>
                          {formatDate(block.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500 dark:text-slate-400" data-testid={`blocked-by-${block.id || idx}`}>
                          {block.blockedBy || "System"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeMutation.mutate({ riderId: block.riderId, driverId: block.driverId })}
                          disabled={removeMutation.isPending}
                          data-testid={`button-remove-block-${block.id || idx}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400 mr-1" />
                          <span className="text-xs">Remove</span>
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
