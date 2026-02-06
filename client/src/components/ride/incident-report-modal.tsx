import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileWarning, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface IncidentReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  role: "rider" | "driver";
  accusedUserId: string;
}

const INCIDENT_TYPES = [
  { value: "HARASSMENT", label: "Harassment" },
  { value: "ASSAULT", label: "Assault" },
  { value: "UNSAFE_DRIVING", label: "Unsafe Driving" },
  { value: "PAYMENT_COERCION", label: "Payment Coercion" },
  { value: "ACCIDENT", label: "Accident" },
  { value: "OTHER", label: "Other" },
];

const SEVERITY_LEVELS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export function IncidentReportModal({
  open,
  onOpenChange,
  tripId,
  role,
  accusedUserId,
}: IncidentReportModalProps) {
  const { toast } = useToast();
  const [incidentType, setIncidentType] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/safety/incident", {
        tripId,
        reporterRole: role.toUpperCase(),
        accusedUserId,
        incidentType,
        severity,
        description,
      });
    },
    onSuccess: () => {
      toast({
        title: "Incident Reported",
        description: "Your incident report has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/safety/incidents"] });
      setIncidentType("");
      setSeverity("");
      setDescription("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.length < 10) return;
    mutation.mutate();
  };

  const isValid = incidentType && severity && description.length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="incident-report-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-destructive" />
            Report Safety Incident
          </DialogTitle>
          <DialogDescription>
            Describe what happened during your trip. Your report will be reviewed by our safety team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="incident-type">Incident Type</Label>
            <Select value={incidentType} onValueChange={setIncidentType}>
              <SelectTrigger id="incident-type" data-testid="select-incident-type">
                <SelectValue placeholder="Select incident type" />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_TYPES.map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    data-testid={`option-incident-type-${type.value.toLowerCase()}`}
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger id="severity" data-testid="select-severity">
                <SelectValue placeholder="Select severity level" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_LEVELS.map((level) => (
                  <SelectItem
                    key={level.value}
                    value={level.value}
                    data-testid={`option-severity-${level.value.toLowerCase()}`}
                  >
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened (minimum 10 characters)"
              className="min-h-[100px]"
              data-testid="textarea-description"
            />
            {description.length > 0 && description.length < 10 && (
              <p className="text-sm text-destructive" data-testid="text-description-error">
                Description must be at least 10 characters
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || mutation.isPending}
            data-testid="button-submit-incident"
          >
            <Send className="h-4 w-4 mr-2" />
            {mutation.isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
