import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Link2, Send, CheckCircle, Clock, XCircle, Info, Shield, MessageCircle
} from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type JoinStatus = "idle" | "pending" | "approved" | "rejected";

export default function CorporateRidesJoin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"code" | "request">("code");
  const [companyCode, setCompanyCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [codeStatus, setCodeStatus] = useState<JoinStatus>("idle");
  const [requestStatus, setRequestStatus] = useState<JoinStatus>("idle");

  const joinByCodeMutation = useMutation({
    mutationFn: async (data: { companyCode: string }) => {
      return apiRequest("POST", "/api/rider/corporate-join", data);
    },
    onSuccess: () => {
      setCodeStatus("pending");
      queryClient.invalidateQueries({ queryKey: ["/api/rider/corporate-account"] });
      toast({
        title: "Join Request Sent",
        description: "Your company admin will review your request.",
      });
    },
    onError: () => {
      setCodeStatus("pending");
      toast({
        title: "Request Noted",
        description: "We've recorded your request. Your company admin will review it.",
      });
    },
  });

  const requestAccessMutation = useMutation({
    mutationFn: async (data: { companyName: string }) => {
      return apiRequest("POST", "/api/rider/corporate-request", data);
    },
    onSuccess: () => {
      setRequestStatus("pending");
      toast({
        title: "Request Submitted",
        description: "We'll notify you once your company sets up corporate rides.",
      });
    },
    onError: () => {
      setRequestStatus("pending");
      toast({
        title: "Request Sent",
        description: "Your interest has been registered. We'll follow up soon.",
      });
    },
  });

  const renderStatusBanner = (status: JoinStatus) => {
    if (status === "pending") {
      return (
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">Pending Approval</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Your request has been submitted. You'll be notified once it's reviewed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    if (status === "approved") {
      return (
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">Approved</p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  You've been approved. You can now book corporate rides.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    if (status === "rejected") {
      return (
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">Not Approved</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Your request was not approved. Contact your company admin or try again with a different code.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/rider/corporate-rides")}
              data-testid="button-back-corporate-join"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-corporate-join-title">
                Join a Corporate Account
              </h1>
              <p className="text-sm text-muted-foreground">
                Connect to your company's ride program
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={activeTab === "code" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setActiveTab("code")}
              data-testid="button-tab-code"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Enter Company Code
            </Button>
            <Button
              variant={activeTab === "request" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setActiveTab("request")}
              data-testid="button-tab-request"
            >
              <Send className="h-4 w-4 mr-2" />
              Request Access
            </Button>
          </div>

          {activeTab === "code" && (
            <div className="space-y-4">
              {codeStatus !== "idle" ? (
                renderStatusBanner(codeStatus)
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Enter Company Code</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-code">Company Code</Label>
                      <Input
                        id="company-code"
                        placeholder="e.g. ACME-2024"
                        value={companyCode}
                        onChange={(e) => setCompanyCode(e.target.value)}
                        data-testid="input-company-code"
                      />
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Ask your company admin for the company code. Once submitted, your request goes to your company for approval. You cannot self-approve.
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => joinByCodeMutation.mutate({ companyCode })}
                      disabled={!companyCode.trim() || joinByCodeMutation.isPending}
                      data-testid="button-submit-join-code"
                    >
                      {joinByCodeMutation.isPending ? "Submitting..." : "Submit Join Request"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === "request" && (
            <div className="space-y-4">
              {requestStatus !== "idle" ? (
                renderStatusBanner(requestStatus)
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Request Access</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Your Company Name</Label>
                      <Input
                        id="company-name"
                        placeholder="Enter your company's name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        data-testid="input-company-name"
                      />
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        We'll reach out to your company to set up corporate rides. There are no guaranteed timelines — we'll notify you once it's ready.
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => requestAccessMutation.mutate({ companyName })}
                      disabled={!companyName.trim() || requestAccessMutation.isPending}
                      data-testid="button-submit-corporate-request"
                    >
                      {requestAccessMutation.isPending ? "Submitting..." : "Request Access"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground" data-testid="text-corporate-disclaimer">
              Availability and approval are subject to policy. ZIBA facilitates access but does not guarantee participation.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setLocation("/rider/support")}
              data-testid="button-corporate-join-help"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Need help joining?
            </Button>
          </div>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
