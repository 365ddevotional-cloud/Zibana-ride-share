import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Plus, Settings } from "lucide-react";

interface InsurancePartner {
  id: string;
  companyName: string;
  coverageType: string;
  contactEmail?: string;
  contactPhone?: string;
  claimUrl?: string;
  activeRegions?: string[];
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    case "inactive":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    default:
      return "";
  }
}

export function InsurancePartnersPanel() {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [coverageType, setCoverageType] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [claimUrl, setClaimUrl] = useState("");
  const [activeRegions, setActiveRegions] = useState("");
  const [notes, setNotes] = useState("");

  const { data: partners, isLoading } = useQuery<InsurancePartner[]>({
    queryKey: ["/api/admin/insurance-partners"],
  });

  const createMutation = useMutation({
    mutationFn: (body: {
      companyName: string;
      coverageType: string;
      contactEmail?: string;
      contactPhone?: string;
      claimUrl?: string;
      activeRegions?: string[];
      notes?: string;
    }) => apiRequest("POST", "/api/admin/insurance-partners", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/insurance-partners"] });
      setAddDialogOpen(false);
      resetForm();
      toast({ title: "Partner added successfully" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/insurance-partners/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/insurance-partners"] });
      toast({ title: "Partner status updated" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setCompanyName("");
    setCoverageType("");
    setContactEmail("");
    setContactPhone("");
    setClaimUrl("");
    setActiveRegions("");
    setNotes("");
  };

  const handleCreate = () => {
    if (!companyName || !coverageType) {
      toast({ title: "Company name and coverage type are required", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      companyName,
      coverageType,
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
      claimUrl: claimUrl || undefined,
      activeRegions: activeRegions ? activeRegions.split(",").map((r) => r.trim()) : undefined,
      notes: notes || undefined,
    });
  };

  const handleToggleStatus = (partner: InsurancePartner) => {
    const newStatus = partner.status === "active" ? "inactive" : "active";
    toggleStatusMutation.mutate({ id: partner.id, status: newStatus });
  };

  return (
    <div className="space-y-6" data-testid="insurance-partners-panel">
      <div>
        <h2 className="text-xl font-semibold text-foreground" data-testid="text-insurance-title">
          Insurance Partners
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage insurance partner integrations and coverage
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg" data-testid="text-partners-list-title">
            Partners
          </CardTitle>
          <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-partner">
            <Plus className="h-4 w-4 mr-2" />
            Add Partner
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !partners?.length ? (
            <div className="text-center py-8" data-testid="text-no-partners">
              <Shield className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No insurance partners configured</p>
            </div>
          ) : (
            <Table data-testid="table-insurance-partners">
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Coverage Type</TableHead>
                  <TableHead>Regions</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((partner) => (
                  <TableRow key={partner.id} data-testid={`partner-row-${partner.id}`}>
                    <TableCell data-testid={`text-partner-name-${partner.id}`}>
                      {partner.companyName}
                    </TableCell>
                    <TableCell data-testid={`text-partner-coverage-${partner.id}`}>
                      {partner.coverageType}
                    </TableCell>
                    <TableCell data-testid={`text-partner-regions-${partner.id}`}>
                      {partner.activeRegions?.join(", ") || "N/A"}
                    </TableCell>
                    <TableCell data-testid={`text-partner-contact-${partner.id}`}>
                      {partner.contactEmail || partner.contactPhone || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusBadgeClass(partner.status)}
                        data-testid={`badge-partner-status-${partner.id}`}
                      >
                        {partner.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(partner)}
                        data-testid={`button-toggle-partner-${partner.id}`}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        {partner.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-add-partner">
          <DialogHeader>
            <DialogTitle>Add Insurance Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Company Name</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                data-testid="input-company-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Coverage Type</label>
              <Select value={coverageType} onValueChange={setCoverageType}>
                <SelectTrigger data-testid="select-coverage-type">
                  <SelectValue placeholder="Select coverage type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="rider">Rider</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Contact Email</label>
              <Input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="email@example.com"
                data-testid="input-contact-email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Contact Phone</label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1234567890"
                data-testid="input-contact-phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Claim URL</label>
              <Input
                value={claimUrl}
                onChange={(e) => setClaimUrl(e.target.value)}
                placeholder="https://claims.example.com"
                data-testid="input-claim-url"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Active Regions (comma-separated)</label>
              <Input
                value={activeRegions}
                onChange={(e) => setActiveRegions(e.target.value)}
                placeholder="Lagos, Abuja, Kano"
                data-testid="input-active-regions"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                data-testid="input-notes"
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="w-full"
              data-testid="button-submit-partner"
            >
              {createMutation.isPending ? "Adding..." : "Add Partner"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
