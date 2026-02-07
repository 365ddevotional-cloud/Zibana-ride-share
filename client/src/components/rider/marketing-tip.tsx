import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, X } from "lucide-react";

interface MarketingTipResponse {
  eligible: boolean;
  tip?: {
    text: string;
    key: string;
  };
}

export function MarketingTipBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery<MarketingTipResponse>({
    queryKey: ["/api/rider/marketing-tip"],
  });

  if (!data?.eligible || !data.tip || dismissed) {
    return null;
  }

  return (
    <Card className="border-dashed" data-testid="card-marketing-tip">
      <CardContent className="p-3 flex items-center gap-3">
        <Lightbulb className="h-4 w-4 text-yellow-500 dark:text-yellow-400 shrink-0" />
        <p
          className="text-sm text-muted-foreground flex-1"
          data-testid={`text-marketing-tip-${data.tip.key}`}
        >
          {data.tip.text}
        </p>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setDismissed(true)}
          data-testid="button-dismiss-marketing-tip"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
