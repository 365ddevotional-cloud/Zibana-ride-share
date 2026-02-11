import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Briefcase,
  Users,
  CheckCircle,
  FileText,
  UserCheck,
  Search,
  Eye,
} from "lucide-react";

type Director = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  status?: string;
  directorType?: string;
  commissionRatePercent?: number;
  maxCommissionablePerDay?: number;
  driverCount?: number;
  lifecycleStatus?: string;
  referralCode?: string;
};

function getStatusBadge(status?: string) {
  switch (status) {
    case "active":
      return (
        <Badge variant="secondary" className="border-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Active
        </Badge>
      );
    case "suspended":
      return (
        <Badge variant="secondary" className="border-0 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Suspended
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary" className="border-0 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Pending
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="border-0">
          {status || "Unknown"}
        </Badge>
      );
  }
}

function truncateId(id: string): string {
  if (id.length <= 8) return id;
  return id.slice(0, 8) + "...";
}

export default function UsersDirectorsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: directors = [], isLoading } = useQuery<Director[]>({
    queryKey: ["/api/admin/directors"],
  });

  const filteredDirectors = useMemo(() => {
    return directors.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = (d.fullName || `${d.firstName || ""} ${d.lastName || ""}`).toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [directors, statusFilter, searchQuery]);

  const totalDirectors = directors.length;
  const activeDirectors = directors.filter((d) => d.status === "active").length;
  const contractDirectors = directors.filter((d) => d.directorType === "contract").length;
  const employedDirectors = directors.filter((d) => d.directorType === "employed").length;

  const metrics = [
    { label: "Total Directors", value: totalDirectors, icon: Briefcase, accent: "text-blue-600 dark:text-blue-400" },
    { label: "Active", value: activeDirectors, icon: CheckCircle, accent: "text-green-600 dark:text-green-400" },
    { label: "Contract", value: contractDirectors, icon: FileText, accent: "text-violet-600 dark:text-violet-400" },
    { label: "Employed", value: employedDirectors, icon: UserCheck, accent: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="director-metrics-row">
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
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{m.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="director-filter-bar">
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <Input
                placeholder="Search directors by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-director-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-director-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            {(statusFilter !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setSearchQuery("");
                }}
                data-testid="button-clear-director-filters"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="director-list-card">
        <CardHeader className="pb-3 gap-2">
          <CardTitle className="text-base text-slate-800 dark:text-slate-100">
            {isLoading ? "Loading..." : `${filteredDirectors.length} director${filteredDirectors.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400" data-testid="loading-directors">
              Loading director data...
            </div>
          ) : filteredDirectors.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400" data-testid="empty-directors">
              {directors.length === 0
                ? "No directors registered yet. Director registrations will appear here."
                : "No directors match the current filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Director ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Assigned Drivers</TableHead>
                    <TableHead>Commission %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDirectors.map((director) => (
                    <TableRow key={director.id} data-testid={`row-director-${director.id}`}>
                      <TableCell>
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400" title={director.id}>
                          {truncateId(director.id)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                            {director.fullName || `${director.firstName || ""} ${director.lastName || ""}`.trim() || "--"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{director.email || "--"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                          <span className="text-sm text-slate-800 dark:text-slate-100" data-testid={`text-driver-count-${director.id}`}>
                            {director.driverCount ?? 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-800 dark:text-slate-100" data-testid={`text-commission-${director.id}`}>
                          {director.commissionRatePercent != null ? `${director.commissionRatePercent}%` : "--"}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`status-director-${director.id}`}>
                        {getStatusBadge(director.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" data-testid={`button-view-director-${director.id}`}>
                          <Eye className="h-4 w-4" />
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
