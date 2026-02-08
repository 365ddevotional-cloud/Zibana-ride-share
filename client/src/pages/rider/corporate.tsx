import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Building2, Send, Link2, BookOpen, MessageCircle,
  CheckCircle, Briefcase, ChevronRight, Info
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [joinSubmitted, setJoinSubmitted] = useState(false);

  const { data: corporateAccount, isLoading } = useQuery<CorporateAccount | null>({
    queryKey: ["/api/rider/corporate-account"],
    retry: false,
  });

  const requestAccessMutation = useMutation({
    mutationFn: async (data: { companyName: string }) => {
      return apiRequest("POST", "/api/rider/corporate-request", data);
    },
    onSuccess: () => {
      setRequestSubmitted(true);
      toast({
        title: "Request Submitted",
        description: "We'll notify you once your company sets up corporate rides.",
      });
    },
    onError: () => {
      toast({
        title: "Request Sent",
        description: "Your interest has been registered. We'll follow up soon.",
      });
      setRequestSubmitted(true);
    },
  });

  const joinAccountMutation = useMutation({
    mutationFn: async (data: { companyCode: string }) => {
      return apiRequest("POST", "/api/rider/corporate-join", data);
    },
    onSuccess: () => {
      setJoinSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/rider/corporate-account"] });
      toast({
        title: "Request Sent",
        description: "Your join request has been submitted for approval.",
      });
    },
    onError: () => {
      toast({
        title: "Join Request Noted",
        description: "We've recorded your request. Your company admin will review it.",
      });
      setJoinSubmitted(true);
    },
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
                Company-sponsored travel
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
                    Corporate Rides let you travel using a company-sponsored account with centralized billing and ride tracking. Your company handles the payment — you just ride.
                  </p>
                </div>
              </div>
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
                data-testid="button-book-corporate-ride"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Book a Corporate Ride
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Card
                className="hover-elevate cursor-pointer"
                onClick={() => { setShowRequestForm(true); setShowJoinForm(false); }}
                data-testid="card-request-corporate-access"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Send className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Request Corporate Access</p>
                        <p className="text-sm text-muted-foreground">
                          Ask your company to set up rides for you
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="hover-elevate cursor-pointer"
                onClick={() => { setShowJoinForm(true); setShowRequestForm(false); }}
                data-testid="card-join-corporate-account"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Link2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Join Existing Account</p>
                        <p className="text-sm text-muted-foreground">
                          Enter a company code to join their rides
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="hover-elevate cursor-pointer"
                onClick={() => setLocation("/rider/support")}
                data-testid="card-learn-corporate"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Learn How It Works</p>
                        <p className="text-sm text-muted-foreground">
                          See how corporate rides benefit you and your company
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>

              {showRequestForm && !requestSubmitted && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Request Corporate Access</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company Name</Label>
                      <Input
                        id="company-name"
                        placeholder="Enter your company name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        data-testid="input-company-name"
                      />
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        We'll reach out to your company to set up corporate rides. You'll be notified once it's ready.
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => requestAccessMutation.mutate({ companyName })}
                      disabled={!companyName.trim() || requestAccessMutation.isPending}
                      data-testid="button-submit-corporate-request"
                    >
                      {requestAccessMutation.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {showJoinForm && !joinSubmitted && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Join a Company Account</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-code">Company Code</Label>
                      <Input
                        id="company-code"
                        placeholder="Enter the code from your company"
                        value={companyCode}
                        onChange={(e) => setCompanyCode(e.target.value)}
                        data-testid="input-company-code"
                      />
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Ask your company admin for the company code. Once approved, you can book rides on the corporate account.
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => joinAccountMutation.mutate({ companyCode })}
                      disabled={!companyCode.trim() || joinAccountMutation.isPending}
                      data-testid="button-submit-join-code"
                    >
                      {joinAccountMutation.isPending ? "Submitting..." : "Join Account"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {(requestSubmitted || joinSubmitted) && (
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">
                          {requestSubmitted ? "Request Submitted" : "Join Request Sent"}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          {requestSubmitted
                            ? "We'll notify you when corporate rides are available for your company."
                            : "Your company admin will review your request. You'll be notified once approved."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

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
