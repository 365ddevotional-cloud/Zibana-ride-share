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
import { 
  HelpCircle, Shield, Phone, MessageSquare, Plus, 
  Clock, CheckCircle, AlertTriangle, ChevronRight,
  FileText, AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

export default function RiderSupport() {
  const { toast } = useToast();
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support/tickets/my"],
  });

  const createTicket = useMutation({
    mutationFn: async (data: { subject: string; description: string }) => {
      return apiRequest("POST", "/api/support/tickets", data);
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
          <h1 className="text-2xl font-bold" data-testid="text-support-title">Support</h1>

          <div className="grid grid-cols-2 gap-3">
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="p-4 text-center">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <p className="font-medium" data-testid="text-safety-center">Safety Center</p>
                <p className="text-xs text-muted-foreground mt-1">Emergency help</p>
              </CardContent>
            </Card>
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="p-4 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium" data-testid="text-contact-us">Contact Us</p>
                <p className="text-xs text-muted-foreground mt-1">24/7 support</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
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
                        <div className="flex items-center gap-2 mb-1">
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
              <a href="/guidelines" className="block p-4 hover-elevate flex items-center justify-between">
                <span>Community Guidelines</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
            </CardContent>
          </Card>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
