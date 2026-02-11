import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Eye,
  Star,
} from "lucide-react";
import type { DriverProfile } from "@shared/schema";

type DriverWithUser = DriverProfile & { email?: string };

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function UsersMyDriversPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: drivers = [], isLoading } = useQuery<DriverWithUser[]>({
    queryKey: ["/api/admin/drivers"],
  });

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = d.fullName?.toLowerCase().includes(q);
        const phoneMatch = d.phone?.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [drivers, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="my-drivers-filter-bar">
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-my-drivers-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-my-drivers-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
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
                data-testid="button-clear-my-drivers-filters"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="my-drivers-list-card">
        <CardHeader className="pb-3 gap-2">
          <CardTitle className="text-base text-slate-800 dark:text-slate-100">
            {isLoading ? "Loading..." : `${filteredDrivers.length} driver${filteredDrivers.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400" data-testid="loading-my-drivers">
              Loading driver data...
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400" data-testid="empty-my-drivers">
              {drivers.length === 0
                ? "No drivers registered yet."
                : "No drivers match the current filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Online Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => (
                    <TableRow key={driver.id} data-testid={`row-my-driver-${driver.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(driver.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                            {driver.fullName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-800 dark:text-slate-100">{driver.phone || "--"}</span>
                      </TableCell>
                      <TableCell data-testid={`status-my-driver-${driver.id}`}>
                        <StatusBadge status={driver.status as any} />
                      </TableCell>
                      <TableCell>
                        {driver.averageRating ? (
                          <div className="flex items-center gap-1">
                            <Star className={`h-3.5 w-3.5 ${parseFloat(driver.averageRating) < 3.5 ? "text-orange-500" : "text-amber-500"}`} />
                            <span className="text-sm text-slate-800 dark:text-slate-100">
                              {parseFloat(driver.averageRating).toFixed(1)}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">({driver.totalRatings})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">No ratings</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`online-status-${driver.id}`}>
                        <StatusBadge status={driver.isOnline ? "online" : "offline"} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" data-testid={`button-view-my-driver-${driver.id}`}>
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
