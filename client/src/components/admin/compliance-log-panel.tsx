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
import { Shield, Search } from "lucide-react";

const ACKNOWLEDGEMENT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "TERMS_ACCEPTANCE", label: "Terms Acceptance" },
  { value: "ASSUMPTION_OF_RISK", label: "Assumption of Risk" },
  { value: "LOST_ITEM_DISCLAIMER", label: "Lost Item Disclaimer" },
  { value: "ACCIDENT_DISCLAIMER", label: "Accident Disclaimer" },
  { value: "INCIDENT_DISCLAIMER", label: "Incident Disclaimer" },
  { value: "DRIVER_REGISTRATION_TERMS", label: "Driver Registration Terms" },
  { value: "POLICY_UPDATE_ACCEPTANCE", label: "Policy Update" },
];

interface LegalAcknowledgement {
  id: string;
  userId: string;
  acknowledgementType: string;
  countryCode: string | null;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export function ComplianceLogPanel() {
  const [filterType, setFilterType] = useState("all");
  const [filterUserId, setFilterUserId] = useState("");
  const [searchUserId, setSearchUserId] = useState("");

  const queryParams = new URLSearchParams();
  if (filterType !== "all") queryParams.set("type", filterType);
  if (searchUserId) queryParams.set("userId", searchUserId);
  const queryString = queryParams.toString();

  const { data: logs, isLoading } = useQuery<LegalAcknowledgement[]>({
    queryKey: ["/api/admin/legal-acknowledgements", filterType, searchUserId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/legal-acknowledgements${queryString ? `?${queryString}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const handleSearch = () => {
    setSearchUserId(filterUserId.trim());
  };

  return (
    <Card data-testid="card-compliance-logs">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg" data-testid="text-compliance-title">
          <Shield className="h-5 w-5" />
          Legal Acknowledgement Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1 flex-1 min-w-[150px]">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger data-testid="select-filter-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACKNOWLEDGEMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} data-testid={`option-type-${t.value}`}>
                    {t.label}
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
                data-testid="input-filter-user-id"
              />
              <Button size="icon" variant="outline" onClick={handleSearch} data-testid="button-search-logs">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !logs || logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-logs">
            No acknowledgement logs found
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-md border text-sm"
                data-testid={`row-log-${log.id}`}
              >
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <Badge variant="secondary" className="text-[10px]" data-testid={`badge-type-${log.id}`}>
                    {log.acknowledgementType}
                  </Badge>
                  {log.countryCode && (
                    <Badge variant="outline" className="text-[10px]" data-testid={`badge-country-${log.id}`}>
                      {log.countryCode}
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
