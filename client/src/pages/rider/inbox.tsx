import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Car, Wallet, XCircle, Gift, Bell, Megaphone, Mail,
  Settings, CheckCheck, Lightbulb, ShieldCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface InboxMessage {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
}

interface UnreadCount {
  count: number;
}

interface NotificationPreferences {
  permissionGranted: boolean;
  driverAssigned: boolean;
  driverArriving: boolean;
  rideScheduledConfirmation: boolean;
  cancellationPenalties: boolean;
  walletLowBalance: boolean;
  promotions: boolean;
  systemAnnouncements: boolean;
}

const messageIcons: Record<string, typeof Car> = {
  trip_update: Car,
  payment_alert: Wallet,
  cancellation_notice: XCircle,
  promotion: Gift,
  system_announcement: Bell,
  marketing: Megaphone,
};

const typeLabels: Record<string, string> = {
  trip_update: "Trip Update",
  payment_alert: "Payment",
  cancellation_notice: "Cancellation",
  promotion: "Promotion",
  system_announcement: "Announcement",
  marketing: "Marketing",
};

const prefLabels: { key: keyof Omit<NotificationPreferences, "permissionGranted">; label: string }[] = [
  { key: "driverAssigned", label: "Driver assigned" },
  { key: "driverArriving", label: "Driver arriving" },
  { key: "rideScheduledConfirmation", label: "Ride scheduled confirmation" },
  { key: "cancellationPenalties", label: "Cancellation penalties" },
  { key: "walletLowBalance", label: "Wallet low balance" },
  { key: "promotions", label: "Promotions" },
  { key: "systemAnnouncements", label: "System announcements" },
];

export default function RiderInbox() {
  const { toast } = useToast();
  const [prefsOpen, setPrefsOpen] = useState(false);

  const { data: messages, isLoading } = useQuery<InboxMessage[]>({
    queryKey: ["/api/rider/inbox"],
  });

  const { data: unreadData } = useQuery<UnreadCount>({
    queryKey: ["/api/rider/inbox/unread-count"],
  });

  const { data: prefs } = useQuery<NotificationPreferences>({
    queryKey: ["/api/rider/notification-preferences"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await apiRequest("POST", `/api/rider/inbox/${messageId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/inbox/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/rider/inbox/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/inbox/unread-count"] });
      toast({ title: "All messages marked as read" });
    },
  });

  const updatePrefsMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      await apiRequest("PUT", "/api/rider/notification-preferences", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/notification-preferences"] });
    },
  });

  const handleTogglePref = (key: keyof NotificationPreferences, value: boolean) => {
    updatePrefsMutation.mutate({ [key]: value });
  };

  const handleMessageClick = (msg: InboxMessage) => {
    if (!msg.read) {
      markReadMutation.mutate(msg.id);
    }
  };

  const unreadCount = unreadData?.count ?? 0;

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold" data-testid="text-inbox-title">Inbox</h1>
              {unreadCount > 0 && (
                <Badge data-testid="badge-unread-count">{unreadCount}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  data-testid="button-mark-all-read"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark All Read
                </Button>
              )}
              <CollapsibleTrigger asChild onClick={() => setPrefsOpen(!prefsOpen)}>
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid="button-notification-settings"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {prefs && !prefs.permissionGranted && (
            <Card data-testid="card-enable-notifications">
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium" data-testid="text-enable-notifications-title">Enable Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Stay updated with trip alerts, payment confirmations, and promotions.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleTogglePref("permissionGranted", true)}
                  disabled={updatePrefsMutation.isPending}
                  data-testid="button-allow-notifications"
                >
                  Allow
                </Button>
              </CardContent>
            </Card>
          )}

          <Collapsible open={prefsOpen} onOpenChange={setPrefsOpen}>
            <CollapsibleContent>
              <Card data-testid="card-notification-preferences">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Notification Preferences</p>
                  </div>
                  {prefLabels.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <Label htmlFor={`pref-${key}`} className="text-sm cursor-pointer">
                        {label}
                      </Label>
                      <Switch
                        id={`pref-${key}`}
                        checked={prefs?.[key] ?? true}
                        onCheckedChange={(val) => handleTogglePref(key, val)}
                        disabled={updatePrefsMutation.isPending}
                        data-testid={`switch-pref-${key}`}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {isLoading ? (
            <div className="space-y-3" data-testid="inbox-loading">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !messages || messages.length === 0 ? (
            <Card data-testid="card-empty-inbox">
              <CardContent className="p-8 text-center">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No messages yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your notifications and updates will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => {
                const Icon = messageIcons[msg.type] || Bell;
                return (
                  <Card
                    key={msg.id}
                    className={`cursor-pointer hover-elevate ${!msg.read ? "border-primary/30" : ""}`}
                    onClick={() => handleMessageClick(msg)}
                    data-testid={`card-message-${msg.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 mt-0.5 rounded-full p-2 ${!msg.read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p
                              className={`font-medium truncate ${!msg.read ? "text-foreground" : "text-muted-foreground"}`}
                              data-testid={`text-message-title-${msg.id}`}
                            >
                              {msg.title}
                            </p>
                            {!msg.read && (
                              <span
                                className="h-2 w-2 rounded-full bg-primary shrink-0"
                                data-testid={`indicator-unread-${msg.id}`}
                              />
                            )}
                          </div>
                          <p
                            className="text-sm text-muted-foreground line-clamp-2"
                            data-testid={`text-message-body-${msg.id}`}
                          >
                            {msg.body}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs" data-testid={`badge-message-type-${msg.id}`}>
                              {typeLabels[msg.type] || msg.type}
                            </Badge>
                            <span
                              className="text-xs text-muted-foreground"
                              data-testid={`text-message-time-${msg.id}`}
                            >
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
