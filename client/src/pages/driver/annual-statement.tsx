import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ChevronDown, ArrowLeft, Calendar, User, MapPin, ShieldCheck } from "lucide-react";
import { useState } from "react";

interface AnnualStatement {
  year: number;
  driverName: string;
  driverId: string;
  totalGrossEarnings: number;
  totalTips: number;
  totalIncentives: number;
  totalPlatformFee: number;
  reportableIncome: number;
  totalTrips: number;
  totalOnlineHours: number;
  totalMilesDrivenOnline: number;
  currency: string;
  status?: string;
}

export default function DriverAnnualStatementPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [feeOpen, setFeeOpen] = useState(false);

  const currentYear = new Date().getFullYear();

  const { data: annualData, isLoading } = useQuery<AnnualStatement>({
    queryKey: ["/api/driver/statements/annual", currentYear],
    enabled: !!user,
  });

  const handleDownload = (format: "pdf" | "csv") => {
    if (!annualData) return;
    window.open(`/api/driver/statements/annual/${annualData.year}/download?format=${format}`, "_blank");
  };

  const currency = annualData?.currency || "NGN";
  const currencySymbol = "\u20A6";

  const formatAmount = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <DriverLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/driver/statements")}
            data-testid="button-back-statements"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold" data-testid="text-annual-title">Annual Tax Statement</h1>
        </div>

        <p className="text-sm text-muted-foreground">
          Annual summary for tax filing purposes. This document summarizes your reportable income for the year.
        </p>

        {isLoading ? (
          <Card className="animate-pulse">
            <CardContent className="pt-4 h-48" />
          </Card>
        ) : !annualData ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium">No annual data yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your annual statement will be available after completing trips.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card data-testid="card-annual-statement">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Tax Year {annualData.year}</span>
                </div>
                {annualData.status && (annualData.status === "finalized" || annualData.status === "issued") && (
                  <Badge variant="secondary" data-testid="badge-tax-status">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    {annualData.status === "issued" ? "Official" : "Finalized"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm" data-testid="text-driver-name">{annualData.driverName}</p>
                  <p className="text-xs text-muted-foreground">Driver ID: {annualData.driverId}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Gross Trip Earnings</span>
                  <span className="font-medium" data-testid="text-gross-earnings">
                    {formatAmount(annualData.totalGrossEarnings)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tips Received</span>
                  <span className="font-medium">{formatAmount(annualData.totalTips)}</span>
                </div>

                {annualData.totalIncentives > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Incentive Bonuses</span>
                    <span className="font-medium">{formatAmount(annualData.totalIncentives)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{annualData.totalTrips} total trips</span>
                  <span>{annualData.totalOnlineHours}h online</span>
                </div>
              </div>

              {annualData.totalMilesDrivenOnline > 0 && (
                <div className="p-3 rounded-md bg-muted/50 space-y-1" data-testid="section-mileage-disclosure">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium">Mileage Summary</span>
                  </div>
                  <div className="flex items-center justify-between pl-6">
                    <span className="text-sm text-muted-foreground">Total miles driven while online</span>
                    <span className="font-medium" data-testid="text-total-miles">
                      {annualData.totalMilesDrivenOnline.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    For tax reporting purposes. This figure may be relevant for mileage deductions. Consult a tax professional.
                  </p>
                </div>
              )}

              <Collapsible open={feeOpen} onOpenChange={setFeeOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-muted-foreground"
                    data-testid="button-toggle-annual-fee"
                  >
                    <span className="text-xs">Annual Service Fee (for tax records)</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${feeOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-2 py-2 rounded-md bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total annual service fees</span>
                      <span className="font-medium" data-testid="text-annual-fee">
                        {formatAmount(annualData.totalPlatformFee)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Aggregated service fees for {annualData.totalTrips} trips in {annualData.year}. This amount may be deductible as a business expense.
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Reportable Income</p>
                    <p className="text-2xl font-bold text-emerald-600" data-testid="text-reportable-income">
                      {formatAmount(annualData.reportableIncome)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleDownload("csv")}
                  data-testid="button-download-annual-csv"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleDownload("pdf")}
                  data-testid="button-download-annual-pdf"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                This statement is provided for informational purposes. Consult a tax professional for filing guidance.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DriverLayout>
  );
}
