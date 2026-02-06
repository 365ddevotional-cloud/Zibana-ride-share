import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  UserCheck,
  RotateCcw,
  TrendingUp,
  Clock,
  ArrowRight,
  Activity,
} from "lucide-react";

interface GrowthData {
  newUsersToday: { riders: number; drivers: number };
  activatedToday: { riders: number; drivers: number };
  returningToday: { riders: number; drivers: number };
  riderRetention: { d1: number; d7: number; d30: number };
  driverRetention: { d1: number; d7: number; d30: number };
  avgTimeToFirstRide: number;
  avgTimeToFirstTrip: number;
  riderFunnel: { signedUp: number; firstRide: number; secondRide: number };
  driverFunnel: { signedUp: number; approved: number; firstTrip: number; consistentActivity: number };
  riderActivity: { ridesPerUser7d: number; ridesPerUser30d: number };
  driverActivity: { onlineDays7d: number; onlineDays30d: number; tripsCompleted7d: number; tripsCompleted30d: number };
}

function RetentionBar({ label, value }: { label: string; value: number }) {
  const color = value >= 50 ? "bg-green-500" : value >= 25 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function FunnelStep({ label, count, total, isLast }: { label: string; count: number; total: number; isLast?: boolean }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm truncate">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{count}</span>
            <Badge variant="secondary" className="text-xs">{pct}%</Badge>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {!isLast && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </div>
  );
}

export function UserGrowthPanel() {
  const { data, isLoading } = useQuery<GrowthData>({
    queryKey: ["/api/analytics/user-growth"],
  });

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading user growth analytics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No analytics data available yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users Today</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-new-users-today">
              {data.newUsersToday.riders + data.newUsersToday.drivers}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted-foreground">{data.newUsersToday.riders} riders</span>
              <span className="text-xs text-muted-foreground">{data.newUsersToday.drivers} drivers</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activated Today</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-activated-today">
              {data.activatedToday.riders + data.activatedToday.drivers}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted-foreground">{data.activatedToday.riders} riders</span>
              <span className="text-xs text-muted-foreground">{data.activatedToday.drivers} drivers</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returning Today</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-returning-today">
              {data.returningToday.riders + data.returningToday.drivers}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted-foreground">{data.returningToday.riders} riders</span>
              <span className="text-xs text-muted-foreground">{data.returningToday.drivers} drivers</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Rider Retention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RetentionBar label="D1 (24 hours)" value={data.riderRetention.d1} />
            <RetentionBar label="D7 (7 days)" value={data.riderRetention.d7} />
            <RetentionBar label="D30 (30 days)" value={data.riderRetention.d30} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Driver Retention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RetentionBar label="D1 (24 hours)" value={data.driverRetention.d1} />
            <RetentionBar label="D7 (7 days)" value={data.driverRetention.d7} />
            <RetentionBar label="D30 (30 days)" value={data.driverRetention.d30} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time to First Action
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg time to first ride (rider)</span>
              <span className="font-medium" data-testid="text-avg-first-ride">
                {data.avgTimeToFirstRide > 0 ? `${data.avgTimeToFirstRide.toFixed(1)} hrs` : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg time to first trip (driver)</span>
              <span className="font-medium" data-testid="text-avg-first-trip">
                {data.avgTimeToFirstTrip > 0 ? `${data.avgTimeToFirstTrip.toFixed(1)} hrs` : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Riders</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rides/user (7d active)</span>
                <span className="font-medium">{data.riderActivity.ridesPerUser7d.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rides/user (30d active)</span>
                <span className="font-medium">{data.riderActivity.ridesPerUser30d.toFixed(1)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Drivers</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Online days (7d)</span>
                <span className="font-medium">{data.driverActivity.onlineDays7d.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Trips completed (7d)</span>
                <span className="font-medium">{data.driverActivity.tripsCompleted7d.toFixed(1)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Rider Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FunnelStep
              label="Signed Up"
              count={data.riderFunnel.signedUp}
              total={data.riderFunnel.signedUp}
            />
            <FunnelStep
              label="First Ride"
              count={data.riderFunnel.firstRide}
              total={data.riderFunnel.signedUp}
            />
            <FunnelStep
              label="Second Ride"
              count={data.riderFunnel.secondRide}
              total={data.riderFunnel.signedUp}
              isLast
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Driver Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FunnelStep
              label="Signed Up"
              count={data.driverFunnel.signedUp}
              total={data.driverFunnel.signedUp}
            />
            <FunnelStep
              label="Approved"
              count={data.driverFunnel.approved}
              total={data.driverFunnel.signedUp}
            />
            <FunnelStep
              label="First Trip"
              count={data.driverFunnel.firstTrip}
              total={data.driverFunnel.signedUp}
            />
            <FunnelStep
              label="Consistent (5+ trips)"
              count={data.driverFunnel.consistentActivity}
              total={data.driverFunnel.signedUp}
              isLast
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Decision Signals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.riderFunnel.signedUp > 0 && data.riderFunnel.firstRide === 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
              <TrendingUp className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-sm">Signups are happening but no first rides yet. This may indicate an onboarding or pricing issue.</p>
            </div>
          )}
          {data.riderFunnel.firstRide > 0 && data.riderRetention.d7 < 20 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-orange-500/10 text-orange-700 dark:text-orange-400">
              <TrendingUp className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-sm">First rides are happening but D7 retention is low ({data.riderRetention.d7}%). This may indicate a service quality or availability problem.</p>
            </div>
          )}
          {data.driverFunnel.signedUp > 0 && data.driverRetention.d1 < 20 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 text-red-700 dark:text-red-400">
              <TrendingUp className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-sm">Drivers are signing up but D1 online rate is low ({data.driverRetention.d1}%). This may indicate an incentive or trust issue.</p>
            </div>
          )}
          {data.riderFunnel.signedUp === 0 && data.driverFunnel.signedUp === 0 && (
            <p className="text-sm text-muted-foreground">No analytics data available yet. Signals will appear as users interact with the platform.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
