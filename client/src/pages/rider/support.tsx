import { SupportSection } from "@/components/support-section";
import { Link } from "wouter";
import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  HelpCircle, Shield, Phone, MessageSquare, Plus, 
  ChevronRight, ChevronDown, ChevronUp, FileText, AlertTriangle, AlertOctagon, Banknote
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

export default function RiderSupport() {
  const [showSafetyInfo, setShowSafetyInfo] = useState(false);

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <h1 className="text-2xl font-bold" data-testid="text-support-title">Help & Safety</h1>
          <Link href="/guide" className="inline-block text-sm text-primary underline">Quick tour, launch status & answers</Link>

          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertOctagon className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 dark:text-red-200">Emergency?</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    If you're in immediate danger, please call emergency services directly.
                  </p>
                  <Button 
                    variant="destructive" 
                    className="mt-3 w-full"
                    onClick={() => window.location.href = "tel:911"}
                    data-testid="button-emergency-call"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call Emergency Services
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card 
              className="hover-elevate cursor-pointer"
              onClick={() => setShowSafetyInfo(!showSafetyInfo)}
            >
              <CardContent className="p-4 text-center">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <p className="font-medium" data-testid="text-safety-center">Safety Center</p>
                <p className="text-xs text-muted-foreground mt-1">Safety tips & info</p>
              </CardContent>
            </Card>
            <Card 
              className="hover-elevate cursor-pointer"
              onClick={() => document.getElementById("rider-feedback")?.scrollIntoView({ block: "start" })}
            >
              <CardContent className="p-4 text-center">
                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="font-medium" data-testid="text-report-issue">Report Issue</p>
                <p className="text-xs text-muted-foreground mt-1">Trip problems</p>
              </CardContent>
            </Card>
          </div>

          {showSafetyInfo && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Safety Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">Verify your driver</p>
                  <p className="text-xs text-muted-foreground">Check the driver's name, photo, and license plate before entering</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">Share your trip</p>
                  <p className="text-xs text-muted-foreground">Share your live location with trusted contacts</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">Trust your instincts</p>
                  <p className="text-xs text-muted-foreground">If something feels wrong, don't get in or ask to be let out safely</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">Sit in the back</p>
                  <p className="text-xs text-muted-foreground">Sitting in the back seat gives you more personal space</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div id="rider-feedback"><SupportSection /></div>

          <RiderPaymentFAQ />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Legal & Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <a href="/terms" className="block p-4 hover-elevate flex items-center justify-between border-b">
                <span>Terms of Service</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
              <a href="/privacy" className="block p-4 hover-elevate flex items-center justify-between border-b">
                <span>Privacy Policy</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
              <a href="/guidelines" className="block p-4 hover-elevate flex items-center justify-between border-b">
                <span>Community Guidelines</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
              <a href="/refund-policy" className="block p-4 hover-elevate flex items-center justify-between">
                <span>Refund Policy</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground px-4">
            ZIBANA Rider v1.0 | Need immediate help? Tap Safety Center above.
          </p>
        </div>
        <ZibraFloatingButton />
      </RiderLayout>
    </RiderRouteGuard>
  );
}

function RiderPaymentFAQ() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card data-testid="card-payment-faq">
      <CardContent className="pt-4">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setExpanded(!expanded)}
          data-testid="button-toggle-payment-faq"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Banknote className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium">How do I pay for my trip?</p>
              <p className="text-sm text-muted-foreground">Payment options explained</p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
        </button>
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-sm">
              You can pay with a card in the app or pay the driver directly in cash.
            </p>
            <p className="text-sm text-muted-foreground">
              Both options are supported for your convenience.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
