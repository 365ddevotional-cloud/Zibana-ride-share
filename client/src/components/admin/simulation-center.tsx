import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Play,
  Copy,
  XCircle,
  Clock,
  CheckCircle,
  Users,
  Shield,
  AlertTriangle,
} from "lucide-react";

interface SimulationCode {
  id: string;
  code: string;
  role: string;
  country: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface SimulationSession {
  id: string;
  userId: string;
  role: string;
  country: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface SimulationSystemStatus {
  enabled: boolean;
  codeLength: number;
  expiresMinutes: number;
}

export function SimulationCenter() {
  const { toast } = useToast();

  const [role, setRole] = useState("rider");
  const [country, setCountry] = useState("NG");
  const [city, setCity] = useState("");
  const [driverTier, setDriverTier] = useState("new");
  const [walletBalance, setWalletBalance] = useState("0.00");
  const [rating, setRating] = useState("4.50");
  const [cashEnabled, setCashEnabled] = useState(true);
  const [reusable, setReusable] = useState(false);
  const [expiryHours, setExpiryHours] = useState("24");

  const { data: systemStatus, isLoading: statusLoading } = useQuery<SimulationSystemStatus>({
    queryKey: ["/api/simulation/system-status"],
  });

  const simulationEnabled = systemStatus?.enabled === true;

  const { data: codes = [], isLoading: codesLoading } = useQuery<SimulationCode[]>({
    queryKey: ["/api/admin/simulation/codes"],
    enabled: simulationEnabled,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<SimulationSession[]>({
    queryKey: ["/api/admin/simulation/sessions"],
    enabled: simulationEnabled,
  });

  const createCodeMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        role,
        country,
        city: city || undefined,
        walletBalance: parseFloat(walletBalance),
        rating: parseFloat(rating),
        cashEnabled,
        reusable,
        expiryHours: parseInt(expiryHours, 10),
      };
      if (role === "driver") {
        body.driverTier = driverTier;
      }
      return apiRequest("POST", "/api/admin/simulation/codes", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/simulation/codes"] });
      toast({ title: "Simulation code generated" });
    },
    onError: () => {
      toast({ title: "Failed to generate code", variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/simulation/codes/${id}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/simulation/codes"] });
      toast({ title: "Code revoked" });
    },
    onError: () => {
      toast({ title: "Failed to revoke code", variant: "destructive" });
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/simulation/sessions/${id}/end`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/simulation/sessions"] });
      toast({ title: "Session ended" });
    },
    onError: () => {
      toast({ title: "Failed to end session", variant: "destructive" });
    },
  });

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      toast({ title: "Code copied to clipboard" });
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>;
      case "expired":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">Expired</Badge>;
      case "used":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Used</Badge>;
      case "revoked":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Revoked</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  function formatDate(d: string | null | undefined) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading simulation system status...</p>
        </CardContent>
      </Card>
    );
  }

  if (!simulationEnabled) {
    return (
      <Card data-testid="card-simulation-disabled">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            Simulation Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-md bg-muted">
            <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium" data-testid="text-simulation-disabled">Simulation Mode is disabled at system level.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Set the SIMULATION_MODE_ENABLED environment variable to "true" to activate simulation features.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card data-testid="card-create-simulation">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Simulation Center
          </CardTitle>
          <CardDescription>
            Generate simulation codes for full role emulation experiences
            {systemStatus && (
              <span className="ml-2 text-xs text-muted-foreground">
                (Code length: {systemStatus.codeLength} digits, Default expiry: {systemStatus.expiresMinutes} min)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sim-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger data-testid="select-role" id="sim-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rider">Rider</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sim-country">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger data-testid="select-country" id="sim-country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NG">Nigeria (NG)</SelectItem>
                  <SelectItem value="US">USA (US)</SelectItem>
                  <SelectItem value="JM">Jamaica (JM)</SelectItem>
                  <SelectItem value="CA">Canada (CA)</SelectItem>
                  <SelectItem value="GH">Ghana (GH)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sim-city">City (optional)</Label>
              <Input
                id="sim-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Lagos"
                data-testid="input-city"
              />
            </div>

            {role === "driver" && (
              <div className="space-y-2">
                <Label htmlFor="sim-driver-tier">Driver Tier</Label>
                <Select value={driverTier} onValueChange={setDriverTier}>
                  <SelectTrigger data-testid="select-driver-tier" id="sim-driver-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="veteran">Veteran</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="sim-wallet">Wallet Balance</Label>
              <Input
                id="sim-wallet"
                type="number"
                step="0.01"
                value={walletBalance}
                onChange={(e) => setWalletBalance(e.target.value)}
                data-testid="input-wallet-balance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sim-rating">Rating</Label>
              <Input
                id="sim-rating"
                type="number"
                step="0.01"
                min="1"
                max="5"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                data-testid="input-rating"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sim-expiry">Expiry Hours</Label>
              <Input
                id="sim-expiry"
                type="number"
                min="1"
                value={expiryHours}
                onChange={(e) => setExpiryHours(e.target.value)}
                data-testid="input-expiry-hours"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="sim-cash"
                checked={cashEnabled}
                onCheckedChange={(checked) => setCashEnabled(checked === true)}
                data-testid="checkbox-cash-enabled"
              />
              <Label htmlFor="sim-cash">Cash Enabled</Label>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="sim-reusable"
                checked={reusable}
                onCheckedChange={(checked) => setReusable(checked === true)}
                data-testid="checkbox-reusable"
              />
              <Label htmlFor="sim-reusable">Reusable</Label>
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={() => createCodeMutation.mutate()}
              disabled={createCodeMutation.isPending}
              data-testid="button-generate-code"
            >
              <Shield className="h-4 w-4 mr-2" />
              {createCodeMutation.isPending ? "Generating..." : "Generate Code"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-active-codes">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Codes
          </CardTitle>
          <CardDescription>
            All simulation codes and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {codesLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading codes...</div>
          ) : codes.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No simulation codes"
              description="Generate a simulation code using the form above"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.id} data-testid={`row-code-${code.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-semibold" data-testid={`text-code-${code.id}`}>
                            {code.code}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copyToClipboard(code.code)}
                            data-testid={`button-copy-${code.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{code.role}</TableCell>
                      <TableCell>{code.country}</TableCell>
                      <TableCell>{getStatusBadge(code.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(code.createdAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(code.expiresAt)}</TableCell>
                      <TableCell>
                        {code.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => revokeMutation.mutate(code.id)}
                            disabled={revokeMutation.isPending}
                            data-testid={`button-revoke-${code.id}`}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-active-sessions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Currently running simulation sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No active sessions"
              description="No simulation sessions are currently running"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} data-testid={`row-session-${session.id}`}>
                      <TableCell className="font-mono text-sm">{session.id.slice(0, 8)}...</TableCell>
                      <TableCell className="font-mono text-sm">{session.userId.slice(0, 8)}...</TableCell>
                      <TableCell className="capitalize">{session.role}</TableCell>
                      <TableCell>{session.country}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(session.createdAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(session.expiresAt)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => endSessionMutation.mutate(session.id)}
                          disabled={endSessionMutation.isPending}
                          data-testid={`button-end-session-${session.id}`}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          End Session
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
