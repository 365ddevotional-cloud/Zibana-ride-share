import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, User, Clock } from "lucide-react";

interface InboxMessage {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
  inboxType: "rider" | "driver";
}

interface InboxData {
  rider: InboxMessage[];
  driver: InboxMessage[];
}

export function InboxViewerPanel() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [userIdFilter, setUserIdFilter] = useState("");

  const queryParams = new URLSearchParams();
  if (typeFilter !== "all") queryParams.set("type", typeFilter);
  if (userIdFilter.trim()) queryParams.set("userId", userIdFilter.trim());

  const { data, isLoading, isError } = useQuery<InboxData>({
    queryKey: ["/api/admin/inbox-messages", typeFilter, userIdFilter],
    queryFn: async () => {
      const url = `/api/admin/inbox-messages?${queryParams.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const allMessages = [
    ...(data?.rider || []),
    ...(data?.driver || []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-inbox-type-filter">
            <SelectValue placeholder="Message type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Inboxes</SelectItem>
            <SelectItem value="rider">Rider Inbox</SelectItem>
            <SelectItem value="driver">Driver Inbox</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Filter by User ID..."
          value={userIdFilter}
          onChange={(e) => setUserIdFilter(e.target.value)}
          className="max-w-xs"
          data-testid="input-inbox-user-filter"
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {isError && (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-inbox-viewer-error">
          Unable to load inbox messages.
        </div>
      )}

      {!isLoading && !isError && allMessages.length === 0 && (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-inbox-viewer-empty">
          <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No inbox messages found.
        </div>
      )}

      {!isLoading && allMessages.map((msg) => (
        <Card key={msg.id} data-testid={`card-inbox-message-${msg.id}`}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{msg.title}</p>
                  <Badge variant="outline" className="text-xs">{msg.inboxType}</Badge>
                  <Badge variant={msg.read ? "secondary" : "default"} className="text-xs">
                    {msg.read ? "Read" : "Unread"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{msg.body}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {msg.userId.substring(0, 12)}...
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
