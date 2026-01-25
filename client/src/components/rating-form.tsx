import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RatingFormProps {
  tripId: string;
  targetName: string;
  targetRole: "driver" | "rider";
}

export function RatingForm({ tripId, targetName, targetRole }: RatingFormProps) {
  const [score, setScore] = useState(0);
  const [hoveredScore, setHoveredScore] = useState(0);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: ratingCheck, isLoading: checkLoading } = useQuery({
    queryKey: ["/api/ratings/check", tripId],
    queryFn: () => fetch(`/api/ratings/check/${tripId}`).then(r => r.json()),
  });

  const submitRating = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/ratings", { tripId, score, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ratings/check", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/current-trip"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/current-trip"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/trip-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/trip-history"] });
      toast({
        title: "Rating Submitted",
        description: `Thank you for rating your ${targetRole}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      });
    },
  });

  if (checkLoading) {
    return null;
  }

  if (ratingCheck?.hasRated) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">You rated this trip</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= ratingCheck.rating.score
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                  data-testid={`star-display-${star}`}
                />
              ))}
            </div>
            {ratingCheck.rating.comment && (
              <p className="text-sm italic" data-testid="text-rating-comment">
                "{ratingCheck.rating.comment}"
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Rate Your {targetRole === "driver" ? "Driver" : "Rider"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            How was your experience with {targetName}?
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setScore(star)}
                onMouseEnter={() => setHoveredScore(star)}
                onMouseLeave={() => setHoveredScore(0)}
                className="p-1 focus:outline-none"
                data-testid={`button-star-${star}`}
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= (hoveredScore || score)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <Textarea
            placeholder="Add a comment (optional, max 300 characters)"
            value={comment}
            onChange={(e) => setComment(e.target.value.substring(0, 300))}
            className="resize-none"
            rows={3}
            data-testid="input-rating-comment"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {comment.length}/300
          </p>
        </div>

        <Button
          onClick={() => submitRating.mutate()}
          disabled={score === 0 || submitRating.isPending}
          className="w-full"
          data-testid="button-submit-rating"
        >
          {submitRating.isPending ? "Submitting..." : "Submit Rating"}
        </Button>
      </CardContent>
    </Card>
  );
}
