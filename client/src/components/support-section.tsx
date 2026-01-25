import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Headphones, 
  MessageSquare, 
  Plus,
  Send,
  Clock,
  CheckCircle
} from "lucide-react";

type SupportTicket = {
  id: string;
  createdByUserId: string;
  createdByRole: string;
  tripId: string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  assignedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
  messagesCount?: number;
  tripDetails?: { pickup: string; dropoff: string; fare: string } | null;
};

type SupportMessage = {
  id: string;
  ticketId: string;
  senderUserId: string;
  senderRole: string;
  message: string;
  internal: boolean;
  createdAt: string;
};

type Trip = {
  id: string;
  pickupLocation: string;
  dropoffLocation: string;
};

interface SupportSectionProps {
  userTrips?: Trip[];
}

export function SupportSection({ userTrips = [] }: SupportSectionProps) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    tripId: "",
    priority: "medium",
  });
  const [newMessage, setNewMessage] = useState("");

  const { data: myTickets = [], isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support/tickets/my"],
    queryFn: async () => {
      const res = await fetch("/api/support/tickets/my", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
  });

  const { data: ticketDetails } = useQuery<{ ticket: SupportTicket; messages: SupportMessage[] }>({
    queryKey: ["/api/support/tickets", selectedTicket?.id],
    queryFn: async () => {
      const res = await fetch(`/api/support/tickets/${selectedTicket!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch ticket details");
      return res.json();
    },
    enabled: !!selectedTicket && showTicketDialog,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newTicket) => {
      const res = await apiRequest("POST", "/api/support/tickets/create", {
        ...data,
        tripId: data.tripId || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets/my"] });
      setShowCreateDialog(false);
      setNewTicket({ subject: "", description: "", tripId: "", priority: "medium" });
      toast({ title: "Ticket created", description: "Our support team will respond shortly" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create ticket", 
        description: error.message || "Please try again", 
        variant: "destructive" 
      });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async (data: { ticketId: string; message: string }) => {
      const res = await apiRequest("POST", "/api/support/tickets/respond", {
        ...data,
        internal: false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets", selectedTicket?.id] });
      setNewMessage("");
      toast({ title: "Message sent" });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const openTicketDetails = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setShowTicketDialog(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "resolved":
      case "closed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const openTickets = myTickets.filter(t => !["resolved", "closed"].includes(t.status));
  const closedTickets = myTickets.filter(t => ["resolved", "closed"].includes(t.status));

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Support</CardTitle>
              <CardDescription>Get help with your account or trips</CardDescription>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-ticket">
            <Plus className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : myTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Headphones className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No support tickets</h3>
            <p className="text-muted-foreground mb-4">
              Need help? Create a ticket and our team will assist you.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {openTickets.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Open Tickets ({openTickets.length})</h4>
                <div className="space-y-2">
                  {openTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex justify-between items-center p-3 bg-muted rounded-lg cursor-pointer hover-elevate"
                      onClick={() => openTicketDetails(ticket)}
                      data-testid={`ticket-${ticket.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(ticket.status)}
                        <div>
                          <p className="font-medium text-sm">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {getStatusLabel(ticket.status)} - {new Date(ticket.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {ticket.messagesCount && ticket.messagesCount > 0 && (
                        <Badge variant="secondary">{ticket.messagesCount} msgs</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {closedTickets.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                  Resolved ({closedTickets.length})
                </h4>
                <div className="space-y-2">
                  {closedTickets.slice(0, 3).map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex justify-between items-center p-3 bg-muted/50 rounded-lg cursor-pointer hover-elevate"
                      onClick={() => openTicketDetails(ticket)}
                      data-testid={`ticket-closed-${ticket.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(ticket.status)}
                        <div>
                          <p className="font-medium text-sm text-muted-foreground">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ticket.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue and our team will help you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                placeholder="Brief summary of your issue"
                maxLength={255}
                data-testid="input-ticket-subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                placeholder="Provide details about your issue..."
                className="min-h-[120px]"
                maxLength={5000}
                data-testid="textarea-ticket-description"
              />
            </div>
            {userTrips.length > 0 && (
              <div>
                <label className="text-sm font-medium">Related Trip (optional)</label>
                <Select
                  value={newTicket.tripId}
                  onValueChange={(v) => setNewTicket({ ...newTicket, tripId: v })}
                >
                  <SelectTrigger data-testid="select-ticket-trip">
                    <SelectValue placeholder="Select a trip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No related trip</SelectItem>
                    {userTrips.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>
                        {trip.pickupLocation} → {trip.dropoffLocation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={newTicket.priority}
                onValueChange={(v) => setNewTicket({ ...newTicket, priority: v })}
              >
                <SelectTrigger data-testid="select-ticket-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(newTicket)}
              disabled={
                createMutation.isPending ||
                newTicket.subject.length < 5 ||
                newTicket.description.length < 10
              }
              data-testid="button-submit-ticket"
            >
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
            <DialogDescription>
              Status: {selectedTicket && getStatusLabel(selectedTicket.status)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Your Issue:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {selectedTicket?.description}
              </p>
            </div>

            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {ticketDetails?.messages.filter(m => !m.internal).map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${
                    msg.senderRole === "support_agent" || msg.senderRole === "admin"
                      ? "bg-primary/10 ml-4"
                      : "bg-muted mr-4"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <Badge variant="outline" className="text-xs">
                      {msg.senderRole === "support_agent" || msg.senderRole === "admin" 
                        ? "Support" 
                        : "You"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))}
            </div>

            {selectedTicket && !["resolved", "closed"].includes(selectedTicket.status) && (
              <div className="flex gap-2 pt-2 border-t">
                <Textarea
                  placeholder="Add a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="min-h-[60px]"
                  data-testid="textarea-ticket-reply"
                />
                <Button
                  onClick={() => {
                    if (selectedTicket && newMessage.trim()) {
                      respondMutation.mutate({
                        ticketId: selectedTicket.id,
                        message: newMessage,
                      });
                    }
                  }}
                  disabled={!newMessage.trim() || respondMutation.isPending}
                  data-testid="button-send-reply"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            {selectedTicket && ["resolved", "closed"].includes(selectedTicket.status) && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  This ticket has been resolved
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
