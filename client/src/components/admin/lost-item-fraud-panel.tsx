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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShieldAlert, Search, Eye, AlertTriangle } from "lucide-react";

interface FraudSignal {
  id: string;
  userId: string;
  signalType: string;
  severity: string;
  riskScore?: number;
  adminReviewed: boolean;
  adminNotes?: string;
  autoResolved?: boolean;
  details?: string;
  createdAt: string;
  updatedAt?: string;
}

interface UserFraudProfile {
  userId: string;
  riskScore: number;
  signals: FraudSignal[];
}

function signalTypeBadgeClass(type: string): string {
  switch (type) {
    case "frequent_reporter":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "same_item_type":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
    case "frequent_accused":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
    case "gps_mismatch":
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    case "no_proof":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    default:
      return "";
  }
}

function severityBadgeClass(severity: string): string {
  switch (severity) {
    case "low":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    case "medium":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
    case "high":
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    default:
      return "";
  }
}

export function LostItemFraudPanel() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSignal, setSelectedSignal] = useState<FraudSignal | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [autoResolved, setAutoResolved] = useState(false);

  const [userProfileDialogOpen, setUserProfileDialogOpen] = useState(false);
  const [userIdToView, setUserIdToView] = useState("");

  const { data: signals, isLoading } = useQuery<FraudSignal[]>({
    queryKey: ["/api/admin/lost-item-fraud"],
  });

  const { data: userProfile, isLoading: profileLoading } = useQuery<UserFraudProfile>({
    queryKey: ["/api/admin/lost-item-fraud/user", userIdToView],
    enabled: !!userIdToView && userProfileDialogOpen,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; adminNotes?: string; autoResolved?: boolean }) =>
      apiRequest("PATCH", `/api/admin/lost-item-fraud/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lost-item-fraud"] });
      setReviewDialogOpen(false);
      setSelectedSignal(null);
      setAdminNotes("");
      setAutoResolved(false);
      toast({ title: "Signal reviewed successfully" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openReview = (signal: FraudSignal) => {
    setSelectedSignal(signal);
    setAdminNotes(signal.adminNotes || "");
    setAutoResolved(signal.autoResolved || false);
    setReviewDialogOpen(true);
  };

  const handleReviewSubmit = () => {
    if (!selectedSignal) return;
    reviewMutation.mutate({
      id: selectedSignal.id,
      adminNotes: adminNotes || undefined,
      autoResolved,
    });
  };

  const openUserProfile = (userId: string) => {
    setUserIdToView(userId);
    setUserProfileDialogOpen(true);
  };

  const filteredSignals = (signals || []).filter((signal) => {
    if (!searchQuery) return true;
    return signal.userId.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6" data-testid="lost-item-fraud-panel">
      <div>
        <h2 className="text-xl font-semibold text-foreground" data-testid="text-fraud-detection-title">
          Lost Item Fraud Detection
        </h2>
        <p className="text-sm text-muted-foreground">
          Review fraud detection signals for lost item reports
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg" data-testid="text-fraud-signals-title">
            Fraud Signals
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-[250px]"
              data-testid="input-search-fraud-signals"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !filteredSignals.length ? (
            <div className="text-center py-8" data-testid="text-no-signals">
              <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No fraud signals detected</p>
            </div>
          ) : (
            <Table data-testid="table-fraud-signals">
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Signal Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Admin Reviewed</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignals.map((signal) => (
                  <TableRow key={signal.id} data-testid={`signal-row-${signal.id}`}>
                    <TableCell data-testid={`text-signal-user-${signal.id}`}>
                      {signal.userId.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={signalTypeBadgeClass(signal.signalType)}
                        data-testid={`badge-signal-type-${signal.id}`}
                      >
                        {signal.signalType.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={severityBadgeClass(signal.severity)}
                        data-testid={`badge-signal-severity-${signal.id}`}
                      >
                        {signal.severity}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-signal-risk-${signal.id}`}>
                      {signal.riskScore ?? "—"}
                    </TableCell>
                    <TableCell data-testid={`text-signal-reviewed-${signal.id}`}>
                      {signal.adminReviewed ? "Yes" : "No"}
                    </TableCell>
                    <TableCell data-testid={`text-signal-date-${signal.id}`}>
                      {new Date(signal.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReview(signal)}
                          data-testid={`button-review-signal-${signal.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openUserProfile(signal.userId)}
                          data-testid={`button-view-user-${signal.id}`}
                        >
                          View User Profile
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-review-signal">
          <DialogHeader>
            <DialogTitle>Review Fraud Signal</DialogTitle>
          </DialogHeader>
          {selectedSignal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">User ID</p>
                  <p className="font-medium" data-testid="text-review-user-id">
                    {selectedSignal.userId}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Signal Type</p>
                  <Badge
                    variant="secondary"
                    className={signalTypeBadgeClass(selectedSignal.signalType)}
                    data-testid="badge-review-signal-type"
                  >
                    {selectedSignal.signalType.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Severity</p>
                  <Badge
                    variant="secondary"
                    className={severityBadgeClass(selectedSignal.severity)}
                    data-testid="badge-review-severity"
                  >
                    {selectedSignal.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Risk Score</p>
                  <p className="font-medium" data-testid="text-review-risk-score">
                    {selectedSignal.riskScore ?? "—"}
                  </p>
                </div>
              </div>
              {selectedSignal.details && (
                <div>
                  <p className="text-sm text-muted-foreground">Details</p>
                  <p className="text-sm" data-testid="text-review-details">
                    {selectedSignal.details}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Enter review notes..."
                  data-testid="input-admin-notes"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoResolved}
                  onChange={(e) => setAutoResolved(e.target.checked)}
                  id="auto-resolved"
                  data-testid="checkbox-auto-resolved"
                />
                <label htmlFor="auto-resolved" className="text-sm font-medium">
                  Mark as auto-resolved
                </label>
              </div>
              <Button
                onClick={handleReviewSubmit}
                disabled={reviewMutation.isPending}
                className="w-full"
                data-testid="button-submit-signal-review"
              >
                {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={userProfileDialogOpen} onOpenChange={setUserProfileDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-user-profile">
          <DialogHeader>
            <DialogTitle>
              <AlertTriangle className="inline h-5 w-5 mr-2" />
              User Fraud Profile
            </DialogTitle>
          </DialogHeader>
          {profileLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : userProfile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-medium" data-testid="text-profile-user-id">
                    {userProfile.userId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Risk Score</p>
                  <p className="font-medium text-lg" data-testid="text-profile-risk-score">
                    {userProfile.riskScore}
                  </p>
                </div>
              </div>
              {userProfile.signals?.length > 0 ? (
                <Table data-testid="table-user-signals">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Signal Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userProfile.signals.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Badge variant="secondary" className={signalTypeBadgeClass(s.signalType)}>
                            {s.signalType.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={severityBadgeClass(s.severity)}>
                            {s.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4" data-testid="text-no-user-signals">
                  No signals for this user
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4" data-testid="text-profile-not-found">
              User profile not found
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
