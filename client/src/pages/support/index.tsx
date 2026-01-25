import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Headphones, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ArrowUpCircle,
  Send,
  User,
  LogOut
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileDropdown } from "@/components/profile-dropdown";

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

type SupportStats = {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  escalatedTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  highPriorityOpen: number;
};

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

export default function SupportDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("queue");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const { data: stats } = useQuery<SupportStats>({
    queryKey: ["/api/support/stats"],
    queryFn: async () => {
      const res = await fetch("/api/support/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: queueTickets = [], isLoading: queueLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support/tickets/queue", statusFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      const res = await fetch(`/api/support/tickets/queue?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch queue");
      return res.json();
    },
    enabled: activeTab === "queue",
  });

  const { data: assignedTickets = [], isLoading: assignedLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support/tickets/assigned"],
    queryFn: async () => {
      const res = await fetch("/api/support/tickets/assigned", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch assigned tickets");
      return res.json();
    },
    enabled: activeTab === "assigned",
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

  const assignMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await apiRequest("POST", `/api/support/tickets/${ticketId}/assign`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets/assigned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/stats"] });
      toast({ title: "Ticket assigned", description: "Ticket has been assigned to you" });
    },
    onError: () => {
      toast({ title: "Assignment failed", description: "Could not assign ticket", variant: "destructive" });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async (data: { ticketId: string; message: string; internal: boolean }) => {
      const res = await apiRequest("POST", "/api/support/tickets/respond", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets", selectedTicket?.id] });
      setNewMessage("");
      setIsInternalNote(false);
      toast({ title: "Message sent", description: isInternalNote ? "Internal note added" : "Reply sent to user" });
    },
    onError: () => {
      toast({ title: "Send failed", description: "Could not send message", variant: "destructive" });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: async (data: { ticketId: string; reason: string }) => {
      const res = await apiRequest("POST", "/api/support/tickets/escalate", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets/assigned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets", selectedTicket?.id] });
      setShowEscalateDialog(false);
      setEscalationReason("");
      toast({ title: "Ticket escalated", description: "Ticket has been escalated to admin" });
    },
    onError: () => {
      toast({ title: "Escalation failed", description: "Could not escalate ticket", variant: "destructive" });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (data: { ticketId: string; resolution: string }) => {
      const res = await apiRequest("POST", "/api/support/tickets/close", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets/assigned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/stats"] });
      setShowCloseDialog(false);
      setShowTicketDialog(false);
      setResolutionNote("");
      toast({ title: "Ticket resolved", description: "Ticket has been closed" });
    },
    onError: () => {
      toast({ title: "Close failed", description: "Could not close ticket", variant: "destructive" });
    },
  });

  const openTicketDetails = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setShowTicketDialog(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "open": return "default";
      case "in_progress": return "secondary";
      case "escalated": return "destructive";
      case "resolved": return "outline";
      case "closed": return "outline";
      default: return "default";
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "default";
    }
  };

  const displayTickets = activeTab === "queue" ? queueTickets : assignedTickets;
  const isLoading = activeTab === "queue" ? queueLoading : assignedLoading;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Headphones className="h-3 w-3" />
              Support Agent
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ProfileDropdown user={user} role="support_agent" onLogout={logout} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.openTickets || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.inProgressTickets || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Escalated</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.escalatedTickets || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.highPriorityOpen || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="queue" data-testid="tab-queue">Ticket Queue</TabsTrigger>
            <TabsTrigger value="assigned" data-testid="tab-assigned">My Tickets</TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <CardTitle>Ticket Queue</CardTitle>
                    <CardDescription>All open support tickets</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-[140px]" data-testid="select-priority-filter">
                        <SelectValue placeholder="All Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading tickets...</div>
                ) : displayTickets.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle}
                    title="Queue is empty"
                    description="No tickets matching your filters"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayTickets.map((ticket) => (
                        <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {ticket.subject}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ticket.createdByRole}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(ticket.status)}>
                              {ticket.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openTicketDetails(ticket)}
                                data-testid={`button-view-ticket-${ticket.id}`}
                              >
                                View
                              </Button>
                              {!ticket.assignedToUserId && (
                                <Button
                                  size="sm"
                                  onClick={() => assignMutation.mutate(ticket.id)}
                                  disabled={assignMutation.isPending}
                                  data-testid={`button-assign-ticket-${ticket.id}`}
                                >
                                  Assign to Me
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assigned">
            <Card>
              <CardHeader>
                <CardTitle>My Tickets</CardTitle>
                <CardDescription>Tickets assigned to you</CardDescription>
              </CardHeader>
              <CardContent>
                {assignedLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading tickets...</div>
                ) : assignedTickets.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="No assigned tickets"
                    description="Assign tickets from the queue to start helping users"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Messages</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedTickets.map((ticket) => (
                        <TableRow key={ticket.id} data-testid={`row-assigned-${ticket.id}`}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {ticket.subject}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ticket.createdByRole}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(ticket.status)}>
                              {ticket.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{ticket.messagesCount || 0}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openTicketDetails(ticket)}
                              data-testid={`button-open-assigned-${ticket.id}`}
                            >
                              Open
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTicket?.subject}</DialogTitle>
              <DialogDescription>
                Ticket from {selectedTicket?.createdByRole} - {selectedTicket?.status.replace("_", " ")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Original Description:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedTicket?.description}
                </p>
                {selectedTicket?.tripDetails && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium mb-1">Related Trip:</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTicket.tripDetails.pickup} → {selectedTicket.tripDetails.dropoff}
                      <br />
                      Fare: ${selectedTicket.tripDetails.fare}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                <p className="font-medium text-sm">Conversation:</p>
                {ticketDetails?.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.internal 
                        ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                        : msg.senderRole === "support_agent" || msg.senderRole === "admin"
                          ? "bg-primary/10 ml-8"
                          : "bg-muted mr-8"
                    }`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <Badge variant="outline" className="text-xs">
                        {msg.internal ? "Internal Note" : msg.senderRole}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
              </div>

              {selectedTicket?.status !== "closed" && selectedTicket?.status !== "resolved" && (
                <div className="space-y-2 pt-4 border-t">
                  <Textarea
                    placeholder="Type your response..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[100px]"
                    data-testid="textarea-response"
                  />
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="internal"
                        checked={isInternalNote}
                        onCheckedChange={(checked) => setIsInternalNote(checked as boolean)}
                        data-testid="checkbox-internal"
                      />
                      <label htmlFor="internal" className="text-sm text-muted-foreground">
                        Internal note (hidden from user)
                      </label>
                    </div>
                    <Button
                      onClick={() => {
                        if (selectedTicket && newMessage.trim()) {
                          respondMutation.mutate({
                            ticketId: selectedTicket.id,
                            message: newMessage,
                            internal: isInternalNote,
                          });
                        }
                      }}
                      disabled={!newMessage.trim() || respondMutation.isPending}
                      data-testid="button-send-response"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              {selectedTicket?.status !== "closed" && selectedTicket?.status !== "resolved" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowEscalateDialog(true)}
                    data-testid="button-escalate"
                  >
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    Escalate
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => setShowCloseDialog(true)}
                    data-testid="button-resolve"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Escalate Ticket</DialogTitle>
              <DialogDescription>
                This ticket will be escalated to administrators for review.
              </DialogDescription>
            </DialogHeader>
            <div>
              <label className="text-sm font-medium">Escalation Reason</label>
              <Textarea
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Explain why this ticket needs escalation..."
                className="mt-2"
                data-testid="textarea-escalation-reason"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEscalateDialog(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (selectedTicket) {
                    escalateMutation.mutate({
                      ticketId: selectedTicket.id,
                      reason: escalationReason,
                    });
                  }
                }}
                disabled={escalateMutation.isPending}
                data-testid="button-confirm-escalate"
              >
                Escalate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Ticket</DialogTitle>
              <DialogDescription>
                Mark this ticket as resolved and add a resolution note.
              </DialogDescription>
            </DialogHeader>
            <div>
              <label className="text-sm font-medium">Resolution Note</label>
              <Textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Describe how the issue was resolved..."
                className="mt-2"
                data-testid="textarea-resolution"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (selectedTicket) {
                    closeMutation.mutate({
                      ticketId: selectedTicket.id,
                      resolution: resolutionNote,
                    });
                  }
                }}
                disabled={closeMutation.isPending}
                data-testid="button-confirm-resolve"
              >
                Resolve Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
