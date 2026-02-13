import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSupportContext } from "@/hooks/use-support-context";
import { 
  HelpCircle, Shield, Phone, MessageSquare, Plus, 
  ChevronRight, ChevronDown, ChevronUp, FileText, AlertTriangle, AlertOctagon, Banknote
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

export default function RiderSupport() {
  const { toast } = useToast();
  const { getSupportContext } = useSupportContext();
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [showSafetyInfo, setShowSafetyInfo] = useState(false);

  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support/tickets/my"],
  });

  const createTicket = useMutation({
    mutationFn: async (data: { subject: string; description: string }) => {
      const supportContext = getSupportContext();
      return apiRequest("POST", "/api/support/tickets/create", { ...data, supportContext });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets/my"] });
      toast({ title: "Ticket created", description: "We'll get back to you soon" });
      setShowNewTicket(false);
      setSubject("");
      setDescription("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create ticket", variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "in_progress": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "resolved": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "closed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleSubmit = () => {
    if (subject.trim() && description.trim()) {
      createTicket.mutate({ subject, description });
    }
  };

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <h1 className="text-2xl font-bold" data-testid="text-support-title">Help & Safety</h1>

          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertOctagon className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 dark:text-red-200">Emergency?</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    If you're in immediate danger, please call emergency services directly.
                  </p>
                  <Button 
                    variant="destructive" 
                    className="mt-3 w-full"
                    onClick={() => window.location.href = "tel:911"}
                    data-testid="button-emergency-call"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call Emergency Services
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card 
              className="hover-elevate cursor-pointer"
              onClick={() => setShowSafetyInfo(!showSafetyInfo)}
            >
              <CardContent className="p-4 text-center">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <p className="font-medium" data-testid="text-safety-center">Safety Center</p>
                <p className="text-xs text-muted-foreground mt-1">Safety tips & info</p>
              </CardContent>
            </Card>
            <Card 
              className="hover-elevate cursor-pointer"
              onClick={() => setShowNewTicket(true)}
            >
              <CardContent className="p-4 text-center">
                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="font-medium" data-testid="text-report-issue">Report Issue</p>
                <p className="text-xs text-muted-foreground mt-1">Trip problems</p>
              </CardContent>
            </Card>
          </div>

          {showSafetyInfo && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Safety Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">Verify your driver</p>
                  <p className="text-xs text-muted-foreground">Check the driver's name, photo, and license plate before entering</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">Share your trip</p>
                  <p className="text-xs text-muted-foreground">Share your live location with trusted contacts</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">Trust your instincts</p>
                  <p className="text-xs text-muted-foreground">If something feels wrong, don't get in or ask to be let out safely</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">Sit in the back</p>
                  <p className="text-xs text-muted-foreground">Sitting in the back seat gives you more personal space</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Support Tickets
              </CardTitle>
              <Button 
                size="sm" 
                onClick={() => setShowNewTicket(!showNewTicket)}
                data-testid="button-new-ticket"
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </CardHeader>
            <CardContent>
              {showNewTicket && (
                <div className="space-y-3 mb-4 p-4 border rounded-lg bg-muted/50">
                  <Input
                    placeholder="Subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    data-testid="input-ticket-subject"
                  />
                  <Textarea
                    placeholder="Describe your issue..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    data-testid="input-ticket-description"
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSubmit}
                      disabled={!subject.trim() || !description.trim() || createTicket.isPending}
                      data-testid="button-submit-ticket"
                    >
                      {createTicket.isPending ? "Submitting..." : "Submit"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowNewTicket(false)}
                      data-testid="button-cancel-ticket"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !tickets || tickets.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No support tickets</p>
                  <p className="text-sm mt-1">Create a ticket if you need help</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div 
                      key={ticket.id} 
                      className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className={getStatusColor(ticket.status)}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="font-medium truncate" data-testid={`text-ticket-${ticket.id}`}>
                          {ticket.subject}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <RiderPaymentFAQ />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Legal & Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <a href="/terms" className="block p-4 hover-elevate flex items-center justify-between border-b">
                <span>Terms of Service</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
              <a href="/privacy" className="block p-4 hover-elevate flex items-center justify-between border-b">
                <span>Privacy Policy</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
              <a href="/guidelines" className="block p-4 hover-elevate flex items-center justify-between border-b">
                <span>Community Guidelines</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
              <a href="/refund-policy" className="block p-4 hover-elevate flex items-center justify-between">
                <span>Refund Policy</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground px-4">
            ZIBANA Rider v1.0 | Need immediate help? Tap Safety Center above.
          </p>
        </div>
        <ZibraFloatingButton />
      </RiderLayout>
    </RiderRouteGuard>
  );
}

function RiderPaymentFAQ() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card data-testid="card-payment-faq">
      <CardContent className="pt-4">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setExpanded(!expanded)}
          data-testid="button-toggle-payment-faq"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Banknote className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium">How do I pay for my trip?</p>
              <p className="text-sm text-muted-foreground">Payment options explained</p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
        </button>
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-sm">
              You can pay with a card in the app or pay the driver directly in cash.
            </p>
            <p className="text-sm text-muted-foreground">
              Both options are supported for your convenience.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
