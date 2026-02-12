import { useState, useMemo } from "react";
import { Link } from "wouter";
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
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  UserCheck,
  Clock,
  Search,
  Eye,
  CalendarDays,
} from "lucide-react";

type RiderWithDetails = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  createdAt?: string;
};

export default function AdminRidersOverview() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: riders = [], isLoading } = useQuery<RiderWithDetails[]>({
    queryKey: ["/api/admin/riders"],
  });

  const filteredRiders = useMemo(() => {
    if (!searchQuery) return riders;
    const q = searchQuery.toLowerCase();
    return riders.filter((r) => {
      const nameMatch = r.fullName?.toLowerCase().includes(q);
      const emailMatch = r.email?.toLowerCase().includes(q);
      const phoneMatch = r.phone?.toLowerCase().includes(q);
      return nameMatch || emailMatch || phoneMatch;
    });
  }, [riders, searchQuery]);

  const totalRiders = riders.length;
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentRiders = riders.filter(
    (r) => r.createdAt && new Date(r.createdAt) >= sevenDaysAgo
  ).length;

  function getInitials(name?: string): string {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function formatDate(dateStr?: string): string {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const metrics = [
    { label: "Total Riders", value: totalRiders, icon: Users, accent: "text-violet-600 dark:text-violet-400" },
    { label: "New This Week", value: recentRiders, icon: UserCheck, accent: "text-green-600 dark:text-green-400" },
    { label: "With Phone", value: riders.filter((r) => r.phone).length, icon: CalendarDays, accent: "text-blue-600 dark:text-blue-400" },
    { label: "With Email", value: riders.filter((r) => r.email).length, icon: Clock, accent: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb data-testid="breadcrumb-nav">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/overview" data-testid="breadcrumb-admin">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="breadcrumb-current">Riders</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold" data-testid="text-riders-title">Rider Operations</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage all registered riders on the platform</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="rider-metrics-row">
        {metrics.map((m) => (
          <Card key={m.label} data-testid={`metric-${m.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className={`h-4 w-4 shrink-0 ${m.accent}`} />
                <span className="text-xs text-muted-foreground truncate">{m.label}</span>
              </div>
              {isLoading ? (
                <p className="text-lg font-semibold text-muted-foreground">--</p>
              ) : (
                <p className="text-lg font-semibold">{m.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-testid="rider-filter-bar">
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-rider-search"
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                data-testid="button-clear-filters"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="rider-list-card">
        <CardHeader className="pb-3 gap-2">
          <CardTitle className="text-base">
            {isLoading ? "Loading..." : `${filteredRiders.length} rider${filteredRiders.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading rider data...</div>
          ) : filteredRiders.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground" data-testid="empty-riders">
              {riders.length === 0
                ? "No riders registered yet. Rider registrations will appear here."
                : "No riders match the current search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rider</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRiders.map((rider) => (
                    <TableRow key={rider.id} data-testid={`row-rider-${rider.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(rider.fullName || rider.firstName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {rider.fullName || `${rider.firstName || ""} ${rider.lastName || ""}`.trim() || "--"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm truncate">{rider.email || "--"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{rider.phone || "--"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{formatDate(rider.createdAt)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/users/riders/${rider.id}`}>
                          <Button size="sm" variant="ghost" data-testid={`button-view-rider-${rider.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
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
