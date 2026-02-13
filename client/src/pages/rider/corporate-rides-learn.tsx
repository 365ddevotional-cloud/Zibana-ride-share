import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Building2, CreditCard, Users, ShieldCheck, MessageCircle
} from "lucide-react";
import { useLocation } from "wouter";

const steps = [
  {
    icon: Building2,
    title: "Your Company Sets It Up",
    description: "Your employer or organization registers a corporate account with ZIBANA. They choose a billing method — monthly invoicing, prepaid wallet, or a hybrid approach.",
  },
  {
    icon: Users,
    title: "You Get Invited",
    description: "Your company admin shares a company code, or you can request access. Once approved, you're linked to the corporate account.",
  },
  {
    icon: CreditCard,
    title: "Ride Without Paying",
    description: "Book rides as you normally would. The cost is billed to your company's account — you don't pay out of pocket for approved trips.",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Transparent",
    description: "Your rides are tracked for billing purposes only. Your personal information stays private. Your company sees trip summaries, not personal details.",
  },
];

export default function CorporateRidesLearn() {
  const [, setLocation] = useLocation();

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/rider/services/corporate")}
              data-testid="button-back-corporate-learn"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-corporate-learn-title">
                How Corporate Rides Work
              </h1>
              <p className="text-sm text-muted-foreground">
                A quick guide to company-sponsored travel
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => {
              const IconComp = step.icon;
              return (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <IconComp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        {index < steps.length - 1 && (
                          <div className="w-0.5 flex-1 bg-blue-200 dark:bg-blue-800 mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="font-medium" data-testid={`text-corporate-step-${index}-title`}>
                          {step.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1" data-testid={`text-corporate-step-${index}-desc`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 space-y-3">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Ready to get started?
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Ask your company's admin for a company code, or request access and we'll reach out on your behalf.
              </p>
              <Button
                className="w-full"
                onClick={() => setLocation("/rider/services/corporate/join")}
                data-testid="button-goto-join"
              >
                Join a Corporate Account
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setLocation("/rider/support")}
              data-testid="button-corporate-learn-help"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Questions? Ask ZIBRA
            </Button>
          </div>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
