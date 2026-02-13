import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Copy, Share2, TrendingUp, Users } from "lucide-react";

type ReferralCode = {
  id: string;
  code: string;
  ownerUserId: string;
  ownerRole: string;
  usageCount: number;
  maxUsage: number | null;
  active: boolean;
  createdAt: string;
};

type ReferralStats = {
  totalReferrals: number;
  conversions: number;
};

export function ReferralSection() {
  const { toast } = useToast();

  // Fetch or create referral code
  const { data: referralCode, isLoading: isCodeLoading, error: codeError } = useQuery<ReferralCode>({
    queryKey: ["/api/referrals/create"],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/referrals/create", {});
      return res.json();
    },
  });

  // Fetch referral stats
  const { data: stats = { totalReferrals: 0, conversions: 0 }, isLoading: isStatsLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/referrals/stats"],
    queryFn: async () => {
      const res = await fetch("/api/referrals/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch referral stats");
      return res.json();
    },
  });

  // Copy code to clipboard
  const copyMutation = useMutation({
    mutationFn: async () => {
      if (!referralCode?.code) throw new Error("No referral code available");
      await navigator.clipboard.writeText(referralCode.code);
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    },
    onError: () => {
      toast({
        title: "Failed to copy",
        description: "Could not copy the referral code to clipboard",
        variant: "destructive",
      });
    },
  });

  // Share referral code (for now just copies, can be extended for social sharing)
  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!referralCode?.code) throw new Error("No referral code available");
      
      const shareText = `Join me on ZIBANA! Use my referral code: ${referralCode.code}`;
      
      // Try native share first if available
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Join ZIBANA",
            text: shareText,
          });
          return true;
        } catch (err) {
          // User cancelled share, fall back to copying
        }
      }
      
      // Fallback to copying to clipboard
      await navigator.clipboard.writeText(shareText);
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Shared!",
        description: "Referral information copied to clipboard",
      });
    },
    onError: () => {
      toast({
        title: "Share failed",
        description: "Could not share the referral code",
        variant: "destructive",
      });
    },
  });

  const isLoading = isCodeLoading || isStatsLoading;
  const hasCode = !!referralCode?.code;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Referral Program</CardTitle>
            <CardDescription>Share your code and earn rewards</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Code Section */}
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading referral code...</div>
        ) : codeError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              Failed to load referral code
            </p>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/referrals/create"] })}
              size="sm"
              variant="outline"
              data-testid="button-retry-referral"
            >
              Try Again
            </Button>
          </div>
        ) : hasCode ? (
          <div className="space-y-4">
            {/* Code Display */}
            <div className="bg-muted rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-2">Your Referral Code</p>
              <div className="flex items-center justify-between gap-3">
                <code
                  className="text-2xl font-bold font-mono tracking-widest"
                  data-testid="text-referral-code"
                >
                  {referralCode.code}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyMutation.mutate()}
                  disabled={copyMutation.isPending}
                  title="Copy referral code"
                  data-testid="button-copy-code"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Share Button */}
            <Button
              className="w-full"
              onClick={() => shareMutation.mutate()}
              disabled={shareMutation.isPending || copyMutation.isPending}
              data-testid="button-share-code"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Your Code
            </Button>

            {/* Usage Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Total Referrals</p>
                </div>
                <p
                  className="text-2xl font-bold"
                  data-testid="text-total-referrals"
                >
                  {stats.totalReferrals}
                </p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <p className="text-xs text-muted-foreground">Conversions</p>
                </div>
                <p
                  className="text-2xl font-bold"
                  data-testid="text-conversions"
                >
                  {stats.conversions}
                </p>
              </div>
            </div>

            {/* Code Status Badge */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Code Status</p>
              <Badge
                variant={referralCode.active ? "default" : "secondary"}
                data-testid={`badge-code-status-${referralCode.active ? "active" : "inactive"}`}
              >
                {referralCode.active ? "Active" : "Inactive"}
              </Badge>
            </div>

            {/* Usage Counter */}
            {referralCode.maxUsage !== null && (
              <div className="text-xs text-muted-foreground">
                <p>
                  Uses: <span data-testid="text-usage-count">{referralCode.usageCount}</span>
                  {referralCode.maxUsage !== null && ` / ${referralCode.maxUsage}`}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No referral code available
            </p>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/referrals/create"] })}
              data-testid="button-load-code"
            >
              Load Code
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
