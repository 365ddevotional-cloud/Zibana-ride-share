import { useQuery, useMutation } from "@tanstack/react-query";
import { Car, TrendingUp, Star, Trophy, Share2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ShareableMoment = {
  id: string;
  userId: string;
  momentType: string;
  title: string;
  message: string;
  shared: boolean;
  sharedAt: string | null;
  dismissed: boolean;
  metadata: string | null;
  createdAt: string;
};

function getIconForMomentType(momentType: string) {
  switch (momentType) {
    case "FIRST_RIDE":
      return Car;
    case "MILESTONE_EARNINGS":
      return TrendingUp;
    case "HIGH_RATING":
      return Star;
    case "TRIP_COUNT_MILESTONE":
      return Trophy;
    default:
      return Star;
  }
}

function getMomentTypeLabel(momentType: string): string {
  switch (momentType) {
    case "FIRST_RIDE":
      return "First Ride";
    case "MILESTONE_EARNINGS":
      return "Earnings Milestone";
    case "HIGH_RATING":
      return "High Rating";
    case "TRIP_COUNT_MILESTONE":
      return "Trip Milestone";
    default:
      return "Achievement";
  }
}

export function ShareableMomentBanner() {
  const { toast } = useToast();

  // Fetch pending shareable moments
  const { data: moments = [], isLoading } = useQuery<ShareableMoment[]>({
    queryKey: ["/api/shareable-moments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shareable-moments");
      return await res.json();
    },
  });

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: async (momentId: string) => {
      const res = await apiRequest("POST", `/api/shareable-moments/${momentId}/share`);
      return await res.json();
    },
    onSuccess: (data) => {
      const moment = moments.find((m) => m.id === data.id);
      if (moment) {
        const shareText = `${moment.title}: ${moment.message}`;

        // Try native share API first if available
        if (navigator.share) {
          navigator.share({
            title: moment.title,
            text: shareText,
          }).catch((err) => {
            // User cancelled share, that's okay
            console.log("Share cancelled:", err);
          });
        } else {
          // Fallback to clipboard
          navigator.clipboard.writeText(shareText).then(() => {
            toast({
              title: "Copied to clipboard",
              description: "Share text has been copied to your clipboard.",
            });
          }).catch(() => {
            toast({
              title: "Share content",
              description: shareText,
            });
          });
        }
      }

      // Invalidate query to refresh moments list
      queryClient.invalidateQueries({ queryKey: ["/api/shareable-moments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to share",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async (momentId: string) => {
      const res = await apiRequest("POST", `/api/shareable-moments/${momentId}/dismiss`);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate query to refresh moments list
      queryClient.invalidateQueries({ queryKey: ["/api/shareable-moments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to dismiss",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter pending moments (not shared and not dismissed), sort by creation date (most recent first)
  const pendingMoments = moments
    .filter((m) => !m.shared && !m.dismissed)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  // If no pending moments or still loading, return nothing
  if (isLoading || pendingMoments.length === 0) {
    return null;
  }

  // Show the most recent pending moment
  const currentMoment = pendingMoments[0];
  const IconComponent = getIconForMomentType(currentMoment.momentType);
  const momentTypeLabel = getMomentTypeLabel(currentMoment.momentType);

  return (
    <Card
      className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-primary/10"
      data-testid="card-shareable-moment"
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Icon */}
            <div className="mt-1 flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <IconComponent className="h-5 w-5 text-primary" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3
                  className="font-semibold text-base leading-tight"
                  data-testid="text-moment-title"
                >
                  {currentMoment.title}
                </h3>
                <Badge
                  variant="secondary"
                  className="flex-shrink-0"
                  data-testid={`badge-moment-type-${currentMoment.momentType}`}
                >
                  {momentTypeLabel}
                </Badge>
              </div>
              <p
                className="text-sm text-muted-foreground"
                data-testid="text-moment-message"
              >
                {currentMoment.message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={() => shareMutation.mutate(currentMoment.id)}
              disabled={shareMutation.isPending || dismissMutation.isPending}
              data-testid="button-share-moment"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => dismissMutation.mutate(currentMoment.id)}
              disabled={shareMutation.isPending || dismissMutation.isPending}
              data-testid="button-dismiss-moment"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
