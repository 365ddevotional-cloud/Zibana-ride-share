import { DriverLayout } from "@/components/driver/DriverLayout";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useTranslation } from "@/i18n";
import {
  ArrowLeft, Car, Wallet, Bell, Megaphone, Mail,
  CheckCheck, DollarSign, Shield, AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface InboxMessage {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface UnreadCount {
  count: number;
}

const messageIcons: Record<string, typeof Car> = {
  ride_update: Car,
  payout_update: DollarSign,
  system_announcement: Megaphone,
  wallet_update: Wallet,
  safety_alert: Shield,
  warning: AlertTriangle,
};

const typeLabels: Record<string, string> = {
  ride_update: "Ride Update",
  payout_update: "Payout",
  system_announcement: "Announcement",
  wallet_update: "Wallet",
  safety_alert: "Safety",
  warning: "Warning",
};

export default function DriverInbox() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const { data: messages, isLoading, isError } = useQuery<InboxMessage[]>({
    queryKey: ["/api/driver/inbox"],
    enabled: !!user,
  });

  const { data: unreadData } = useQuery<UnreadCount>({
    queryKey: ["/api/driver/inbox/unread-count"],
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await apiRequest("POST", `/api/driver/inbox/${messageId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/inbox/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/driver/inbox/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/inbox/unread-count"] });
      toast({ title: "All messages marked as read" });
    },
  });

  const handleMessageClick = (msg: InboxMessage) => {
    if (!msg.read) {
      markReadMutation.mutate(msg.id);
    }
  };

  const unreadCount = unreadData?.count ?? 0;

  return (
    <DriverLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/driver/account")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold" data-testid="text-inbox-title">{t("inbox.title")}</h1>
            {unreadCount > 0 && (
              <Badge data-testid="badge-unread-count">{unreadCount}</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              {t("inbox.markAllRead")}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3" data-testid="inbox-loading">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : isError ? (
          <div className="text-center py-12 space-y-3">
            <Mail className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground" data-testid="text-inbox-error">
              Unable to load your inbox right now. Please try again later.
            </p>
          </div>
        ) : !messages || messages.length === 0 ? (
          <Card data-testid="card-empty-inbox">
            <CardContent className="p-8 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">{t("inbox.noMessages")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("inbox.noMessagesDesc")}
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
                            className={`truncate ${!msg.read ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}
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
      <ZibraFloatingButton />
    </DriverLayout>
  );
}
