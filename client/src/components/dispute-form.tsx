import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DisputeFormProps {
  tripId: string;
  tripStatus: string;
}

const DISPUTE_CATEGORIES = [
  { value: "fare", label: "Fare Issue" },
  { value: "behavior", label: "Behavior Issue" },
  { value: "cancellation", label: "Cancellation Issue" },
  { value: "other", label: "Other" },
];

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "open":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    case "under_review":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    case "resolved":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
  }
}

export function DisputeForm({ tripId, tripStatus }: DisputeFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: disputeCheck, isLoading: checkLoading } = useQuery<{
    hasDispute: boolean;
    dispute: any;
  }>({
    queryKey: ["/api/disputes/check", tripId],
  });

  const createDisputeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/disputes", { tripId, category, description });
    },
    onSuccess: () => {
      toast({
        title: "Issue Reported",
        description: "Your dispute has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/disputes/check", tripId] });
      setShowForm(false);
      setCategory("");
      setDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit dispute",
        variant: "destructive",
      });
    },
  });

  const canFileDispute = tripStatus === "completed" || tripStatus === "cancelled";

  if (!canFileDispute) {
    return null;
  }

  if (checkLoading) {
    return (
      <Card>
        <CardContent className="pt-4 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (disputeCheck?.hasDispute) {
    const dispute = disputeCheck.dispute;
    return (
      <Card className="border-orange-200 dark:border-orange-900">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Dispute Filed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge className={getStatusBadgeColor(dispute.status)} data-testid="badge-dispute-status">
              {dispute.status?.replace("_", " ")}
            </Badge>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Category: </span>
            <span className="text-sm capitalize">{dispute.category}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Description: </span>
            <p className="text-sm mt-1">{dispute.description}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!showForm) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowForm(true)}
            data-testid="button-report-issue"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Report an Issue
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 dark:border-orange-900">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Report an Issue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="select-dispute-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {DISPUTE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Describe the issue (max 500 characters)"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            rows={4}
            data-testid="textarea-dispute-description"
          />
          <p className="text-xs text-muted-foreground text-right">
            {description.length}/500
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setShowForm(false);
              setCategory("");
              setDescription("");
            }}
            data-testid="button-cancel-dispute"
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={() => createDisputeMutation.mutate()}
            disabled={!category || !description.trim() || createDisputeMutation.isPending}
            data-testid="button-submit-dispute"
          >
            {createDisputeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Submit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
