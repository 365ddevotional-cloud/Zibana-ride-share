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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Search,
  ShieldBan,
  ShieldOff,
} from "lucide-react";

interface RiderTrust {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  trustScore: number;
  tier: string;
  totalTrips: number;
  disputes: number;
  flags: number;
  [key: string]: any;
}

export default function UsersRiderTrustPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");

  const { data: riders = [], isLoading } = useQuery<RiderTrust[]>({
    queryKey: ["/api/admin/rider-trust/all"],
  });

  const flagMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/rider-trust/${userId}/flag`, {
        reason: "Manual admin flag",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rider-trust/all"] });
      toast({ title: "Rider flagged", description: "Rider has been restricted successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to flag rider", description: error.message, variant: "destructive" });
    },
  });

  const filteredRiders = useMemo(() => {
    return riders.filter((r) => {
      if (tierFilter !== "all" && r.tier?.toLowerCase() !== tierFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = `${r.firstName} ${r.lastName}`.toLowerCase().includes(q);
        const emailMatch = r.email?.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [riders, tierFilter, searchQuery]);

  const totalScored = riders.length;
  const avgScore = totalScored > 0 ? Math.round(riders.reduce((sum, r) => sum + (r.trustScore || 0), 0) / totalScored) : 0;
  const flaggedCount = riders.filter((r) => (r.flags || 0) > 0 || r.tier?.toLowerCase() === "flagged").length;
  const highTrustCount = riders.filter((r) => (r.trustScore || 0) >= 80).length;

  const metrics = [
    { label: "Total Riders Scored", value: totalScored, icon: Users, accent: "text-blue-600 dark:text-blue-400" },
    { label: "Average Trust Score", value: avgScore, icon: TrendingUp, accent: "text-emerald-600 dark:text-emerald-400" },
    { label: "Flagged Riders", value: flaggedCount, icon: AlertTriangle, accent: "text-red-600 dark:text-red-400" },
    { label: "High Trust (≥80)", value: highTrustCount, icon: ShieldCheck, accent: "text-green-600 dark:text-green-400" },
  ];

  function scoreColor(score: number) {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  }

  function scoreBg(score: number) {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 50) return "bg-amber-100 dark:bg-amber-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  }

  function tierBadgeVariant(tier: string): "default" | "secondary" | "destructive" | "outline" {
    switch (tier?.toLowerCase()) {
      case "gold": return "default";
      case "silver": return "secondary";
      case "flagged": return "destructive";
      default: return "outline";
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="rider-trust-metrics">
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

      <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="rider-trust-filter-bar">
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-rider-trust-search"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-tier-filter">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
            {(tierFilter !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setTierFilter("all"); setSearchQuery(""); }}
                data-testid="button-clear-filters"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="rider-trust-table-card">
        <CardHeader className="pb-3 gap-2">
          <CardTitle className="text-base text-slate-800 dark:text-slate-100">
            {isLoading ? "Loading..." : `${filteredRiders.length} rider${filteredRiders.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400" data-testid="loading-riders">Loading rider trust data...</div>
          ) : filteredRiders.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400" data-testid="empty-riders">
              {riders.length === 0
                ? "No rider trust scores available yet."
                : "No riders match the current filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rider</TableHead>
                    <TableHead>Trust Score</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Trips</TableHead>
                    <TableHead>Disputes</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRiders.map((rider) => (
                    <TableRow key={rider.userId} data-testid={`row-rider-${rider.userId}`}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                            {rider.firstName} {rider.lastName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{rider.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-semibold ${scoreColor(rider.trustScore)} ${scoreBg(rider.trustScore)}`}
                          data-testid={`score-${rider.userId}`}
                        >
                          {rider.trustScore}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tierBadgeVariant(rider.tier)} data-testid={`tier-${rider.userId}`}>
                          {rider.tier || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-800 dark:text-slate-100" data-testid={`trips-${rider.userId}`}>{rider.totalTrips || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-800 dark:text-slate-100" data-testid={`disputes-${rider.userId}`}>{rider.disputes || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-800 dark:text-slate-100" data-testid={`flags-${rider.userId}`}>{rider.flags || 0}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => flagMutation.mutate(rider.userId)}
                            disabled={flagMutation.isPending}
                            data-testid={`button-restrict-${rider.userId}`}
                          >
                            <ShieldBan className="h-4 w-4 text-red-600 dark:text-red-400 mr-1" />
                            <span className="text-xs">Restrict</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled
                            data-testid={`button-clear-${rider.userId}`}
                          >
                            <ShieldOff className="h-4 w-4 text-slate-500 dark:text-slate-400 mr-1" />
                            <span className="text-xs">Clear</span>
                          </Button>
                        </div>
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
