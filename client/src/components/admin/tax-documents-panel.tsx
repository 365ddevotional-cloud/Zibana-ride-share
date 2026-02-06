import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Send,
  Eye,
  Clock,
  Search,
} from "lucide-react";

type TaxDriverEntry = {
  driverId: string;
  driverName: string;
  country: string;
  status: string;
  totalGrossEarnings: number | null;
  reportableIncome: number | null;
  generatedAt: string | null;
};

type TaxValidation = {
  canGenerate: boolean;
  errors: string[];
  warnings: string[];
  driverId: string;
  taxYear: number;
};

type TaxSummaryDetail = {
  stored: boolean;
  driverId: string;
  taxYear: number;
  taxProfile: any;
  totalGrossEarnings: number;
  totalTips: number;
  totalIncentives: number;
  totalPlatformFees: number;
  totalMilesDriven: number;
  reportableIncome: number;
  currency: string;
  status: string;
  generatedAt?: string;
  generatedBy?: string;
  finalizedAt?: string;
  finalizedBy?: string;
  documents: any[];
  auditLogs: any[];
  tripCount?: number;
};

type AuditLogEntry = {
  id: number;
  driverUserId: string;
  taxYear: number;
  action: string;
  performedBy: string;
  details: string | null;
  createdAt: string;
};

function statusBadge(status: string) {
  switch (status) {
    case "not_generated":
      return <Badge variant="outline" data-testid={`badge-status-${status}`}><Clock className="h-3 w-3 mr-1" />Not Generated</Badge>;
    case "draft":
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}><FileText className="h-3 w-3 mr-1" />Draft</Badge>;
    case "finalized":
      return <Badge variant="default" data-testid={`badge-status-${status}`}><ShieldCheck className="h-3 w-3 mr-1" />Finalized</Badge>;
    case "issued":
      return <Badge variant="default" className="bg-green-600" data-testid={`badge-status-${status}`}><CheckCircle className="h-3 w-3 mr-1" />Issued</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function TaxDocumentsPanel() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; driverId: string; year: number } | null>(null);

  const year = parseInt(selectedYear);

  const { data: drivers = [], isLoading: driversLoading } = useQuery<TaxDriverEntry[]>({
    queryKey: ["/api/admin/tax/drivers", year],
    queryFn: () => fetch(`/api/admin/tax/drivers/${year}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: driverDetail, isLoading: detailLoading } = useQuery<TaxSummaryDetail>({
    queryKey: ["/api/admin/tax/summary", selectedDriver, year],
    queryFn: () => fetch(`/api/admin/tax/summary/${selectedDriver}/${year}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedDriver,
  });

  const { data: validation } = useQuery<TaxValidation>({
    queryKey: ["/api/admin/tax/validate", selectedDriver, year],
    queryFn: () => fetch(`/api/admin/tax/validate/${selectedDriver}/${year}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedDriver,
  });

  const generateMutation = useMutation({
    mutationFn: (params: { driverId: string; year: number }) =>
      apiRequest("POST", `/api/admin/tax/generate/${params.driverId}/${params.year}`),
    onSuccess: () => {
      toast({ title: "Tax summary generated", description: "Draft summary created from source data." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tax/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tax/drivers"] });
      setConfirmAction(null);
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setConfirmAction(null);
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: (params: { driverId: string; year: number }) =>
      apiRequest("POST", `/api/admin/tax/finalize/${params.driverId}/${params.year}`),
    onSuccess: () => {
      toast({ title: "Tax summary finalized", description: "Summary locked. No further edits allowed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tax/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tax/drivers"] });
      setConfirmAction(null);
    },
    onError: (err: any) => {
      toast({ title: "Finalization failed", description: err.message, variant: "destructive" });
      setConfirmAction(null);
    },
  });

  const issueMutation = useMutation({
    mutationFn: (params: { driverId: string; year: number }) =>
      apiRequest("POST", `/api/admin/tax/issue/${params.driverId}/${params.year}`),
    onSuccess: () => {
      toast({ title: "Tax document issued", description: "Document created and driver notified." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tax/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tax/drivers"] });
      setConfirmAction(null);
    },
    onError: (err: any) => {
      toast({ title: "Issuance failed", description: err.message, variant: "destructive" });
      setConfirmAction(null);
    },
  });

  const handleConfirmedAction = () => {
    if (!confirmAction) return;
    switch (confirmAction.type) {
      case "generate":
        generateMutation.mutate({ driverId: confirmAction.driverId, year: confirmAction.year });
        break;
      case "finalize":
        finalizeMutation.mutate({ driverId: confirmAction.driverId, year: confirmAction.year });
        break;
      case "issue":
        issueMutation.mutate({ driverId: confirmAction.driverId, year: confirmAction.year });
        break;
    }
  };

  const years = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(y.toString());
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle data-testid="text-tax-panel-title">Tax Documents & Statements</CardTitle>
            <CardDescription>Generate, review, finalize, and issue driver tax documents</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]" data-testid="select-tax-year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => window.open(`/api/admin/tax/export/${year}`, "_blank")}
              data-testid="button-export-tax-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {driversLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading drivers...</div>
          ) : drivers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No drivers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Gross Earnings</TableHead>
                    <TableHead className="text-right">Reportable</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.driverId} data-testid={`row-tax-driver-${driver.driverId}`}>
                      <TableCell className="font-medium">{driver.driverName}</TableCell>
                      <TableCell>{driver.country}</TableCell>
                      <TableCell>{statusBadge(driver.status)}</TableCell>
                      <TableCell className="text-right">
                        {driver.totalGrossEarnings !== null ? driver.totalGrossEarnings.toFixed(2) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {driver.reportableIncome !== null ? driver.reportableIncome.toFixed(2) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDriver(driver.driverId)}
                          data-testid={`button-view-tax-${driver.driverId}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
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

      <Dialog open={!!selectedDriver} onOpenChange={(open) => { if (!open) setSelectedDriver(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-tax-detail-title">
              Tax Summary: {driverDetail?.taxProfile?.legalName || selectedDriver?.substring(0, 8)}
            </DialogTitle>
            <DialogDescription>Tax Year {year} - {driverDetail?.currency || "NGN"}</DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : driverDetail ? (
            <Tabs defaultValue="summary">
              <TabsList className="w-full">
                <TabsTrigger value="summary" data-testid="tab-tax-summary">Summary</TabsTrigger>
                <TabsTrigger value="documents" data-testid="tab-tax-documents">Documents</TabsTrigger>
                <TabsTrigger value="audit" data-testid="tab-tax-audit">Audit Log</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Current Status</p>
                    {statusBadge(driverDetail.status)}
                  </div>
                  {driverDetail.generatedAt && (
                    <p className="text-xs text-muted-foreground">
                      Generated: {new Date(driverDetail.generatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {validation && (
                  <div className="space-y-2">
                    {validation.errors.length > 0 && (
                      <div className="p-3 rounded-md bg-destructive/10 space-y-1">
                        {validation.errors.map((e, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                            <XCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{e}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {validation.warnings.length > 0 && (
                      <div className="p-3 rounded-md bg-yellow-500/10 space-y-1">
                        {validation.warnings.map((w, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Gross Earnings</p>
                    <p className="text-lg font-bold" data-testid="text-tax-gross">{driverDetail.totalGrossEarnings.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Reportable Income</p>
                    <p className="text-lg font-bold" data-testid="text-tax-reportable">{driverDetail.reportableIncome.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Tips</p>
                    <p className="text-lg font-bold">{driverDetail.totalTips.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Incentives</p>
                    <p className="text-lg font-bold">{driverDetail.totalIncentives.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Platform Fees (aggregated)</p>
                    <p className="text-lg font-bold">{driverDetail.totalPlatformFees.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Miles Driven</p>
                    <p className="text-lg font-bold">{driverDetail.totalMilesDriven.toFixed(1)} mi</p>
                  </div>
                </div>

                {driverDetail.taxProfile && (
                  <div className="p-3 rounded-md bg-muted/30 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Tax Profile</p>
                    <p className="text-sm">Legal Name: {driverDetail.taxProfile.legalName}</p>
                    <p className="text-sm">Tax ID: {driverDetail.taxProfile.taxId || "Not provided"}</p>
                    <p className="text-sm">Classification: {driverDetail.taxProfile.taxClassification}</p>
                    <p className="text-sm">Country: {driverDetail.taxProfile.country}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  {(driverDetail.status === "not_generated" || driverDetail.status === "draft") && (
                    <Button
                      onClick={() => setConfirmAction({ type: "generate", driverId: selectedDriver!, year })}
                      disabled={validation ? !validation.canGenerate : true}
                      data-testid="button-generate-tax"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {driverDetail.status === "draft" ? "Regenerate Draft" : "Generate Draft"}
                    </Button>
                  )}
                  {driverDetail.status === "draft" && (
                    <Button
                      variant="outline"
                      onClick={() => setConfirmAction({ type: "finalize", driverId: selectedDriver!, year })}
                      data-testid="button-finalize-tax"
                    >
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Finalize
                    </Button>
                  )}
                  {driverDetail.status === "finalized" && (
                    <Button
                      onClick={() => setConfirmAction({ type: "issue", driverId: selectedDriver!, year })}
                      data-testid="button-issue-tax"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Issue to Driver
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-3">
                {driverDetail.documents.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No documents generated yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Generated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driverDetail.documents.map((doc: any) => (
                        <TableRow key={doc.id} data-testid={`row-tax-doc-${doc.id}`}>
                          <TableCell className="font-medium">{doc.documentType}</TableCell>
                          <TableCell>v{doc.version}</TableCell>
                          <TableCell>
                            {doc.isLatest ? (
                              <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Current</Badge>
                            ) : (
                              <Badge variant="outline">Archived</Badge>
                            )}
                          </TableCell>
                          <TableCell>{new Date(doc.generatedAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {doc.fileUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(doc.fileUrl, "_blank")}
                                data-testid={`button-download-doc-${doc.id}`}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="audit" className="space-y-3">
                {driverDetail.auditLogs.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No audit events recorded</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {driverDetail.auditLogs.map((log: AuditLogEntry) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/30" data-testid={`audit-log-${log.id}`}>
                        <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-medium">{log.action}</p>
                            <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">By: {log.performedBy.substring(0, 8)}</p>
                          {log.details && <p className="text-xs text-muted-foreground mt-1">{log.details}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "generate" && "This will generate a draft tax summary from current source data. Any existing draft will be replaced."}
              {confirmAction?.type === "finalize" && "This will lock the tax summary. No further modifications will be allowed. This action cannot be undone."}
              {confirmAction?.type === "issue" && "This will create the tax document, mark it as issued, and notify the driver. The driver will be able to download it."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)} data-testid="button-cancel-confirm">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmedAction}
              disabled={generateMutation.isPending || finalizeMutation.isPending || issueMutation.isPending}
              data-testid="button-confirm-action"
            >
              {(generateMutation.isPending || finalizeMutation.isPending || issueMutation.isPending) ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
