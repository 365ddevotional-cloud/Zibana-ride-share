import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { FileText, Download, ChevronDown, Calendar, TrendingUp, Clock, Car } from "lucide-react";
import { useState } from "react";

interface MonthlyStatement {
  month: number;
  year: number;
  monthLabel: string;
  totalDriverEarnings: number;
  totalTips: number;
  totalIncentives: number;
  totalPlatformFee: number;
  netPayout: number;
  tripCount: number;
  onlineHours: number;
  currency: string;
}

export default function DriverStatementsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const { data: statements = [], isLoading } = useQuery<MonthlyStatement[]>({
    queryKey: ["/api/driver/statements", currentYear],
    enabled: !!user,
  });

  const handleDownload = (month: number, year: number, format: "pdf" | "csv") => {
    window.open(`/api/driver/statements/${year}/${month}/download?format=${format}`, "_blank");
  };

  return (
    <DriverLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl font-bold" data-testid="text-statements-title">Earnings Statements</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/driver/statements/annual")}
            data-testid="button-annual-statement"
          >
            <FileText className="h-4 w-4 mr-2" />
            Annual / Tax
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Monthly summaries of your earnings activity. Platform service fees are shown as aggregated totals only.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-4 h-24" />
              </Card>
            ))}
          </div>
        ) : statements.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium">No statements yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Statements are generated after your first completed month of driving.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {statements.map((stmt) => (
              <MonthlyStatementCard
                key={`${stmt.year}-${stmt.month}`}
                statement={stmt}
                isCurrent={stmt.month === currentMonth && stmt.year === currentYear}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}
      </div>
    </DriverLayout>
  );
}

function MonthlyStatementCard({
  statement,
  isCurrent,
  onDownload,
}: {
  statement: MonthlyStatement;
  isCurrent: boolean;
  onDownload: (month: number, year: number, format: "pdf" | "csv") => void;
}) {
  const [feeOpen, setFeeOpen] = useState(false);
  const currency = statement.currency || "NGN";
  const currencySymbol = "\u20A6";

  const formatAmount = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card data-testid={`card-statement-${statement.year}-${statement.month}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{statement.monthLabel}</span>
          </div>
          {isCurrent && (
            <Badge variant="secondary">Current</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Trip Earnings
            </span>
            <span className="font-medium" data-testid={`text-earnings-${statement.month}`}>
              {formatAmount(statement.totalDriverEarnings)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tips Received</span>
            <span className="font-medium">{formatAmount(statement.totalTips)}</span>
          </div>

          {statement.totalIncentives > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Incentive Bonuses</span>
              <span className="font-medium">{formatAmount(statement.totalIncentives)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Car className="h-3.5 w-3.5" />
            {statement.tripCount} trips
          </span>
          <span className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            {statement.onlineHours}h online
          </span>
        </div>

        <Collapsible open={feeOpen} onOpenChange={setFeeOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground"
              data-testid={`button-toggle-fee-${statement.month}`}
            >
              <span className="text-xs">Service Fee Summary</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${feeOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-2 py-2 rounded-md bg-muted/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total service fees</span>
                <span className="font-medium">{formatAmount(statement.totalPlatformFee)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                This is the aggregated service fee for all {statement.tripCount} trips in {statement.monthLabel}.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Net Payout</p>
            <p className="text-lg font-bold text-emerald-600" data-testid={`text-net-payout-${statement.month}`}>
              {formatAmount(statement.netPayout)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(statement.month, statement.year, "csv")}
              data-testid={`button-download-csv-${statement.month}`}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(statement.month, statement.year, "pdf")}
              data-testid={`button-download-pdf-${statement.month}`}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
