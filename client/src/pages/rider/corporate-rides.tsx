import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Building2, Send, Link2, BookOpen, MessageCircle,
  CheckCircle, Briefcase, ChevronRight, Info, Shield
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface CorporateAccount {
  id: number;
  companyName: string;
  rideLimit: number | null;
  ridesUsed: number;
  billingMethod: string;
  status: string;
}

export default function CorporateRides() {
  const [, setLocation] = useLocation();

  const { data: corporateAccount } = useQuery<CorporateAccount | null>({
    queryKey: ["/api/rider/corporate-account"],
    retry: false,
  });

  const hasCorporateAccount = corporateAccount && corporateAccount.status === "active";

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/rider/services")}
              data-testid="button-back-corporate"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-corporate-title">
                Corporate Rides
              </h1>
              <p className="text-sm text-muted-foreground">
                Travel on your company's account with monthly invoicing or prepaid billing.
              </p>
            </div>
          </div>

          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100" data-testid="text-corporate-intro-title">
                    What are Corporate Rides?
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1" data-testid="text-corporate-intro-description">
                    Corporate Rides let you travel using a company-sponsored account. Your company handles billing — you just ride.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="font-medium text-sm" data-testid="text-corporate-who-title">Who can use Corporate Rides?</p>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-corporate-who-desc">
                Riders who have been invited or approved by their company can use Corporate Rides. Your company controls spending limits and ride policies. Riders cannot self-approve — access is granted by a company admin.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="font-medium text-sm" data-testid="text-corporate-billing-title">How billing works</p>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-corporate-billing-desc">
                Monthly invoicing is handled by ZIBANA directly with your company. You ride, and your company pays. You cannot see company financials. ZIBANA acts as a facilitator, not an employer.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="font-medium text-sm" data-testid="text-corporate-join-title">How to join a corporate account</p>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-corporate-join-desc">
                Ask your company admin for a company code and enter it below, or request access and we'll reach out on your behalf. Corporate Rides are being activated across regions — you can request access or join an existing company.
              </p>
            </CardContent>
          </Card>

          {hasCorporateAccount ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                    <Briefcase className="h-5 w-5" />
                    Your Corporate Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Company</span>
                    <span className="font-medium" data-testid="text-corporate-company-name">
                      {corporateAccount.companyName}
                    </span>
                  </div>
                  {corporateAccount.rideLimit && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Rides Used</span>
                      <span className="font-medium" data-testid="text-corporate-rides-used">
                        {corporateAccount.ridesUsed} / {corporateAccount.rideLimit}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Billing</span>
                    <Badge variant="outline" data-testid="badge-corporate-billing">
                      {corporateAccount.billingMethod}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className="bg-green-600 text-white" data-testid="badge-corporate-status">
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                onClick={() => setLocation("/rider/home")}
                data-testid="button-request-corporate-ride"
              >
                <Send className="h-4 w-4 mr-2" />
                Request Corporate Ride
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Card
                className="hover-elevate cursor-pointer"
                onClick={() => setLocation("/rider/services/corporate/join")}
                data-testid="card-join-corporate-account"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Link2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Join a Corporate Account</p>
                        <p className="text-sm text-muted-foreground">
                          Enter a company code or request access
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => setLocation("/rider/home")}
                data-testid="button-request-corporate-ride"
              >
                <Send className="h-4 w-4 mr-2" />
                Request Corporate Ride
              </Button>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => setLocation("/rider/support")}
                data-testid="button-contact-corporate-admin"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Corporate Admin
              </Button>

              <Card
                className="hover-elevate cursor-pointer"
                onClick={() => setLocation("/rider/services/corporate/learn")}
                data-testid="card-learn-corporate"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Learn More</p>
                        <p className="text-sm text-muted-foreground">
                          See how Corporate Rides benefit you and your company
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground" data-testid="text-corporate-disclaimer">
              Corporate rides are subject to company approval and billing rules.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setLocation("/rider/support")}
              data-testid="button-corporate-help"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Need help with Corporate Rides?
            </Button>
          </div>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
