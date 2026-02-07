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
import { AlertTriangle, Search, Eye } from "lucide-react";

interface AccidentReport {
  id: string;
  reporterId?: string;
  reporterName?: string;
  reporterRole?: string;
  tripId?: string;
  accidentType?: string;
  severity?: string;
  description?: string;
  safetyFlags?: string[];
  gpsLatitude?: string;
  gpsLongitude?: string;
  photos?: string[];
  damageDescription?: string;
  adminReviewStatus?: string;
  adminNotes?: string;
  insuranceClaimRef?: string;
  createdAt: string;
  updatedAt?: string;
}

const REVIEW_STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "resolved", label: "Resolved" },
];

function severityBadgeClass(severity: string): string {
  switch (severity?.toLowerCase()) {
    case "minor":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    case "moderate":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
    case "severe":
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    case "critical":
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    default:
      return "";
  }
}

function reviewStatusBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    case "reviewed":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "resolved":
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    default:
      return "";
  }
}

export function AccidentReportsPanel() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<AccidentReport | null>(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [insuranceClaimRef, setInsuranceClaimRef] = useState("");

  const { data: reports, isLoading } = useQuery<AccidentReport[]>({
    queryKey: ["/api/admin/accident-reports"],
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; adminReviewStatus: string; adminNotes?: string; insuranceClaimRef?: string }) =>
      apiRequest("PATCH", `/api/admin/accident-reports/${id}/review`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accident-reports"] });
      setSelectedReport(null);
      toast({ title: "Report reviewed successfully" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleReview = () => {
    if (!selectedReport || !reviewStatus) return;
    reviewMutation.mutate({
      id: selectedReport.id,
      adminReviewStatus: reviewStatus,
      adminNotes: adminNotes || undefined,
      insuranceClaimRef: insuranceClaimRef || undefined,
    });
  };

  const filteredReports = (reports || []).filter((report) => {
    if (statusFilter !== "all" && report.adminReviewStatus !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        report.reporterName?.toLowerCase().includes(q) ||
        report.accidentType?.toLowerCase().includes(q) ||
        report.id.toLowerCase().includes(q) ||
        report.tripId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openReviewDialog = (report: AccidentReport) => {
    setSelectedReport(report);
    setReviewStatus(report.adminReviewStatus || "pending");
    setAdminNotes(report.adminNotes || "");
    setInsuranceClaimRef(report.insuranceClaimRef || "");
  };

  return (
    <div className="space-y-6" data-testid="accident-reports-panel">
      <div>
        <h2 className="text-xl font-semibold text-foreground" data-testid="text-accident-reports-title">
          Accident Reports
        </h2>
        <p className="text-sm text-muted-foreground">
          Review and manage accident reports submitted during trips
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg" data-testid="text-accident-reports-table-title">
            Accident Reports
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[200px]"
                data-testid="input-search-accident-reports"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-accident-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !filteredReports.length ? (
            <div className="text-center py-8" data-testid="text-no-accident-reports">
              <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No accident reports found</p>
            </div>
          ) : (
            <Table data-testid="table-accident-reports">
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Trip</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id} data-testid={`accident-report-row-${report.id}`}>
                    <TableCell data-testid={`text-accident-id-${report.id}`}>
                      {report.id.slice(0, 8)}
                    </TableCell>
                    <TableCell data-testid={`text-accident-reporter-${report.id}`}>
                      {report.reporterName || report.reporterId || "N/A"}
                    </TableCell>
                    <TableCell data-testid={`text-accident-trip-${report.id}`}>
                      {report.tripId ? report.tripId.slice(0, 8) : "N/A"}
                    </TableCell>
                    <TableCell data-testid={`text-accident-type-${report.id}`}>
                      {report.accidentType || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={severityBadgeClass(report.severity || "")}
                        data-testid={`badge-accident-severity-${report.id}`}
                      >
                        {report.severity || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={reviewStatusBadgeClass(report.adminReviewStatus || "pending")}
                        data-testid={`badge-accident-status-${report.id}`}
                      >
                        {report.adminReviewStatus || "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-accident-date-${report.id}`}>
                      {new Date(report.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReviewDialog(report)}
                        data-testid={`button-review-accident-${report.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" data-testid="dialog-accident-report-detail">
          <DialogHeader>
            <DialogTitle data-testid="text-accident-dialog-title">Accident Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <p data-testid="text-detail-accident-id">{selectedReport.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reporter:</span>
                  <p data-testid="text-detail-reporter">{selectedReport.reporterName || selectedReport.reporterId || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reporter Role:</span>
                  <p data-testid="text-detail-reporter-role">{selectedReport.reporterRole || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Trip ID:</span>
                  <p data-testid="text-detail-accident-trip">{selectedReport.tripId || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p data-testid="text-detail-accident-type">{selectedReport.accidentType || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Severity:</span>
                  <p>
                    <Badge variant="secondary" className={severityBadgeClass(selectedReport.severity || "")} data-testid="badge-detail-severity">
                      {selectedReport.severity || "N/A"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>
                    <Badge variant="secondary" className={reviewStatusBadgeClass(selectedReport.adminReviewStatus || "pending")} data-testid="badge-detail-review-status">
                      {selectedReport.adminReviewStatus || "pending"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p data-testid="text-detail-accident-date">{new Date(selectedReport.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {selectedReport.description && (
                <div>
                  <span className="text-sm text-muted-foreground">Description:</span>
                  <p className="text-sm mt-1" data-testid="text-detail-description">{selectedReport.description}</p>
                </div>
              )}

              {selectedReport.damageDescription && (
                <div>
                  <span className="text-sm text-muted-foreground">Damage Description:</span>
                  <p className="text-sm mt-1" data-testid="text-detail-damage">{selectedReport.damageDescription}</p>
                </div>
              )}

              {selectedReport.safetyFlags && selectedReport.safetyFlags.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Safety Flags:</span>
                  <div className="flex flex-wrap gap-1 mt-1" data-testid="safety-flags-list">
                    {selectedReport.safetyFlags.map((flag, i) => (
                      <Badge key={i} variant="outline" data-testid={`badge-safety-flag-${i}`}>
                        {flag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(selectedReport.gpsLatitude || selectedReport.gpsLongitude) && (
                <div>
                  <span className="text-sm text-muted-foreground">GPS Location:</span>
                  <p className="text-sm mt-1" data-testid="text-detail-gps">
                    {selectedReport.gpsLatitude}, {selectedReport.gpsLongitude}
                  </p>
                </div>
              )}

              {selectedReport.photos && selectedReport.photos.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Photos ({selectedReport.photos.length}):</span>
                  <div className="flex flex-wrap gap-2 mt-1" data-testid="photos-list">
                    {selectedReport.photos.map((photo, i) => (
                      <a
                        key={i}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 underline"
                        data-testid={`link-photo-${i}`}
                      >
                        Photo {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium text-sm">Admin Review</h4>
                <div>
                  <label className="text-xs text-muted-foreground">Review Status</label>
                  <Select value={reviewStatus} onValueChange={setReviewStatus}>
                    <SelectTrigger data-testid="select-review-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Admin Notes</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Enter review notes..."
                    data-testid="textarea-admin-notes"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Insurance Claim Reference</label>
                  <Input
                    value={insuranceClaimRef}
                    onChange={(e) => setInsuranceClaimRef(e.target.value)}
                    placeholder="CLM-XXXXX"
                    data-testid="input-insurance-claim-ref"
                  />
                </div>
                <Button
                  onClick={handleReview}
                  disabled={reviewMutation.isPending}
                  data-testid="button-submit-review"
                >
                  {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
